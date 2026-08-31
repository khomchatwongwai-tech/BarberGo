#!/usr/bin/env bash
# Opens the Workqora createRun-only PR using the caller GitHub credentials.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
PATCH="$ROOT/01-createrun.patch"
REPO="${WORKQORA_REPO:-https://github.com/khomchatwongwai-tech/workqora.git}"
BRANCH="cursor/workflow-run-schema-fallback-bf1e"

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

git clone --depth 50 "$REPO" "$TMP/workqora"
cd "$TMP/workqora"
git checkout -B "$BRANCH" origin/main
git apply "$PATCH"
git add scripts/critical-deploy-gate.mjs server.ts server/ops/schemaContracts.ts \
  server/workflow/workflowEngine.ts \
  tests/automation_condition_operators_correlation_observability.test.ts \
  tests/schema_contracts.test.ts
git commit -m "fix(workflow): four-tier createRun when AG version columns are missing"
git push -u origin "$BRANCH"
gh pr create --repo khomchatwongwai-tech/workqora --base main --head "$BRANCH" \
  --title "fix(workflow): four-tier createRun when AG version columns are missing" \
  --body "Four-tier createRun so production can persist workflow_runs while AG version columns are missing. Do not mix CRM, late/no-show, or hydration. Recert worker-alone against the SHA reported by GET /api/health. Keep WORKQORA_AUTONOMOUS_MUTATION false. Closes nothing; see issue 296."
