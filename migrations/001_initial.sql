-- Bootstrap-only schema; reward ledger tables are intentionally deferred to Step 3.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE TABLE IF NOT EXISTS users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 email citext NOT NULL UNIQUE,
 username citext NOT NULL UNIQUE,
 password_hash text NOT NULL,
 status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','ACTIVE','SUSPENDED')),
 email_verified_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS user_roles (
 user_id uuid NOT NULL REFERENCES users(id),
 role text NOT NULL CHECK(role IN ('USER','ADMIN','OWNER')),
 granted_by uuid REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,role)
);
CREATE TABLE IF NOT EXISTS mining_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES users(id),
 starts_at timestamptz NOT NULL,
 ends_at timestamptz NOT NULL,
 status text NOT NULL CHECK(status IN ('ACTIVE','EXPIRED','CANCELLED')),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(ends_at > starts_at)
);
CREATE UNIQUE INDEX IF NOT EXISTS one_active_mining_session_per_user
 ON mining_sessions(user_id) WHERE status='ACTIVE';
