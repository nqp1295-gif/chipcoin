package auth

import (
	"context"
	"errors"
	"fmt"
	"time"
)

var ErrRegistrationFailed = errors.New("registration failed")

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) Register(
	ctx context.Context,
	req RegisterRequest,
) (User, error) {

	if err := ValidateRegister(&req); err != nil {
		return User{}, err
	}

	passwordHash, err := HashPassword(req.Password)
	if err != nil {
		return User{}, fmt.Errorf("%w: password hashing", ErrRegistrationFailed)
	}

	user, err := s.repo.Register(ctx, RegisterInput{
		Username:     req.Username,
		Email:        req.Email,
		PasswordHash: passwordHash,
		ReferralCode: req.ReferralCode,
	})

	if err != nil {
		if errors.Is(err, ErrDuplicateAccount) {
			return User{}, ErrDuplicateAccount
		}

		return User{}, fmt.Errorf("%w: database operation", ErrRegistrationFailed)
	}

	return user, nil
}

// RegisterWithVerification creates a pending account and
// verification token in one database transaction.
//
// The raw token is returned only to trusted internal code.
// It must never be included in a public HTTP response.
func (s *Service) RegisterWithVerification(
	ctx context.Context,
	req RegisterRequest,
) (User, string, error) {

	if err := ValidateRegister(&req); err != nil {
		return User{}, "", err
	}

	passwordHash, err := HashPassword(req.Password)
	if err != nil {
		return User{}, "", fmt.Errorf(
			"%w: password hashing",
			ErrRegistrationFailed,
		)
	}

	// Generate cryptographically secure token.
	rawToken, err := GenerateVerificationToken()
	if err != nil {
		return User{}, "", fmt.Errorf(
			"%w: token generation",
			ErrRegistrationFailed,
		)
	}

	// Store only SHA-256 hash.
	tokenHash, err := HashVerificationToken(rawToken)
	if err != nil {
		return User{}, "", fmt.Errorf(
			"%w: token hashing",
			ErrRegistrationFailed,
		)
	}

	expiresAt := VerificationTokenExpiresAt(
		time.Now().UTC(),
	)

	user, err := s.repo.RegisterWithVerification(
		ctx,
		RegisterInput{
			Username:     req.Username,
			Email:        req.Email,
			PasswordHash: passwordHash,
			ReferralCode: req.ReferralCode,
		},
		tokenHash,
		expiresAt,
	)

	if err != nil {
		if errors.Is(err, ErrDuplicateAccount) {
			return User{}, "", ErrDuplicateAccount
		}

		return User{}, "", fmt.Errorf(
			"%w: database operation",
			ErrRegistrationFailed,
		)
	}

	return user, rawToken, nil
}
