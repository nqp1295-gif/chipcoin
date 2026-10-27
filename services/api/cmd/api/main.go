package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"daocoin/api/internal/auth"
	"daocoin/api/internal/config"
	"daocoin/api/internal/database"
	"daocoin/api/internal/email"
	"daocoin/api/internal/middleware"
)

// newHandler preserves compatibility with existing tests.
func newHandler(
	authHandlers ...*auth.Handler,
) http.Handler {
	return newHandlerWithLogin(nil, authHandlers...)
}

// newHandlerWithLogin preserves compatibility with existing tests.
func newHandlerWithLogin(
	loginHandler *auth.LoginHandler,
	authHandlers ...*auth.Handler,
) http.Handler {
	return newHandlerWithVerification(
		loginHandler,
		nil,
		authHandlers...,
	)
}

// newHandlerWithVerification preserves compatibility with existing tests.
func newHandlerWithVerification(
	loginHandler *auth.LoginHandler,
	verificationHandler *auth.VerificationHandler,
	authHandlers ...*auth.Handler,
) http.Handler {
	return newHandlerWithResend(
		loginHandler,
		verificationHandler,
		nil,
		nil,
		nil,
		false,
		authHandlers...,
	)
}

// newHandlerWithResend preserves compatibility with existing tests.
func newHandlerWithResend(
	loginHandler *auth.LoginHandler,
	verificationHandler *auth.VerificationHandler,
	resendHandler *auth.ResendVerificationHandler,
	httpLimiter *middleware.HTTPRateLimiter,
	emailLimiter *middleware.EmailRateLimiter,
	resendEnabled bool,
	authHandlers ...*auth.Handler,
) http.Handler {
	return newHandlerWithSystem(
		loginHandler,
		verificationHandler,
		resendHandler,
		nil,
		httpLimiter,
		emailLimiter,
		resendEnabled,
		authHandlers...,
	)
}

// newHandlerWithSystem preserves compatibility with existing tests.
func newHandlerWithSystem(
	loginHandler *auth.LoginHandler,
	verificationHandler *auth.VerificationHandler,
	resendHandler *auth.ResendVerificationHandler,
	systemHandler *auth.SystemHandler,
	httpLimiter *middleware.HTTPRateLimiter,
	emailLimiter *middleware.EmailRateLimiter,
	resendEnabled bool,
	authHandlers ...*auth.Handler,
) http.Handler {
	return newHandlerWithDiagnostics(
		loginHandler,
		verificationHandler,
		resendHandler,
		systemHandler,
		nil,
		httpLimiter,
		emailLimiter,
		resendEnabled,
		authHandlers...,
	)
}

// newHandlerWithDiagnostics registers all DAOCOIN API routes including accounts-system administration and email diagnostics.
func newHandlerWithDiagnostics(
	loginHandler *auth.LoginHandler,
	verificationHandler *auth.VerificationHandler,
	resendHandler *auth.ResendVerificationHandler,
	systemHandler *auth.SystemHandler,
	emailDiagHandler *email.DiagnosticsHandler,
	httpLimiter *middleware.HTTPRateLimiter,
	emailLimiter *middleware.EmailRateLimiter,
	resendEnabled bool,
	authHandlers ...*auth.Handler,
) http.Handler {

	mux := http.NewServeMux()

	// =====================================================
	// 1. Health Check
	// =====================================================

	mux.HandleFunc(
		"GET /healthz",
		func(w http.ResponseWriter, r *http.Request) {

			w.Header().Set(
				"Content-Type",
				"application/json",
			)

			_ = json.NewEncoder(w).Encode(
				map[string]string{
					"service": "daocoin-api",
					"status":  "ok",
					"time": time.Now().
						UTC().
						Format(time.RFC3339),
				},
			)
		},
	)

	// =====================================================
	// 2. Public Configuration
	// =====================================================

	mux.HandleFunc(
		"GET /api/v1/public/config",
		func(w http.ResponseWriter, r *http.Request) {

			w.Header().Set(
				"Content-Type",
				"application/json",
			)

			_ = json.NewEncoder(w).Encode(
				map[string]any{
					"asset":                "DAO",
					"asset_type":           "internal_points",
					"withdrawal_enabled":   false,
					"mining_enabled":       false,
					"reward_budget_status": "draft",
				},
			)
		},
	)

	// =====================================================
	// 3. Register API
	// =====================================================

	if len(authHandlers) > 0 &&
		authHandlers[0] != nil {

		mux.HandleFunc(
			"POST /api/v1/auth/register",
			authHandlers[0].Register,
		)
	}

	// =====================================================
	// 4. Login API
	// =====================================================

	if loginHandler != nil {

		mux.HandleFunc(
			"POST /api/v1/auth/login",
			loginHandler.Login,
		)
	}

	// =====================================================
	// 5. Verify Email API
	// =====================================================

	if verificationHandler != nil {

		mux.HandleFunc(
			"POST /api/v1/auth/verify-email",
			verificationHandler.VerifyEmail,
		)
	}

	// =====================================================
	// 6. Resend Verification API (Feature Flagged)
	// =====================================================

	if resendEnabled && resendHandler != nil {
		var handler http.Handler = http.HandlerFunc(resendHandler.ResendVerification)
		if emailLimiter != nil {
			handler = emailLimiter.Middleware(handler)
		}
		if httpLimiter != nil {
			handler = httpLimiter.Middleware(handler)
		}

		mux.Handle(
			"POST /api/v1/auth/resend-verification",
			handler,
		)
	}

	// =====================================================
	// 7. System Accounts Management APIs
	// =====================================================

	if systemHandler != nil {
		mux.HandleFunc(
			"POST /api/v1/system/auth/login",
			systemHandler.SystemLogin,
		)
		mux.HandleFunc(
			"GET /api/v1/system/accounts",
			systemHandler.ListAccounts,
		)
		mux.HandleFunc(
			"POST /api/v1/system/accounts",
			systemHandler.CreateAccount,
		)
	}

	// =====================================================
	// 8. Email Verification & Gmail SMTP Diagnostics APIs
	// =====================================================

	if emailDiagHandler != nil {
		mux.HandleFunc(
			"GET /api/v1/system/email/status",
			emailDiagHandler.Status,
		)
		mux.HandleFunc(
			"POST /api/v1/system/email/test-send",
			emailDiagHandler.TestSend,
		)
	}

	return mux
}

func main() {

	// =====================================================
	// 1. Application Context & Graceful Shutdown
	// =====================================================

	ctx, cancelApp := signal.NotifyContext(
		context.Background(),
		os.Interrupt,
		syscall.SIGTERM,
	)
	defer cancelApp()

	// =====================================================
	// 2. Load Configurations
	// =====================================================

	rateLimitCfg, err := config.LoadRateLimitConfig()
	if err != nil {
		log.Fatalf(
			"Rate limit configuration failed: %v",
			err,
		)
	}

	// =====================================================
	// 3. PostgreSQL Connection
	// =====================================================

	db, err := database.Connect(ctx)

	if err != nil {
		log.Fatalf(
			"PostgreSQL connection failed: %v",
			err,
		)
	}

	defer db.Close()

	log.Println(
		"PostgreSQL connected successfully",
	)

	// =====================================================
	// 4. Authentication Repository & Service
	// =====================================================

	authRepo := auth.NewRepository(db)

	authService := auth.NewService(
		authRepo,
	)

	authHandler := auth.NewHandler(
		authService,
	)

	// =====================================================
	// 5. Login Handler
	// =====================================================

	cookieSecure := os.Getenv(
		"COOKIE_SECURE",
	) == "true"

	loginHandler := auth.NewLoginHandler(
		authService,
		cookieSecure,
	)

	// =====================================================
	// 6. Verification Handler
	// =====================================================

	verificationRepo := auth.NewVerificationRepository(
		db,
	)

	verificationService := auth.NewVerificationService(
		verificationRepo,
	)

	verificationHandler := auth.NewVerificationHandler(
		verificationService,
	)

	// =====================================================
	// 7. Resend Verification & Rate Limiters (Feature Flagged)
	// =====================================================

	var resendHandler *auth.ResendVerificationHandler
	var httpLimiter *middleware.HTTPRateLimiter
	var emailLimiter *middleware.EmailRateLimiter
	var cleanupScheduler *middleware.RateLimitCleanupScheduler

	if rateLimitCfg.ResendVerificationEnabled {
		tokenCipher, err := email.NewTokenCipher(rateLimitCfg.TokenEncryptionKey)
		if err != nil {
			log.Fatalf("Token cipher initialization failed: %v", err)
		}

		resendLookupRepo, err := auth.NewResendLookupRepository(db)
		if err != nil {
			log.Fatalf("Resend lookup repo initialization failed: %v", err)
		}

		outboxRepo, err := auth.NewOutboxRepository(db, tokenCipher)
		if err != nil {
			log.Fatalf("Outbox repo initialization failed: %v", err)
		}

		resendService, err := auth.NewResendVerificationService(outboxRepo)
		if err != nil {
			log.Fatalf("Resend verification service initialization failed: %v", err)
		}

		resendHandler, err = auth.NewResendVerificationHandler(resendLookupRepo, resendService)
		if err != nil {
			log.Fatalf("Resend verification handler initialization failed: %v", err)
		}

		httpLimiter = middleware.NewHTTPRateLimiter(middleware.HTTPRateLimitConfig{
			GlobalLimit:  rateLimitCfg.GlobalLimit,
			GlobalWindow: rateLimitCfg.GlobalWindow,
			IPLimit:      rateLimitCfg.IPLimit,
			IPWindow:     rateLimitCfg.IPWindow,
			MaxEntries:   rateLimitCfg.MaxEntries,
		})

		emailLimiter, err = middleware.NewEmailRateLimiter(
			rateLimitCfg.EmailHMACSecret,
			rateLimitCfg.EmailLimit,
			rateLimitCfg.EmailWindow,
			rateLimitCfg.MaxEntries,
		)
		if err != nil {
			log.Fatalf("Email rate limiter initialization failed: %v", err)
		}

		cleanupScheduler, err = middleware.NewRateLimitCleanupScheduler(
			rateLimitCfg.CleanupInterval,
			httpLimiter,
			emailLimiter,
		)
		if err != nil {
			log.Fatalf("Rate limit cleanup scheduler initialization failed: %v", err)
		}

		go func() {
			if err := cleanupScheduler.Run(ctx); err != nil {
				log.Printf("Rate limit cleanup scheduler exited: %v", err)
			}
		}()

		log.Println("Resend verification route enabled with rate limiters")
	}

	// =====================================================
	// 8. Email Outbox Worker (Feature Flagged)
	// =====================================================

	emailCfg, emailErr := config.LoadEmailConfig()
	var emailSender email.Sender
	var emailDiagHandler *email.DiagnosticsHandler

	if emailErr != nil {
		log.Printf("Email configuration check: %v", emailErr)
	} else if emailCfg.Enabled {
		if emailCfg.Provider == "gmail_smtp" || emailCfg.Provider == "smtp" || emailCfg.Provider == "gmail" {
			emailSender = email.NewGmailSMTPSender(email.GmailSMTPConfig{
				Host:            emailCfg.SMTPHost,
				Port:            emailCfg.SMTPPort,
				Username:        emailCfg.SMTPUsername,
				Password:        emailCfg.SMTPPassword,
				FromEmail:       emailCfg.SMTPFromEmail,
				FromName:        emailCfg.SMTPFromName,
				RequireSTARTTLS: emailCfg.SMTPRequireTLS,
			})
			log.Printf("Gmail SMTP sender configured (%s:%d as %s)", emailCfg.SMTPHost, emailCfg.SMTPPort, emailCfg.SMTPUsername)
		} else {
			emailSender = email.NewResendSender(emailCfg.APIKey, emailCfg.From)
			log.Println("Resend email sender configured")
		}

		emailDiagHandler = email.NewDiagnosticsHandler(
			email.GmailSMTPConfig{
				Host:            emailCfg.SMTPHost,
				Port:            emailCfg.SMTPPort,
				Username:        emailCfg.SMTPUsername,
				Password:        emailCfg.SMTPPassword,
				FromEmail:       emailCfg.SMTPFromEmail,
				FromName:        emailCfg.SMTPFromName,
				RequireSTARTTLS: emailCfg.SMTPRequireTLS,
			},
			emailSender,
			db,
			emailCfg.PublicURL,
		)

		var cipher *email.TokenCipher
		if len(rateLimitCfg.TokenEncryptionKey) == 32 {
			var err error
			cipher, err = email.NewTokenCipher(rateLimitCfg.TokenEncryptionKey)
			if err != nil {
				log.Fatalf("Token cipher for worker failed: %v", err)
			}
		}

		if cipher != nil {
			workerRepo, err := email.NewOutboxWorkerRepository(db)
			if err != nil {
				log.Fatalf("Outbox worker repo initialization failed: %v", err)
			}

			emailWorker, err := email.NewWorker(
				workerRepo,
				cipher,
				emailSender,
				email.WorkerConfig{
					PublicURL: emailCfg.PublicURL,
				},
			)
			if err != nil {
				log.Fatalf("Email worker initialization failed: %v", err)
			}

			go func() {
				if err := emailWorker.Run(ctx); err != nil {
					log.Printf("Email outbox worker exited: %v", err)
				}
			}()

			log.Println("Email outbox worker started successfully")
		} else {
			log.Println("Email outbox worker not started: TOKEN_ENCRYPTION_KEY not configured")
		}
	}

	// =====================================================
	// 9. API Port
	// =====================================================

	port := os.Getenv("PORT")
	if port == "" {
		port = os.Getenv("API_PORT")
	}
	if port == "" {
		port = "8080"
	}

	// =====================================================
	// 9. Accounts System Handler (Quản Trị Viên, Trợ Lý, Chuyên Viên)
	// =====================================================

	roleRepo := auth.NewRoleRepository(db)
	systemHandler := auth.NewSystemHandler(authService, roleRepo, cookieSecure)

	// =====================================================
	// 10. HTTP Router
	// =====================================================

	router := newHandlerWithDiagnostics(
		loginHandler,
		verificationHandler,
		resendHandler,
		systemHandler,
		emailDiagHandler,
		httpLimiter,
		emailLimiter,
		rateLimitCfg.ResendVerificationEnabled,
		authHandler,
	)

	// =====================================================
	// 10. CORS Configuration
	// =====================================================

	allowedOrigins := []string{
		"http://localhost:3000",
		"http://127.0.0.1:3000",
	}
	if envOrigins := os.Getenv("CORS_ALLOWED_ORIGINS"); envOrigins != "" {
		for _, o := range strings.Split(envOrigins, ",") {
			if trimmed := strings.TrimSpace(o); trimmed != "" {
				allowedOrigins = append(allowedOrigins, trimmed)
			}
		}
	}

	corsHandler := middleware.CORSMiddleware(middleware.CORSConfig{
		AllowedOrigins: allowedOrigins,
	})(router)

	// =====================================================
	// 11. HTTP Server
	// =====================================================

	srv := &http.Server{
		Addr:              ":" + port,
		Handler:           corsHandler,
		ReadHeaderTimeout: 5 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	// =====================================================
	// 11. Start API & Graceful Shutdown
	// =====================================================

	serverErrors := make(chan error, 1)

	go func() {
		log.Printf(
			"DAOCOIN API listening on :%s",
			port,
		)
		serverErrors <- srv.ListenAndServe()
	}()

	select {
	case err := <-serverErrors:
		if err != nil && err != http.ErrServerClosed {
			log.Fatalf("HTTP server failed: %v", err)
		}
	case <-ctx.Done():
		log.Println("Shutting down DAOCOIN API server...")
		shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer shutdownCancel()

		if err := srv.Shutdown(shutdownCtx); err != nil {
			log.Printf("HTTP server graceful shutdown failed: %v", err)
			_ = srv.Close()
		}
		log.Println("DAOCOIN API server stopped")
	}
}
