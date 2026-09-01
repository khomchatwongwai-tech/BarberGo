# Product Integration Guide (HMAC SHA-256 Webhook Spec)

This guide specifies how connected products (MarketMind AI, ShiftForce, BarberGo, and future applications) securely dispatch events to the Owner Command Center.

---

## 1. Normalized Event Schema (`ops_events`)

All events dispatched to `POST /api/events` must conform to the following JSON structure:

```json
{
  "eventId": "evt_1723847291024",
  "productSlug": "marketmind",
  "eventType": "subscription_created",
  "amountUsd": 49.00,
  "userId": "usr_998124",
  "timestamp": "2026-08-16T14:30:00Z",
  "metadata": {
    "planTier": "pro",
    "billingInterval": "monthly",
    "customerCity": "Austin"
  }
}
```

### Supported Event Types
- `subscription_created` — New paying subscription (updates MRR and paying accounts).
- `subscription_canceled` — Churn event (updates churn calculations).
- `payment_succeeded` — Transaction or invoice settlement.
- `payment_failed` — Triggers high-priority dunning alert in Alert Center.
- `booking_completed` — Marketplace booking completed (updates GMV and take rate).
- `user_registered` — Growth tracking.
- `system_alert` — Pushes instant alert (red/orange/blue) to Alert Center.

---

## 2. HMAC SHA-256 Signature Verification

To prevent spoofing and replay attacks, every request to `POST /api/events` must include the following headers:

| Header | Description |
|---|---|
| `Content-Type` | `application/json` |
| `x-product-slug` | Product identifier (e.g. `marketmind`, `shiftforce`, `barbergo`) |
| `x-signature` | Hex-encoded HMAC SHA-256 signature of the raw JSON body using the product secret |
| `x-timestamp` | Unix epoch timestamp in seconds (must be within ±300s of server clock) |

### Sample Dispatch Implementation (TypeScript / Node.js)

```typescript
import crypto from 'crypto';

export async function sendCommandCenterEvent(eventType: string, amountUsd: number, metadata = {}) {
  const COMMAND_CENTER_URL = process.env.COMMAND_CENTER_URL || 'https://command-center.internal/api/events';
  const PRODUCT_SLUG = 'shiftforce';
  const WEBHOOK_SECRET = process.env.COMMAND_CENTER_WEBHOOK_SECRET!;

  const timestamp = Math.floor(Date.now() / 1000).toString();
  
  const payload = {
    eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    productSlug: PRODUCT_SLUG,
    eventType,
    amountUsd,
    timestamp: new Date().toISOString(),
    metadata,
  };

  const payloadString = JSON.stringify(payload);

  const signature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payloadString)
    .digest('hex');

  const res = await fetch(COMMAND_CENTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-product-slug': PRODUCT_SLUG,
      'x-signature': signature,
      'x-timestamp': timestamp,
    },
    body: payloadString,
  });

  return res.json();
}
```

---

## 3. Privacy & Prohibited Data Rules

Products must **NEVER** transmit:
- Passwords or raw password hashes
- Credit card numbers, CVVs, or bank routing numbers
- Firebase Admin SDK private credentials or database service-role keys
- Personal employee medical or internal disciplinary records
- Sensitive safety narratives (send only sanitized incident categories and IDs)

---

## 4. Corporate OS ingest (additive)

Canonical envelope fields: `eventId`, `eventType`, `productId`, `sourceSystem`, `sourceEntityType`, `sourceEntityId`, `organizationId`, `locationId`, `correlationId`, `traceId`, `occurredAt`, `severity`, `quality`, `payload`, `schemaVersion`, `idempotencyKey`.

| Endpoint | Auth |
|---|---|
| `POST /api/corporate/events/workqora` | HMAC `WORKQORA_OPS_SECRET` |
| `POST /api/corporate/events/marketmind` | HMAC `MARKETMIND_OPS_SECRET` |

Headers: `x-timestamp` (unix seconds or ms), `x-signature` hex HMAC-SHA256 of `` `${timestamp}.${rawJsonBody}` ``. Replay window: 5 minutes. No hardcoded secret fallback.

Workqora allowlist: `schedule.published`, `attendance.late`, `attendance.no_show`, `employee.call_out`, `timeoff.requested`, `timeoff.approved`, `shift_swap.requested`, `shift_swap.approved`, `certification.expiring`, `inventory.low`, `inventory.stockout`, `waste.threshold_exceeded`, `equipment.failure`, `equipment.maintenance_due`, `crm.followup_due`, `crm.risk_detected`, `workflow.failed`, `automation.failed`, `scanner.failed`, `system.degraded`.

Default payload: aggregates, scores, authorized IDs. Do not send PIN, SSN, wages, private contact, or HR notes.

MarketMind quality must be the provider quality (`LIVE` / `DELAYED` / `CACHED` / `FALLBACK` / `STALE` / `PARTIAL` / `UNAVAILABLE`). Do not mint a new quote because a second elapsed.

Owner APIs (session required): `GET /api/corporate/products`, `GET /api/corporate/products/:id`, `GET /api/corporate/health`.
