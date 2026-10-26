package auth

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
)

var ErrUserNotFound = errors.New("user not found")

type LoginUser struct {
	ID              string
	Username        string
	Email           string
	PasswordHash    string
	Status          string
	EmailVerifiedAt *time.Time
}

func (r *Repository) FindUserByEmail(
	ctx context.Context,
	email string,
) (LoginUser, error) {

	var user LoginUser

	err := r.db.QueryRow(
		ctx,
		`
		SELECT
			id,
			username,
			email,
			password_hash,
			status,
			email_verified_at
		FROM users
		WHERE email = $1
		LIMIT 1
		`,
		email,
	).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.PasswordHash,
		&user.Status,
		&user.EmailVerifiedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return LoginUser{}, ErrUserNotFound
		}

		return LoginUser{}, fmt.Errorf(
			"find user by email: %w",
			err,
		)
	}

	return user, nil
}

// CreateSession lưu hash của session token.
// Không lưu token gốc vào PostgreSQL.
func (r *Repository) CreateSession(
	ctx context.Context,
	userID string,
	tokenHash string,
	expiresAt time.Time,
) (string, error) {

	var sessionID string

	err := r.db.QueryRow(
		ctx,
		`
		INSERT INTO user_sessions (
			user_id,
			refresh_token_hash,
			expires_at
		)
		VALUES ($1, $2, $3)
		RETURNING id
		`,
		userID,
		tokenHash,
		expiresAt,
	).Scan(&sessionID)

	if err != nil {
		return "", fmt.Errorf(
			"create session: %w",
			err,
		)
	}

	return sessionID, nil
}
