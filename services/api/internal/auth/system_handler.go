package auth

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/mail"
	"strings"
	"unicode/utf8"
)

type SystemHandler struct {
	authService *Service
	roleRepo    *RoleRepository
	secure      bool
}

func NewSystemHandler(
	authService *Service,
	roleRepo *RoleRepository,
	secure bool,
) *SystemHandler {
	return &SystemHandler{
		authService: authService,
		roleRepo:    roleRepo,
		secure:      secure,
	}
}

// SystemLoginRequest payload for accounts-system login.
type SystemLoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// CreateSystemAccountRequest payload to create staff / management accounts.
type CreateSystemAccountRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Role     string `json:"role"`
}

// SystemLogin handles login specifically for system management accounts.
// Non-system accounts (USER role only) will be rejected with 403 Forbidden.
func (h *SystemHandler) SystemLogin(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 4096)
	defer r.Body.Close()

	var req SystemLoginRequest
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()

	if err := decoder.Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"success": false,
			"error":   "invalid_request",
		})
		return
	}

	var extra any
	if err := decoder.Decode(&extra); !errors.Is(err, io.EOF) {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"success": false,
			"error":   "invalid_request",
		})
		return
	}

	// 1. Authenticate credentials
	result, err := h.authService.Login(r.Context(), LoginInput{
		Email:    req.Email,
		Password: req.Password,
	})
	if err != nil {
		switch {
		case errors.Is(err, ErrInvalidCredentials):
			writeJSON(w, http.StatusUnauthorized, map[string]any{
				"success": false,
				"error":   "invalid_credentials",
				"message": "Email hoặc mật khẩu hệ thống không chính xác.",
			})
		case errors.Is(err, ErrAccountInactive), errors.Is(err, ErrEmailNotVerified):
			writeJSON(w, http.StatusForbidden, map[string]any{
				"success": false,
				"error":   "account_unavailable",
				"message": "Tài khoản hệ thống chưa được kích hoạt.",
			})
		default:
			writeJSON(w, http.StatusInternalServerError, map[string]any{
				"success": false,
				"error":   "internal_error",
			})
		}
		return
	}

	// 2. Verify system role permission
	roles, err := h.roleRepo.GetUserRoles(r.Context(), result.UserID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{
			"success": false,
			"error":   "internal_error",
		})
		return
	}

	if !HasAnySystemRole(roles) {
		// Reject regular users from accessing accounts-system
		writeJSON(w, http.StatusForbidden, map[string]any{
			"success": false,
			"error":   "access_denied_not_system_account",
			"message": "Tài khoản không thuộc nhóm quản trị hệ thống.",
		})
		return
	}

	// 3. Issue Session Cookie
	SetSessionCookie(w, result.Token, h.secure)

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"message": "Đăng nhập cổng quản trị hệ thống thành công",
		"data": map[string]any{
			"user": map[string]any{
				"id":       result.UserID,
				"username": result.Username,
				"email":    result.Email,
				"roles":    roles,
			},
			"expires_at": result.ExpiresAt,
		},
	})
}

// ListAccounts returns all accounts with their assigned roles.
func (h *SystemHandler) ListAccounts(w http.ResponseWriter, r *http.Request) {
	accounts, err := h.roleRepo.ListAccounts(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{
			"success": false,
			"error":   "internal_error",
			"message": "Không thể tải danh sách tài khoản.",
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    accounts,
	})
}

// CreateAccount allows creating a new system account with immediate ACTIVE status.
func (h *SystemHandler) CreateAccount(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 4096)
	defer r.Body.Close()

	var req CreateSystemAccountRequest
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()

	if err := decoder.Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"success": false,
			"error":   "invalid_request",
		})
		return
	}

	req.Username = strings.TrimSpace(req.Username)
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	req.Role = strings.ToUpper(strings.TrimSpace(req.Role))

	if !usernamePattern.MatchString(req.Username) {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"success": false,
			"error":   "invalid_username",
			"message": "Tên người dùng không hợp lệ (3-30 ký tự, chữ, số, gạch dưới).",
		})
		return
	}

	if _, err := mail.ParseAddress(req.Email); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"success": false,
			"error":   "invalid_email",
			"message": "Địa chỉ email không hợp lệ.",
		})
		return
	}

	if utf8.RuneCountInString(req.Password) < 12 || len(req.Password) > 1024 {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"success": false,
			"error":   "weak_password",
			"message": "Mật khẩu phải có độ dài tối thiểu 12 ký tự.",
		})
		return
	}

	if !IsSystemRole(req.Role) && req.Role != RoleUser {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"success": false,
			"error":   "invalid_role",
			"message": "Cấp phân quyền không hợp lệ. Hỗ trợ: ADMIN, ASSISTANT, SPECIALIST, USER.",
		})
		return
	}

	passwordHash, err := HashPassword(req.Password)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{
			"success": false,
			"error":   "internal_error",
		})
		return
	}

	account, err := h.roleRepo.CreateSystemAccount(r.Context(), CreateSystemAccountInput{
		Username:     req.Username,
		Email:        req.Email,
		PasswordHash: passwordHash,
		Role:         req.Role,
	})
	if err != nil {
		if errors.Is(err, ErrDuplicateAccount) {
			writeJSON(w, http.StatusConflict, map[string]any{
				"success": false,
				"error":   "account_already_exists",
				"message": "Tên người dùng hoặc email này đã tồn tại.",
			})
			return
		}

		writeJSON(w, http.StatusInternalServerError, map[string]any{
			"success": false,
			"error":   "internal_error",
			"message": "Không thể tạo tài khoản lúc này.",
		})
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"success": true,
		"message": "Tạo tài khoản quản trị thành công",
		"data":    account,
	})
}
