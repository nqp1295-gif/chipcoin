package auth

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func TestRoleHierarchyConstants(t *testing.T) {
	if !IsSystemRole(RoleAdmin) {
		t.Fatal("ADMIN must be recognized as system role")
	}
	if !IsSystemRole(RoleAssistant) {
		t.Fatal("ASSISTANT must be recognized as system role")
	}
	if !IsSystemRole(RoleSpecialist) {
		t.Fatal("SPECIALIST must be recognized as system role")
	}
	if IsSystemRole(RoleUser) {
		t.Fatal("USER must NOT be recognized as system role")
	}

	if RoleTitles[RoleAdmin] != "Quản Trị Viên" {
		t.Fatalf("unexpected admin title: %s", RoleTitles[RoleAdmin])
	}
	if RoleTitles[RoleAssistant] != "Trợ Lý" {
		t.Fatalf("unexpected assistant title: %s", RoleTitles[RoleAssistant])
	}
	if RoleTitles[RoleSpecialist] != "Chuyên Viên" {
		t.Fatalf("unexpected specialist title: %s", RoleTitles[RoleSpecialist])
	}
	if RoleTitles[RoleUser] != "Người Dùng" {
		t.Fatalf("unexpected user title: %s", RoleTitles[RoleUser])
	}
}

func TestSystemAccountsAndLoginIntegration(t *testing.T) {
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("TEST_DATABASE_URL is not configured")
	}

	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		t.Fatal(err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	db, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()

	// Clean up test data
	cleanup := func() {
		_, err := db.Exec(context.Background(), `
			DELETE FROM email_verification_tokens WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@sys-test.local');
			DELETE FROM email_outbox WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@sys-test.local');
			DELETE FROM user_roles WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@sys-test.local');
			DELETE FROM user_sessions WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@sys-test.local');
			DELETE FROM ledger_accounts WHERE wallet_id IN (SELECT id FROM wallets WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@sys-test.local'));
			DELETE FROM wallets WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@sys-test.local');
			DELETE FROM users WHERE email LIKE '%@sys-test.local';
		`)
		if err != nil {
			t.Logf("cleanup error: %v", err)
		}
	}
	cleanup()
	defer cleanup()

	authRepo := NewRepository(db)
	authService := NewService(authRepo)
	roleRepo := NewRoleRepository(db)
	systemHandler := NewSystemHandler(authService, roleRepo, false)

	// 1. Create System Admin
	t.Run("create_system_admin", func(t *testing.T) {
		body := `{"username":"sys_admin_1","email":"admin1@sys-test.local","password":"SuperAdminPassword123!","role":"ADMIN"}`
		req := httptest.NewRequest(http.MethodPost, "/api/v1/system/accounts", bytes.NewReader([]byte(body)))
		rec := httptest.NewRecorder()

		systemHandler.CreateAccount(rec, req)

		if rec.Code != http.StatusCreated {
			t.Fatalf("expected 201 Created, got %d: %s", rec.Code, rec.Body.String())
		}

		var res map[string]any
		_ = json.Unmarshal(rec.Body.Bytes(), &res)
		data := res["data"].(map[string]any)
		if data["status"] != "ACTIVE" {
			t.Fatalf("system account must be immediately ACTIVE, got %v", data["status"])
		}
	})

	// 2. Create System Assistant (Trợ Lý)
	t.Run("create_system_assistant", func(t *testing.T) {
		body := `{"username":"sys_assistant_1","email":"assistant1@sys-test.local","password":"AssistantPass123!","role":"ASSISTANT"}`
		req := httptest.NewRequest(http.MethodPost, "/api/v1/system/accounts", bytes.NewReader([]byte(body)))
		rec := httptest.NewRecorder()

		systemHandler.CreateAccount(rec, req)

		if rec.Code != http.StatusCreated {
			t.Fatalf("expected 201 Created, got %d: %s", rec.Code, rec.Body.String())
		}
	})

	// 3. Create System Specialist (Chuyên Viên)
	t.Run("create_system_specialist", func(t *testing.T) {
		body := `{"username":"sys_specialist_1","email":"specialist1@sys-test.local","password":"SpecialistPass123!","role":"SPECIALIST"}`
		req := httptest.NewRequest(http.MethodPost, "/api/v1/system/accounts", bytes.NewReader([]byte(body)))
		rec := httptest.NewRecorder()

		systemHandler.CreateAccount(rec, req)

		if rec.Code != http.StatusCreated {
			t.Fatalf("expected 201 Created, got %d: %s", rec.Code, rec.Body.String())
		}
	})

	// 4. Create Normal User (USER role)
	var normalUserID string
	t.Run("create_regular_user", func(t *testing.T) {
		passHash, _ := HashPassword("UserPassword123!")
		user, err := authRepo.Register(ctx, RegisterInput{
			Username:     "regular_user_1",
			Email:        "user1@sys-test.local",
			PasswordHash: passHash,
		})
		if err != nil {
			t.Fatal(err)
		}
		// Activate so credentials pass
		_, _ = db.Exec(ctx, "UPDATE users SET status = 'ACTIVE', email_verified_at = NOW() WHERE id = $1", user.ID)
		normalUserID = user.ID
	})

	// 5. Normal User tries to log in via /api/v1/system/auth/login -> Must be rejected (403 access_denied_not_system_account)
	t.Run("regular_user_rejected_from_system_login", func(t *testing.T) {
		body := `{"email":"user1@sys-test.local","password":"UserPassword123!"}`
		req := httptest.NewRequest(http.MethodPost, "/api/v1/system/auth/login", bytes.NewReader([]byte(body)))
		rec := httptest.NewRecorder()

		systemHandler.SystemLogin(rec, req)

		if rec.Code != http.StatusForbidden {
			t.Fatalf("expected 403 Forbidden, got %d: %s", rec.Code, rec.Body.String())
		}

		var res map[string]any
		_ = json.Unmarshal(rec.Body.Bytes(), &res)
		if res["error"] != "access_denied_not_system_account" {
			t.Fatalf("expected error access_denied_not_system_account, got %v", res["error"])
		}
	})

	// 6. Admin logs in via /api/v1/system/auth/login -> 200 OK with session cookie
	t.Run("admin_login_success", func(t *testing.T) {
		body := `{"email":"admin1@sys-test.local","password":"SuperAdminPassword123!"}`
		req := httptest.NewRequest(http.MethodPost, "/api/v1/system/auth/login", bytes.NewReader([]byte(body)))
		rec := httptest.NewRecorder()

		systemHandler.SystemLogin(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200 OK, got %d: %s", rec.Code, rec.Body.String())
		}

		// Verify cookie
		cookies := rec.Result().Cookies()
		foundCookie := false
		for _, c := range cookies {
			if c.Name == SessionCookieName {
				foundCookie = true
			}
		}
		if !foundCookie {
			t.Fatal("session cookie not found in response")
		}

		var res map[string]any
		_ = json.Unmarshal(rec.Body.Bytes(), &res)
		data := res["data"].(map[string]any)
		userData := data["user"].(map[string]any)
		roles := userData["roles"].([]any)
		if len(roles) == 0 || roles[0] != RoleAdmin {
			t.Fatalf("expected role ADMIN, got %v", roles)
		}
	})

	// 7. Assistant logs in via /api/v1/system/auth/login -> 200 OK
	t.Run("assistant_login_success", func(t *testing.T) {
		body := `{"email":"assistant1@sys-test.local","password":"AssistantPass123!"}`
		req := httptest.NewRequest(http.MethodPost, "/api/v1/system/auth/login", bytes.NewReader([]byte(body)))
		rec := httptest.NewRecorder()

		systemHandler.SystemLogin(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200 OK, got %d: %s", rec.Code, rec.Body.String())
		}
	})

	// 8. Specialist logs in via /api/v1/system/auth/login -> 200 OK
	t.Run("specialist_login_success", func(t *testing.T) {
		body := `{"email":"specialist1@sys-test.local","password":"SpecialistPass123!"}`
		req := httptest.NewRequest(http.MethodPost, "/api/v1/system/auth/login", bytes.NewReader([]byte(body)))
		rec := httptest.NewRecorder()

		systemHandler.SystemLogin(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200 OK, got %d: %s", rec.Code, rec.Body.String())
		}
	})

	// 9. List accounts
	t.Run("list_accounts", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/system/accounts", nil)
		rec := httptest.NewRecorder()

		systemHandler.ListAccounts(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200 OK, got %d", rec.Code)
		}

		var res map[string]any
		_ = json.Unmarshal(rec.Body.Bytes(), &res)
		data := res["data"].([]any)
		if len(data) < 4 {
			t.Fatalf("expected at least 4 accounts, got %d", len(data))
		}
	})

	_ = normalUserID
}
