package auth

import (
	"context"
	"errors"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func setupVerificationTest(t *testing.T) (
	context.Context,
	*pgxpool.Pool,
	*VerificationRepository,
) {
	t.Helper()

	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("TEST_DATABASE_URL not configured")
	}

	config, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		t.Fatal(err)
	}

	// Prevent accidental execution against the development database.
	if config.ConnConfig.Database != "daocoin_test" {
		t.Fatal("integration tests require daocoin_test database")
	}

	ctx := context.Background()

	db, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		t.Fatal(err)
	}

	t.Cleanup(db.Close)

	if err := db.Ping(ctx); err != nil {
		t.Fatal(err)
	}

	return ctx, db, NewVerificationRepository(db)
}

func createVerificationTestUser(
	t *testing.T,
	ctx context.Context,
	db *pgxpool.Pool,
) string {
	t.Helper()

	var userID string

	err := db.QueryRow(
		ctx,
		`
		INSERT INTO users (
			email,
			username,
			password_hash,
			status
		)
		VALUES (
			gen_random_uuid()::text || '@example.com',
			'test_' || replace(gen_random_uuid()::text, '-', ''),
			'test-password-hash',
			'PENDING'
		)
		RETURNING id
		`,
	).Scan(&userID)

	if err != nil {
		t.Fatal(err)
	}

	t.Cleanup(func() {
		// Token rows must be deleted before the parent user.
		_, _ = db.Exec(
			context.Background(),
			`DELETE FROM email_verification_tokens WHERE user_id = $1`,
			userID,
		)

		_, _ = db.Exec(
			context.Background(),
			`DELETE FROM users WHERE id = $1`,
			userID,
		)
	})

	return userID
}

func newVerificationTestToken(t *testing.T) string {
	t.Helper()

	token, err := GenerateVerificationToken()
	if err != nil {
		t.Fatal(err)
	}

	hash, err := HashVerificationToken(token)
	if err != nil {
		t.Fatal(err)
	}

	return hash
}

func TestVerificationRepositoryIntegration(t *testing.T) {
	ctx, db, repo := setupVerificationTest(t)

	t.Run("valid token activates pending user", func(t *testing.T) {
		userID := createVerificationTestUser(t, ctx, db)
		hash := newVerificationTestToken(t)

		err := repo.CreateToken(
			ctx,
			userID,
			hash,
			time.Now().Add(15*time.Minute),
		)
		if err != nil {
			t.Fatal(err)
		}

		if err := repo.VerifyToken(ctx, hash); err != nil {
			t.Fatal(err)
		}

		var status string
		var verifiedAt *time.Time

		err = db.QueryRow(
			ctx,
			`SELECT status, email_verified_at FROM users WHERE id = $1`,
			userID,
		).Scan(&status, &verifiedAt)

		if err != nil {
			t.Fatal(err)
		}

		if status != "ACTIVE" || verifiedAt == nil {
			t.Fatalf(
				"expected ACTIVE with verification timestamp; got %s, %v",
				status,
				verifiedAt,
			)
		}

		var usedAt *time.Time

		err = db.QueryRow(
			ctx,
			`SELECT used_at FROM email_verification_tokens WHERE token_hash = $1`,
			hash,
		).Scan(&usedAt)

		if err != nil {
			t.Fatal(err)
		}

		if usedAt == nil {
			t.Fatal("expected verification token to be consumed")
		}

		if err := repo.VerifyToken(ctx, hash); !errors.Is(err, ErrVerificationUsed) {
			t.Fatalf("expected ErrVerificationUsed, got %v", err)
		}
	})

	t.Run("unknown token rejected", func(t *testing.T) {
		hash := newVerificationTestToken(t)

		err := repo.VerifyToken(ctx, hash)
		if !errors.Is(err, ErrVerificationNotFound) {
			t.Fatalf("expected ErrVerificationNotFound, got %v", err)
		}
	})

	t.Run("active user cannot receive token", func(t *testing.T) {
		userID := createVerificationTestUser(t, ctx, db)

		_, err := db.Exec(
			ctx,
			`UPDATE users SET status = 'ACTIVE', email_verified_at = NOW() WHERE id = $1`,
			userID,
		)
		if err != nil {
			t.Fatal(err)
		}

		err = repo.CreateToken(
			ctx,
			userID,
			newVerificationTestToken(t),
			time.Now().Add(15*time.Minute),
		)

		if !errors.Is(err, ErrVerificationUserNotEligible) {
			t.Fatalf("expected ineligible user error, got %v", err)
		}
	})

	t.Run("new token invalidates old token", func(t *testing.T) {
		userID := createVerificationTestUser(t, ctx, db)

		oldHash := newVerificationTestToken(t)
		newHash := newVerificationTestToken(t)

		expiresAt := time.Now().Add(15 * time.Minute)

		if err := repo.CreateToken(ctx, userID, oldHash, expiresAt); err != nil {
			t.Fatal(err)
		}

		if err := repo.CreateToken(ctx, userID, newHash, expiresAt); err != nil {
			t.Fatal(err)
		}

		if err := repo.VerifyToken(ctx, oldHash); !errors.Is(err, ErrVerificationUsed) {
			t.Fatalf("expected old token rejected, got %v", err)
		}

		if err := repo.VerifyToken(ctx, newHash); err != nil {
			t.Fatalf("expected new token accepted, got %v", err)
		}
	})

	t.Run("expired token rejected", func(t *testing.T) {
		userID := createVerificationTestUser(t, ctx, db)
		hash := newVerificationTestToken(t)

		// Create a valid token first.
		err := repo.CreateToken(
			ctx,
			userID,
			hash,
			time.Now().Add(15*time.Minute),
		)

		if err != nil {
			t.Fatal(err)
		}

		// Simulate a token created 20 minutes ago
		// and expired 5 minutes ago.
		_, err = db.Exec(
			ctx,
			`
		UPDATE email_verification_tokens
		SET
			created_at = NOW() - INTERVAL '20 minutes',
			expires_at = NOW() - INTERVAL '5 minutes'
		WHERE token_hash = $1
		`,
			hash,
		)

		if err != nil {
			t.Fatal(err)
		}

		// Verify expired token must fail.
		err = repo.VerifyToken(ctx, hash)

		if !errors.Is(err, ErrVerificationExpired) {
			t.Fatalf(
				"expected ErrVerificationExpired, got %v",
				err,
			)
		}

		// User must remain PENDING.
		var status string

		err = db.QueryRow(
			ctx,
			`
		SELECT status
		FROM users
		WHERE id = $1
		`,
			userID,
		).Scan(&status)

		if err != nil {
			t.Fatal(err)
		}

		if status != "PENDING" {
			t.Fatalf(
				"expected user to remain PENDING, got %s",
				status,
			)
		}
	})

	t.Run("concurrent verification accepts only one", func(t *testing.T) {
		userID := createVerificationTestUser(t, ctx, db)
		hash := newVerificationTestToken(t)

		if err := repo.CreateToken(
			ctx,
			userID,
			hash,
			time.Now().Add(15*time.Minute),
		); err != nil {
			t.Fatal(err)
		}

		const workers = 2

		results := make(chan error, workers)
		var wg sync.WaitGroup

		for i := 0; i < workers; i++ {
			wg.Add(1)

			go func() {
				defer wg.Done()
				results <- repo.VerifyToken(ctx, hash)
			}()
		}

		wg.Wait()
		close(results)

		successes := 0
		usedErrors := 0

		for err := range results {
			switch {
			case err == nil:
				successes++
			case errors.Is(err, ErrVerificationUsed):
				usedErrors++
			default:
				t.Fatalf("unexpected verification result: %v", err)
			}
		}

		if successes != 1 || usedErrors != 1 {
			t.Fatalf(
				"expected 1 success and 1 used error; got %d and %d",
				successes,
				usedErrors,
			)
		}
	})
}

// Verify that this file is compiled only when the integration test is selected.
// The strings import is intentionally used for a basic DSN sanity check.
var _ = strings.TrimSpace
