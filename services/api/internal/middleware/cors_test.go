package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestCORSMiddleware(t *testing.T) {
	cfg := CORSConfig{
		AllowedOrigins: []string{"http://localhost:3000", "http://127.0.0.1:3000"},
	}

	handlerCalled := false
	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		handlerCalled = true
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})

	cors := CORSMiddleware(cfg)(nextHandler)

	t.Run("allowed_origin_preflight_options", func(t *testing.T) {
		handlerCalled = false
		req := httptest.NewRequest(http.MethodOptions, "/api/v1/auth/register", nil)
		req.Header.Set("Origin", "http://localhost:3000")
		req.Header.Set("Access-Control-Request-Method", "POST")
		rec := httptest.NewRecorder()

		cors.ServeHTTP(rec, req)

		if rec.Code != http.StatusNoContent {
			t.Fatalf("expected 204 No Content, got %d", rec.Code)
		}
		if handlerCalled {
			t.Fatal("preflight OPTIONS should not call next handler")
		}
		if rec.Header().Get("Access-Control-Allow-Origin") != "http://localhost:3000" {
			t.Fatalf("missing or wrong Allow-Origin: %s", rec.Header().Get("Access-Control-Allow-Origin"))
		}
		if rec.Header().Get("Access-Control-Allow-Credentials") != "true" {
			t.Fatalf("missing Allow-Credentials: %s", rec.Header().Get("Access-Control-Allow-Credentials"))
		}
	})

	t.Run("allowed_origin_post_request", func(t *testing.T) {
		handlerCalled = false
		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", nil)
		req.Header.Set("Origin", "http://127.0.0.1:3000")
		rec := httptest.NewRecorder()

		cors.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200 OK, got %d", rec.Code)
		}
		if !handlerCalled {
			t.Fatal("POST request should call next handler")
		}
		if rec.Header().Get("Access-Control-Allow-Origin") != "http://127.0.0.1:3000" {
			t.Fatalf("missing or wrong Allow-Origin: %s", rec.Header().Get("Access-Control-Allow-Origin"))
		}
	})

	t.Run("disallowed_origin", func(t *testing.T) {
		handlerCalled = false
		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", nil)
		req.Header.Set("Origin", "http://evil-attacker.com")
		rec := httptest.NewRecorder()

		cors.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200 OK, got %d", rec.Code)
		}
		if !handlerCalled {
			t.Fatal("request should still execute")
		}
		if rec.Header().Get("Access-Control-Allow-Origin") != "" {
			t.Fatalf("expected no Allow-Origin header for disallowed origin, got %s", rec.Header().Get("Access-Control-Allow-Origin"))
		}
	})
}
