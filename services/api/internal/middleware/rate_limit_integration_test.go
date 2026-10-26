package middleware

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

func newIntegratedRateLimitHandler(
	t *testing.T,
	globalLimit int,
	ipLimit int,
	emailLimit int,
	next http.Handler,
) http.Handler {
	t.Helper()

	httpLimiter := NewHTTPRateLimiter(
		HTTPRateLimitConfig{
			GlobalLimit:  globalLimit,
			GlobalWindow: time.Minute,
			IPLimit:      ipLimit,
			IPWindow:     time.Minute,
			MaxEntries:   100,
		},
	)

	emailLimiter, err := NewEmailRateLimiter(
		[]byte("0123456789abcdef0123456789abcdef"),
		emailLimit,
		time.Hour,
		100,
	)
	if err != nil {
		t.Fatal(err)
	}

	// Execution order:
	// Global -> IP -> Email -> Handler
	return httpLimiter.Middleware(
		emailLimiter.Middleware(next),
	)
}

func integratedRequest(
	handler http.Handler,
	ip string,
	email string,
) *httptest.ResponseRecorder {
	req := httptest.NewRequest(
		http.MethodPost,
		"/api/v1/auth/resend-verification",
		strings.NewReader(`{"email":"`+email+`"}`),
	)

	req.RemoteAddr = ip + ":12345"

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	return rec
}

func TestRateLimitIntegrationValidRequest(t *testing.T) {
	var calls atomic.Int32

	handler := newIntegratedRateLimitHandler(
		t, 100, 10, 5,
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			body, err := io.ReadAll(r.Body)
			if err != nil {
				t.Error(err)
				w.WriteHeader(http.StatusInternalServerError)
				return
			}

			if string(body) != `{"email":"user@example.com"}` {
				t.Errorf("unexpected body: %s", body)
			}

			calls.Add(1)
			w.WriteHeader(http.StatusOK)
		}),
	)

	rec := integratedRequest(
		handler,
		"192.0.2.10",
		"user@example.com",
	)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	if calls.Load() != 1 {
		t.Fatalf("expected 1 handler call, got %d", calls.Load())
	}
}

func TestRateLimitIntegrationIPLimit(t *testing.T) {
	var calls atomic.Int32

	handler := newIntegratedRateLimitHandler(
		t, 100, 2, 100,
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			calls.Add(1)
			w.WriteHeader(http.StatusOK)
		}),
	)

	for i := 0; i < 3; i++ {
		rec := integratedRequest(
			handler,
			"192.0.2.10",
			"user@example.com",
		)

		expected := http.StatusOK
		if i == 2 {
			expected = http.StatusTooManyRequests
		}

		if rec.Code != expected {
			t.Fatalf(
				"request %d: expected %d, got %d",
				i+1,
				expected,
				rec.Code,
			)
		}
	}

	if calls.Load() != 2 {
		t.Fatalf("expected 2 handler calls, got %d", calls.Load())
	}
}

func TestRateLimitIntegrationGlobalLimit(t *testing.T) {
	var calls atomic.Int32

	handler := newIntegratedRateLimitHandler(
		t, 2, 100, 100,
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			calls.Add(1)
			w.WriteHeader(http.StatusOK)
		}),
	)

	ips := []string{
		"192.0.2.10",
		"192.0.2.11",
		"192.0.2.12",
	}

	for i, ip := range ips {
		rec := integratedRequest(
			handler,
			ip,
			"user@example.com",
		)

		expected := http.StatusOK
		if i == 2 {
			expected = http.StatusTooManyRequests
		}

		if rec.Code != expected {
			t.Fatalf(
				"request %d: expected %d, got %d",
				i+1,
				expected,
				rec.Code,
			)
		}
	}

	if calls.Load() != 2 {
		t.Fatalf("expected 2 handler calls, got %d", calls.Load())
	}
}

func TestRateLimitIntegrationEmailLimit(t *testing.T) {
	var calls atomic.Int32

	handler := newIntegratedRateLimitHandler(
		t, 100, 100, 2,
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			calls.Add(1)
			w.WriteHeader(http.StatusOK)
		}),
	)

	ips := []string{
		"192.0.2.10",
		"192.0.2.11",
		"192.0.2.12",
	}

	for i, ip := range ips {
		rec := integratedRequest(
			handler,
			ip,
			"user@example.com",
		)

		expected := http.StatusOK
		if i == 2 {
			expected = http.StatusTooManyRequests
		}

		if rec.Code != expected {
			t.Fatalf(
				"request %d: expected %d, got %d",
				i+1,
				expected,
				rec.Code,
			)
		}
	}

	if calls.Load() != 2 {
		t.Fatalf(
			"email limiter should stop third request; got %d calls",
			calls.Load(),
		)
	}
}

func TestRateLimitIntegrationUnknownEmail(t *testing.T) {
	var calls atomic.Int32

	handler := newIntegratedRateLimitHandler(
		t, 100, 100, 2,
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			calls.Add(1)
			w.WriteHeader(http.StatusOK)
		}),
	)

	for i := 0; i < 3; i++ {
		rec := integratedRequest(
			handler,
			"192.0.2.10",
			"unknown@example.com",
		)

		expected := http.StatusOK
		if i == 2 {
			expected = http.StatusTooManyRequests
		}

		if rec.Code != expected {
			t.Fatalf(
				"request %d: expected %d, got %d",
				i+1,
				expected,
				rec.Code,
			)
		}
	}

	if calls.Load() != 2 {
		t.Fatalf("expected 2 handler calls, got %d", calls.Load())
	}
}

func TestRateLimitIntegrationEmailNormalization(t *testing.T) {
	var calls atomic.Int32

	handler := newIntegratedRateLimitHandler(
		t, 100, 100, 2,
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			calls.Add(1)
			w.WriteHeader(http.StatusOK)
		}),
	)

	emails := []string{
		"USER@EXAMPLE.COM",
		" user@example.com ",
		"user@example.com",
	}

	for i, email := range emails {
		rec := integratedRequest(
			handler,
			"192.0.2.10",
			email,
		)

		expected := http.StatusOK
		if i == 2 {
			expected = http.StatusTooManyRequests
		}

		if rec.Code != expected {
			t.Fatalf(
				"request %d: expected %d, got %d",
				i+1,
				expected,
				rec.Code,
			)
		}
	}

	if calls.Load() != 2 {
		t.Fatalf("expected 2 handler calls, got %d", calls.Load())
	}
}

func TestRateLimitIntegrationBlockedRequestDoesNotReachHandler(
	t *testing.T,
) {
	var calls atomic.Int32

	handler := newIntegratedRateLimitHandler(
		t, 100, 100, 1,
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			calls.Add(1)
			w.WriteHeader(http.StatusOK)
		}),
	)

	first := integratedRequest(
		handler,
		"192.0.2.10",
		"user@example.com",
	)

	second := integratedRequest(
		handler,
		"192.0.2.11",
		"user@example.com",
	)

	if first.Code != http.StatusOK {
		t.Fatalf("first request: expected 200, got %d", first.Code)
	}

	if second.Code != http.StatusTooManyRequests {
		t.Fatalf("second request: expected 429, got %d", second.Code)
	}

	if calls.Load() != 1 {
		t.Fatalf(
			"blocked request reached handler: calls=%d",
			calls.Load(),
		)
	}
}
