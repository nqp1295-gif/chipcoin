-- DAOCOIN Migration 005
-- Transactional Email Outbox

CREATE TABLE email_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    verification_token_id UUID NOT NULL
        REFERENCES email_verification_tokens(id)
        ON DELETE CASCADE,

    recipient_email TEXT NOT NULL,

    email_type TEXT NOT NULL
        DEFAULT 'EMAIL_VERIFICATION',

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

    CONSTRAINT email_outbox_status_check
        CHECK (
            status IN (
                'PENDING',
                'PROCESSING',
                'SENT',
                'FAILED'
            )
        ),

    CONSTRAINT email_outbox_attempts_check
        CHECK (
            attempts >= 0
            AND max_attempts > 0
            AND attempts <= max_attempts
        ),

    CONSTRAINT email_outbox_type_check
        CHECK (
            email_type = 'EMAIL_VERIFICATION'
        ),

    CONSTRAINT email_outbox_sent_check
        CHECK (
            status <> 'SENT'
            OR sent_at IS NOT NULL
        ),

    CONSTRAINT email_outbox_token_check
        CHECK (
            status NOT IN ('PENDING', 'PROCESSING')
            OR encrypted_token IS NOT NULL
        )
);

CREATE INDEX idx_email_outbox_pending
ON email_outbox (
    next_attempt_at,
    created_at
)
WHERE status = 'PENDING';

CREATE INDEX idx_email_outbox_processing
ON email_outbox (
    locked_at
)
WHERE status = 'PROCESSING';

CREATE INDEX idx_email_outbox_user
ON email_outbox (
    user_id,
    created_at DESC
);

CREATE UNIQUE INDEX idx_email_outbox_token
ON email_outbox (
    verification_token_id
);