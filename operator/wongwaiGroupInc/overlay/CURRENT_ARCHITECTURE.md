# CURRENT ARCHITECTURE — Wongwai Group Inc

Audit date: 2026-09-01
Repository audited: `khomchatwongwai-tech/wongwaiGroupInc` (`main` SHA `6d8c79a6e0f93a77ae29921fefa9a8d1647ddd56`)
This document classifies capabilities. It does not certify production.

## Runtime observed during this audit

| Surface | Evidence | Classification |
|---|---|---|
| `https://wongwaigroupinc.com` | TLS handshake failed (`tlsv1 alert internal error`) | BROKEN |
| `https://www.wongwaigroupinc.com` | HTTP 301 → `https://wongwaigroupinc.com/` | PARTIAL (www exists; apex TLS broken) |
| Workqora `GET https://www.workqora.com/api/health` | HTTP 200 JSON; `commitSha=f37457170a1e0a6ba4fda61c88fab839942888a2`; `databaseSchema=degraded`; `affectedSubsystems=["workflow"]` | LIVE (degraded) |
| Workqora `GET /api/ready` | SPA HTML, not a JSON ready document | UNIMPLEMENTED / BROKEN as a ready probe |
| MarketMind GitHub `khomchatwongwai-tech/MarketMind-AI` `main` | SHA `43de92c190b8` (2026-09-01) with `/api/health` JSON handler in source | LOCAL_ONLY relative to Wongwai (no certified production URL) |
| `https://marketmind-ai.com/api/health` | HTTP 200 HTML marketing SPA (“Coming Fall 2026”) | NOT the trading engine; treating as UNIMPLEMENTED for Wongwai connectors |

Safety flags required by this program (code now defaults both to false):

- `WORKQORA_AUTONOMOUS_MUTATION=false`
- `MARKETMIND_LIVE_TRADING_ENABLED=false`

## Existing application (pre–corporate OS)

The repository is an Owner Command Center: React 19 + Express + in-memory store, optional Supabase, Firebase client config, Gemini AI CEO.

| Capability | Path | Classification | Notes |
|---|---|---|---|
| Express server | `server.ts` | PARTIAL | Listens on port 3000. Owner session auth. No `render.yaml`. |
| Vite SPA | `src/App.tsx`, `vite.config.ts` | LIVE locally | Tab navigation, not URL routes. |
| Health | `GET /api/health` | PARTIAL | Previously labeled `healthy` without upstream checks. Now reports `ok` plus safety flags. |
| Ready | `GET /api/ready` | PARTIAL | Previously claimed `database: connected` with no database. Now `configured` vs `unavailable`. |
| Owner auth | `server/auth.ts`, `tests/auth_security_suite.test.ts` | PARTIAL | Allowlist email, bcrypt, master token, rate limit. `googleAuthSimulated` remains a demo path. |
| Product list | `server/store.ts` `productsList` | SIMULATED | Hard-coded MarketMind / ShiftForce / BarberGo MRR, churn, uptime. Not Workqora. |
| HMAC events | `POST /api/events`, `server/events.ts` | PARTIAL | Signature exists. Docs say Unix seconds ±300s; code uses `Date.now()` ms ±10 minutes. Default secrets are hardcoded if env unset. `x-test-dispatch` bypasses HMAC. |
| Alerts | `/api/alerts` | SIMULATED | Seeded demo alerts. |
| Support inbox | `/api/support/tickets` | SIMULATED | Seeded tickets. |
| System ping | `POST /api/systems/ping` | SIMULATED | Multiplies latency by random factor. Does not call product health URLs. |
| AI CEO | `server/ai-ceo.ts`, `/api/ai-ceo/chat` | PARTIAL | Real Gemini when `GEMINI_API_KEY` set; context is seeded financial demo data. |
| Tax / reconciliation | `src/lib/taxEngine.ts`, views | SIMULATED / LOCAL_ONLY | Deterministic engines over in-memory ledgers. |
| Firebase | `src/lib/firebase.ts` | UNIMPLEMENTED for corporate data | Client config only. |
| Supabase | `SUPABASE_SETUP.md` | UNIMPLEMENTED in runtime | DDL docs exist; server does not persist to Postgres. |
| CI | none on `main` before this change | UNIMPLEMENTED | No `.github/workflows` on audited `main`. |
| Tests | `tests/auth_security_suite.test.ts` | PARTIAL | Auth unit tests only. |
| Command center UI | Overview, revenue, product cards, alerts, reports | SIMULATED in production mode unless live connectors are added | Legacy views still serve store fixtures. |
| Workqora bridge | missing on audited `main` | UNIMPLEMENTED | ShiftForce is the workforce stand-in. |
| MarketMind bridge | `/api/products/marketmind` | SIMULATED | Fixture metrics, not MarketMind events. |
| Corporate product registry | missing | UNIMPLEMENTED → added in-memory registry | |
| Spider Web | missing | UNIMPLEMENTED → corporate graph added | |
| Deep research | missing | UNIMPLEMENTED → jobs return INSUFFICIENT_EVIDENCE until retrieval exists | |
| Automation control plane | missing | UNIMPLEMENTED → policy engine added; mutations prohibited | |
| SSE / websocket corporate feed | missing | UNIMPLEMENTED | |
| Distributed rate limit / mTLS | missing | UNIMPLEMENTED | In-process rate limit on login only. |

## Source of truth (non-negotiable)

Wongwai must not copy tenant databases.

- Workqora remains source of truth for workforce/operations entities listed in the program brief.
- MarketMind remains source of truth for market data, paper portfolio, and market AI.
- Wongwai owns corporate registry, health snapshots, corporate events, alerts, incidents, spider web, research, KPI snapshots, automation control state, audit.

## Corporate OS added in this slice (code complete, not production-certified)

| Capability | Classification after this slice |
|---|---|
| `GET /api/corporate/products` | LIVE in-process (auth required) |
| `GET /api/corporate/health` | PARTIAL — polls configured URLs; never maps unknown → GREEN |
| Corporate event envelope + DLQ + idempotency | PARTIAL — in-memory, process lifetime |
| Workqora HMAC ingest allowlist | PARTIAL — requires `WORKQORA_OPS_SECRET`; no hardcoded fallback |
| MarketMind HMAC ingest | UNIMPLEMENTED until `MARKETMIND_HEALTH_URL` / secret / live engine URL are proven |
| Spider Web query APIs | PARTIAL — seeded corporate graph |
| KPI engine | PARTIAL — business metrics UNAVAILABLE without connectors |
| AI committee | PARTIAL — evidence-only; no Gemini required |
| Executive UI `/executive` tab | PARTIAL — honest empty/unavailable states |
| Durable Postgres corporate tables | UNIMPLEMENTED in runtime; SQL migration file exists |
| Production TLS for wongwaigroupinc.com | BROKEN (external) |
| Load test, backup restore, live e2e certification | UNIMPLEMENTED |

## HMAC documentation mismatch (pre-existing)

`PRODUCT_INTEGRATION_GUIDE.md` signs the raw JSON body and uses Unix seconds. `server/events.ts` signs `` `${timestamp}.${payload}` `` and treats timestamp as milliseconds. Treat legacy `/api/events` as PARTIAL. New corporate ingest uses timestamp seconds or ms, window 5 minutes, `` `${timestamp}.${rawBody}` ``.

## Do not rebuild

Keep owner login, tax engines, reconciliation views, existing HMAC playground, and product add flow. New work is additive under `server/corporate/` and the Executive OS view.
