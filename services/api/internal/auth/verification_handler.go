package auth

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
)

type VerificationHandler struct {
	service *VerificationService
}

func NewVerificationHandler(
	service *VerificationService,
) *VerificationHandler {
	return &VerificationHandler{
		service: service,
	}
}

type verifyEmailRequest struct {
	Token string `json:"token"`
}

func (h *VerificationHandler) VerifyEmail(
	w http.ResponseWriter,
	r *http.Request,
) {
	if r.Method != http.MethodPost {
		w.Header().Set("Allow", http.MethodPost)
		writeVerificationJSON(
			w,
			http.StatusMethodNotAllowed,
			false,
			"method_not_allowed",
		)
		return
	}

	defer r.Body.Close()

	var req verifyEmailRequest

	r.Body = http.MaxBytesReader(w, r.Body, 4096)

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()

	if err := decoder.Decode(&req); err != nil {
		writeVerificationJSON(
			w,
			http.StatusBadRequest,
			false,
			"invalid_request",
		)
		return
	}

	// Reject additional JSON values.
	var extra json.RawMessage
	if err := decoder.Decode(&extra); err != io.EOF {
		writeVerificationJSON(
			w,
			http.StatusBadRequest,
			false,
			"invalid_request",
		)
		return
	}

	err := h.service.VerifyEmail(
		r.Context(),
		req.Token,
	)

	if err != nil {
		switch {
		case errors.Is(err, ErrVerificationTokenRequired),
			errors.Is(err, ErrInvalidVerificationToken),
			errors.Is(err, ErrVerificationNotFound):

			writeVerificationJSON(
				w,
				http.StatusBadRequest,
				false,
				"invalid_verification_token",
			)

		case errors.Is(err, ErrVerificationExpired):

			writeVerificationJSON(
				w,
				http.StatusBadRequest,
				false,
				"verification_token_expired",
			)

		case errors.Is(err, ErrVerificationUsed):

			writeVerificationJSON(
				w,
				http.StatusBadRequest,
				false,
				"verification_token_used",
			)

		case errors.Is(err, ErrAccountNotPending):

			writeVerificationJSON(
				w,
				http.StatusConflict,
				false,
				"account_not_pending",
			)

		default:

			writeVerificationJSON(
				w,
				http.StatusInternalServerError,
				false,
				"internal_error",
			)
		}

		return
	}

	writeVerificationJSON(
		w,
		http.StatusOK,
		true,
		"email_verified",
	)
}

func writeVerificationJSON(
	w http.ResponseWriter,
	status int,
	success bool,
	message string,
) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)

	if success {
		_ = json.NewEncoder(w).Encode(map[string]any{
			"success": true,
			"message": message,
		})
		return
	}

	_ = json.NewEncoder(w).Encode(map[string]any{
		"success": false,
		"error":   message,
	})
}
