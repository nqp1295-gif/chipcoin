package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"net/http"
	"time"
)

const (
	SessionCookieName = "daocoin_session"
	SessionDuration   = 24 * time.Hour
	SessionTokenBytes = 32
)

var ErrInvalidSessionToken = errors.New("invalid session token")

// GenerateSessionToken tạo token ngẫu nhiên bằng crypto/rand.
func GenerateSessionToken() (string, error) {
	token := make([]byte, SessionTokenBytes)

	if _, err := rand.Read(token); err != nil {
		return "", err
	}

	return base64.RawURLEncoding.EncodeToString(token), nil
}

// HashSessionToken tạo SHA-256 hash để lưu vào PostgreSQL.
func HashSessionToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}

// ValidateSessionToken kiểm tra định dạng và độ dài token.
func ValidateSessionToken(token string) error {
	decoded, err := base64.RawURLEncoding.DecodeString(token)
	if err != nil {
		return ErrInvalidSessionToken
	}

	if len(decoded) != SessionTokenBytes {
		return ErrInvalidSessionToken
	}

	if base64.RawURLEncoding.EncodeToString(decoded) != token {
		return ErrInvalidSessionToken
	}

	return nil
}

// SetSessionCookie gửi token tới trình duyệt.
func SetSessionCookie(
	w http.ResponseWriter,
	token string,
	secure bool,
) {
	http.SetCookie(w, &http.Cookie{
		Name:     SessionCookieName,
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   int(SessionDuration.Seconds()),
	})
}

// ClearSessionCookie xóa cookie phía trình duyệt.
func ClearSessionCookie(
	w http.ResponseWriter,
	secure bool,
) {
	http.SetCookie(w, &http.Cookie{
		Name:     SessionCookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1,
	})
}
