package auth

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/mail"
	"strings"
)

const resendGenericMessage = "If the account is eligible, a verification email will be queued."

type ResendAccountLookup interface {
	FindEligibleUserID(
		ctx context.Context,
		emailAddress string,
	) (string, bool, error)
}

type ResendVerificationRequester interface {
	RequestResend(
		ctx context.Context,
		userID string,
	) error
}

type ResendVerificationHandler struct {
	lookup  ResendAccountLookup
	service ResendVerificationRequester
}

func NewResendVerificationHandler(
	lookup ResendAccountLookup,
	service ResendVerificationRequester,
) (*ResendVerificationHandler, error) {
	if lookup == nil || service == nil {
		return nil, errors.New(
			"resend verification handler dependencies are required",
		)
	}

	return &ResendVerificationHandler{
		lookup:  lookup,
		service: service,
	}, nil
}

type resendVerificationRequest struct {
	Email string `json:"email"`
}

func (h *ResendVerificationHandler) ResendVerification(
	w http.ResponseWriter,
	r *http.Request,
) {
	if r.Method != http.MethodPost {
		w.Header().Set("Allow", http.MethodPost)

		writeJSON(
			w,
			http.StatusMethodNotAllowed,
			map[string]any{
				"success": false,
				"error":   "method_not_allowed",
			},
		)
		return
	}

	if h == nil || h.lookup == nil || h.service == nil {
		writeJSON(
			w,
			http.StatusInternalServerError,
			map[string]any{
				"success": false,
				"error":   "internal_error",
			},
		)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 4096)
	defer r.Body.Close()

	var req resendVerificationRequest

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()

	if err := decoder.Decode(&req); err != nil {
		writeJSON(
			w,
			http.StatusBadRequest,
			map[string]any{
				"success": false,
				"error":   "invalid_request",
			},
		)
		return
	}

	var extra any

	if err := decoder.Decode(&extra); !errors.Is(err, io.EOF) {
		writeJSON(
			w,
			http.StatusBadRequest,
			map[string]any{
				"success": false,
				"error":   "invalid_request",
			},
		)
		return
	}

	emailAddress := strings.ToLower(
		strings.TrimSpace(req.Email),
	)

	if len(emailAddress) == 0 || len(emailAddress) > 254 {
		writeResendInvalidEmail(w)
		return
	}

	parsed, err := mail.ParseAddress(emailAddress)
	if err != nil || parsed.Address != emailAddress {
		writeResendInvalidEmail(w)
		return
	}

	userID, eligible, err := h.lookup.FindEligibleUserID(
		r.Context(),
		emailAddress,
	)

	if err != nil {
		writeResendInternalError(w)
		return
	}

	if !eligible {
		writeResendGenericSuccess(w)
		return
	}

	err = h.service.RequestResend(
		r.Context(),
		userID,
	)

	if err != nil {
		switch {
		case errors.Is(err, ErrResendNotEligible),
			errors.Is(err, ErrResendRateLimited):

			writeResendGenericSuccess(w)
			return

		default:
			writeResendInternalError(w)
			return
		}
	}

	writeResendGenericSuccess(w)
}

func writeResendInvalidEmail(w http.ResponseWriter) {
	writeJSON(
		w,
		http.StatusBadRequest,
		map[string]any{
			"success": false,
			"error":   "invalid_email",
		},
	)
}

func writeResendGenericSuccess(w http.ResponseWriter) {
	writeJSON(
		w,
		http.StatusOK,
		map[string]any{
			"success": true,
			"message": resendGenericMessage,
		},
	)
}

func writeResendInternalError(w http.ResponseWriter) {
	writeJSON(
		w,
		http.StatusInternalServerError,
		map[string]any{
			"success": false,
			"error":   "internal_error",
		},
	)
}
