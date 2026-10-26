package auth

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 4096)
	defer r.Body.Close()

	var req RegisterRequest

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()

	if err := decoder.Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"success": false,
			"error":   "invalid_request",
		})
		return
	}

	// Không chấp nhận nhiều JSON object trong cùng request.
	var extra any
	if err := decoder.Decode(&extra); !errors.Is(err, io.EOF) {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"success": false,
			"error":   "invalid_request",
		})
		return
	}

	user, err := h.service.Register(r.Context(), req)

	if err != nil {
		switch {
		case errors.Is(err, ErrInvalidUsername),
			errors.Is(err, ErrInvalidEmail),
			errors.Is(err, ErrWeakPassword):

			writeJSON(w, http.StatusBadRequest, map[string]any{
				"success": false,
				"error":   err.Error(),
			})

		case errors.Is(err, ErrDuplicateAccount):
			writeJSON(w, http.StatusConflict, map[string]any{
				"success": false,
				"error":   "account_already_exists",
			})

		default:
			writeJSON(w, http.StatusInternalServerError, map[string]any{
				"success": false,
				"error":   "internal_error",
			})
		}
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"success": true,
		"message": "Account created successfully",
		"data":    user,
	})
}
