package auth

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrResendRateLimited = errors.New("verification resend rate limited")
	ErrResendNotEligible = errors.New("verification resend not eligible")
)

const (
	ResendCooldown  = 60 * time.Second
	ResendMaxHourly = 5
)

type ResendRepository struct {
	db *pgxpool.Pool
}

func NewResendRepository(db *pgxpool.Pool) *ResendRepository {
	return &ResendRepository{db: db}
}

// ReserveResend records an allowed resend request.
//
// The user row is locked to serialize concurrent requests
// for the same account.
//
// This method does not generate a token or send an email.
func (r *ResendRepository) ReserveResend(
	ctx context.Context,
	userID string,
) error {

	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin resend transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	var status string
	var verifiedAt *time.Time

	err = tx.QueryRow(
		ctx,
		`
		SELECT status, email_verified_at
		FROM users
		WHERE id = $1
		FOR UPDATE
		`,
		userID,
	).Scan(&status, &verifiedAt)

	if errors.Is(err, pgx.ErrNoRows) {
		return ErrResendNotEligible
	}

	if err != nil {
		return fmt.Errorf("lock resend user: %w", err)
	}

	if status != "PENDING" || verifiedAt != nil {
		return ErrResendNotEligible
	}

	// Use database time for consistent rate-limit decisions.
	var now time.Time

	if err := tx.QueryRow(
		ctx,
		`SELECT clock_timestamp()`,
	).Scan(&now); err != nil {
		return fmt.Errorf("read database time: %w", err)
	}

	var lastRequest *time.Time
	var hourlyCount int

	err = tx.QueryRow(
		ctx,
		`
		SELECT
			MAX(requested_at),
			COUNT(*) FILTER (
				WHERE requested_at > $2::timestamptz - INTERVAL '1 hour'
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
		return fmt.Errorf("record resend request: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit resend transaction: %w", err)
	}

	return nil
}
