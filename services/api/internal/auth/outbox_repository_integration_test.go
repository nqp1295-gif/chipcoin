package auth

import (
	"bytes"
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	"daocoin/api/internal/email"

	"github.com/jackc/pgx/v5/pgxpool"
)

func TestOutboxRepositoryIntegration(t *testing.T) {
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("TEST_DATABASE_URL is not configured")
	}

	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		t.Fatal(err)
	}

	if cfg.ConnConfig.Database != "daocoin_test" {
		t.Fatal("integration test must use daocoin_test")
	}

	ctx, cancel := context.WithTimeout(
		context.Background(),
		45*time.Second,
	)
	defer cancel()

	db, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(db.Close)

	key := make([]byte, email.TokenEncryptionKeySize)
	if _, err := rand.Read(key); err != nil {
		t.Fatal(err)
	}

	tokenCipher, err := email.NewTokenCipher(key)
	if err != nil {
		t.Fatal(err)
	}

	repo, err := NewOutboxRepository(db, tokenCipher)
	if err != nil {
		t.Fatal(err)
	}

	createUser := func() string {
		t.Helper()

		suffix := fmt.Sprintf("%d", time.Now().UnixNano())

		var userID string

		err := db.QueryRow(
			ctx,
			`
			INSERT INTO users (
				username,
				email,
				password_hash,
				status
			)
			VALUES ($1, $2, $3, 'PENDING')
			RETURNING id
			`,
			"outbox_"+suffix,
			"outbox_"+suffix+"@example.com",
			"integration-test-not-a-real-password-hash",
		).Scan(&userID)

		if err != nil {
			t.Fatal(err)
		}

		t.Cleanup(func() {
			cleanupCtx, cleanupCancel := context.WithTimeout(
				context.Background(),
				10*time.Second,
			)
			defer cleanupCancel()

			// Remove outbox records explicitly before deleting
			// the user to keep cleanup independent of FK policy.
			_, _ = db.Exec(
				cleanupCtx,
				"DELETE FROM email_outbox WHERE user_id = $1",
				userID,
			)

			_, _ = db.Exec(
				cleanupCtx,
				"DELETE FROM email_verification_resend_requests WHERE user_id = $1",
				userID,
			)

			_, _ = db.Exec(
				cleanupCtx,
				"DELETE FROM email_verification_tokens WHERE user_id = $1",
				userID,
			)

			_, _ = db.Exec(
				cleanupCtx,
				"DELETE FROM users WHERE id = $1",
				userID,
			)
		})

		return userID
	}

	t.Run("creates_token_outbox_and_history", func(t *testing.T) {
		userID := createUser()

		if err := repo.QueueResend(ctx, userID); err != nil {
			t.Fatal(err)
		}

		var (
			tokenHash      string
			encryptedToken []byte
			status         string
			expiresAt      time.Time
			historyCount   int
		)

		err := db.QueryRow(
			ctx,
			`
			SELECT
				t.token_hash,
				o.encrypted_token,
				o.status,
				t.expires_at
			FROM email_outbox o
			JOIN email_verification_tokens t
				ON t.id = o.verification_token_id
			WHERE o.user_id = $1
			`,
			userID,
		).Scan(
			&tokenHash,
			&encryptedToken,
			&status,
			&expiresAt,
		)

		if err != nil {
			t.Fatal(err)
		}

		if status != "PENDING" {
			t.Fatalf("unexpected outbox status: %s", status)
		}

		rawToken, err := tokenCipher.Decrypt(encryptedToken)
		if err != nil {
			t.Fatal(err)
		}

		if len(rawToken) != 64 {
			t.Fatal("invalid raw token length")
		}

		computedHash, err := HashVerificationToken(rawToken)
		if err != nil {
			t.Fatal(err)
		}

		if computedHash != tokenHash {
			t.Fatal("stored token hash mismatch")
		}

		if bytes.Contains(encryptedToken, []byte(rawToken)) {
			t.Fatal("plaintext token found in ciphertext")
		}

		if !expiresAt.After(time.Now()) {
			t.Fatal("new token is already expired")
		}

		err = db.QueryRow(
			ctx,
			`
			SELECT COUNT(*)
			FROM email_verification_resend_requests
			WHERE user_id = $1
			`,
			userID,
		).Scan(&historyCount)

		if err != nil {
			t.Fatal(err)
		}

		if historyCount != 1 {
			t.Fatalf(
				"expected one resend history record, got %d",
				historyCount,
			)
		}
	})

	t.Run("cooldown_blocks_second_request", func(t *testing.T) {
		userID := createUser()

		if err := repo.QueueResend(ctx, userID); err != nil {
			t.Fatal(err)
		}

		err := repo.QueueResend(ctx, userID)

		if !errors.Is(err, ErrResendRateLimited) {
			t.Fatalf("expected rate limit error, got %v", err)
		}

		var count int

		err = db.QueryRow(
			ctx,
			"SELECT COUNT(*) FROM email_outbox WHERE user_id = $1",
			userID,
		).Scan(&count)

		if err != nil {
			t.Fatal(err)
		}

		if count != 1 {
			t.Fatalf("expected one outbox job, got %d", count)
		}
	})

	t.Run("concurrent_requests_allow_only_one", func(t *testing.T) {
		userID := createUser()

		const workers = 2

		results := make(chan error, workers)
		var wg sync.WaitGroup

		for i := 0; i < workers; i++ {
			wg.Add(1)

			go func() {
				defer wg.Done()
				results <- repo.QueueResend(ctx, userID)
			}()
		}

		wg.Wait()
		close(results)

		successCount := 0
		limitedCount := 0

		for err := range results {
			switch {
			case err == nil:
				successCount++
			case errors.Is(err, ErrResendRateLimited):
				limitedCount++
			default:
				t.Fatalf("unexpected concurrent error: %v", err)
			}
		}

		if successCount != 1 || limitedCount != 1 {
			t.Fatalf(
				"expected one success and one rate limit, got %d and %d",
				successCount,
				limitedCount,
			)
		}

		var outboxCount int

		err := db.QueryRow(
			ctx,
			"SELECT COUNT(*) FROM email_outbox WHERE user_id = $1",
			userID,
		).Scan(&outboxCount)

		if err != nil {
			t.Fatal(err)
		}

		if outboxCount != 1 {
			t.Fatalf(
				"expected one outbox job, got %d",
				outboxCount,
			)
		}
	})

	t.Run("unknown_user_rejected", func(t *testing.T) {
		err := repo.QueueResend(
			ctx,
			"00000000-0000-4000-8000-000000000000",
		)

		if !errors.Is(err, ErrResendNotEligible) {
			t.Fatalf("expected ineligible user, got %v", err)
		}
	})

	t.Run("empty_user_rejected", func(t *testing.T) {
		err := repo.QueueResend(ctx, strings.Repeat(" ", 3))

		if !errors.Is(err, ErrResendNotEligible) {
			t.Fatalf("expected ineligible user, got %v", err)
		}
	})
}
