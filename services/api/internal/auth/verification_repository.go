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
	ErrVerificationExpired         = errors.New("verification token expired")
	ErrVerificationUsed            = errors.New("verification token already used")
	ErrVerificationNotFound        = errors.New("verification token not found")
	ErrAccountNotPending           = errors.New("account is not pending")
	ErrVerificationUserNotEligible = errors.New(
		"user is not eligible for email verification",
	)
)

type VerificationRepository struct {
	db *pgxpool.Pool
}

func NewVerificationRepository(db *pgxpool.Pool) *VerificationRepository {
	return &VerificationRepository{db: db}
}

// CreateToken stores only the token hash.
func (r *VerificationRepository) CreateToken(
	ctx context.Context,
	userID string,
	tokenHash string,
	expiresAt time.Time,
) error {

	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin token transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Lock user to serialize token issuance for this account.
	var lockedUserID string

	err = tx.QueryRow(
		ctx,
		`
		SELECT id
		FROM users
		WHERE id = $1
		  AND status = 'PENDING'
		  AND email_verified_at IS NULL
		FOR UPDATE
		`,
		userID,
	).Scan(&lockedUserID)

	if errors.Is(err, pgx.ErrNoRows) {
		return ErrVerificationUserNotEligible
	}

	if err != nil {
		return fmt.Errorf("lock verification user: %w", err)
	}

	// Invalidate previous unused tokens.
	_, err = tx.Exec(
		ctx,
		`
		UPDATE email_verification_tokens
		SET used_at = NOW()
		WHERE user_id = $1
		  AND used_at IS NULL
		`,
		lockedUserID,
	)

	if err != nil {
		return fmt.Errorf("invalidate previous tokens: %w", err)
	}

	// Create new verification token.
	result, err := tx.Exec(
		ctx,
		`
		INSERT INTO email_verification_tokens (
			user_id,
			token_hash,
			expires_at
		)
		VALUES ($1, $2, $3)
		`,
		lockedUserID,
		tokenHash,
		expiresAt,
	)

	if err != nil {
		return fmt.Errorf("insert verification token: %w", err)
	}

	if result.RowsAffected() != 1 {
		return errors.New("verification token was not created")
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit token transaction: %w", err)
	}

	return nil
}

// VerifyToken activates the user atomically.
func (r *VerificationRepository) VerifyToken(
	ctx context.Context,
	tokenHash string,
) error {

	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin verification transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	var (
		tokenID   string
		userID    string
		expiresAt time.Time
		usedAt    *time.Time
	)

	err = tx.QueryRow(
		ctx,
		`
		SELECT id, user_id, expires_at, used_at
		FROM email_verification_tokens
		WHERE token_hash = $1
		FOR UPDATE
		`,
		tokenHash,
	).Scan(
		&tokenID,
		&userID,
		&expiresAt,
		&usedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return ErrVerificationNotFound
	}

	if err != nil {
		return fmt.Errorf("find verification token: %w", err)
	}

	if usedAt != nil {
		return ErrVerificationUsed
	}

	if !time.Now().UTC().Before(expiresAt) {
		return ErrVerificationExpired
	}

	result, err := tx.Exec(
		ctx,
		`
    UPDATE users
    SET
        status = 'ACTIVE',
        email_verified_at = NOW(),
        updated_at = NOW()
    WHERE id = $1
      AND status = 'PENDING'
      AND email_verified_at IS NULL
    `,
		userID,
	)

	if err != nil {
		return fmt.Errorf("activate user: %w", err)
	}

	if result.RowsAffected() != 1 {
		return ErrAccountNotPending
	}

	result, err = tx.Exec(
		ctx,
		`
		UPDATE email_verification_tokens
		SET used_at = NOW()
		WHERE id = $1
		  AND used_at IS NULL
		`,
		tokenID,
	)

	if err != nil {
		return fmt.Errorf("consume verification token: %w", err)
	}

	if result.RowsAffected() != 1 {
		return ErrVerificationUsed
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit verification: %w", err)
	}

	return nil
}
