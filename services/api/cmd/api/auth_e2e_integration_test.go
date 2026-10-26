package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"strings"
	"testing"
	"time"

	"daocoin/api/internal/auth"
	"daocoin/api/internal/email"
	"daocoin/api/internal/middleware"

	"github.com/jackc/pgx/v5/pgxpool"
)

type e2eMockSender struct {
	sentURLs map[string]string // email -> verificationURL
}

func (s *e2eMockSender) SendVerification(ctx context.Context, to, verificationURL string) error {
	if s.sentURLs == nil {
		s.sentURLs = make(map[string]string)
	}
	s.sentURLs[to] = verificationURL
	return nil
}

func TestAuthEndToEndLifecycleIntegration(t *testing.T) {
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

	// Clean up tables for this e2e test
	cleanup := func() {
		_, _ = db.Exec(context.Background(), `
			DELETE FROM email_outbox WHERE recipient_email LIKE '%@auth-e2e.test';
			DELETE FROM email_verification_resend_requests WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@auth-e2e.test');
			DELETE FROM email_verification_tokens WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@auth-e2e.test');
			DELETE FROM user_sessions WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@auth-e2e.test');
			DELETE FROM ledger_accounts WHERE wallet_id IN (SELECT id FROM wallets WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@auth-e2e.test'));
			DELETE FROM wallets WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@auth-e2e.test');
			DELETE FROM user_roles WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@auth-e2e.test');
			DELETE FROM users WHERE email LIKE '%@auth-e2e.test';
		`)
	}
	cleanup()
	defer cleanup()

	// 1. Setup system components
	aesKey := []byte("0123456789abcdef0123456789abcdef")
	hmacSecret := []byte("fedcba9876543210fedcba9876543210")

	tokenCipher, err := email.NewTokenCipher(aesKey)
	if err != nil {
		t.Fatal(err)
	}

	authRepo := auth.NewRepository(db)
	authService := auth.NewService(authRepo)
	authHandler := auth.NewHandler(authService)
	loginHandler := auth.NewLoginHandler(authService, false)

	verificationRepo := auth.NewVerificationRepository(db)
	verificationService := auth.NewVerificationService(verificationRepo)
	verificationHandler := auth.NewVerificationHandler(verificationService)

	resendLookupRepo, err := auth.NewResendLookupRepository(db)
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

	resendHandler, err := auth.NewResendVerificationHandler(resendLookupRepo, resendService)
	if err != nil {
		t.Fatal(err)
	}

	httpLimiter := middleware.NewHTTPRateLimiter(middleware.HTTPRateLimitConfig{
		GlobalLimit:  100,
		GlobalWindow: time.Minute,
		IPLimit:      20,
		IPWindow:     time.Minute,
		MaxEntries:   100,
	})

	emailLimiter, err := middleware.NewEmailRateLimiter(
		hmacSecret,
		10,
		time.Hour,
		100,
	)
	if err != nil {
		t.Fatal(err)
	}

	router := newHandlerWithResend(
		loginHandler,
		verificationHandler,
		resendHandler,
		httpLimiter,
		emailLimiter,
		true,
		authHandler,
	)

	// Setup Worker
	mockSender := &e2eMockSender{}
	workerRepo, err := email.NewOutboxWorkerRepository(db)
	if err != nil {
		t.Fatal(err)
	}

	worker, err := email.NewWorker(
		workerRepo,
		tokenCipher,
		mockSender,
		email.WorkerConfig{
			BatchSize:    10,
			PollInterval: 100 * time.Millisecond,
			PublicURL:    "https://daocoin.app",
		},
	)
	if err != nil {
		t.Fatal(err)
	}

	testUserEmail := "trader@auth-e2e.test"
	testPassword := "SuperSecret123!"

	// Step 1: Register new user
	t.Run("step1_register_user", func(t *testing.T) {
		regBody := `{"username":"trader_e2e","email":"` + testUserEmail + `","password":"` + testPassword + `"}`
		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", strings.NewReader(regBody))
		req.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()

		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusCreated {
			t.Fatalf("expected 201 Created, got %d: %s", rec.Code, rec.Body.String())
		}

		var res map[string]any
		if err := json.Unmarshal(rec.Body.Bytes(), &res); err != nil {
			t.Fatal(err)
		}
		data := res["data"].(map[string]any)
		if data["status"] != "PENDING" {
			t.Fatalf("expected user status PENDING, got %v", data["status"])
		}
	})

	// Step 2: Try to login before verification -> must be rejected (403 account_unavailable)
	t.Run("step2_login_before_verification_rejected", func(t *testing.T) {
		loginBody := `{"email":"` + testUserEmail + `","password":"` + testPassword + `"}`
		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", strings.NewReader(loginBody))
		req.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()

		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusForbidden {
			t.Fatalf("expected 403 Forbidden for unverified account, got %d: %s", rec.Code, rec.Body.String())
		}
	})

	// Step 3: Request verification email via Resend endpoint
	t.Run("step3_request_resend_verification", func(t *testing.T) {
		resendBody := `{"email":"` + testUserEmail + `"}`
		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/resend-verification", strings.NewReader(resendBody))
		req.Header.Set("Content-Type", "application/json")
		req.RemoteAddr = "192.0.2.88:12345"
		rec := httptest.NewRecorder()

		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200 OK from resend verification, got %d: %s", rec.Code, rec.Body.String())
		}
	})

	// Step 4: Worker processes outbox and sends email
	var extractedToken string
	t.Run("step4_worker_processes_outbox_job", func(t *testing.T) {
		processed, err := worker.ProcessBatch(ctx)
		if err != nil {
			t.Fatalf("worker failed to process batch: %v", err)
		}
		if processed != 1 {
			t.Fatalf("expected 1 processed job, got %d", processed)
		}

		sentURL, ok := mockSender.sentURLs[testUserEmail]
		if !ok || sentURL == "" {
			t.Fatalf("expected email sent to %s, got map %v", testUserEmail, mockSender.sentURLs)
		}

		// Parse token from verification URL
		parsedURL, err := url.Parse(sentURL)
		if err != nil {
			t.Fatal(err)
		}
		extractedToken = parsedURL.Query().Get("token")
		if len(extractedToken) != 64 {
			t.Fatalf("extracted token invalid: %s", extractedToken)
		}
	})

	// Step 5: Verify email using the token
	t.Run("step5_verify_email_with_token", func(t *testing.T) {
		verifyBody := `{"token":"` + extractedToken + `"}`
		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/verify-email", strings.NewReader(verifyBody))
		req.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()

		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200 OK from verify email, got %d: %s", rec.Code, rec.Body.String())
		}

		// Verify user status in DB is now ACTIVE and email_verified_at is set
		var status string
		var verifiedAt *time.Time
		err := db.QueryRow(ctx, "SELECT status, email_verified_at FROM users WHERE email = $1", testUserEmail).Scan(&status, &verifiedAt)
		if err != nil {
			t.Fatal(err)
		}
		if status != "ACTIVE" || verifiedAt == nil {
			t.Fatalf("expected user to be ACTIVE with verifiedAt, got %s, %v", status, verifiedAt)
		}
	})

	// Step 6: Login after verification -> must succeed with 200 and session cookie
	t.Run("step6_login_after_verification_succeeds", func(t *testing.T) {
		loginBody := `{"email":"` + testUserEmail + `","password":"` + testPassword + `"}`
		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", strings.NewReader(loginBody))
		req.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()

		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200 OK for verified user login, got %d: %s", rec.Code, rec.Body.String())
		}

		cookies := rec.Result().Cookies()
		var sessionCookie *http.Cookie
		for _, c := range cookies {
			if c.Name == auth.SessionCookieName {
				sessionCookie = c
				break
			}
		}
		if sessionCookie == nil || sessionCookie.Value == "" {
			t.Fatalf("expected %s cookie to be set", auth.SessionCookieName)
		}
	})

	// Step 7: Replay protection: verify-email with same token again must fail
	t.Run("step7_replay_token_rejected", func(t *testing.T) {
		verifyBody := `{"token":"` + extractedToken + `"}`
		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/verify-email", strings.NewReader(verifyBody))
		req.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()

		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusBadRequest {
			t.Fatalf("expected 400 Bad Request for reused token, got %d: %s", rec.Code, rec.Body.String())
		}
		if !strings.Contains(rec.Body.String(), "verification_token_used") {
			t.Fatalf("expected verification_token_used, got %s", rec.Body.String())
		}
	})

	// Step 8: Resend verification for now-ACTIVE user should NOT queue any outbox job
	t.Run("step8_resend_active_user_no_outbox", func(t *testing.T) {
		resendBody := `{"email":"` + testUserEmail + `"}`
		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/resend-verification", strings.NewReader(resendBody))
		req.Header.Set("Content-Type", "application/json")
		req.RemoteAddr = "192.0.2.89:12345"
		rec := httptest.NewRecorder()

		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected generic 200 OK, got %d", rec.Code)
		}

		// Count outbox rows for this user: should remain exactly 1 (the original sent one)
		var outboxCount int
		err := db.QueryRow(ctx, "SELECT COUNT(*) FROM email_outbox WHERE recipient_email = $1", testUserEmail).Scan(&outboxCount)
		if err != nil {
			t.Fatal(err)
		}
		if outboxCount != 1 {
			t.Fatalf("expected 1 outbox record, got %d", outboxCount)
		}
	})
}
