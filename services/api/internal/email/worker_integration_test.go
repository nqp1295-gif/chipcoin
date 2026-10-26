package email

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"os"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func TestWorkerPostgreSQLIntegration(t *testing.T) {
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

	// Clean up previous test runs
	cleanup := func() {
		_, _ = db.Exec(context.Background(), `
			DELETE FROM email_outbox WHERE recipient_email LIKE '%@worker-integration.test';
			DELETE FROM email_verification_resend_requests WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@worker-integration.test');
			DELETE FROM email_verification_tokens WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@worker-integration.test');
			DELETE FROM users WHERE email LIKE '%@worker-integration.test';
		`)
	}
	cleanup()
	defer cleanup()

	// Setup cipher
	key := []byte("0123456789abcdef0123456789abcdef")
	cipher, err := NewTokenCipher(key)
	if err != nil {
		t.Fatal(err)
	}

	rawTokenBytes := make([]byte, 32)
	_, _ = rand.Read(rawTokenBytes)
	rawToken := hex.EncodeToString(rawTokenBytes)

	encToken, err := cipher.Encrypt(rawToken)
	if err != nil {
		t.Fatal(err)
	}

	// Create a test user
	var userID string
	err = db.QueryRow(ctx, `
		INSERT INTO users (username, email, password_hash, status)
		VALUES ('worker_test_user', 'user@worker-integration.test', 'hash', 'PENDING')
		RETURNING id
	`).Scan(&userID)
	if err != nil {
		t.Fatal(err)
	}

	// Create verification token
	var tokenID string
	err = db.QueryRow(ctx, `
		INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
		VALUES ($1, $2, NOW() + INTERVAL '15 minutes')
		RETURNING id
	`, userID, hex.EncodeToString(rawTokenBytes)).Scan(&tokenID)
	if err != nil {
		t.Fatal(err)
	}

	// Create outbox job
	var jobID string
	err = db.QueryRow(ctx, `
		INSERT INTO email_outbox (user_id, verification_token_id, recipient_email, encrypted_token, status)
		VALUES ($1, $2, 'user@worker-integration.test', $3, 'PENDING')
		RETURNING id
	`, userID, tokenID, encToken).Scan(&jobID)
	if err != nil {
		t.Fatal(err)
	}

	repo, err := NewOutboxWorkerRepository(db)
	if err != nil {
		t.Fatal(err)
	}

	sender := &mockSender{}
	worker, err := NewWorker(
		repo,
		cipher,
		sender,
		WorkerConfig{
			BatchSize:    10,
			PollInterval: time.Second,
			PublicURL:    "https://daocoin.app",
		},
	)
	if err != nil {
		t.Fatal(err)
	}

	// 1. Process batch should claim the job, send email, and mark SENT
	t.Run("claims_and_sends_job", func(t *testing.T) {
		processed, err := worker.ProcessBatch(ctx)
		if err != nil {
			t.Fatalf("process batch failed: %v", err)
		}
		if processed < 1 {
			t.Fatalf("expected at least 1 processed job, got %d", processed)
		}

		found := false
		for _, r := range sender.sent {
			if r == "user@worker-integration.test" {
				found = true
				break
			}
		}
		if !found {
			t.Fatalf("expected email sent to user@worker-integration.test, got %v", sender.sent)
		}

		// Verify database state is SENT
		var status string
		var sentAt *time.Time
		var lockedAt *time.Time
		err = db.QueryRow(ctx, `
			SELECT status, sent_at, locked_at
			FROM email_outbox
			WHERE id = $1
		`, jobID).Scan(&status, &sentAt, &lockedAt)
		if err != nil {
			t.Fatal(err)
		}

		if status != "SENT" || sentAt == nil || lockedAt != nil {
			t.Fatalf("unexpected outbox state: status=%s, sentAt=%v, lockedAt=%v", status, sentAt, lockedAt)
		}
	})

	// 2. Next process batch should find no more pending jobs for this user
	t.Run("no_more_pending_jobs", func(t *testing.T) {
		var pendingForUser int
		err := db.QueryRow(ctx, `
			SELECT COUNT(*) FROM email_outbox WHERE user_id = $1 AND status = 'PENDING'
		`, userID).Scan(&pendingForUser)
		if err != nil {
			t.Fatal(err)
		}
		if pendingForUser != 0 {
			t.Fatalf("expected 0 pending jobs for user, got %d", pendingForUser)
		}
	})

	// 3. Stuck job recovery: a job stuck in PROCESSING with old locked_at is recovered
	t.Run("recovers_stuck_processing_job", func(t *testing.T) {
		sender.sent = nil

		var stuckTokenID string
		token2Bytes := make([]byte, 32)
		_, _ = rand.Read(token2Bytes)
		token2 := hex.EncodeToString(token2Bytes)
		encToken2, _ := cipher.Encrypt(token2)

		err = db.QueryRow(ctx, `
			INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
			VALUES ($1, $2, NOW() + INTERVAL '15 minutes')
			RETURNING id
		`, userID, hex.EncodeToString(token2Bytes)).Scan(&stuckTokenID)
		if err != nil {
			t.Fatal(err)
		}

		var stuckJobID string
		err = db.QueryRow(ctx, `
			INSERT INTO email_outbox (user_id, verification_token_id, recipient_email, encrypted_token, status, attempts, locked_at)
			VALUES ($1, $2, 'user@worker-integration.test', $3, 'PROCESSING', 1, NOW() - INTERVAL '10 minutes')
			RETURNING id
		`, userID, stuckTokenID, encToken2).Scan(&stuckJobID)
		if err != nil {
			t.Fatal(err)
		}

		processed, err := worker.ProcessBatch(ctx)
		if err != nil {
			t.Fatalf("process batch for recovered job failed: %v", err)
		}
		if processed < 1 {
			t.Fatalf("expected at least 1 recovered job, got %d", processed)
		}

		var status string
		var attempts int
		err = db.QueryRow(ctx, `
			SELECT status, attempts
			FROM email_outbox
			WHERE id = $1
		`, stuckJobID).Scan(&status, &attempts)
		if err != nil {
			t.Fatal(err)
		}

		if status != "SENT" || attempts != 2 {
			t.Fatalf("expected recovered job to be SENT with attempts=2, got status=%s, attempts=%d", status, attempts)
		}
	})
}
