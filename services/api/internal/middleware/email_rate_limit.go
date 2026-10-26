package middleware

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/mail"
	"strings"
	"time"
)

const maxResendBodyBytes = 4096

type EmailRateLimiter struct {
	limiter *RateLimiter
	key     []byte
}

func NewEmailRateLimiter(
	secret []byte,
	limit int,
	window time.Duration,
	maxEntries int,
) (*EmailRateLimiter, error) {
	if len(secret) < 32 {
		return nil, errors.New(
			"email rate limit secret must contain at least 32 bytes",
		)
	}

	if limit <= 0 || window <= 0 || maxEntries <= 0 {
		return nil, errors.New(
			"invalid email rate limiter configuration",
		)
	}

	key := make([]byte, len(secret))
	copy(key, secret)

	return &EmailRateLimiter{
		limiter: NewRateLimiter(
			limit,
			window,
			maxEntries,
		),
		key: key,
	}, nil
}

// CleanupExpired cleans expired entries in the email limiter.
func (m *EmailRateLimiter) CleanupExpired(now time.Time) int {
	if m == nil || m.limiter == nil {
		return 0
	}
	return m.limiter.CleanupExpired(now)
}

func (m *EmailRateLimiter) emailKey(
	email string,
) string {
	email = strings.ToLower(strings.TrimSpace(email))

	mac := hmac.New(sha256.New, m.key)
	mac.Write([]byte(email))

	return hex.EncodeToString(mac.Sum(nil))
}

func (m *EmailRateLimiter) Middleware(
	next http.Handler,
) http.Handler {
	return http.HandlerFunc(
		func(w http.ResponseWriter, r *http.Request) {
			if m == nil ||
				m.limiter == nil ||
				len(m.key) < 32 ||
				next == nil {
				writeRateLimitError(
					w,
					http.StatusInternalServerError,
					"internal_error",
				)
				return
			}

			if r.Method != http.MethodPost {
				next.ServeHTTP(w, r)
				return
			}

			if r.Body == nil {
				writeRateLimitError(
					w,
					http.StatusBadRequest,
					"invalid_request",
				)
				return
			}

			defer r.Body.Close()

			// Read at most 4097 bytes to detect oversized bodies.
			body, err := io.ReadAll(
				io.LimitReader(
					r.Body,
					maxResendBodyBytes+1,
				),
			)

			if err != nil {
				writeRateLimitError(
					w,
					http.StatusBadRequest,
					"invalid_request",
				)
				return
			}

			if len(body) > maxResendBodyBytes {
				writeRateLimitError(
					w,
					http.StatusRequestEntityTooLarge,
					"request_too_large",
				)
				return
			}

			// Restore the body before forwarding.
			r.Body = io.NopCloser(bytes.NewReader(body))

			var req struct {
				Email string `json:"email"`
			}

			decoder := json.NewDecoder(bytes.NewReader(body))
			decoder.DisallowUnknownFields()

			if err := decoder.Decode(&req); err != nil {
				// Let the existing auth handler reject malformed JSON.
				next.ServeHTTP(w, r)
				return
			}

			var extra any

			if err := decoder.Decode(&extra); !errors.Is(err, io.EOF) {
				next.ServeHTTP(w, r)
				return
			}

			email := strings.ToLower(strings.TrimSpace(req.Email))

			// Invalid emails remain the responsibility of the handler.
			if email == "" || len(email) > 254 {
				next.ServeHTTP(w, r)
				return
			}

			parsed, err := mail.ParseAddress(email)
			if err != nil || parsed.Address != email {
				next.ServeHTTP(w, r)
				return
			}

			key := m.emailKey(email)

			allowed, retryAfter := m.limiter.AllowWithRetry(key)

			if !allowed {
				writeRateLimitResponse(w, retryAfter)
				return
			}

			next.ServeHTTP(w, r)
		},
	)
}
