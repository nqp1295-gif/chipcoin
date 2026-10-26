package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"daocoin/api/internal/auth"
	"daocoin/api/internal/email"
	"daocoin/api/internal/middleware"

	"github.com/jackc/pgx/v5/pgxpool"
)

func TestResendHTTPAndPostgreSQLIntegration(t *testing.T) {
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("TEST_DATABASE_URL is not configured")
	}

	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		t.Fatal(err)
	}

	if cfg.ConnConfig.Database != "daocoin_test" {
		t.Fatal("integration tests require daocoin_test database")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	db, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()

	// Clean up tables for this test suite
	_, err = db.Exec(ctx, `
		DELETE FROM email_outbox WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@http-integration.test');
		DELETE FROM email_verification_resend_requests WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@http-integration.test');
		DELETE FROM email_verification_tokens WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@http-integration.test');
		DELETE FROM users WHERE email LIKE '%@http-integration.test';
	`)
	if err != nil {
		t.Fatal(err)
	}

	// Create test users
	var pendingUserID, activeUserID, suspendedUserID string

	err = db.QueryRow(ctx, `
		INSERT INTO users (username, email, password_hash, status, email_verified_at)
		VALUES ('pending_http_user', 'pending@http-integration.test', 'hash', 'PENDING', NULL)
		RETURNING id
	`).Scan(&pendingUserID)
	if err != nil {
		t.Fatal(err)
	}

	err = db.QueryRow(ctx, `
		INSERT INTO users (username, email, password_hash, status, email_verified_at)
		VALUES ('active_http_user', 'active@http-integration.test', 'hash', 'ACTIVE', NOW())
		RETURNING id
	`).Scan(&activeUserID)
	if err != nil {
		t.Fatal(err)
	}

	err = db.QueryRow(ctx, `
		INSERT INTO users (username, email, password_hash, status, email_verified_at)
		VALUES ('suspended_http_user', 'suspended@http-integration.test', 'hash', 'SUSPENDED', NULL)
		RETURNING id
	`).Scan(&suspendedUserID)
	if err != nil {
		t.Fatal(err)
	}

	defer func() {
		_, _ = db.Exec(context.Background(), `
			DELETE FROM email_outbox WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@http-integration.test');
			DELETE FROM email_verification_resend_requests WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@http-integration.test');
			DELETE FROM email_verification_tokens WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@http-integration.test');
			DELETE FROM users WHERE email LIKE '%@http-integration.test';
		`)
	}()

	// Setup application components
	aesKey := []byte("0123456789abcdef0123456789abcdef")
	hmacSecret := []byte("fedcba9876543210fedcba9876543210")

	tokenCipher, err := email.NewTokenCipher(aesKey)
	if err != nil {
		t.Fatal(err)
	}

	lookupRepo, err := auth.NewResendLookupRepository(db)
	if err != nil {
		t.Fatal(err)
	}

	outboxRepo, err := auth.NewOutboxRepository(db, tokenCipher)
	if err != nil {
		t.Fatal(err)
	}

	resendService, err := auth.NewResendVerificationService(outboxRepo)
	if err != nil {
		t.Fatal(err)
	}

	resendHandler, err := auth.NewResendVerificationHandler(lookupRepo, resendService)
	if err != nil {
		t.Fatal(err)
	}

	httpLimiter := middleware.NewHTTPRateLimiter(middleware.HTTPRateLimitConfig{
		GlobalLimit:  50,
		GlobalWindow: time.Minute,
		IPLimit:      5,
		IPWindow:     time.Minute,
		MaxEntries:   100,
	})

	emailLimiter, err := middleware.NewEmailRateLimiter(
		hmacSecret,
		3,
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

	// Helper to send request
	sendRequest := func(method, path, body, remoteAddr string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(method, path, strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		if remoteAddr != "" {
			req.RemoteAddr = remoteAddr
		} else {
			req.RemoteAddr = "198.51.100.10:12345"
		}
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)
		return rec
	}

	// 1. Method Not Allowed
	t.Run("rejects_non_post_methods", func(t *testing.T) {
		rec := sendRequest(http.MethodGet, "/api/v1/auth/resend-verification", "", "")
		if rec.Code != http.StatusMethodNotAllowed {
			t.Fatalf("expected 405, got %d", rec.Code)
		}
	})

	// 2. Malformed JSON
	t.Run("rejects_malformed_json", func(t *testing.T) {
		rec := sendRequest(http.MethodPost, "/api/v1/auth/resend-verification", "{not valid json", "")
		if rec.Code != http.StatusBadRequest {
			t.Fatalf("expected 400, got %d", rec.Code)
		}
	})

	// 3. Oversized body
	t.Run("rejects_oversized_body", func(t *testing.T) {
		largeBody := `{"email":"` + strings.Repeat("a", 5000) + `@test.com"}`
		rec := sendRequest(http.MethodPost, "/api/v1/auth/resend-verification", largeBody, "")
		if rec.Code != http.StatusRequestEntityTooLarge {
			t.Fatalf("expected 413, got %d", rec.Code)
		}
	})

	// 4. Invalid email format
	t.Run("rejects_invalid_email", func(t *testing.T) {
		rec := sendRequest(http.MethodPost, "/api/v1/auth/resend-verification", `{"email":"not-an-email"}`, "")
		if rec.Code != http.StatusBadRequest {
			t.Fatalf("expected 400, got %d", rec.Code)
		}
	})

	// 5. Eligible Pending user succeeds and creates database records
	t.Run("eligible_pending_user_enqueues_outbox", func(t *testing.T) {
		rec := sendRequest(
			http.MethodPost,
			"/api/v1/auth/resend-verification",
			`{"email":"pending@http-integration.test"}`,
			"198.51.100.11:12345",
		)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
		}

		var res map[string]any
		if err := json.Unmarshal(rec.Body.Bytes(), &res); err != nil {
			t.Fatal(err)
		}
		if res["success"] != true {
			t.Fatal("expected success: true")
		}

		// Verify database records
		var tokenID string
		var tokenHash string
		err := db.QueryRow(ctx, `
			SELECT id, token_hash
			FROM email_verification_tokens
			WHERE user_id = $1
		`, pendingUserID).Scan(&tokenID, &tokenHash)
		if err != nil {
			t.Fatalf("verification token was not inserted: %v", err)
		}

		// Verify token_hash is a 64-char hex string (SHA-256)
		if len(tokenHash) != 64 {
			t.Fatalf("token hash is invalid: %s", tokenHash)
		}

		var outboxID string
		var encryptedToken []byte
		var outboxStatus string
		err = db.QueryRow(ctx, `
			SELECT id, encrypted_token, status
			FROM email_outbox
			WHERE user_id = $1 AND verification_token_id = $2
		`, pendingUserID, tokenID).Scan(&outboxID, &encryptedToken, &outboxStatus)
		if err != nil {
			t.Fatalf("email outbox record was not inserted: %v", err)
		}

		if outboxStatus != "PENDING" {
			t.Fatalf("expected outbox status PENDING, got %s", outboxStatus)
		}

		// Verify encrypted token can be decrypted and matches the token hash
		rawToken, err := tokenCipher.Decrypt(encryptedToken)
		if err != nil {
			t.Fatalf("failed to decrypt outbox token: %v", err)
		}

		computedHash, err := auth.HashVerificationToken(rawToken)
		if err != nil {
			t.Fatalf("failed to hash decrypted token: %v", err)
		}
		if computedHash != tokenHash {
			t.Fatal("decrypted token does not match stored token hash")
		}

		// Verify token was NOT stored as plaintext in DB
		var plainCount int
		err = db.QueryRow(ctx, `
			SELECT count(*)
			FROM email_outbox
			WHERE encrypted_token = $1
		`, []byte(rawToken)).Scan(&plainCount)
		if err != nil || plainCount != 0 {
			t.Fatal("security violation: raw token stored unencrypted")
		}
	})

	// 6. DB Cooldown blocks immediate second resend, but returns identical generic message
	t.Run("cooldown_blocks_second_resend_without_leaking_info", func(t *testing.T) {
		rec := sendRequest(
			http.MethodPost,
			"/api/v1/auth/resend-verification",
			`{"email":"pending@http-integration.test"}`,
			"198.51.100.12:12345",
		)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected generic 200, got %d", rec.Code)
		}

		// Verify no second outbox row was inserted
		var outboxCount int
		err := db.QueryRow(ctx, `
			SELECT count(*)
			FROM email_outbox
			WHERE user_id = $1
		`, pendingUserID).Scan(&outboxCount)
		if err != nil {
			t.Fatal(err)
		}
		if outboxCount != 1 {
			t.Fatalf("expected exactly 1 outbox entry due to cooldown, got %d", outboxCount)
		}
	})

	// 7. Unknown email returns identical generic 200, does not insert outbox
	t.Run("unknown_email_returns_generic_200_no_outbox", func(t *testing.T) {
		rec := sendRequest(
			http.MethodPost,
			"/api/v1/auth/resend-verification",
			`{"email":"unknown@http-integration.test"}`,
			"198.51.100.13:12345",
		)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", rec.Code)
		}

		var count int
		err := db.QueryRow(ctx, `
			SELECT count(*)
			FROM email_outbox
			WHERE recipient_email = 'unknown@http-integration.test'
		`).Scan(&count)
		if err != nil || count != 0 {
			t.Fatalf("outbox row must not be created for unknown email, count=%d", count)
		}
	})

	// 8. Active user returns generic 200, does not insert outbox
	t.Run("active_user_returns_generic_200_no_outbox", func(t *testing.T) {
		rec := sendRequest(
			http.MethodPost,
			"/api/v1/auth/resend-verification",
			`{"email":"active@http-integration.test"}`,
			"198.51.100.14:12345",
		)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", rec.Code)
		}

		var count int
		err := db.QueryRow(ctx, `
			SELECT count(*)
			FROM email_outbox
			WHERE user_id = $1
		`, activeUserID).Scan(&count)
		if err != nil || count != 0 {
			t.Fatalf("outbox row must not be created for active user, count=%d", count)
		}
	})

	// 9. Email Rate Limiting triggers 429 when quota for that email is exhausted
	t.Run("email_rate_limiting_enforced", func(t *testing.T) {
		// Email limit is 3. We send from different IPs so IP limit doesn't hit.
		emailTarget := `{"email":"rate-limit-email@http-integration.test"}`
		for i := 1; i <= 3; i++ {
			rec := sendRequest(
				http.MethodPost,
				"/api/v1/auth/resend-verification",
				emailTarget,
				"198.51.100."+strings.Repeat("1", i)+":12345",
			)
			if rec.Code != http.StatusOK {
				t.Fatalf("email request %d should have passed, got %d", i, rec.Code)
			}
		}

		// 4th request for same email must be 429
		rec := sendRequest(
			http.MethodPost,
			"/api/v1/auth/resend-verification",
			emailTarget,
			"198.51.100.50:12345",
		)
		if rec.Code != http.StatusTooManyRequests {
			t.Fatalf("expected 429 for email rate limit, got %d", rec.Code)
		}
		if rec.Header().Get("Retry-After") == "" {
			t.Fatal("expected Retry-After header on 429 response")
		}
	})

	// 10. IP Rate Limiting triggers 429 when quota for that IP is exhausted
	t.Run("ip_rate_limiting_enforced", func(t *testing.T) {
		testIP := "198.51.100.99:12345"

		// IP Limit is 5. We use different emails so email rate limit is not hit.
		emails := []string{
			`{"email":"ip1@http-integration.test"}`,
			`{"email":"ip2@http-integration.test"}`,
			`{"email":"ip3@http-integration.test"}`,
			`{"email":"ip4@http-integration.test"}`,
			`{"email":"ip5@http-integration.test"}`,
		}

		for i, emailPayload := range emails {
			rec := sendRequest(
				http.MethodPost,
				"/api/v1/auth/resend-verification",
				emailPayload,
				testIP,
			)
			if rec.Code != http.StatusOK {
				t.Fatalf("request %d should have passed, got %d", i+1, rec.Code)
			}
		}

		// 6th request from same IP must be 429
		rec := sendRequest(
			http.MethodPost,
			"/api/v1/auth/resend-verification",
			`{"email":"ip6@http-integration.test"}`,
			testIP,
		)
		if rec.Code != http.StatusTooManyRequests {
			t.Fatalf("expected 429 for IP rate limit, got %d", rec.Code)
		}
		if rec.Header().Get("Retry-After") == "" {
			t.Fatal("expected Retry-After header on 429 response")
		}
	})
}
