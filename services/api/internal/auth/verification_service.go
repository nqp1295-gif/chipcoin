package auth

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"
)

var ErrVerificationTokenRequired = errors.New(
	"verification token is required",
)

type VerificationTokenRepository interface {
	CreateToken(
		ctx context.Context,
		userID string,
		tokenHash string,
		expiresAt time.Time,
	) error

	VerifyToken(
		ctx context.Context,
		tokenHash string,
	) error
}

type VerificationService struct {
	repo VerificationTokenRepository
}

func NewVerificationService(
	repo VerificationTokenRepository,
) *VerificationService {
	return &VerificationService{
		repo: repo,
	}
}

// IssueToken generates a secure token and stores only its hash.
//
// The raw token must be delivered to the user through a
// trusted delivery channel. Never log or persist it.
func (s *VerificationService) IssueToken(
	ctx context.Context,
	userID string,
) (string, error) {

	if strings.TrimSpace(userID) == "" {
		return "", errors.New("user ID is required")
	}

	token, err := GenerateVerificationToken()
	if err != nil {
		return "", fmt.Errorf(
			"generate verification token: %w",
			err,
		)
	}

	tokenHash, err := HashVerificationToken(token)
	if err != nil {
		return "", fmt.Errorf(
			"hash verification token: %w",
			err,
		)
	}

	expiresAt := VerificationTokenExpiresAt(time.Now())

	err = s.repo.CreateToken(
		ctx,
		userID,
		tokenHash,
		expiresAt,
	)

	if err != nil {
		return "", fmt.Errorf(
			"store verification token: %w",
			err,
		)
	}

	return token, nil
}

// VerifyEmail validates the token and activates the user.
func (s *VerificationService) VerifyEmail(
	ctx context.Context,
	token string,
) error {

	token = strings.TrimSpace(token)

	if token == "" {
		return ErrVerificationTokenRequired
	}

	tokenHash, err := HashVerificationToken(token)
	if err != nil {
		return ErrInvalidVerificationToken
	}

	err = s.repo.VerifyToken(ctx, tokenHash)
	if err != nil {
		return fmt.Errorf(
			"verify email: %w",
			err,
		)
	}

	return nil
}
