package auth

import (
	"context"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func TestResendLookupRepositoryIntegration(t *testing.T) {
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("TEST_DATABASE_URL is not configured")
	}

	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		t.Fatal(err)
	}

	if cfg.ConnConfig.Database != "daocoin_test" {
		t.Fatal("integration test requires daocoin_test")
	}

	ctx, cancel := context.WithTimeout(
		context.Background(),
		30*time.Second,
	)
	defer cancel()

	db, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()

	repo, err := NewResendLookupRepository(db)
	if err != nil {
		t.Fatal(err)
	}

	createUser := func(
		t *testing.T,
		status string,
		verified bool,
	) (string, string) {
		t.Helper()

		suffix := fmt.Sprintf(
			"%d",
			time.Now().UnixNano(),
		)

		emailAddress := fmt.Sprintf(
			"lookup_%s@example.com",
			suffix,
		)

		username := "lookup_" + suffix

		var verifiedAt any
		if verified {
			verifiedAt = time.Now().UTC()
		}

		var userID string

		err := db.QueryRow(
			ctx,
			`
			INSERT INTO users (
				username,
				email,
				password_hash,
				status,
				email_verified_at
			)
			VALUES ($1, $2, $3, $4, $5)
			RETURNING id
			`,
			username,
			emailAddress,
			"integration-test-hash",
			status,
			verifiedAt,
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

			if _, err := db.Exec(
				cleanupCtx,
				`DELETE FROM users WHERE id = $1`,
				userID,
			); err != nil {
				t.Errorf("cleanup user: %v", err)
			}
		})

		return userID, emailAddress
	}

	t.Run("pending_user_found", func(t *testing.T) {
		expectedID, emailAddress := createUser(
			t,
			"PENDING",
			false,
		)

		actualID, found, err := repo.FindEligibleUserID(
			ctx,
			emailAddress,
		)

		if err != nil {
			t.Fatal(err)
		}

		if !found || actualID != expectedID {
			t.Fatalf(
				"expected eligible user %s, got %s, found=%v",
				expectedID,
				actualID,
				found,
			)
		}
	})

	t.Run("unknown_email", func(t *testing.T) {
		_, found, err := repo.FindEligibleUserID(
			ctx,
			"unknown_"+fmt.Sprint(time.Now().UnixNano())+"@example.com",
		)

		if err != nil {
			t.Fatal(err)
		}

		if found {
			t.Fatal("unknown email must not be eligible")
		}
	})

	t.Run("active_user_not_eligible", func(t *testing.T) {
		_, emailAddress := createUser(
			t,
			"ACTIVE",
			true,
		)

		_, found, err := repo.FindEligibleUserID(
			ctx,
			emailAddress,
		)

		if err != nil {
			t.Fatal(err)
		}

		if found {
			t.Fatal("ACTIVE user must not be eligible")
		}
	})

	t.Run("suspended_user_not_eligible", func(t *testing.T) {
		_, emailAddress := createUser(
			t,
			"SUSPENDED",
			false,
		)

		_, found, err := repo.FindEligibleUserID(
			ctx,
			emailAddress,
		)

		if err != nil {
			t.Fatal(err)
		}

		if found {
			t.Fatal("SUSPENDED user must not be eligible")
		}
	})

	t.Run("email_normalization", func(t *testing.T) {
		expectedID, emailAddress := createUser(
			t,
			"PENDING",
			false,
		)

		actualID, found, err := repo.FindEligibleUserID(
			ctx,
			"  "+emailAddress+"  ",
		)

		if err != nil {
			t.Fatal(err)
		}

		if !found || actualID != expectedID {
			t.Fatal("normalized email lookup failed")
		}
	})

	t.Run("verified_pending_user_not_eligible", func(t *testing.T) {
		_, emailAddress := createUser(
			t,
			"PENDING",
			true,
		)

		_, found, err := repo.FindEligibleUserID(
			ctx,
			emailAddress,
		)

		if err != nil {
			t.Fatal(err)
		}

		if found {
			t.Fatal("verified account must not be eligible")
		}
	})
}
