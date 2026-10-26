package middleware

import (
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"
	"time"
)

func testHTTPRateLimiter(
	globalLimit int,
	ipLimit int,
) *HTTPRateLimiter {
	return NewHTTPRateLimiter(
		HTTPRateLimitConfig{
			GlobalLimit:  globalLimit,
			GlobalWindow: time.Minute,
			IPLimit:      ipLimit,
			IPWindow:     time.Minute,
			MaxEntries:   100,
		},
	)
}

func performRateLimitedRequest(
	handler http.Handler,
	ip string,
) *httptest.ResponseRecorder {
	req := httptest.NewRequest(
		http.MethodPost,
		"/api/v1/auth/resend-verification",
		nil,
	)

	req.RemoteAddr = ip + ":12345"

	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	return rec
}

func TestHTTPRateLimiterAllowsRequest(t *testing.T) {
	limiter := testHTTPRateLimiter(100, 10)

	called := false

	next := http.HandlerFunc(
		func(w http.ResponseWriter, r *http.Request) {
			called = true
			w.WriteHeader(http.StatusOK)
		},
	)

	handler := limiter.Middleware(next)

	rec := performRateLimitedRequest(
		handler,
		"192.0.2.10",
	)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	if !called {
		t.Fatal("next handler was not called")
	}
}

func TestHTTPRateLimiterBlocksIP(t *testing.T) {
	limiter := testHTTPRateLimiter(100, 2)

	next := http.HandlerFunc(
		func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		},
	)

	handler := limiter.Middleware(next)

	for i := 0; i < 2; i++ {
		rec := performRateLimitedRequest(
			handler,
			"192.0.2.10",
		)

		if rec.Code != http.StatusOK {
			t.Fatal("request should be allowed")
		}
	}

	rec := performRateLimitedRequest(
		handler,
		"192.0.2.10",
	)

	if rec.Code != http.StatusTooManyRequests {
		t.Fatalf(
			"expected 429, got %d",
			rec.Code,
		)
	}
}

func TestHTTPRateLimiterIndependentIPs(t *testing.T) {
	limiter := testHTTPRateLimiter(100, 1)

	next := http.HandlerFunc(
		func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		},
	)

	handler := limiter.Middleware(next)

	first := performRateLimitedRequest(
		handler,
		"192.0.2.10",
	)

	second := performRateLimitedRequest(
		handler,
		"192.0.2.11",
	)

	if first.Code != http.StatusOK ||
		second.Code != http.StatusOK {
		t.Fatal("different IPs should be independent")
	}
}

func TestHTTPRateLimiterBlocksGlobal(t *testing.T) {
	limiter := testHTTPRateLimiter(2, 100)

	next := http.HandlerFunc(
		func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		},
	)

	handler := limiter.Middleware(next)

	for _, ip := range []string{
		"192.0.2.10",
		"192.0.2.11",
	} {
		rec := performRateLimitedRequest(handler, ip)

		if rec.Code != http.StatusOK {
			t.Fatal("request should be allowed")
		}
	}

	rec := performRateLimitedRequest(
		handler,
		"192.0.2.12",
	)

	if rec.Code != http.StatusTooManyRequests {
		t.Fatalf(
			"expected global 429, got %d",
			rec.Code,
		)
	}
}

func TestHTTPRateLimiterIgnoresForwardedFor(t *testing.T) {
	limiter := testHTTPRateLimiter(100, 1)

	next := http.HandlerFunc(
		func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		},
	)

	handler := limiter.Middleware(next)

	req := httptest.NewRequest(
		http.MethodPost,
		"/api/v1/auth/resend-verification",
		nil,
	)

	req.RemoteAddr = "192.0.2.10:12345"
	req.Header.Set("X-Forwarded-For", "203.0.113.99")

	first := httptest.NewRecorder()
	handler.ServeHTTP(first, req)

	req2 := httptest.NewRequest(
		http.MethodPost,
		"/api/v1/auth/resend-verification",
		nil,
	)

	req2.RemoteAddr = "192.0.2.10:54321"
	req2.Header.Set("X-Forwarded-For", "203.0.113.100")

	second := httptest.NewRecorder()
	handler.ServeHTTP(second, req2)

	if first.Code != http.StatusOK {
		t.Fatal("first request should pass")
	}

	if second.Code != http.StatusTooManyRequests {
		t.Fatal("forwarded header must not bypass limit")
	}
}

func TestHTTPRateLimiterInvalidRemoteAddr(t *testing.T) {
	limiter := testHTTPRateLimiter(100, 10)

	next := http.HandlerFunc(
		func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		},
	)

	handler := limiter.Middleware(next)

	req := httptest.NewRequest(
		http.MethodPost,
		"/api/v1/auth/resend-verification",
		nil,
	)

	req.RemoteAddr = "invalid-address"

	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf(
			"expected 400, got %d",
			rec.Code,
		)
	}
}
func TestHTTPRateLimiterRetryAfter(t *testing.T) {
	limiter := testHTTPRateLimiter(100, 1)

	next := http.HandlerFunc(
		func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		},
	)

	handler := limiter.Middleware(next)

	performRateLimitedRequest(
		handler,
		"192.0.2.10",
	)

	rec := performRateLimitedRequest(
		handler,
		"192.0.2.10",
	)

	if rec.Code != http.StatusTooManyRequests {
		t.Fatalf("expected 429, got %d", rec.Code)
	}

	retry := rec.Header().Get("Retry-After")

	if retry == "" {
		t.Fatal("Retry-After header is missing")
	}

	seconds, err := strconv.Atoi(retry)
	if err != nil {
		t.Fatalf("invalid Retry-After: %v", err)
	}

	if seconds < 1 || seconds > 60 {
		t.Fatalf("unexpected Retry-After: %d", seconds)
	}
}

func TestHTTPRateLimiterRetryAfterRounding(t *testing.T) {
	rec := httptest.NewRecorder()

	writeRateLimitResponse(
		rec,
		1500*time.Millisecond,
	)

	if rec.Code != http.StatusTooManyRequests {
		t.Fatalf("expected 429, got %d", rec.Code)
	}

	if got := rec.Header().Get("Retry-After"); got != "2" {
		t.Fatalf("expected Retry-After 2, got %s", got)
	}
}
