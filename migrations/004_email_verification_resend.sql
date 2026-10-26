-- DAOCOIN Migration 004
-- Email verification resend rate limiting

CREATE TABLE IF NOT EXISTS email_verification_resend_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS
    idx_email_verification_resend_user_time
ON email_verification_resend_requests (
    user_id,
    requested_at DESC
);