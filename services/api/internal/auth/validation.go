package auth

import (
	"errors"
	"net/mail"
	"regexp"
	"strings"
	"unicode/utf8"
)

var (
	ErrInvalidUsername = errors.New("invalid username")
	ErrInvalidEmail    = errors.New("invalid email")
	ErrWeakPassword    = errors.New("password does not meet security requirements")
)

var usernamePattern = regexp.MustCompile(`^[a-zA-Z0-9_]{3,30}$`)

type RegisterRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

func ValidateRegister(req *RegisterRequest) error {
	req.Username = strings.TrimSpace(req.Username)
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	if !usernamePattern.MatchString(req.Username) {
		return ErrInvalidUsername
	}

	if len(req.Email) > 254 {
		return ErrInvalidEmail
	}

	address, err := mail.ParseAddress(req.Email)
	if err != nil || address.Address != req.Email {
		return ErrInvalidEmail
	}

	if utf8.RuneCountInString(req.Password) < 12 ||
		len(req.Password) > 1024 {
		return ErrWeakPassword
	}

	return nil
}
