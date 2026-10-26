package middleware

import (
	"encoding/json"
	"math"
	"net"
	"net/http"
	"strconv"
	"strings"
	"time"
)

type HTTPRateLimitConfig struct {
	GlobalLimit  int
	GlobalWindow time.Duration

	IPLimit  int
	IPWindow time.Duration

	MaxEntries int
}

type HTTPRateLimiter struct {
	global *RateLimiter
	perIP  *RateLimiter
}

func NewHTTPRateLimiter(
	cfg HTTPRateLimitConfig,
) *HTTPRateLimiter {
	return &HTTPRateLimiter{
		global: NewRateLimiter(
			cfg.GlobalLimit,
			cfg.GlobalWindow,
			1,
		),
		perIP: NewRateLimiter(
			cfg.IPLimit,
			cfg.IPWindow,
			cfg.MaxEntries,
		),
	}
}

// CleanupExpired cleans expired entries in both global and per-IP limiters.
func (m *HTTPRateLimiter) CleanupExpired(now time.Time) int {
	if m == nil {
		return 0
	}
	removed := 0
	if m.global != nil {
		removed += m.global.CleanupExpired(now)
	}
	if m.perIP != nil {
		removed += m.perIP.CleanupExpired(now)
	}
	return removed
}

func (m *HTTPRateLimiter) Middleware(
	next http.Handler,
) http.Handler {
	return http.HandlerFunc(
		func(w http.ResponseWriter, r *http.Request) {
			if m == nil || m.global == nil ||
				m.perIP == nil || next == nil {
				writeRateLimitError(
					w,
					http.StatusInternalServerError,
					"internal_error",
				)
				return
			}

			// Do not trust X-Forwarded-For.
			// RemoteAddr is supplied by net/http.
			ip := clientIP(r.RemoteAddr)

			if ip == "" {
				writeRateLimitError(
					w,
					http.StatusBadRequest,
					"invalid_client_address",
				)
				return
			}

			globalAllowed, globalRetry := m.global.AllowWithRetry("global")

			if !globalAllowed {
				writeRateLimitResponse(w, globalRetry)
				return
			}

			ipAllowed, ipRetry := m.perIP.AllowWithRetry(ip)

			if !ipAllowed {
				writeRateLimitResponse(w, ipRetry)
				return
			}

			next.ServeHTTP(w, r)
		},
	)
}

func clientIP(remoteAddr string) string {
	host, _, err := net.SplitHostPort(remoteAddr)
	if err != nil {
		return ""
	}

	host = strings.TrimSpace(host)

	ip := net.ParseIP(host)
	if ip == nil {
		return ""
	}

	return ip.String()
}

func writeRateLimitError(
	w http.ResponseWriter,
	status int,
	code string,
) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")

	w.WriteHeader(status)

	_ = json.NewEncoder(w).Encode(
		map[string]any{
			"success": false,
			"error":   code,
		},
	)
}
func writeRateLimitResponse(
	w http.ResponseWriter,
	retryAfter time.Duration,
) {
	seconds := int64(math.Ceil(retryAfter.Seconds()))

	if seconds < 1 {
		seconds = 1
	}

	w.Header().Set(
		"Retry-After",
		strconv.FormatInt(seconds, 10),
	)

	writeRateLimitError(
		w,
		http.StatusTooManyRequests,
		"rate_limited",
	)
}
