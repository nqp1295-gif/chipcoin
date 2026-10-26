BEGIN;
SELECT pg_advisory_xact_lock(2026, 3);
CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
DO $$ BEGIN IF EXISTS (SELECT 1 FROM schema_migrations WHERE version='002_daocoin_core') THEN RAISE EXCEPTION 'Migration 002 already applied'; END IF; END $$;

CREATE TABLE user_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id),
 refresh_token_hash text NOT NULL UNIQUE, created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL, revoked_at timestamptz, last_used_at timestamptz,
 CHECK(expires_at > created_at));
CREATE INDEX user_sessions_user_idx ON user_sessions(user_id, expires_at DESC);

CREATE TABLE mining_daily_weights (
 user_id uuid NOT NULL REFERENCES users(id), reward_date date NOT NULL,
 valid_seconds integer NOT NULL DEFAULT 0 CHECK(valid_seconds BETWEEN 0 AND 86400),
 updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,reward_date));

CREATE TABLE reward_budgets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), reward_date date NOT NULL,
 category text NOT NULL CHECK(category IN ('MINING','TASK')),
 allocated_units bigint NOT NULL CHECK(allocated_units >= 0),
 spent_units bigint NOT NULL DEFAULT 0 CHECK(spent_units >= 0),
 status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','APPROVED','CLOSED')),
 approved_by uuid REFERENCES users(id), approved_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(reward_date,category), CHECK(spent_units <= allocated_units),
 CHECK(status <> 'APPROVED' OR (approved_by IS NOT NULL AND approved_at IS NOT NULL)));

CREATE TABLE reward_settlements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), reward_date date NOT NULL,
 category text NOT NULL CHECK(category IN ('MINING','TASK')),
 budget_id uuid NOT NULL REFERENCES reward_budgets(id),
 status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','PROCESSING','COMPLETED','FAILED')),
 distributed_units bigint NOT NULL DEFAULT 0 CHECK(distributed_units >= 0),
 started_at timestamptz, completed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(reward_date,category), UNIQUE(budget_id));

CREATE TABLE tasks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE,
 title text NOT NULL, kind text NOT NULL CHECK(kind IN ('DAILY_CHECKIN','VERIFY_EMAIL','PROFILE_COMPLETE','DAILY_ACTIVITY')),
 reward_units bigint NOT NULL CHECK(reward_units >= 0),
 repeat_policy text NOT NULL CHECK(repeat_policy IN ('ONCE','DAILY')),
 active boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE task_completions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id),
 task_id uuid NOT NULL REFERENCES tasks(id), period_key text NOT NULL,
 status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','VERIFIED','REJECTED','REWARDED')),
 verified_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,task_id,period_key));

CREATE TABLE wallets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL UNIQUE REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE ledger_accounts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 wallet_id uuid REFERENCES wallets(id), code text UNIQUE,
 kind text NOT NULL CHECK(kind IN ('USER','REWARD_POOL','RESERVE')),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK((kind='USER' AND wallet_id IS NOT NULL AND code IS NULL) OR
       (kind<>'USER' AND wallet_id IS NULL AND code IS NOT NULL)),
 UNIQUE(wallet_id));
CREATE TABLE ledger_transactions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), idempotency_key text NOT NULL UNIQUE,
 kind text NOT NULL CHECK(kind IN ('MINING_REWARD','TASK_REWARD','REVERSAL','FUNDING')),
 reference_id uuid, created_at timestamptz NOT NULL DEFAULT now(),
 description text);
CREATE TABLE ledger_entries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 transaction_id uuid NOT NULL REFERENCES ledger_transactions(id),
 account_id uuid NOT NULL REFERENCES ledger_accounts(id),
 side text NOT NULL CHECK(side IN ('DEBIT','CREDIT')),
 amount_units bigint NOT NULL CHECK(amount_units > 0),
 created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX ledger_entries_account_idx ON ledger_entries(account_id,created_at);
CREATE INDEX ledger_entries_tx_idx ON ledger_entries(transaction_id);

CREATE TABLE audit_logs (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, actor_id uuid REFERENCES users(id),
 action text NOT NULL, resource_type text NOT NULL, resource_id text,
 before_data jsonb, after_data jsonb, reason text,
 created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX audit_logs_created_idx ON audit_logs(created_at DESC);

-- A deferred constraint trigger checks every transaction touched by an entry at COMMIT.
-- Posting must insert both debit and credit entries in one database transaction.
CREATE FUNCTION enforce_ledger_balanced() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE tx_id uuid; debit_sum numeric; credit_sum numeric;
BEGIN
 tx_id := CASE WHEN TG_OP='DELETE' THEN OLD.transaction_id ELSE NEW.transaction_id END;
 SELECT COALESCE(sum(amount_units) FILTER (WHERE side='DEBIT'),0),
        COALESCE(sum(amount_units) FILTER (WHERE side='CREDIT'),0)
 INTO debit_sum,credit_sum FROM ledger_entries WHERE transaction_id=tx_id;
 IF debit_sum=0 OR debit_sum<>credit_sum THEN
   RAISE EXCEPTION 'Unbalanced ledger transaction %: debit %, credit %',tx_id,debit_sum,credit_sum;
 END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER ledger_entries_balanced
AFTER INSERT OR UPDATE OR DELETE ON ledger_entries
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION enforce_ledger_balanced();

-- Prevent mutation of posted ledger entries; corrections require reversal transactions.
CREATE FUNCTION reject_ledger_entry_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Ledger entries are immutable; use reversal'; END $$;
CREATE TRIGGER ledger_entries_immutable BEFORE UPDATE OR DELETE ON ledger_entries
FOR EACH ROW EXECUTE FUNCTION reject_ledger_entry_mutation();

INSERT INTO schema_migrations(version) VALUES ('002_daocoin_core');
COMMIT;
