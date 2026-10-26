# Step 2 — Architecture & acceptance

Browser -> Next.js UI -> Go REST API -> PostgreSQL.
A separate Go worker will perform UTC daily settlement in later steps.
Redis is optional, not used for ledger balances. All reward credits must be atomic, idempotent and double-entry.

## Acceptance
1. `docker compose up --build -d` starts PostgreSQL, API and web (requires image/network access).
2. `GET /healthz` returns `status: ok`.
3. `GET /api/v1/public/config` reports `mining_enabled: false`, `withdrawal_enabled: false`.
4. Website renders DAOCOIN status at localhost:3000.
5. `go test ./services/api/...` passes.
6. `users`, `user_roles`, `mining_sessions` tables exist on first DB initialization.

## Next Step 3
Design and implement ledger schema, budget controls, migrations runner, transaction integrity, role separation, and database integration tests before enabling rewards.
