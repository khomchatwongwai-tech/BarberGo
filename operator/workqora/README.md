# Workqora createRun operator kit

Live `GET /api/health` and `origin/main` are **`ba654bf`** (Workqora `#305` DATA-15). That SHA does **not** include four-tier `createRun`. Production still uses the `#279` two-step insert (`baseRow` always includes `definition_version`). That column is missing, so the worker writes **zero** `workflow_runs`.

Do **not** fold this into a DATA PR. Do **not** recert `ba654bf` (or earlier DATA SHAs) for worker-alone. Recert only when `/api/health` reports a SHA whose `createRun` has `tiers` / `coreRow`. Keep `WORKQORA_AUTONOMOUS_MUTATION` false.

This kit is **not** a Workqora merge. `cursor[bot]` on BarberGo cannot push Workqora (403). Someone with Workqora write must open the createRun-only PR.

## Fastest path (GitHub website, one file)

You already merge DATA PRs in the GitHub editor. Do the same here, **instead of another DATA PR**.

1. Open  
   https://github.com/khomchatwongwai-tech/workqora/edit/main/server/workflow/workflowEngine.ts
2. Select all and replace with this file (raw, copy all):  
   https://raw.githubusercontent.com/khomchatwongwai-tech/BarberGo/cursor/workqora-createrun-paste-file-bf1e/operator/workqora/workflowEngine.ts
3. Commit to a **new branch** named `cursor/workflow-run-schema-fallback-bf1e` (not `main` if you prefer a PR).
4. Open a pull request titled  
   `fix(workflow): four-tier createRun when AG version columns are missing`
5. Merge that PR alone. Do not add CRM, late/no-show, hydration, or DATA files.

Issue with the same paste-over: https://github.com/khomchatwongwai-tech/workqora/issues/307

If the editor is already on a DATA branch, switch the branch dropdown to **`main`** first.

## Other apply paths

```bash
git clone https://github.com/khomchatwongwai-tech/workqora.git
cd workqora
git checkout -b cursor/workflow-run-schema-fallback-bf1e origin/main
git apply /path/to/01-createrun.patch
git commit -am "fix(workflow): four-tier createRun when AG version columns are missing"
git push -u origin cursor/workflow-run-schema-fallback-bf1e
gh pr create --base main --title "fix(workflow): four-tier createRun when AG version columns are missing"
```

`01b-createrun-engine-only.patch` is the engine-only subset (same as replacing `workflowEngine.ts`).

Equivalent schema path: apply `supabase/migrations/20260943000000_workflow_run_lifecycle_and_versioning.sql` on production Postgres (service role cannot DDL). That would also let current production two-step `createRun` insert.

BarberGo Actions: add secret `WORKQORA_GITHUB_TOKEN` (Contents + PRs write on Workqora), then **Actions → Ship Workqora createRun PR**.

After Render, recert **worker-alone**: synthetic org, mutation off, `employee.activated` must create a `workflow_runs` row for that `event_id`, then delete the org.

## After worker-alone runs exist (separate PRs)

1. `02-crm.patch`
2. `03-late-after-crm.patch` on the CRM commit
3. `04-hydration-after-createrun.patch` on the createRun commit

Workqora issue: https://github.com/khomchatwongwai-tech/workqora/issues/297  
Close accidental Workqora `#295` (`title: test`).
