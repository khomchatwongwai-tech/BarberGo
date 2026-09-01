# Wongwai Group Inc — Corporate OS operator kit

This Cloud Agent runs on **BarberGo**. `cursor[bot]` cannot push `khomchatwongwai-tech/wongwaiGroupInc` (403). The implementation lives in `overlay/` as a full-tree apply onto that repository.

Do **not** merge this overlay into BarberGo production behavior. BarberGo remains a marketplace. This kit only ships the parent command-center repository.

## What landed (PR 1 — foundation)

- `CURRENT_ARCHITECTURE.md` — audit classifications (LIVE / PARTIAL / SIMULATED / …)
- `CERTIFICATION.md` — honest **RED / 18/100** (apex TLS broken; MarketMind public host is not the trading API)
- Canonical registry: `WORKQORA`, `MARKETMIND_AI`, `WONGWAI_GROUP`
- `GET /api/corporate/products`, `GET /api/corporate/products/:id`, `GET /api/corporate/health`
- Event bus, Workqora/MarketMind HMAC ingest, Spider Web, KPIs (`null` + `UNAVAILABLE`), policy engine
- Safety: `WORKQORA_AUTONOMOUS_MUTATION=false`, `MARKETMIND_LIVE_TRADING_ENABLED=false`

## Unblock push (then start a new agent on Wongwai)

1. Install Cursor GitHub App on **wongwaiGroupInc** (or All repositories): https://github.com/apps/cursor/installations/new
2. Or add BarberGo Actions secret `WONGWAI_GITHUB_TOKEN` (Contents + PRs write on `khomchatwongwai-tech/wongwaiGroupInc`), then **Actions → Ship Wongwai Corporate OS PR**

## Manual apply

```bash
git clone https://github.com/khomchatwongwai-tech/wongwaiGroupInc.git
cd wongwaiGroupInc
git checkout -b cursor/corporate-os-foundation-138b
cp -a /path/to/BarberGo/operator/wongwaiGroupInc/overlay/. .
git add -A
git commit -m "feat(corporate-os): product registry, honest health, event bus foundation"
```
