# Workqora Universal File Intelligence — Inventory & Architecture

> Repository‑discovery report and the architecture introduced by the first
> increment of the Universal File Intelligence + Spider‑Web backbone.

## 0. Honest baseline: what this repository actually is

This repo is **BarberPilot** — an on‑demand **mobile barber marketplace** demo
(Vite + React front end, an Express `server.ts` back end run via `tsx`, an
**in‑memory** data store, a Gemini AI gateway, and Stripe helpers). It is **not**
a pre‑existing multi‑module operations platform. Most subsystems the mission
assumes already exist (OCR, schedule scanner, automation engine, analytics
registry, event bus, Supabase, tenant model, autonomy levels, Docling worker)
**do not exist here**. The plan therefore *creates* the shared backbone rather
than refactoring duplicates — but it is built so existing/real subsystems can be
swapped in behind the same contracts.

## 1. Inventory of reusable components

| Concern | Status | Location / notes |
| --- | --- | --- |
| AI provider gateway | ✅ Exists | `server/gemini.ts` (`@google/genai`, model `gemini-3.7-flash`, graceful fallback when `GEMINI_API_KEY` unset). Reused as the classifier/entity AI‑escalation seam. |
| Audit log | ✅ Exists (in‑memory) | `db.auditLogs` in `server/store.ts`; `AuditLog` type; `GET /api/admin/audit-logs`. Ingest + review now write here. |
| Admin analytics | ⚠️ Ad‑hoc | `GET /api/admin/metrics` computes marketplace KPIs. No metric **registry**. |
| Auth | ⚠️ Demo | `x-user-id` header / `currentUserId`; `server/auth.ts` (PBKDF2 sessions) exists but is not wired. Firebase Google sign‑in on the client. |
| Data store | ⚠️ In‑memory only | `server/store.ts` (`Map`/arrays, seeded, lost on restart). No SQL, no migrations. |
| Stripe | ⚠️ Partial | `server/stripe.ts` real logic; `server.ts` uses simplified mock routes. |
| CSV export | ⚠️ Export only | `GET /api/admin/export-csv` (string concat). No import/parse. |
| Schedule feature | ⚠️ Manual only | `BarberScheduleView` / `BarberAvailabilityCalendar` (weekly hours UI). **No** file/photo schedule scanner. |
| OCR | ❌ Missing | none. |
| PDF / XLSX / DOCX parsing | ❌ Missing | none (added: native PDF text extraction). |
| Binary file upload | ❌ Missing | `POST /api/barbers/:id/upload-document` stored only a JSON `fileUrl`. |
| Supabase | ❌ Missing | referenced only in a comment. |
| Operational event bus | ❌ Missing | closest was `billingEvents[]`. |
| Automation / rules engine | ❌ Missing | UI label only. |
| Metric registry | ❌ Missing | — |
| Autonomy levels / policy | ❌ Missing | — |
| Tenant model (org/location) | ❌ Missing | single global marketplace. |
| Idempotency / dedupe | ❌ Missing | — |
| Dead‑letter / retry / worker | ❌ Missing | `p-retry` only transitively. |
| Canonical `employees` table | ❌ Missing | only marketplace `User`/`BarberProfile`. Created a canonical employee entity for the HR vertical. |

## 2. Architecture introduced (this increment)

All new code lives under `server/intelligence/` behind provider‑agnostic
contracts, so a later swap to Supabase / a Docling worker / real OCR does not
touch callers.

```
FILE (drop) → INGEST (validate, sha256, idempotency, immutable evidence)
            → DETECT (extension + MIME + magic bytes)
            → ROUTE  (native‑first; OCR only when structured text is absent)
            → EXTRACT (native PDF text, CSV, text; XLSX/OCR are later PRs)
            → CLASSIFY (deterministic rules; AI escalation seam)
            → NORMALIZE (employee roster adapter)
            → RESOLVE (tenant‑scoped employee resolution by id/email/phone/name)
            → EVENTS (canonical operational event bus)
            → HUMAN REVIEW GATE (nothing mutated until approved)
            → PERSIST canonical employees → emit employee.imported/updated
                 ↘ ANALYTICS / AUTOMATION subscribers (via the one event bus)
```

Key modules: `ingestion/` (contracts, detector, router, idempotency, security,
telemetry), `extraction/`, `parsers/` (pdf, csv), `classification/`,
`normalization/`, `resolution/`, `entities/`, `events/` (contract + in‑memory
bus), `ocr/` (provider interface), `storage/` (immutable local‑disk evidence,
Supabase‑shaped), `store/` (in‑memory document + canonical employee tables),
`automation/` (analytics/automation subscribers), and `fileIntakeService.ts`
(the orchestrator).

### Non‑negotiables honored
- Tenant identity is **server‑derived** (`deriveTenant` in `server.ts`); the
  browser never supplies `organization_id` / `location_id`.
- **Raw evidence is immutable** and never overwritten (`LocalDiskDocumentStorage`).
- **Idempotency** = SHA‑256 + tenant + purpose; identity ≠ processing ≠ mutation.
- **Explicit error codes** (`UNSUPPORTED_FILE`, `FILE_TOO_LARGE`, `OCR_FAILED`,
  `DUPLICATE_DOCUMENT`, `TENANT_ACCESS_DENIED`, …) — never a generic
  "AI unavailable".
- **One event contract** — analytics/automation are subscribers only.
- **Human review gate** before any canonical mutation.

## 3. HTTP surface

| Method + path | Role | Purpose |
| --- | --- | --- |
| `POST /api/intelligence/ingest` | admin/support | Drop‑to‑ingest (base64 body) |
| `GET /api/intelligence/documents` | admin/support | List tenant documents |
| `GET /api/intelligence/documents/:id` | admin/support | Full document detail |
| `POST /api/intelligence/documents/:id/review` | admin | Approve/reject → persist |
| `GET /api/intelligence/employees` | admin/support | Canonical employees |
| `GET /api/intelligence/events` | admin/support | Operational event graph |
| `GET /api/intelligence/observability` | admin/support | Telemetry snapshot |

## 4. Proposed PR sequence

1. **(this)** architecture / inventory / contracts **+ a working schedule/HR
   vertical slice** (PDF/CSV/text → classify → resolve → review → import).
2. Document tables + RLS on **Supabase** (replace in‑memory store/storage).
3. Ingestion API hardening (multipart, quotas, rate limits, malware hook).
4. Docling worker (Python) for layout/table extraction.
5. OCR abstraction + Tesseract provider.
6. Google Document AI escalation.
7. AI classifier escalation (wire `server/gemini.ts`).
8. Entity resolver expansion (locations, vendors, equipment, products).
9. Schedule‑scanner vertical (shifts) on the same pipeline.
10–13. Operational events → analytics registry → automation engine → autonomy /
    Command Center.
14. Certifications vertical. 15. Invoice/inventory vertical. 16. Universal
    certification across all formats (camera/HEIC/scanned PDF/XLSX multi‑sheet).

## 5. Collision risk with open branches

Open branches (`agent/production-foundation`, three `fix/*-i18n`,
`rebrand/barbergo-to-barberpilot`) only touch `src/components/barber/…` and i18n
files. This work adds a new `server/intelligence/` tree, new
`/api/intelligence/*` routes, one new admin view, and additive nav entries —
**no overlap** with those branches. The 8‑language i18n completeness tests are
unaffected (the new admin power‑tool view is intentionally outside the
i18n‑audited component list).

## 6. Known limitations (this increment)

- Persistence is **in‑memory** + local disk (demo). Swap points are isolated in
  `store/` and `storage/`.
- **No OCR yet**: image‑only / scanned PDFs return the explicit `OCR_FAILED`
  code by design. XLSX/DOCX native parsing returns `NOT_IMPLEMENTED` until PR 4/5.
- Name parsing on messy multi‑token names is best‑effort and surfaced via the
  human‑review gate (low‑confidence rows flagged).
- AI classifier escalation is a seam, not yet wired (deterministic rules only).
