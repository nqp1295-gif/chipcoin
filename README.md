# DAOCOIN — Step 2: Runnable scaffold

## Prerequisites
- Windows + VSCode, Docker Desktop with Compose (or Docker Engine + Compose).
- Optional: Go 1.23+ for local tests, Node 22+ for frontend development.

## Run on Windows PowerShell
```powershell
Copy-Item .env.example .env
# Edit .env and set a unique POSTGRES_PASSWORD before running
# docker compose up --build
docker compose up --build -d
docker compose ps
Invoke-RestMethod http://localhost:8080/healthz
Invoke-RestMethod http://localhost:8080/api/v1/public/config
Start-Process http://localhost:3000
```

## Run Go tests
```powershell
go test ./services/api/...
```

## Stop
```powershell
docker compose down
```
**Never run `docker compose down -v` unless you intentionally want to delete the database volume.**

## Current limitations
- No authentication, mining rewards, wallet or withdrawal endpoints yet.
- Database schema is initial only; full ledger and settlement schema belong to Step 3.
- Initial SQL scripts in `docker-entrypoint-initdb.d` execute only on a fresh PostgreSQL data volume. Subsequent migrations require a migration runner.
- Postgres port and web/API are bound to localhost for development. Do not expose this scaffold publicly.
- Budget split 10/20/70 and 24-hour sessions are **draft assumptions**, not approved economics.
