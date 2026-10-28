package database

import (
	"context"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
)

// EnsureMigrations runs necessary idempotent schema updates at service startup.
func EnsureMigrations(ctx context.Context, db *pgxpool.Pool) error {
	migrations := []struct {
		name string
		sql  string
	}{
		{
			name: "008_add_referral_code_tracking",
			sql: `
				ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by_code VARCHAR(50) DEFAULT NULL;
				CREATE INDEX IF NOT EXISTS idx_users_referred_by_code ON users (referred_by_code) WHERE referred_by_code IS NOT NULL;
			`,
		},
		{
			name: "006_system_roles",
			sql: `
				ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
				ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_check 
					CHECK (role IN ('USER', 'SPECIALIST', 'ASSISTANT', 'ADMIN', 'OWNER'));
			`,
		},
	}

	for _, m := range migrations {
		if _, err := db.Exec(ctx, m.sql); err != nil {
			log.Printf("WARN: EnsureMigrations [%s] failed: %v", m.name, err)
		} else {
			log.Printf("INFO: Schema migration [%s] verified successfully", m.name)
		}
	}

	return nil
}
