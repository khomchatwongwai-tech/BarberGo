# Private Multi-App Owner Command Center

> **ONE OWNER. ONE LOGIN. ONE DASHBOARD. ALL BUSINESSES.**  
> A private, executive-grade multi-business command center and AI CEO intelligence suite built for founders managing multiple SaaS and marketplace apps.

---

## 🚀 Connected Products

1. **MarketMind AI** — FinTech B2C SaaS for automated technical analysis, chart screening, and trading intelligence ($18,450 MRR).
2. **ShiftForce** — Workforce B2B SaaS for hourly employee scheduling, shift swapping, and payroll synchronization ($29,800 MRR).
3. **BarberGo** — 2-Sided on-demand mobile barber & chair marketplace with multi-tier subscriptions and platform take rates ($26,254 Total Monthly Revenue).
4. **Future Apps & Businesses** — Extensible architecture allowing dynamic registration of future products with auto-generated HMAC SHA-256 webhook keys.

---

## 🔒 Security Architecture

- **Private Single-Tenant Access**: Only approved identities matching the `OWNER_ALLOWED_EMAIL` allowlist or verified with `OWNER_DASHBOARD_TOKEN` can access the system.
- **No Public Registration**: Public signups, employee accounts, or registration buttons are permanently disabled.
- **HMAC SHA-256 Webhooks**: Server-to-server normalized event ingestion (`POST /api/events`) verifies HMAC signatures and enforces a 300-second replay protection window.
- **Strict Rate Limiting**: Max 5 failed login attempts per 15-minute window with complete security audit logging.
- **Server-Side AI Isolation**: All Gemini 3.7 Flash AI interactions run strictly server-side; API keys are never exposed to the client.
- **Zero Sensitive Data Ingestion**: No passwords, credit card PANs, or private PII are ingested.

---

## 🛠️ Key Capabilities & Views

- **Executive Company Overview**: Real-time multi-product KPIs (Total Revenue, MRR, ARR, Margin, Active Accounts, Churn).
- **Central Revenue & Costs Center**: Subscription vs Transaction matrix with itemized infrastructure, API, and payment costs.
- **Product-Specific Dashboards**: Deep-dive operational analytics tailored to MarketMind, ShiftForce, and BarberGo.
- **Red-First Alert Center**: Prioritized threshold monitoring (Stripe payouts, upstream API latency, KYC holds, dunning).
- **Consolidated Support Inbox**: Cross-product customer tickets with automated AI deflection status and internal notes.
- **AI CEO & Executive Analyst**: On-demand co-founder intelligence powered by Google Gemini 3.7 Flash with real-time business telemetry context.
- **System Health Matrix**: Real-time endpoint pings, 30-day uptime SLA tracking, and service latency monitoring.
- **Corporate AI Operating System** (additive): product registry, honest health aggregation, event bus, Spider Web, KPIs that stay `UNAVAILABLE` when data is missing. See `CURRENT_ARCHITECTURE.md` and `CERTIFICATION.md`.
- **Executive Reports**: Automated generation of Daily CEO Operational Digests and Weekly Executive Reviews.
- **Executive Reports**: Automated generation of Daily CEO Operational Digests and Weekly Executive Reviews.
- **Integrations & HMAC Playground**: Interactive signature generator and event dispatcher simulator.

---

## 📖 Setup & Documentation Guides

- [Owner Command Center Setup](./OWNER_COMMAND_CENTER_SETUP.md)
- [Product Integration Guide & HMAC Specs](./PRODUCT_INTEGRATION_GUIDE.md)
- [Supabase & Database Architecture](./SUPABASE_SETUP.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Security & Allowlist Governance](./SECURITY.md)

---

## 💻 Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Recharts, Lucide Icons, Motion
- **Backend**: Node.js, Express, TSX, esbuild
- **AI Engine**: Google Gen AI SDK (`@google/genai`) using `gemini-3.7-flash`
- **Security**: Node.js `crypto` (HMAC SHA-256), memory-guarded session management, audit log system
