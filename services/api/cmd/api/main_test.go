package main

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"daocoin/api/internal/auth"
	"daocoin/api/internal/middleware"
)

func TestHealth(t *testing.T) {
	r := httptest.NewRecorder()
	newHandler().ServeHTTP(r, httptest.NewRequest(http.MethodGet, "/healthz", nil))
	if r.Code != 200 || !strings.Contains(r.Body.String(), `"status":"ok"`) {
		t.Fatalf("bad response: %d %s", r.Code, r.Body.String())
	}
}

func TestMiningDisabled(t *testing.T) {
	r := httptest.NewRecorder()
	newHandler().ServeHTTP(r, httptest.NewRequest(http.MethodGet, "/api/v1/public/config", nil))
	if r.Code != 200 || !strings.Contains(r.Body.String(), `"mining_enabled":false`) {
		t.Fatalf("bad response: %d %s", r.Code, r.Body.String())
	}
}

func TestResendVerificationRouteDisabledByDefault(t *testing.T) {
	r := httptest.NewRecorder()
	req := httptest.NewRequest(
		http.MethodPost,
		"/api/v1/auth/resend-verification",
		strings.NewReader(`{"email":"user@example.com"}`),
	)

	newHandler().ServeHTTP(r, req)

	if r.Code != http.StatusNotFound {
		t.Fatalf("expected 404 for disabled resend verification route, got %d", r.Code)
	}
}

type mockResendLookup struct{}

func (m *mockResendLookup) FindEligibleUserID(ctx context.Context, email string) (string, bool, error) {
	if email == "eligible@example.com" {
		return "user-123", true, nil
	}
	return "", false, nil
}

type mockResendService struct{}

func (m *mockResendService) RequestResend(ctx context.Context, userID string) error {
	return nil
}

func TestResendVerificationRouteEnabled(t *testing.T) {
	resendHandler, err := auth.NewResendVerificationHandler(
		&mockResendLookup{},
		&mockResendService{},
	)
	if err != nil {
		t.Fatal(err)
	}

	httpLimiter := middleware.NewHTTPRateLimiter(middleware.HTTPRateLimitConfig{
		GlobalLimit:  10,
		GlobalWindow: time.Minute,
		IPLimit:      2,
		IPWindow:     time.Minute,
		MaxEntries:   100,
	})

	emailLimiter, err := middleware.NewEmailRateLimiter(
		[]byte("0123456789abcdef0123456789abcdef"),
		5,
		time.Hour,
		100,
	)
	if err != nil {
		t.Fatal(err)
	}

	router := newHandlerWithResend(
		nil,
		nil,
		resendHandler,
		httpLimiter,
		emailLimiter,
		true,
	)

	// Valid request to eligible user
	req := httptest.NewRequest(
		http.MethodPost,
		"/api/v1/auth/resend-verification",
		strings.NewReader(`{"email":"eligible@example.com"}`),
	)
	req.RemoteAddr = "192.0.2.1:12345"
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), "If the account is eligible, a verification email will be queued.") {
		t.Fatalf("unexpected body: %s", rec.Body.String())
	}

	// Second request from same IP
	req2 := httptest.NewRequest(
		http.MethodPost,
		"/api/v1/auth/resend-verification",
		strings.NewReader(`{"email":"eligible@example.com"}`),
	)
	req2.RemoteAddr = "192.0.2.1:12345"
	rec2 := httptest.NewRecorder()
	router.ServeHTTP(rec2, req2)

	if rec2.Code != http.StatusOK {
		t.Fatalf("expected 200 for second request, got %d", rec2.Code)
	}

	// Third request from same IP should be blocked by IP rate limit
	req3 := httptest.NewRequest(
		http.MethodPost,
		"/api/v1/auth/resend-verification",
		strings.NewReader(`{"email":"eligible@example.com"}`),
	)
	req3.RemoteAddr = "192.0.2.1:12345"
	rec3 := httptest.NewRecorder()
	router.ServeHTTP(rec3, req3)

	if rec3.Code != http.StatusTooManyRequests {
		t.Fatalf("expected 429 for third request, got %d", rec3.Code)
	}
	if rec3.Header().Get("Retry-After") == "" {
		t.Fatal("expected Retry-After header on 429 response")
	}
}
