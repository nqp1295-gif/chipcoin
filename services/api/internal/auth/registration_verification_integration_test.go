package auth

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func TestRegisterWithVerificationIntegration(t *testing.T) {
	dsn := os.Getenv("TEST_DATABASE_URL")

	if dsn == "" {
		t.Skip("TEST_DATABASE_URL is not configured")
	}

	config, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		t.Fatal(err)
	}

	// Never run integration tests against development DB.
	if config.ConnConfig.Database != "daocoin_test" {
		t.Fatal("integration tests require daocoin_test database")
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
	defer db.Close()

	if err := db.Ping(ctx); err != nil {
		t.Fatal(err)
	}

	repo := NewRepository(db)
	service := NewService(repo)

	randomBytes := make([]byte, 8)

	if _, err := rand.Read(randomBytes); err != nil {
		t.Fatal(err)
	}

	suffix := hex.EncodeToString(randomBytes)

	username := "test_" + suffix
	email := fmt.Sprintf("test_%s@example.com", suffix)

	req := RegisterRequest{
		Username: username,
		Email:    email,
		Password: "StrongPassword123!",
	}

	var userID string

	t.Cleanup(func() {
		if userID == "" {
			return
		}

		cleanupCtx, cleanupCancel := context.WithTimeout(
			context.Background(),
			10*time.Second,
		)
		defer cleanupCancel()

		// Clean up child records before removing the user.
		_, _ = db.Exec(
			cleanupCtx,
			`DELETE FROM email_verification_tokens WHERE user_id = $1`,
			userID,
		)

		_, _ = db.Exec(
			cleanupCtx,
			`DELETE FROM user_roles WHERE user_id = $1`,
			userID,
		)

		_, _ = db.Exec(
			cleanupCtx,
			`
			DELETE FROM ledger_accounts
			WHERE wallet_id IN (
				SELECT id FROM wallets WHERE user_id = $1
			)
			`,
			userID,
		)

		_, _ = db.Exec(
			cleanupCtx,
			`DELETE FROM wallets WHERE user_id = $1`,
			userID,
		)

		_, _ = db.Exec(
			cleanupCtx,
			`DELETE FROM users WHERE id = $1`,
			userID,
		)
	})

	t.Run("register pending user and create token", func(t *testing.T) {
		user, rawToken, err := service.RegisterWithVerification(
			ctx,
			req,
		)

		if err != nil {
			t.Fatalf("registration failed: %v", err)
		}

		userID = user.ID

		if user.ID == "" {
			t.Fatal("user ID is empty")
		}

		if user.Status != "PENDING" {
			t.Fatalf("expected PENDING, got %s", user.Status)
		}

		if len(rawToken) != 64 {
			t.Fatalf(
				"expected 64-character token, got %d",
				len(rawToken),
			)
		}

		tokenHash, err := HashVerificationToken(rawToken)
		if err != nil {
			t.Fatal(err)
		}

		var storedHash string
		var expiresAt time.Time
		var createdAt time.Time

		err = db.QueryRow(
			ctx,
			`
			SELECT token_hash, expires_at, created_at
			FROM email_verification_tokens
			WHERE user_id = $1
			`,
			user.ID,
		).Scan(
			&storedHash,
			&expiresAt,
			&createdAt,
		)

		if err != nil {
			t.Fatal(err)
		}

		if storedHash != tokenHash {
			t.Fatal("stored token hash does not match")
		}

		if storedHash == rawToken {
			t.Fatal("raw token was stored in database")
		}

		ttl := expiresAt.Sub(createdAt)

		if ttl < 14*time.Minute ||
			ttl > 16*time.Minute {
			t.Fatalf("unexpected token TTL: %v", ttl)
		}

		var roleCount int

		err = db.QueryRow(
			ctx,
			`
			SELECT COUNT(*)
			FROM user_roles
			WHERE user_id = $1 AND role = 'USER'
			`,
			user.ID,
		).Scan(&roleCount)

		if err != nil || roleCount != 1 {
			t.Fatalf("USER role missing: %v", err)
		}

		var walletCount int

		err = db.QueryRow(
			ctx,
			`
			SELECT COUNT(*)
			FROM wallets
			WHERE user_id = $1
			`,
			user.ID,
		).Scan(&walletCount)

		if err != nil || walletCount != 1 {
			t.Fatalf("wallet missing: %v", err)
		}

		var ledgerCount int

		err = db.QueryRow(
			ctx,
			`
			SELECT COUNT(*)
			FROM ledger_accounts la
			JOIN wallets w ON la.wallet_id = w.id
			WHERE w.user_id = $1
			  AND la.kind = 'USER'
			`,
			user.ID,
		).Scan(&ledgerCount)

		if err != nil || ledgerCount != 1 {
			t.Fatalf("ledger account missing: %v", err)
		}

		verificationRepo := NewVerificationRepository(db)

		if err := verificationRepo.VerifyToken(
			ctx,
			tokenHash,
		); err != nil {
			t.Fatalf("verification failed: %v", err)
		}

		var status string

		err = db.QueryRow(
			ctx,
			`SELECT status FROM users WHERE id = $1`,
			user.ID,
		).Scan(&status)

		if err != nil {
			t.Fatal(err)
		}

		if status != "ACTIVE" {
			t.Fatalf("expected ACTIVE, got %s", status)
		}

		// Verification token must be single-use.
		err = verificationRepo.VerifyToken(ctx, tokenHash)

		if !errors.Is(err, ErrVerificationUsed) {
			t.Fatalf(
				"expected ErrVerificationUsed, got %v",
				err,
			)
		}
	})

	t.Run("duplicate registration rejected", func(t *testing.T) {
		_, _, err := service.RegisterWithVerification(
			ctx,
			req,
		)

		if !errors.Is(err, ErrDuplicateAccount) {
			t.Fatalf(
				"expected ErrDuplicateAccount, got %v",
				err,
			)
		}
	})
}
func TestRegisterWithVerificationRollbackIntegration(t *testing.T) {
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

	// Close database pool after all previously registered
	// cleanup callbacks have completed.
	t.Cleanup(func() {
		db.Close()
	})

	repo := NewRepository(db)

	suffixBytes := make([]byte, 8)
	if _, err := rand.Read(suffixBytes); err != nil {
		t.Fatal(err)
	}

	suffix := hex.EncodeToString(suffixBytes)

	// This test creates two users using the same token hash.
	// The second registration must fail and roll back.
	tokenHash := "rollback_test_" + suffix

	firstUsername := "rollback_a_" + suffix
	firstEmail := "rollback_a_" + suffix + "@example.com"

	secondUsername := "rollback_b_" + suffix
	secondEmail := "rollback_b_" + suffix + "@example.com"

	passwordHash, err := HashPassword("StrongPassword123!")
	if err != nil {
		t.Fatal(err)
	}

	firstUser, err := repo.RegisterWithVerification(
		ctx,
		RegisterInput{
			Username:     firstUsername,
			Email:        firstEmail,
			PasswordHash: passwordHash,
		},
		tokenHash,
		time.Now().UTC().Add(15*time.Minute),
	)

	if err != nil {
		t.Fatalf("first registration failed: %v", err)
	}

	// Cleanup the successfully created first user.
	t.Cleanup(func() {
		cleanupCtx, cleanupCancel := context.WithTimeout(
			context.Background(),
			10*time.Second,
		)
		defer cleanupCancel()

		queries := []string{
			`DELETE FROM email_verification_tokens WHERE user_id = $1`,
			`DELETE FROM user_roles WHERE user_id = $1`,
			`DELETE FROM ledger_accounts WHERE wallet_id IN
				(SELECT id FROM wallets WHERE user_id = $1)`,
			`DELETE FROM wallets WHERE user_id = $1`,
			`DELETE FROM users WHERE id = $1`,
		}

		for _, query := range queries {
			if _, err := db.Exec(cleanupCtx, query, firstUser.ID); err != nil {
				t.Errorf("cleanup failed: %v", err)
			}
		}
	})

	// Second registration uses the same token hash.
	_, err = repo.RegisterWithVerification(
		ctx,
		RegisterInput{
			Username:     secondUsername,
			Email:        secondEmail,
			PasswordHash: passwordHash,
		},
		tokenHash,
		time.Now().UTC().Add(15*time.Minute),
	)

	if err == nil {
		t.Fatal("expected registration to fail")
	}

	// Verify that the second user was rolled back.
	var userCount int

	err = db.QueryRow(
		ctx,
		`SELECT COUNT(*) FROM users WHERE email = $1`,
		secondEmail,
	).Scan(&userCount)

	if err != nil {
		t.Fatal(err)
	}

	if userCount != 0 {
		t.Fatalf(
			"rollback failed: found %d users",
			userCount,
		)
	}

	// Verify no wallet or ledger account remains.
	var walletCount int

	err = db.QueryRow(
		ctx,
		`
		SELECT COUNT(*)
		FROM wallets
		WHERE user_id IN (
			SELECT id FROM users WHERE email = $1
		)
		`,
		secondEmail,
	).Scan(&walletCount)

	if err != nil {
		t.Fatal(err)
	}

	if walletCount != 0 {
		t.Fatalf(
			"rollback failed: found %d wallets",
			walletCount,
		)
	}
}
