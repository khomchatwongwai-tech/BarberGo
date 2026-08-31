#!/usr/bin/env python3
"""Worker-alone recert for Workqora production.

Creates a synthetic org, emits employee.activated, waits for the Render
domain-event dispatcher (does NOT call claim_pending_domain_events),
asserts a workflow_runs row for that event_id, then deletes the org.

Refuses to run while workflow_runs.definition_version is missing, unless
the live SHA already has four-tier createRun. Does not print secrets.
Keep WORKQORA_AUTONOMOUS_MUTATION false.
"""
from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request
import uuid
from pathlib import Path

FORBIDDEN_RPCS = ("claim_pending_domain_events", "claim_automation_executions")


def load_env() -> None:
    candidates = []
    if os.environ.get("WORKQORA_ENV_FILE"):
        candidates.append(Path(os.environ["WORKQORA_ENV_FILE"]))
    candidates.extend(
        [
            Path("/workspace/workqora/.env.local"),
            Path.cwd() / ".env.local",
        ]
    )
    for path in candidates:
        if not path.is_file():
            continue
        for line in path.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))
        break


def rest(method: str, path: str, body: dict | None = None, extra: dict | None = None) -> tuple[int, object]:
    url = os.environ["SUPABASE_URL"].rstrip("/") + "/rest/v1/" + path.lstrip("/")
    key = os.environ["SUPABASE_SECRET_KEY"]
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    if extra:
        headers.update(extra)
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode() or "null"
            return resp.status, json.loads(raw)
    except urllib.error.HTTPError as err:
        raw = err.read().decode()
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            parsed = {"message": raw[:300]}
        return err.code, parsed


def live_create_run_is_four_tier() -> tuple[str, bool]:
    """True when GET /api/health SHA's createRun uses tiers/coreRow, not #279 baseRow."""
    with urllib.request.urlopen("https://www.workqora.com/api/health", timeout=30) as resp:
        health = json.loads(resp.read().decode())
    sha = str(health.get("commitSha") or "").strip()
    if not sha:
        return "", False
    url = (
        "https://raw.githubusercontent.com/khomchatwongwai-tech/workqora/"
        f"{sha}/server/workflow/workflowEngine.ts"
    )
    with urllib.request.urlopen(url, timeout=30) as resp:
        source = resp.read().decode()
    idx = source.find("async function createRun")
    chunk = source[idx : idx + 4000] if idx >= 0 else ""
    return sha, ("const tiers" in chunk and "coreRow" in chunk)


def openapi_workflow_run_columns() -> list[str]:
    url = os.environ["SUPABASE_URL"].rstrip("/") + "/rest/v1/"
    key = os.environ["SUPABASE_SECRET_KEY"]
    req = urllib.request.Request(
        url,
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Accept": "application/openapi+json",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        spec = json.loads(resp.read().decode())
    props = (spec.get("definitions") or {}).get("workflow_runs", {}).get("properties") or {}
    return sorted(props)


def main() -> int:
    load_env()
    for name in ("SUPABASE_URL", "SUPABASE_SECRET_KEY"):
        if not os.environ.get(name):
            print(f"FAIL missing {name}", file=sys.stderr)
            return 1
    for rpc in FORBIDDEN_RPCS:
        if rpc in sys.argv:
            print("FAIL refusing global claim RPC", file=sys.stderr)
            return 1

    columns = openapi_workflow_run_columns()
    sha, four_tier = live_create_run_is_four_tier()
    print("liveSha", sha, "fourTierCreateRun", four_tier)
    if "definition_version" not in columns and not four_tier:
        print(
            "SKIP definition_version still missing and live createRun is still two-step. "
            "Apply operator/workqora/05-add-run-version-columns.sql or ship four-tier createRun."
        )
        print("columns", columns)
        return 2

    stamp = uuid.uuid4().hex[:12]
    org_id = f"org_bhcert_{stamp}"
    loc_id = f"loc_bhcert_{stamp}"
    emp_id = f"emp_bhcert_{stamp}"
    wf_id = f"wf_bhcert_{stamp}"
    evt_id = f"evt_bhcert_{stamp}"
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    print(f"START org={org_id} event={evt_id}")

    try:
        code, body = rest(
            "POST",
            "organizations",
            {
                "id": org_id,
                "name": f"BH worker-alone recert {stamp}",
                "owner_firebase_uid": f"cert-bh-{stamp}",
                "plan_code": "starter",
                "active_location_count": 1,
                "created_at": now,
                "updated_at": now,
                "payload": {"purpose": "bh-worker-alone-recert", "delete": True},
            },
        )
        if code >= 300:
            print("FAIL org insert", code, body)
            return 1
        rest(
            "POST",
            "locations",
            {
                "id": loc_id,
                "organization_id": org_id,
                "name": "Recert location",
                "active": True,
                "timezone": "America/New_York",
                "payload": {},
                "created_at": now,
                "updated_at": now,
            },
        )
        rest(
            "POST",
            "employees",
            {
                "id": emp_id,
                "organization_id": org_id,
                "location_id": loc_id,
                "active": True,
                "display_name": "Recert Employee",
                "payload": {},
                "created_at": now,
                "updated_at": now,
            },
        )
        rest(
            "POST",
            "workflow_definitions",
            {
                "id": wf_id,
                "organization_id": org_id,
                "location_id": loc_id,
                "name": "Employee activated recert",
                "enabled": True,
                "trigger_event_type": "employee.activated",
                "conditions": {"all": []},
                "actions": [{"action": "create_notification", "params": {"title": "BH recert"}}],
                "created_at": now,
                "updated_at": now,
            },
        )
        code, body = rest(
            "POST",
            "domain_events",
            {
                "id": evt_id,
                "organization_id": org_id,
                "location_id": loc_id,
                "event_type": "employee.activated",
                "schema_version": 1,
                "entity_id": emp_id,
                "entity_type": "employee",
                "actor": {"source": "system"},
                "actor_type": "system",
                "source": "system",
                "payload": {"employeeId": emp_id},
                "idempotency_key": f"employee.activated:{emp_id}:bhcert",
                "occurred_at": now,
                "created_at": now,
                "processing_status": "pending",
                "attempt_count": 0,
                "metadata": {},
                "correlation_id": evt_id,
            },
        )
        if code >= 300:
            print("FAIL event insert", code, body)
            return 1

        runs = []
        status = None
        for _ in range(24):
            time.sleep(5)
            _, events = rest("GET", f"domain_events?id=eq.{evt_id}&select=processing_status,last_error_code")
            if isinstance(events, list) and events:
                status = events[0].get("processing_status")
            _, runs = rest(
                "GET",
                f"workflow_runs?event_id=eq.{evt_id}&organization_id=eq.{org_id}&select=id,status,event_id,failure_reason",
            )
            if isinstance(runs, list) and runs:
                break
        print("event_status", status)
        print("workflow_runs", json.dumps(runs, default=str)[:800])
        if not isinstance(runs, list) or not runs:
            print("FAIL worker-alone produced 0 workflow_runs for", evt_id)
            return 3
        print("PASS worker-alone", runs[0].get("id"), "status", runs[0].get("status"))
        return 0
    finally:
        dcode, dbody = rest("DELETE", f"organizations?id=eq.{org_id}", extra={"Prefer": "return=minimal"})
        print("cleanup_org", dcode)


if __name__ == "__main__":
    raise SystemExit(main())
