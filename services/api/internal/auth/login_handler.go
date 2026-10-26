package auth

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
)

type LoginHandler struct {
	service *Service
	secure  bool
}

func NewLoginHandler(
	service *Service,
	secure bool,
) *LoginHandler {
	return &LoginHandler{
		service: service,
		secure:  secure,
	}
}

func (h *LoginHandler) Login(
	w http.ResponseWriter,
	r *http.Request,
) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")

	r.Body = http.MaxBytesReader(w, r.Body, 4096)

	var input LoginInput

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()

	if err := decoder.Decode(&input); err != nil {
		http.Error(w, `{"success":false,"error":"invalid_request"}`,
			http.StatusBadRequest)
		return
	}

	// Reject trailing JSON values.
	var extra any
	if err := decoder.Decode(&extra); err != io.EOF {
		http.Error(w, `{"success":false,"error":"invalid_request"}`,
			http.StatusBadRequest)
		return
	}

	result, err := h.service.Login(
		r.Context(),
		input,
	)

	if err != nil {
		switch {
		case errors.Is(err, ErrInvalidCredentials):
			http.Error(w,
				`{"success":false,"error":"invalid_credentials"}`,
				http.StatusUnauthorized)

		case errors.Is(err, ErrAccountInactive),
			errors.Is(err, ErrEmailNotVerified):
			http.Error(w,
				`{"success":false,"error":"account_unavailable"}`,
				http.StatusForbidden)

		default:
			http.Error(w,
				`{"success":false,"error":"internal_error"}`,
				http.StatusInternalServerError)
		}

		return
	}

	SetSessionCookie(w, result.Token, h.secure)

	w.WriteHeader(http.StatusOK)

	_ = json.NewEncoder(w).Encode(map[string]any{
		"success": true,
		"data": map[string]any{
			"user": map[string]string{
				"id":       result.UserID,
				"username": result.Username,
				"email":    result.Email,
			},
			"expires_at": result.ExpiresAt,
		},
	})
}
