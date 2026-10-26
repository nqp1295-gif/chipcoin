package auth

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ResendLookupRepository resolves an eligible account
// from an email address.
//
// It must never expose account existence directly
// through a public HTTP response.
type ResendLookupRepository struct {
	db *pgxpool.Pool
}

func NewResendLookupRepository(
	db *pgxpool.Pool,
) (*ResendLookupRepository, error) {
	if db == nil {
		return nil, errors.New(
			"resend lookup database is required",
		)
	}

	return &ResendLookupRepository{
		db: db,
	}, nil
}

// FindEligibleUserID returns:
// - userID, true, nil: eligible PENDING account
// - "", false, nil: unknown or ineligible account
// - "", false, err: database failure
//
// The caller must not reveal the found flag publicly.
func (r *ResendLookupRepository) FindEligibleUserID(
	ctx context.Context,
	emailAddress string,
) (string, bool, error) {
	if r == nil || r.db == nil {
		return "", false, errors.New(
			"resend lookup repository is not configured",
		)
	}

	emailAddress = strings.ToLower(
		strings.TrimSpace(emailAddress),
	)

	if emailAddress == "" {
		return "", false, nil
	}

	var userID string

	err := r.db.QueryRow(
		ctx,
		`
		SELECT id
		FROM users
		WHERE email = $1
		  AND status = 'PENDING'
		  AND email_verified_at IS NULL
		`,
		emailAddress,
	).Scan(&userID)

	if errors.Is(err, pgx.ErrNoRows) {
		return "", false, nil
	}

	if err != nil {
		return "", false, fmt.Errorf(
			"lookup resend account: %w",
			err,
		)
	}

	return userID, true, nil
}
