package auth

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"sync"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func TestResendRepositoryIntegration(t *testing.T) {
	dsn := os.Getenv("TEST_DATABASE_URL")

	if dsn == "" {
		t.Skip("TEST_DATABASE_URL is not configured")
	}

	config, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		t.Fatal(err)
	}

	if config.ConnConfig.Database != "daocoin_test" {
		t.Fatal("integration tests require daocoin_test")
	}

	ctx, cancel := context.WithTimeout(
		context.Background(),
		30*time.Second,
	)
	defer cancel()

	db, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		t.Fatal(err)
	}

	// Register pool cleanup first so it runs last.
	t.Cleanup(func() {
		db.Close()
	})

	if err := db.Ping(ctx); err != nil {
		t.Fatal(err)
	}

	repo := NewResendRepository(db)

	randomBytes := make([]byte, 8)
	if _, err := rand.Read(randomBytes); err != nil {
		t.Fatal(err)
	}

	suffix := hex.EncodeToString(randomBytes)

	createUser := func(status string) string {
		t.Helper()

		username := "resend_" + suffix + "_" + status
		email := fmt.Sprintf(
			"resend_%s_%s@example.com",
			suffix,
			status,
		)

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
			VALUES ($1, $2, $3, $4)
			RETURNING id
			`,
			username,
			email,
			"integration-test-hash",
			status,
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

			_, err := db.Exec(
				cleanupCtx,
				`DELETE FROM users WHERE id = $1`,
				userID,
			)

			if err != nil {
				t.Errorf("cleanup user failed: %v", err)
			}
		})

		return userID
	}

	pendingUserID := createUser("PENDING")
	activeUserID := createUser("ACTIVE")

	t.Run("first request succeeds", func(t *testing.T) {
		err := repo.ReserveResend(ctx, pendingUserID)
		if err != nil {
			t.Fatalf("expected success, got %v", err)
		}
	})

	t.Run("immediate second request is blocked", func(t *testing.T) {
		err := repo.ReserveResend(ctx, pendingUserID)

		if !errors.Is(err, ErrResendRateLimited) {
			t.Fatalf(
				"expected ErrResendRateLimited, got %v",
				err,
			)
		}
	})

	t.Run("request after cooldown succeeds", func(t *testing.T) {
		// Simulate passage of time without waiting 60 seconds.
		_, err := db.Exec(
			ctx,
			`
			UPDATE email_verification_resend_requests
			SET requested_at = NOW() - INTERVAL '61 seconds'
			WHERE user_id = $1
			`,
			pendingUserID,
		)

		if err != nil {
			t.Fatal(err)
		}

		err = repo.ReserveResend(ctx, pendingUserID)
		if err != nil {
			t.Fatalf("expected success after cooldown, got %v", err)
		}
	})

	t.Run("hourly limit blocks request", func(t *testing.T) {
		// Create five historical requests within the last hour.
		_, err := db.Exec(
			ctx,
			`DELETE FROM email_verification_resend_requests WHERE user_id = $1`,
			pendingUserID,
		)
		if err != nil {
			t.Fatal(err)
		}

		for i := 0; i < ResendMaxHourly; i++ {
			_, err := db.Exec(
				ctx,
				`
				INSERT INTO email_verification_resend_requests (
					user_id,
					requested_at
				)
				VALUES (
					$1,
					NOW() - INTERVAL '2 minutes'
				)
				`,
				pendingUserID,
			)

			if err != nil {
				t.Fatal(err)
			}
		}

		err = repo.ReserveResend(ctx, pendingUserID)

		if !errors.Is(err, ErrResendRateLimited) {
			t.Fatalf(
				"expected hourly rate limit, got %v",
				err,
			)
		}
	})

	t.Run("active account rejected", func(t *testing.T) {
		err := repo.ReserveResend(ctx, activeUserID)

		if !errors.Is(err, ErrResendNotEligible) {
			t.Fatalf(
				"expected ErrResendNotEligible, got %v",
				err,
			)
		}
	})

	t.Run("unknown account rejected", func(t *testing.T) {
		err := repo.ReserveResend(
			ctx,
			"00000000-0000-4000-8000-000000000001",
		)

		if !errors.Is(err, ErrResendNotEligible) {
			t.Fatalf(
				"expected ErrResendNotEligible, got %v",
				err,
			)
		}
	})

	t.Run("concurrent requests allow only one", func(t *testing.T) {
		_, err := db.Exec(
			ctx,
			`
			DELETE FROM email_verification_resend_requests
			WHERE user_id = $1
			`,
			pendingUserID,
		)

		if err != nil {
			t.Fatal(err)
		}

		var wg sync.WaitGroup
		results := make(chan error, 2)

		for i := 0; i < 2; i++ {
			wg.Add(1)

			go func() {
				defer wg.Done()

				results <- repo.ReserveResend(
					ctx,
					pendingUserID,
				)
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
				t.Fatalf("unexpected error: %v", err)
			}
		}

		if successCount != 1 || limitedCount != 1 {
			t.Fatalf(
				"expected 1 success and 1 rate limit; got %d success, %d limited",
				successCount,
				limitedCount,
			)
		}
	})
}
