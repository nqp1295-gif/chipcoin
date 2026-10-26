package auth

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"daocoin/api/internal/email"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// OutboxRepository atomically creates a verification token,
// an encrypted email job, and a resend rate-limit record.
type OutboxRepository struct {
	db     *pgxpool.Pool
	cipher *email.TokenCipher
}

func NewOutboxRepository(
	db *pgxpool.Pool,
	cipher *email.TokenCipher,
) (*OutboxRepository, error) {
	if db == nil || cipher == nil {
		return nil, errors.New("outbox repository dependencies are required")
	}

	return &OutboxRepository{
		db:     db,
		cipher: cipher,
	}, nil
}

// QueueResend creates a verification email job.
//
// All database writes occur in one transaction.
// No email is sent by this method.
//
// This method intentionally does not invalidate older
// verification tokens. They remain usable until expiry,
// consumption, or account activation.
func (r *OutboxRepository) QueueResend(
	ctx context.Context,
	userID string,
) error {
	if strings.TrimSpace(userID) == "" {
		return ErrResendNotEligible
	}

	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin outbox transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	var (
		emailAddress string
		status       string
		verifiedAt   *time.Time
	)

	err = tx.QueryRow(
		ctx,
		`
		SELECT email, status, email_verified_at
		FROM users
		WHERE id = $1
		FOR UPDATE
		`,
		userID,
	).Scan(&emailAddress, &status, &verifiedAt)

	if errors.Is(err, pgx.ErrNoRows) {
		return ErrResendNotEligible
	}
	if err != nil {
		return fmt.Errorf("lock outbox user: %w", err)
	}

	if status != "PENDING" || verifiedAt != nil {
		return ErrResendNotEligible
	}

	// Use database time for rate limiting and token expiry.
	var now time.Time

	if err := tx.QueryRow(
		ctx,
		`SELECT clock_timestamp()`,
	).Scan(&now); err != nil {
		return fmt.Errorf("read database time: %w", err)
	}

	var (
		lastRequest *time.Time
		hourlyCount int
	)

	err = tx.QueryRow(
		ctx,
		`
		SELECT
			MAX(requested_at),
			COUNT(*) FILTER (
				WHERE requested_at >
					$2::timestamptz - INTERVAL '1 hour'
			)
		FROM email_verification_resend_requests
		WHERE user_id = $1
		`,
		userID,
		now,
	).Scan(&lastRequest, &hourlyCount)

	if err != nil {
		return fmt.Errorf("check resend limits: %w", err)
	}

	if lastRequest != nil &&
		now.Sub(*lastRequest) < ResendCooldown {
		return ErrResendRateLimited
	}

	if hourlyCount >= ResendMaxHourly {
		return ErrResendRateLimited
	}

	// Generate a cryptographically secure token.
	rawToken, err := GenerateVerificationToken()
	if err != nil {
		return fmt.Errorf("generate verification token: %w", err)
	}

	tokenHash, err := HashVerificationToken(rawToken)
	if err != nil {
		return fmt.Errorf("hash verification token: %w", err)
	}

	// Encrypt the token before storing it in the outbox.
	encryptedToken, err := r.cipher.Encrypt(rawToken)
	if err != nil {
		return fmt.Errorf("encrypt verification token: %w", err)
	}

	expiresAt := VerificationTokenExpiresAt(now)

	var tokenID string

	err = tx.QueryRow(
		ctx,
		`
		INSERT INTO email_verification_tokens (
			user_id,
			token_hash,
			expires_at
		)
		VALUES ($1, $2, $3)
		RETURNING id
		`,
		userID,
		tokenHash,
		expiresAt,
	).Scan(&tokenID)

	if err != nil {
		return fmt.Errorf("insert verification token: %w", err)
	}

	_, err = tx.Exec(
		ctx,
		`
		INSERT INTO email_outbox (
			user_id,
			verification_token_id,
			recipient_email,
			email_type,
			encrypted_token,
			status,
			next_attempt_at
		)
		VALUES (
			$1, $2, $3,
			'EMAIL_VERIFICATION',
			$4, 'PENDING', $5
		)
		`,
		userID,
		tokenID,
		emailAddress,
		encryptedToken,
		now,
	)

	if err != nil {
		return fmt.Errorf("insert email outbox job: %w", err)
	}

	_, err = tx.Exec(
		ctx,
		`
		INSERT INTO email_verification_resend_requests (
			user_id,
			requested_at
		)
		VALUES ($1, $2)
		`,
		userID,
		now,
	)

	if err != nil {
		return fmt.Errorf("insert resend history: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit outbox transaction: %w", err)
	}

	return nil
}
