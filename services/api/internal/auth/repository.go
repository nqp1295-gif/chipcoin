package auth

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrDuplicateAccount = errors.New("email or username already exists")

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

type RegisterInput struct {
	Username     string
	Email        string
	PasswordHash string
	ReferralCode string
}

type User struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
	Status   string `json:"status"`
}

func (r *Repository) Register(
	ctx context.Context,
	input RegisterInput,
) (User, error) {

	var user User
	var walletID string

	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return user, fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// 1. Create user
	err = tx.QueryRow(
		ctx,
		`
		INSERT INTO users (
			username,
			email,
			password_hash,
			status,
			referred_by_code
		)
		VALUES ($1, $2, $3, 'PENDING', NULLIF($4, ''))
		RETURNING id, username, email, status
		`,
		input.Username,
		input.Email,
		input.PasswordHash,
		input.ReferralCode,
	).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.Status,
	)

	if err != nil {
		return user, normalizeDBError(err)
	}

	// 2. Assign USER role
	_, err = tx.Exec(
		ctx,
		`
		INSERT INTO user_roles (
			user_id,
			role,
			granted_by
		)
		VALUES ($1, 'USER', NULL)
		`,
		user.ID,
	)

	if err != nil {
		return user, fmt.Errorf("assign role: %w", err)
	}

	// 3. Create wallet
	err = tx.QueryRow(
		ctx,
		`
		INSERT INTO wallets (user_id)
		VALUES ($1)
		RETURNING id
		`,
		user.ID,
	).Scan(&walletID)

	if err != nil {
		return user, fmt.Errorf("create wallet: %w", err)
	}

	// 4. Create ledger account
	_, err = tx.Exec(
		ctx,
		`
		INSERT INTO ledger_accounts (
			wallet_id,
			kind
		)
		VALUES ($1, 'USER')
		`,
		walletID,
	)

	if err != nil {
		return user, fmt.Errorf("create ledger account: %w", err)
	}

	// 5. Commit transaction
	if err := tx.Commit(ctx); err != nil {
		return user, normalizeDBError(err)
	}

	return user, nil
}

func normalizeDBError(err error) error {
	var pgErr *pgconn.PgError

	if errors.As(err, &pgErr) {
		if pgErr.Code == "23505" {
			return ErrDuplicateAccount
		}
	}

	return err
}
func (r *Repository) RegisterWithVerification(
	ctx context.Context,
	input RegisterInput,
	tokenHash string,
	expiresAt time.Time,
) (User, error) {

	var user User
	var walletID string

	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return User{}, fmt.Errorf("begin registration transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// 1. Create pending user
	err = tx.QueryRow(
		ctx,
		`
		INSERT INTO users (
			username,
			email,
			password_hash,
			status,
			referred_by_code
		)
		VALUES ($1, $2, $3, 'PENDING', NULLIF($4, ''))
		RETURNING id, username, email, status
		`,
		input.Username,
		input.Email,
		input.PasswordHash,
		input.ReferralCode,
	).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.Status,
	)

	if err != nil {
		return User{}, normalizeDBError(err)
	}

	// 2. Assign USER role
	_, err = tx.Exec(
		ctx,
		`
		INSERT INTO user_roles (
			user_id,
			role,
			granted_by
		)
		VALUES ($1, 'USER', NULL)
		`,
		user.ID,
	)

	if err != nil {
		return User{}, fmt.Errorf("assign user role: %w", err)
	}

	// 3. Create wallet
	err = tx.QueryRow(
		ctx,
		`
		INSERT INTO wallets (user_id)
		VALUES ($1)
		RETURNING id
		`,
		user.ID,
	).Scan(&walletID)

	if err != nil {
		return User{}, fmt.Errorf("create wallet: %w", err)
	}

	// 4. Create ledger account
	_, err = tx.Exec(
		ctx,
		`
		INSERT INTO ledger_accounts (
			wallet_id,
			kind
		)
		VALUES ($1, 'USER')
		`,
		walletID,
	)

	if err != nil {
		return User{}, fmt.Errorf("create ledger account: %w", err)
	}

	// 5. Store verification token hash
	_, err = tx.Exec(
		ctx,
		`
		INSERT INTO email_verification_tokens (
			user_id,
			token_hash,
			expires_at
		)
		VALUES ($1, $2, $3)
		`,
		user.ID,
		tokenHash,
		expiresAt,
	)

	if err != nil {
		return User{}, fmt.Errorf("create verification token: %w", err)
	}

	// 6. Commit all changes atomically
	if err := tx.Commit(ctx); err != nil {
		return User{}, normalizeDBError(err)
	}

	return user, nil
}
