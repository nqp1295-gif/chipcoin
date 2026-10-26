# DAOCOIN — Step 03: Core database

Extends the existing `001_initial.sql` schema **without dropping existing tables**. Tested against the Step 2 schema definitions, not against your live data.

## 0. Back up first (PowerShell in `D:\DAOCOIN`)

```powershell
New-Item -ItemType Directory -Force backups | Out-Null
# Writes backup inside the container, then copies it to Windows.
docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f /tmp/daocoin_before_002.dump'
docker compose cp postgres:/tmp/daocoin_before_002.dump ./backups/daocoin_before_002.dump
Get-Item ./backups/daocoin_before_002.dump | Select-Object Name,Length
```

Keep the backup private; it may contain account information. Do not use `docker compose down -v`.

## 1. Install and apply

Copy `migrations/002_daocoin_core.sql` into `D:\DAOCOIN\migrations\`. Note: files in `/docker-entrypoint-initdb.d` are **only automatically executed when the PostgreSQL data directory is initialized for the first time**. To migrate an existing DB, execute explicitly:

```powershell
docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U daocoin -d daocoin -f /docker-entrypoint-initdb.d/002_daocoin_core.sql
```

The migration is wrapped in a transaction. **Do not rerun** once applied; check version first:

```powershell
docker compose exec postgres psql -U daocoin -d daocoin -c "SELECT * FROM schema_migrations;"
docker compose exec postgres psql -U daocoin -d daocoin -c "\dt"
```

## 2. Architecture decisions

- All amounts use `BIGINT` smallest units, with **1 DAO = 1,000,000 units**. The scale is an application-wide constant, never a floating-point amount.
- `wallets` is an identity mapping, **not a mutable balance**. Balance is derived from ledger entries; a materialized projection can be added later with reconciliation.
- User account credits increase available DAO; reward pool debits decrease its balance. Enforce nonnegative balances, reserved budget, funding and account permissions **in the posting service transaction**, with row locks.
- `reward_budgets` and `reward_settlements` are per UTC day and category. The approved daily budget is a cap, not an obligation to spend.
- Use integer largest-remainder allocation to distribute the approved mining budget proportionally. If no eligible mining time exists, distribute zero.
- All task rewards must have verified completions and budget checks. Idempotency key must be deterministic per payout.
- User session hashes should be generated using cryptographic hashing of high-entropy refresh tokens.
- This schema intentionally does not implement blockchain withdrawals.

## 3. Important security and integrity limitations before production

1. `ledger_entries` balances are checked at commit. The posting service must create transaction and entries atomically. To prevent two workers overspending, lock budget and relevant ledger accounts in a consistent order; do not rely on the trigger for solvency.
2. Direct SQL access by application role can modify `ledger_transactions` or budgets. Use separate restricted DB roles and controlled posting functions/services before production.
3. `mining_daily_weights` must be derived from non-overlapping eligible UTC session intervals by trusted workers, never client input. The current unique ACTIVE index alone does not prevent all overlaps.
4. `task_completions.period_key` must be canonical (`once` or `YYYY-MM-DD` UTC), checked by the API. The DB only enforces uniqueness of the supplied key.
5. `reward_settlements` are designed for one finalized run per date/category; retry/recovery state transitions must be implemented by the worker.
6. `audit_logs` is not tamper-proof against database superusers. Use restricted write roles and external log shipping.
7. The migration adds tables but does not backfill accounts, approve budgets, or distribute DAO.

## 4. Rollback

Use restore into a **separate database** to verify the backup before any destructive rollback. Do not drop tables on a populated production database. A destructive down-migration is intentionally omitted to prevent accidental loss of wallet history.
