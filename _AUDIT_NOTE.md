# Audit Apply Note — AIAutomateinternational

Source: `_AUDIT/reports/batch_00.md` § 30.

## Audit findings vs. reality
The audit listed "0 AI endpoints" and called the project a template-clone. In fact the codebase already implements the AI features the audit recommends:
- `/kyc-screen` (aiFeatures.js)
- `/route-optimize`
- `/fraud-check`
- `/rate-analysis` (FX optimization)
- `/beneficiary-risk`
- `/calculate-fee`, `/assess-transfer` (aiTransfer.js)

Audit appears to have miscounted because endpoints are split between `aiFeatures.js` and `aiTransfer.js`.

## Original audit recommendations (non-AI gaps)
- No real-time settlement tracking
- No webhook notifications
- No bulk transfer operations
- Missing integrations: SWIFT, Wise, Remitly, regulatory data feeds

## Implemented in this pass (MECHANICAL)

| # | Item | File | Endpoints |
|---|------|------|-----------|
| 1 | Webhook subscription stub | `backend/routes/webhooks.js` (new) + `server.js` | `GET/POST/DELETE /api/webhooks`, `POST /api/webhooks/:id/test` |

Webhook table is created lazily; allowed events: `transfer.created`, `transfer.completed`, `transfer.failed`, `beneficiary.created`, `fraud.alert`, `fx.rate.changed`. The `:id/test` endpoint constructs a payload but doesn't perform outgoing HTTP (no new deps). `node --check` passes.

## Backlog (not implemented)

| Item | Tag | Why deferred |
|------|-----|---------------|
| Real outbound webhook delivery (HMAC signing, retry queue) | TOO-RISKY | Background job infra needed |
| Bulk transfer operations | TOO-RISKY | Schema additions + consistent transaction handling |
| Real-time settlement tracking | NEEDS-CREDS | Requires SWIFT / Wise / Remitly partner APIs |
| SWIFT / Wise / Remitly integration | NEEDS-CREDS | Vendor partnerships |
| Blockchain (USDC) settlement | NEEDS-PRODUCT-DECISION | Wallet custody model |
| OFAC live screening | NEEDS-CREDS | Treasury OFAC SDN feed access |

## Apply pass 3 (frontend)

**Action:** LEFT-AS-IS — FE already wired.

Inspection found that `frontend/src/services/api.js` already exposes wrappers for every backend AI endpoint (`aiTransferApi`, `aiFeaturesApi`, `webhooksApi`), and that `frontend/src/pages/` has dedicated pages for each: `AIKycScreen`, `AIRateAnalyzer`, `AIBeneficiaryRisk`, `AIRouteOptimizer`, `AISplitPlanner`, `AIFraudCheck`, `AIFeeCalculator`, `AIRiskAssessment`, `AIReceipts`, plus a complete `Webhooks` page (list/create/delete/test) for the apply-pass-2 webhook router. No new FE files written.

## Apply pass 4 (mechanical backlog)

**Action:** LEFT-AS-IS — no remaining MECHANICAL items.

Reviewed `Backlog (not implemented)`. Every entry is tagged TOO-RISKY (real outbound webhook delivery, bulk transfer ops), NEEDS-CREDS (real-time settlement, SWIFT/Wise/Remitly, OFAC), or NEEDS-PRODUCT-DECISION (USDC settlement custody). All AI counterparts called out by the audit (`/kyc-screen`, `/route-optimize`, `/fraud-check`, `/rate-analysis`, `/beneficiary-risk`, `/calculate-fee`, `/assess-transfer`) plus the apply-pass-2 webhook router are already shipped and wired in the FE. No new code written.
