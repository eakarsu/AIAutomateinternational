# Operations

Copy `.env.example` to `.env`, replace secrets, and explicitly run `scripts/bootstrap.sh` and `scripts/migrate.sh`. `start.sh` is non-destructive. The legacy synthetic seed drops local tables and therefore requires `CONFIRM_DEMO_SEED=yes scripts/seed-demo.sh`.

`/api/trade-cases` implements goods/party classification, versioned tariff evidence, sanctions screening, document controls, independent approval, filing receipts, idempotency, optimistic concurrency, tenant isolation, and append-only decisions. Generated `gap-*` routes are quarantined. ERP, tariff, sanctions, broker, and customs filing connections remain unavailable until real credentials, licensed data, and certification are supplied.

