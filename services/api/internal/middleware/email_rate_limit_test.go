package middleware

import (
	"bytes"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func newTestEmailLimiter(t *testing.T) *EmailRateLimiter {
	t.Helper()

	limiter, err := NewEmailRateLimiter(
		[]byte("0123456789abcdef0123456789abcdef"),
		2,
		time.Hour,
		100,
	)

	if err != nil {
		t.Fatal(err)
	}

	return limiter
}

func emailRequest(
	handler http.Handler,
	body string,
) *httptest.ResponseRecorder {
	req := httptest.NewRequest(
		http.MethodPost,
		"/api/v1/auth/resend-verification",
		strings.NewReader(body),
	)

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	return rec
}

func TestEmailRateLimiterAllowsRequests(t *testing.T) {
	limiter := newTestEmailLimiter(t)

	handler := limiter.Middleware(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		}),
	)

	for i := 0; i < 2; i++ {
		rec := emailRequest(
			handler,
			`{"email":"user@example.com"}`,
		)

		if rec.Code != http.StatusOK {
			t.Fatalf("request %d should pass", i+1)
		}
	}
}

func TestEmailRateLimiterBlocksOverLimit(t *testing.T) {
	limiter := newTestEmailLimiter(t)

	handler := limiter.Middleware(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		}),
	)

	for i := 0; i < 2; i++ {
		emailRequest(
			handler,
			`{"email":"user@example.com"}`,
		)
	}

	rec := emailRequest(
		handler,
		`{"email":"user@example.com"}`,
	)

	if rec.Code != http.StatusTooManyRequests {
		t.Fatalf("expected 429, got %d", rec.Code)
	}
}

func TestEmailRateLimiterNormalizesEmail(t *testing.T) {
	limiter := newTestEmailLimiter(t)

	handler := limiter.Middleware(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		}),
	)

	emailRequest(
		handler,
		`{"email":"USER@EXAMPLE.COM"}`,
	)

	emailRequest(
		handler,
		`{"email":" user@example.com "}`,
	)

	rec := emailRequest(
		handler,
		`{"email":"user@example.com"}`,
	)

	if rec.Code != http.StatusTooManyRequests {
		t.Fatalf("expected normalized email to be limited, got %d", rec.Code)
	}
}

func TestEmailRateLimiterIndependentEmails(t *testing.T) {
	limiter := newTestEmailLimiter(t)

	handler := limiter.Middleware(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		}),
	)

	for _, email := range []string{
		"a@example.com",
		"b@example.com",
	} {
		rec := emailRequest(
			handler,
			`{"email":"`+email+`"}`,
		)

		if rec.Code != http.StatusOK {
			t.Fatalf("%s should pass", email)
		}
	}
}

func TestEmailRateLimiterRestoresBody(t *testing.T) {
	limiter := newTestEmailLimiter(t)

	original := []byte(
		`{"email":"user@example.com"}`,
	)

	handler := limiter.Middleware(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			body, err := io.ReadAll(r.Body)
			if err != nil {
				t.Fatal(err)
			}

			if !bytes.Equal(body, original) {
				t.Fatal("request body was modified")
			}

			w.WriteHeader(http.StatusOK)
		}),
	)

	rec := emailRequest(handler, string(original))

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
}

func TestEmailRateLimiterRejectsOversizedBody(t *testing.T) {
	limiter := newTestEmailLimiter(t)

	called := false

	handler := limiter.Middleware(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			called = true
			w.WriteHeader(http.StatusOK)
		}),
	)

	body := strings.Repeat("A", maxResendBodyBytes+1)

	rec := emailRequest(handler, body)

	if rec.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("expected 413, got %d", rec.Code)
	}

	if called {
		t.Fatal("oversized request reached next handler")
	}
}

func TestEmailRateLimiterRejectsShortSecret(t *testing.T) {
	_, err := NewEmailRateLimiter(
		[]byte("short"),
		5,
		time.Hour,
		100,
	)

	if err == nil {
		t.Fatal("expected invalid secret error")
	}
}

func TestEmailRateLimiterUsesDifferentKeys(t *testing.T) {
	first, err := NewEmailRateLimiter(
		[]byte("0123456789abcdef0123456789abcdef"),
		5,
		time.Hour,
		100,
	)
	if err != nil {
		t.Fatal(err)
	}

	second, err := NewEmailRateLimiter(
		[]byte("abcdef0123456789abcdef0123456789"),
		5,
		time.Hour,
		100,
	)
	if err != nil {
		t.Fatal(err)
	}

	if first.emailKey("user@example.com") ==
		second.emailKey("user@example.com") {
		t.Fatal("different secrets must produce different keys")
	}
}
