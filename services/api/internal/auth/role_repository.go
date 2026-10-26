package auth

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrRoleAlreadyAssigned = errors.New("role already assigned to user")
	ErrRoleNotFound        = errors.New("user does not have this role")
	ErrInvalidRole         = errors.New("invalid role specified")
)

type AccountDetail struct {
	ID              string     `json:"id"`
	Username        string     `json:"username"`
	Email           string     `json:"email"`
	Status          string     `json:"status"`
	Roles           []string   `json:"roles"`
	EmailVerifiedAt *time.Time `json:"email_verified_at,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
}

type CreateSystemAccountInput struct {
	Username     string
	Email        string
	PasswordHash string
	Role         string
	GrantedBy    *string
}

type RoleRepository struct {
	db *pgxpool.Pool
}

func NewRoleRepository(db *pgxpool.Pool) *RoleRepository {
	return &RoleRepository{db: db}
}

// GetUserRoles retrieves all assigned roles for a given user ID.
func (r *RoleRepository) GetUserRoles(ctx context.Context, userID string) ([]string, error) {
	rows, err := r.db.Query(ctx, `
		SELECT role
		FROM user_roles
		WHERE user_id = $1
		ORDER BY created_at ASC
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("query user roles: %w", err)
	}
	defer rows.Close()

	var roles []string
	for rows.Next() {
		var role string
		if err := rows.Scan(&role); err != nil {
			return nil, fmt.Errorf("scan role: %w", err)
		}
		roles = append(roles, role)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate roles: %w", err)
	}

	return roles, nil
}

// AssignRole grants a role to a user.
func (r *RoleRepository) AssignRole(ctx context.Context, userID, role string, grantedBy *string) error {
	if !IsValidRole(role) {
		return ErrInvalidRole
	}

	_, err := r.db.Exec(ctx, `
		INSERT INTO user_roles (user_id, role, granted_by)
		VALUES ($1, $2, $3)
		ON CONFLICT (user_id, role) DO NOTHING
	`, userID, role, grantedBy)
	if err != nil {
		return fmt.Errorf("assign role: %w", err)
	}

	return nil
}

// RevokeRole removes a role from a user.
func (r *RoleRepository) RevokeRole(ctx context.Context, userID, role string) error {
	cmdTag, err := r.db.Exec(ctx, `
		DELETE FROM user_roles
		WHERE user_id = $1 AND role = $2
	`, userID, role)
	if err != nil {
		return fmt.Errorf("revoke role: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return ErrRoleNotFound
	}

	return nil
}

// ListAccounts lists all accounts and aggregates their assigned roles.
func (r *RoleRepository) ListAccounts(ctx context.Context) ([]AccountDetail, error) {
	rows, err := r.db.Query(ctx, `
		SELECT 
			u.id, 
			u.username, 
			u.email, 
			u.status, 
			u.email_verified_at, 
			u.created_at,
			COALESCE(array_agg(ur.role) FILTER (WHERE ur.role IS NOT NULL), '{}') as roles
		FROM users u
		LEFT JOIN user_roles ur ON u.id = ur.user_id
		GROUP BY u.id, u.username, u.email, u.status, u.email_verified_at, u.created_at
		ORDER BY u.created_at DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("query accounts: %w", err)
	}
	defer rows.Close()

	var accounts []AccountDetail
	for rows.Next() {
		var a AccountDetail
		if err := rows.Scan(
			&a.ID,
			&a.Username,
			&a.Email,
			&a.Status,
			&a.EmailVerifiedAt,
			&a.CreatedAt,
			&a.Roles,
		); err != nil {
			return nil, fmt.Errorf("scan account: %w", err)
		}
		accounts = append(accounts, a)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate accounts: %w", err)
	}

	return accounts, nil
}

// CreateSystemAccount creates an active management account and assigns the requested role.
func (r *RoleRepository) CreateSystemAccount(ctx context.Context, input CreateSystemAccountInput) (AccountDetail, error) {
	if !IsSystemRole(input.Role) {
		return AccountDetail{}, ErrInvalidRole
	}

	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return AccountDetail{}, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	now := time.Now().UTC()
	var user User

	// 1. Create active, verified user
	err = tx.QueryRow(ctx, `
		INSERT INTO users (
			username,
			email,
			password_hash,
			status,
			email_verified_at,
			created_at,
			updated_at
		)
		VALUES ($1, $2, $3, 'ACTIVE', $4, $4, $4)
		RETURNING id, username, email, status
	`, input.Username, input.Email, input.PasswordHash, now).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.Status,
	)
	if err != nil {
		return AccountDetail{}, normalizeDBError(err)
	}

	// 2. Assign specified system role
	_, err = tx.Exec(ctx, `
		INSERT INTO user_roles (user_id, role, granted_by, created_at)
		VALUES ($1, $2, $3, $4)
	`, user.ID, input.Role, input.GrantedBy, now)
	if err != nil {
		return AccountDetail{}, fmt.Errorf("assign role: %w", err)
	}

	// 3. Create wallet
	_, err = tx.Exec(ctx, `
		INSERT INTO wallets (user_id, created_at)
		VALUES ($1, $2)
	`, user.ID, now)
	if err != nil {
		return AccountDetail{}, fmt.Errorf("create wallet: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return AccountDetail{}, fmt.Errorf("commit tx: %w", err)
	}

	return AccountDetail{
		ID:              user.ID,
		Username:        user.Username,
		Email:           user.Email,
		Status:          user.Status,
		Roles:           []string{input.Role},
		EmailVerifiedAt: &now,
		CreatedAt:       now,
	}, nil
}
