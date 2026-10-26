BEGIN;

CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id),

    token_hash TEXT NOT NULL UNIQUE,

    expires_at TIMESTAMPTZ NOT NULL,

    used_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT email_verification_expiry_check
        CHECK (expires_at > created_at),

    CONSTRAINT email_verification_used_check
        CHECK (used_at IS NULL OR used_at >= created_at)
);

CREATE INDEX IF NOT EXISTS
    email_verification_tokens_user_idx
ON email_verification_tokens(user_id);

CREATE INDEX IF NOT EXISTS
    email_verification_tokens_expires_idx
ON email_verification_tokens(expires_at)
WHERE used_at IS NULL;

INSERT INTO schema_migrations (version)
VALUES ('003_email_verification')
ON CONFLICT (version) DO NOTHING;

COMMIT;