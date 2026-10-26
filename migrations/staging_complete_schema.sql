-- ====================================================================
-- CHIPCOIN / DAOCOIN Complete Staging & Production Schema
-- Migrations 001 to 005 for PostgreSQL (Supabase / Neon / Render)
-- ====================================================================

-- 0. Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- Schema migrations tracker
CREATE TABLE IF NOT EXISTS schema_migrations (
    version text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
);

-- ====================================================================
-- 1. Migration 001: Initial Users, Roles & Mining Sessions
-- ====================================================================

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
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role text NOT NULL CHECK(role IN ('USER','ADMIN','OWNER')),
    granted_by uuid REFERENCES users(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY(user_id, role)
);

CREATE TABLE IF NOT EXISTS mining_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    starts_at timestamptz NOT NULL,
    ends_at timestamptz NOT NULL,
    status text NOT NULL CHECK(status IN ('ACTIVE','EXPIRED','CANCELLED')),
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK(ends_at > starts_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS one_active_mining_session_per_user
    ON mining_sessions(user_id) WHERE status='ACTIVE';

INSERT INTO schema_migrations (version) VALUES ('001_initial') ON CONFLICT (version) DO NOTHING;

-- ====================================================================
-- 2. Migration 002: Core Ledger, Budgets & Double-Entry Accounting
-- ====================================================================

CREATE TABLE IF NOT EXISTS user_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash text NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz,
    last_used_at timestamptz,
    CHECK(expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS user_sessions_user_idx ON user_sessions(user_id, expires_at DESC);

CREATE TABLE IF NOT EXISTS mining_daily_weights (
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reward_date date NOT NULL,
    valid_seconds integer NOT NULL DEFAULT 0 CHECK(valid_seconds BETWEEN 0 AND 86400),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY(user_id, reward_date)
);

CREATE TABLE IF NOT EXISTS reward_budgets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reward_date date NOT NULL,
    category text NOT NULL CHECK(category IN ('MINING','TASK')),
    allocated_units bigint NOT NULL CHECK(allocated_units >= 0),
    spent_units bigint NOT NULL DEFAULT 0 CHECK(spent_units >= 0),
    status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','APPROVED','CLOSED')),
    approved_by uuid REFERENCES users(id),
    approved_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(reward_date, category),
    CHECK(spent_units <= allocated_units),
    CHECK(status <> 'APPROVED' OR (approved_by IS NOT NULL AND approved_at IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS reward_settlements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reward_date date NOT NULL,
    category text NOT NULL CHECK(category IN ('MINING','TASK')),
    budget_id uuid NOT NULL REFERENCES reward_budgets(id),
    status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','PROCESSING','COMPLETED','FAILED')),
    distributed_units bigint NOT NULL DEFAULT 0 CHECK(distributed_units >= 0),
    started_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(reward_date, category),
    UNIQUE(budget_id)
);

CREATE TABLE IF NOT EXISTS tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL UNIQUE,
    title text NOT NULL,
    kind text NOT NULL CHECK(kind IN ('DAILY_CHECKIN','VERIFY_EMAIL','PROFILE_COMPLETE','DAILY_ACTIVITY')),
    reward_units bigint NOT NULL CHECK(reward_units >= 0),
    repeat_policy text NOT NULL CHECK(repeat_policy IN ('ONCE','DAILY')),
    active boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS task_completions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id uuid NOT NULL REFERENCES tasks(id),
    period_key text NOT NULL,
    status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','VERIFIED','REJECTED','REWARDED')),
    verified_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(user_id, task_id, period_key)
);

CREATE TABLE IF NOT EXISTS wallets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ledger_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id uuid REFERENCES wallets(id) ON DELETE CASCADE,
    code text UNIQUE,
    kind text NOT NULL CHECK(kind IN ('USER','REWARD_POOL','RESERVE')),
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK((kind='USER' AND wallet_id IS NOT NULL AND code IS NULL) OR
          (kind<>'USER' AND wallet_id IS NULL AND code IS NOT NULL)),
    UNIQUE(wallet_id)
);

CREATE TABLE IF NOT EXISTS ledger_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key text NOT NULL UNIQUE,
    kind text NOT NULL CHECK(kind IN ('MINING_REWARD','TASK_REWARD','REVERSAL','FUNDING')),
    reference_id uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    description text
);

CREATE TABLE IF NOT EXISTS ledger_entries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id uuid NOT NULL REFERENCES ledger_transactions(id),
    account_id uuid NOT NULL REFERENCES ledger_accounts(id),
    side text NOT NULL CHECK(side IN ('DEBIT','CREDIT')),
    amount_units bigint NOT NULL CHECK(amount_units > 0),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ledger_entries_account_idx ON ledger_entries(account_id, created_at);
CREATE INDEX IF NOT EXISTS ledger_entries_tx_idx ON ledger_entries(transaction_id);

CREATE TABLE IF NOT EXISTS audit_logs (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actor_id uuid REFERENCES users(id),
    action text NOT NULL,
    resource_type text NOT NULL,
    resource_id text,
    before_data jsonb,
    after_data jsonb,
    reason text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON audit_logs(created_at DESC);

-- Trigger: enforce balanced ledger
CREATE OR REPLACE FUNCTION enforce_ledger_balanced() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE tx_id uuid; debit_sum numeric; credit_sum numeric;
BEGIN
    tx_id := CASE WHEN TG_OP='DELETE' THEN OLD.transaction_id ELSE NEW.transaction_id END;
    SELECT COALESCE(sum(amount_units) FILTER (WHERE side='DEBIT'), 0),
           COALESCE(sum(amount_units) FILTER (WHERE side='CREDIT'), 0)
    INTO debit_sum, credit_sum FROM ledger_entries WHERE transaction_id=tx_id;
    IF debit_sum=0 OR debit_sum<>credit_sum THEN
        RAISE EXCEPTION 'Unbalanced ledger transaction %: debit %, credit %', tx_id, debit_sum, credit_sum;
    END IF;
    RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS ledger_entries_balanced ON ledger_entries;
CREATE CONSTRAINT TRIGGER ledger_entries_balanced
AFTER INSERT OR UPDATE OR DELETE ON ledger_entries
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION enforce_ledger_balanced();

-- Trigger: immutable ledger entries
CREATE OR REPLACE FUNCTION reject_ledger_entry_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Ledger entries are immutable; use reversal'; END $$;

DROP TRIGGER IF EXISTS ledger_entries_immutable ON ledger_entries;
CREATE TRIGGER ledger_entries_immutable BEFORE UPDATE OR DELETE ON ledger_entries
FOR EACH ROW EXECUTE FUNCTION reject_ledger_entry_mutation();

INSERT INTO schema_migrations (version) VALUES ('002_daocoin_core') ON CONFLICT (version) DO NOTHING;

-- ====================================================================
-- 3. Migration 003: Email Verification Tokens
-- ====================================================================

CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT email_verification_expiry_check CHECK (expires_at > created_at),
    CONSTRAINT email_verification_used_check CHECK (used_at IS NULL OR used_at >= created_at)
);

CREATE INDEX IF NOT EXISTS email_verification_tokens_user_idx
    ON email_verification_tokens(user_id);

CREATE INDEX IF NOT EXISTS email_verification_tokens_expires_idx
    ON email_verification_tokens(expires_at)
    WHERE used_at IS NULL;

INSERT INTO schema_migrations (version) VALUES ('003_email_verification') ON CONFLICT (version) DO NOTHING;

-- ====================================================================
-- 4. Migration 004: Email Resend Rate Limiting Requests
-- ====================================================================

CREATE TABLE IF NOT EXISTS email_verification_resend_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_verification_resend_user_time
    ON email_verification_resend_requests (user_id, requested_at DESC);

INSERT INTO schema_migrations (version) VALUES ('004_email_verification_resend') ON CONFLICT (version) DO NOTHING;

-- ====================================================================
-- 5. Migration 005: Transactional Email Outbox
-- ====================================================================

CREATE TABLE IF NOT EXISTS email_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    verification_token_id UUID NOT NULL REFERENCES email_verification_tokens(id) ON DELETE CASCADE,
    recipient_email TEXT NOT NULL,
    email_type TEXT NOT NULL DEFAULT 'EMAIL_VERIFICATION',
    encrypted_token BYTEA,
    status TEXT NOT NULL DEFAULT 'PENDING',
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 5,
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    locked_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT email_outbox_status_check CHECK (status IN ('PENDING', 'PROCESSING', 'SENT', 'FAILED')),
    CONSTRAINT email_outbox_attempts_check CHECK (attempts >= 0 AND max_attempts > 0 AND attempts <= max_attempts),
    CONSTRAINT email_outbox_type_check CHECK (email_type = 'EMAIL_VERIFICATION'),
    CONSTRAINT email_outbox_sent_check CHECK (status <> 'SENT' OR sent_at IS NOT NULL),
    CONSTRAINT email_outbox_token_check CHECK (status NOT IN ('PENDING', 'PROCESSING') OR encrypted_token IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_email_outbox_pending
    ON email_outbox (next_attempt_at, created_at)
    WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS idx_email_outbox_processing
    ON email_outbox (locked_at)
    WHERE status = 'PROCESSING';

CREATE INDEX IF NOT EXISTS idx_email_outbox_user
    ON email_outbox (user_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_outbox_token
    ON email_outbox (verification_token_id);

INSERT INTO schema_migrations (version) VALUES ('005_email_outbox') ON CONFLICT (version) DO NOTHING;
