package auth

import (
	"context"
	"errors"
	"fmt"
	"net/mail"
	"strings"
	"time"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrAccountInactive    = errors.New("account is not active")
	ErrEmailNotVerified   = errors.New("email not verified")
	ErrLoginFailed        = errors.New("login failed")
)

type LoginInput struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginResult struct {
	UserID    string
	Username  string
	Email     string
	Token     string
	ExpiresAt time.Time
}

// Login xác thực tài khoản và tạo phiên đăng nhập.
func (s *Service) Login(
	ctx context.Context,
	input LoginInput,
) (LoginResult, error) {

	var result LoginResult

	// 1. Normalize email
	email := strings.TrimSpace(input.Email)

	// 2. Validate input
	if email == "" || input.Password == "" {
		return result, ErrInvalidCredentials
	}

	if len(email) > 254 || len(input.Password) > 1024 {
		return result, ErrInvalidCredentials
	}

	parsedEmail, err := mail.ParseAddress(email)
	if err != nil || parsedEmail.Address != email {
		return result, ErrInvalidCredentials
	}

	// 3. Find user
	user, err := s.repo.FindUserByEmail(ctx, email)

	if err != nil {
		if errors.Is(err, ErrUserNotFound) {
			return result, ErrInvalidCredentials
		}

		return result, fmt.Errorf(
			"%w: database lookup",
			ErrLoginFailed,
		)
	}

	// 4. Verify password
	valid, err := VerifyPassword(
		input.Password,
		user.PasswordHash,
	)

	if err != nil {
		return result, fmt.Errorf(
			"%w: password verification",
			ErrLoginFailed,
		)
	}

	if !valid {
		return result, ErrInvalidCredentials
	}

	// 5. Check account status
	if user.Status != "ACTIVE" {
		return result, ErrAccountInactive
	}

	// 6. Check email verification
	if user.EmailVerifiedAt == nil {
		return result, ErrEmailNotVerified
	}

	// 7. Generate session token
	token, err := GenerateSessionToken()
	if err != nil {
		return result, fmt.Errorf(
			"%w: token generation",
			ErrLoginFailed,
		)
	}

	// 8. Hash session token
	tokenHash := HashSessionToken(token)

	// 9. Calculate expiration
	expiresAt := time.Now().
		UTC().
		Add(SessionDuration)

	// 10. Persist session
	_, err = s.repo.CreateSession(
		ctx,
		user.ID,
		tokenHash,
		expiresAt,
	)

	if err != nil {
		return result, fmt.Errorf(
			"%w: session persistence",
			ErrLoginFailed,
		)
	}

	// 11. Return result
	return LoginResult{
		UserID:    user.ID,
		Username:  user.Username,
		Email:     user.Email,
		Token:     token,
		ExpiresAt: expiresAt,
	}, nil
}
