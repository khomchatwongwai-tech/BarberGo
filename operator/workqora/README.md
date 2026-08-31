# Workqora createRun operator kit

`origin/main` is `ab8a7af` (`#301` DATA-13). Live `/api/health` may still be `23cfa2d` until Render. Neither SHA includes four-tier `createRun`. The worker processes `employee.activated` but creates **zero** `workflow_runs` because production `createRun` always inserts `definition_version` while that column is missing.

`#301` is Command Center `attentionQueue` / `answerContract` only. Do **not** fold this kit into DATA PRs. Recert worker-alone only after `/api/health` reports a SHA that contains four-tier `createRun`. Do not recert `23cfa2d` or `ab8a7af` for the same hole.

This kit is **not** a Workqora merge. It is the apply path for someone with Workqora write (GitHub UI, `gh`, or a new Cloud Agent on that repo). Keep `WORKQORA_AUTONOMOUS_MUTATION` false. Do not call automation 100% GREEN.

## Ship first (required)

From a clone of `khomchatwongwai-tech/workqora` at `origin/main` (`ab8a7af`; this patch still applies):

```bash
git checkout -b cursor/workflow-run-schema-fallback-bf1e
git apply /path/to/01-createrun.patch
git commit -am "fix(workflow): four-tier createRun when AG version columns are missing"
git push -u origin cursor/workflow-run-schema-fallback-bf1e
gh pr create --base main --title "fix(workflow): four-tier createRun when AG version columns are missing"
```

Or run `./operator/workqora/ship-createrun.sh` from this BarberGo checkout (uses your GitHub credentials, or `WORKQORA_GITHUB_TOKEN` if set). Do not commit that token.

Equivalent: apply `supabase/migrations/20260943000000_workflow_run_lifecycle_and_versioning.sql` on production Postgres (service role cannot DDL).

After Render has a SHA that includes createRun, recert **worker-alone**: synthetic org, mutation off, `employee.activated` must create a `workflow_runs` row for that `event_id`.

Workqora issue: https://github.com/khomchatwongwai-tech/workqora/issues/299 (copy-paste). Also #296.

## After worker-alone runs exist (do not mix into the first PR)

Apply in this order on top of the previous merge:

1. `02-crm.patch` on `main` (registers `crm.follow_up` / `crm.escalate_risk`, fail-soft `UNKNOWN_ACTION`)
2. `03-late-after-crm.patch` on the CRM commit (maps `attendance.late` / `attendance.no_show`)
3. `04-hydration-after-createrun.patch` on the createRun commit (source-row facts before match/run)

Workqora issue: https://github.com/khomchatwongwai-tech/workqora/issues/297

Close accidental Workqora `#295` (`title: test`).
