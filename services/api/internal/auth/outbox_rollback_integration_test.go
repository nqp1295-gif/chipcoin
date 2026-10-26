package auth

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"os"
	"testing"
	"time"

	"daocoin/api/internal/email"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

func TestOutboxRollbackIntegration(t *testing.T) {
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("TEST_DATABASE_URL is not configured")
	}

	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		t.Fatal(err)
	}

	if cfg.ConnConfig.Database != "daocoin_test" {
		t.Fatal("rollback test must use daocoin_test")
	}

	// Ensure the pool has enough connections for:
	// 1. The transaction holding the table lock.
	// 2. QueueResend().
	cfg.MaxConns = 4

	// A PostgreSQL lock wait must fail within 500ms.
	// This is configured only for this test pool.
	if cfg.ConnConfig.RuntimeParams == nil {
		cfg.ConnConfig.RuntimeParams = make(map[string]string)
	}
	cfg.ConnConfig.RuntimeParams["lock_timeout"] = "500ms"

	ctx, cancel := context.WithTimeout(
		context.Background(),
		20*time.Second,
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

	suffix := fmt.Sprintf("%d", time.Now().UnixNano())

	var userID string

	err = db.QueryRow(
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
		"rollback_"+suffix,
		"rollback_"+suffix+"@example.com",
		"integration-test-hash",
	).Scan(&userID)

	if err != nil {
		t.Fatal(err)
	}

	// Cleanup is registered before acquiring the table lock.
	// The lock must be released before these deletes execute.
	t.Cleanup(func() {
		cleanupCtx, cleanupCancel := context.WithTimeout(
			context.Background(),
			10*time.Second,
		)
		defer cleanupCancel()

		queries := []string{
			"DELETE FROM email_outbox WHERE user_id = $1",
			"DELETE FROM email_verification_resend_requests WHERE user_id = $1",
			"DELETE FROM email_verification_tokens WHERE user_id = $1",
			"DELETE FROM users WHERE id = $1",
		}

		for _, query := range queries {
			if _, err := db.Exec(
				cleanupCtx,
				query,
				userID,
			); err != nil {
				t.Errorf("cleanup failed: %v", err)
			}
		}
	})

	// Start a separate transaction that blocks writes
	// to email_outbox.
	lockTx, err := db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		t.Fatal(err)
	}

	lockReleased := false

	releaseLock := func() {
		if lockReleased {
			return
		}
		lockReleased = true

		releaseCtx, releaseCancel := context.WithTimeout(
			context.Background(),
			5*time.Second,
		)
		defer releaseCancel()

		if err := lockTx.Rollback(releaseCtx); err != nil &&
			!errors.Is(err, pgx.ErrTxClosed) {
			t.Errorf("release table lock: %v", err)
		}
	}

	// LIFO cleanup: release the lock before deleting the user.
	t.Cleanup(releaseLock)

	_, err = lockTx.Exec(
		ctx,
		`
		LOCK TABLE email_outbox
		IN ACCESS EXCLUSIVE MODE
		`,
	)
	if err != nil {
		t.Fatal(err)
	}

	// QueueResend should successfully insert the token
	// inside its transaction, then fail when attempting
	// to insert the email_outbox record.
	err = repo.QueueResend(ctx, userID)

	if err == nil {
		t.Fatal("expected QueueResend to fail on table lock")
	}

	var pgErr *pgconn.PgError
	if !errors.As(err, &pgErr) {
		t.Fatalf("expected PostgreSQL error, got: %v", err)
	}

	// 55P03 = lock_not_available.
	// PostgreSQL also uses this code for lock_timeout.
	if pgErr.Code != "55P03" {
		t.Fatalf(
			"expected PostgreSQL lock timeout (55P03), got %s: %v",
			pgErr.Code,
			err,
		)
	}

	t.Log("QueueResend failed at email_outbox lock as expected")

	// Release the blocking transaction.
	releaseLock()

	// Check that no partial data survived the failure.
	var (
		tokenCount  int
		outboxCount int
		resendCount int
		userStatus  string
		verifiedAt  *time.Time
	)

	err = db.QueryRow(
		ctx,
		`
		SELECT COUNT(*)
		FROM email_verification_tokens
		WHERE user_id = $1
		`,
		userID,
	).Scan(&tokenCount)
	if err != nil {
		t.Fatal(err)
	}

	err = db.QueryRow(
		ctx,
		`
		SELECT COUNT(*)
		FROM email_outbox
		WHERE user_id = $1
		`,
		userID,
	).Scan(&outboxCount)
	if err != nil {
		t.Fatal(err)
	}

	err = db.QueryRow(
		ctx,
		`
		SELECT COUNT(*)
		FROM email_verification_resend_requests
		WHERE user_id = $1
		`,
		userID,
	).Scan(&resendCount)
	if err != nil {
		t.Fatal(err)
	}

	err = db.QueryRow(
		ctx,
		`
		SELECT status, email_verified_at
		FROM users
		WHERE id = $1
		`,
		userID,
	).Scan(&userStatus, &verifiedAt)
	if err != nil {
		t.Fatal(err)
	}

	if tokenCount != 0 {
		t.Fatalf(
			"rollback failed: %d verification tokens remain",
			tokenCount,
		)
	}

	if outboxCount != 0 {
		t.Fatalf(
			"rollback failed: %d outbox jobs remain",
			outboxCount,
		)
	}

	if resendCount != 0 {
		t.Fatalf(
			"rollback failed: %d resend records remain",
			resendCount,
		)
	}

	if userStatus != "PENDING" || verifiedAt != nil {
		t.Fatal("rollback unexpectedly changed user state")
	}

	t.Log("PASS: verification token rolled back")
	t.Log("PASS: email outbox rolled back")
	t.Log("PASS: resend history rolled back")
	t.Log("PASS: user remains PENDING")
}
