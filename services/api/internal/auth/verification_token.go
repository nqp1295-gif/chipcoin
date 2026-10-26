package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"time"
)

const (
	VerificationTokenBytes = 32

	VerificationTokenTTL = 15 * time.Minute
)

var ErrInvalidVerificationToken = errors.New(
	"invalid verification token",
)

// GenerateVerificationToken creates a cryptographically secure token.
func GenerateVerificationToken() (string, error) {
	token := make([]byte, VerificationTokenBytes)

	if _, err := rand.Read(token); err != nil {
		return "", err
	}

	return hex.EncodeToString(token), nil
}

// HashVerificationToken returns the SHA-256 hash of a valid token.
func HashVerificationToken(token string) (string, error) {
	decoded, err := hex.DecodeString(token)

	if err != nil || len(decoded) != VerificationTokenBytes {
		return "", ErrInvalidVerificationToken
	}

	hash := sha256.Sum256(decoded)

	return hex.EncodeToString(hash[:]), nil
}

// VerificationTokenExpiresAt calculates token expiration.
func VerificationTokenExpiresAt(now time.Time) time.Time {
	return now.UTC().Add(VerificationTokenTTL)
}

// IsVerificationTokenExpired checks whether a token has expired.
func IsVerificationTokenExpired(
	expiresAt time.Time,
	now time.Time,
) bool {
	return !now.Before(expiresAt)
}
