#!/usr/bin/env bash
# Opens the Workqora createRun-only PR using the caller GitHub credentials.
# Idempotent: no-ops if main already has four-tier createRun or the PR exists.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
PATCH="$ROOT/01-createrun.patch"
PATCH_ENGINE="$ROOT/01b-createrun-engine-only.patch"
REPO="${WORKQORA_REPO:-https://github.com/khomchatwongwai-tech/workqora.git}"
BRANCH="cursor/workflow-run-schema-fallback-bf1e"
GH_REPO="khomchatwongwai-tech/workqora"

if ! command -v gh >/dev/null 2>&1; then
  echo "gh is required" >&2
  exit 1
fi

TMP="$(mktemp -d)"
cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

if [ -n "${WORKQORA_GITHUB_TOKEN:-}" ]; then
  export GH_TOKEN="$WORKQORA_GITHUB_TOKEN"
fi
gh auth setup-git >/dev/null

EXISTING="$(gh pr list --repo "$GH_REPO" --head "$BRANCH" --state open --json url --jq '.[0].url // empty')"
if [ -n "$EXISTING" ]; then
  echo "createRun PR already open: $EXISTING"
  exit 0
fi

git clone --depth 50 "$REPO" "$TMP/workqora"
cd "$TMP/workqora"

if git show origin/main:server/workflow/workflowEngine.ts | grep -q "const tiers ="; then
  echo "origin/main already has four-tier createRun"
  exit 0
fi

git checkout -B "$BRANCH" origin/main
ENGINE_SRC="$ROOT/workflowEngine.ts"
if [ -f "$ENGINE_SRC" ] && grep -q "const tiers =" "$ENGINE_SRC"; then
  echo "replacing server/workflow/workflowEngine.ts from operator kit (paste-over equivalent)"
  cp "$ENGINE_SRC" server/workflow/workflowEngine.ts
  git add server/workflow/workflowEngine.ts
elif git apply "$PATCH"; then
  git add scripts/critical-deploy-gate.mjs server.ts server/ops/schemaContracts.ts \
    server/workflow/workflowEngine.ts \
    tests/automation_condition_operators_correlation_observability.test.ts \
    tests/schema_contracts.test.ts
else
  echo "full patch missed; applying engine-only 01b"
  git apply "$PATCH_ENGINE"
  git add server/workflow/workflowEngine.ts
fi
if ! grep -q "const tiers =" server/workflow/workflowEngine.ts; then
  echo "refusing to commit: workflowEngine.ts still lacks four-tier createRun" >&2
  exit 1
fi
git commit -m "fix(workflow): four-tier createRun when AG version columns are missing"
git push -u origin "$BRANCH"
gh pr create --repo "$GH_REPO" --base main --head "$BRANCH" \
  --title "fix(workflow): four-tier createRun when AG version columns are missing" \
  --body "Four-tier createRun so production can persist workflow_runs while AG version columns are missing. Do not mix CRM, late/no-show, hydration, or DATA PRs. Recert worker-alone against the SHA reported by GET /api/health. Keep WORKQORA_AUTONOMOUS_MUTATION false. See issue 307."
