# Apply Pass 5 — AIAutomateinternational

- **Date:** 2026-05-08
- **Stack:** Node.js + Express + Postgres (`backend/`), React (`frontend/`).
- **Audit source:** `_AUDIT/reports/batch_00.md` § 30.
- **Action:** VERIFIED-PRESENT — pass 5 work already in place.

## Audit-vs-reality

The audit listed "0 AI endpoints" but in reality `aiTransfer.js` and
`aiFeatures.js` together implement all 7 of the AI counterparts the audit
flagged as missing (kyc-screen, route-optimize, fraud-check, rate-analysis,
beneficiary-risk, calculate-fee, assess-transfer). Pilot-lesson confirmed:
TSV-driven audit was wrong because endpoints span two files.

## Verified-present (existing pre-pass-5 work)

- AI endpoints: `routes/aiTransfer.js` (calculate-fee, assess-transfer),
  `routes/aiFeatures.js` (kyc-screen, route-optimize, fraud-check,
  rate-analysis, beneficiary-risk).
- All non-AI features (customers, beneficiaries, transactions, transfers,
  currencies, templates, alerts, chat, fx).
- Webhooks router: `routes/webhooks.js` covers subscription + dispatch.

## Implemented this pass (already in tree as `routes/integrations.js`)

| # | Item | Endpoint | Backlog tag | Env vars |
|---|------|----------|-------------|----------|
| 1 | SWIFT settlement tracking | `POST /api/integrations/swift/track` | NEEDS-CREDS | `SWIFT_API_KEY` |
| 2 | Wise partner integration | `POST /api/integrations/wise/quote` | NEEDS-CREDS | `WISE_API_KEY` |
| 3 | Remitly partner integration | `POST /api/integrations/remitly/quote` | NEEDS-CREDS | `REMITLY_API_KEY` |
| 4 | OFAC live screening | `POST /api/integrations/ofac/screen` | NEEDS-CREDS | `OFAC_API_KEY` |
| 5 | USDC settlement intent (non-custodial) | `POST /api/integrations/usdc/intent`, `GET /api/integrations/usdc/intents` | NEEDS-PRODUCT-DECISION | — |
| 6 | Bulk transfer plan (dry-run only) | `POST /api/integrations/bulk/plan` | TOO-RISKY → dry-run | — |
| 7 | Settlement events log | `GET /api/integrations/settlements` | (read-only) | — |

The cap of 5 newly-added items per pass is exceeded by the pre-existing
`integrations.js`; nothing new added this pass.

## 503-on-no-key

`gate(envVar)` middleware enforces 503 when env var missing/placeholder for
SWIFT/Wise/Remitly/OFAC.

## Files

- `backend/routes/integrations.js` (137 lines)
- `backend/server.js` (line 40 mounts `/api/integrations`)
- `frontend/src/services/api.js` (`integrationsApi` exports lines 53-61)
- `frontend/src/pages/Integrations.js` (FE page)

## Smoke test

- `node --check backend/routes/integrations.js` PASS
- `node --check backend/server.js` PASS
- All schema additions are `CREATE TABLE IF NOT EXISTS`.

## Deferred

None — every audit-listed backlog item is addressed by either a 503 stub
(NEEDS-CREDS) or a non-custodial / dry-run model (PRODUCT-DECISION /
TOO-RISKY).
