#!/usr/bin/env bash
# Opens a Wongwai Group Inc PR from this overlay when WONGWAI_GITHUB_TOKEN can write.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
OVERLAY="$ROOT/overlay"
REPO="${WONGWAI_REPO:-https://github.com/khomchatwongwai-tech/wongwaiGroupInc.git}"
BRANCH="cursor/corporate-os-foundation-138b"
GH_REPO="khomchatwongwai-tech/wongwaiGroupInc"

if ! command -v gh >/dev/null 2>&1; then
  echo "gh is required" >&2
  exit 1
fi

if [ -n "${WONGWAI_GITHUB_TOKEN:-}" ]; then
  export GH_TOKEN="$WONGWAI_GITHUB_TOKEN"
fi
gh auth setup-git >/dev/null

EXISTING="$(gh pr list --repo "$GH_REPO" --head "$BRANCH" --state open --json url --jq '.[0].url // empty')"
if [ -n "$EXISTING" ]; then
  echo "Wongwai corporate OS PR already open: $EXISTING"
  exit 0
fi

if [ ! -d "$OVERLAY/server/corporate" ]; then
  echo "overlay missing server/corporate" >&2
  exit 1
fi

TMP="$(mktemp -d)"
cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

git clone --depth 20 "$REPO" "$TMP/wongwai"
cd "$TMP/wongwai"

if git show origin/main:server/corporate/productRegistry.ts >/dev/null 2>&1; then
  echo "origin/main already has corporate product registry"
  exit 0
fi

git checkout -B "$BRANCH" origin/main
# Sparse overlay: only foundation files, copied onto current Wongwai main.
cp -a "$OVERLAY"/. .
git add -A
if git diff --cached --quiet; then
  echo "no overlay changes"
  exit 0
fi
git commit -m "feat(corporate-os): product registry, honest health, event bus foundation"
git push -u origin "$BRANCH"
gh pr create --repo "$GH_REPO" --base main --head "$BRANCH" \
  --title "feat(corporate-os): product registry, honest health, event bus" \
  --body "Foundation slice for the Wongwai corporate AI operating system: architecture audit, canonical product registry (Workqora / MarketMind / Wongwai Group), health aggregation that never maps UNKNOWN to GREEN, HMAC event ingest with DLQ/idempotency, Spider Web, UNAVAILABLE KPIs, and prohibited mutation/trading gates. Keep WORKQORA_AUTONOMOUS_MUTATION=false and MARKETMIND_LIVE_TRADING_ENABLED=false. This is not production certification; see CERTIFICATION.md."
