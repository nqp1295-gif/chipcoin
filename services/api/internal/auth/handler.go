package auth

import (
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
)

type Handler struct {
	service    *Service
	outboxRepo *OutboxRepository
}

func NewHandler(service *Service, outboxRepo ...*OutboxRepository) *Handler {
	var repo *OutboxRepository
	if len(outboxRepo) > 0 {
		repo = outboxRepo[0]
	}
	return &Handler{
		service:    service,
		outboxRepo: repo,
	}
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
		case errors.Is(err, ErrInvalidUsername):
			writeJSON(w, http.StatusBadRequest, map[string]any{
				"success": false,
				"error":   "invalid_username",
				"message": "Tên người dùng không hợp lệ. Vui lòng nhập từ 2 - 50 ký tự (chữ cái tiếng Việt/Anh, số, khoảng trắng, gạch dưới _, gạch ngang - hoặc dấu .).",
			})

		case errors.Is(err, ErrInvalidEmail):
			writeJSON(w, http.StatusBadRequest, map[string]any{
				"success": false,
				"error":   "invalid_email",
				"message": "Địa chỉ email không hợp lệ. Vui lòng kiểm tra lại định dạng email.",
			})

		case errors.Is(err, ErrWeakPassword):
			writeJSON(w, http.StatusBadRequest, map[string]any{
				"success": false,
				"error":   "weak_password",
				"message": "Mật khẩu chưa đáp ứng yêu cầu bảo mật (tối thiểu 12 ký tự).",
			})

		case errors.Is(err, ErrDuplicateAccount):
			writeJSON(w, http.StatusConflict, map[string]any{
				"success": false,
				"error":   "account_already_exists",
				"message": "Tên đăng nhập hoặc địa chỉ email này đã được sử dụng.",
			})

		default:
			log.Printf("ERROR: Register failed for user %q (%q): %v", req.Username, req.Email, err)
			writeJSON(w, http.StatusInternalServerError, map[string]any{
				"success": false,
				"error":   "internal_error",
				"message": "Lỗi xử lý nội bộ của máy chủ.",
				"detail":  err.Error(),
			})
		}
		return
	}

	if h.outboxRepo != nil {
		if err := h.outboxRepo.QueueResend(r.Context(), user.ID); err != nil {
			log.Printf("ERROR: Failed to queue verification email for user %s (%s): %v", user.ID, user.Email, err)
		} else {
			log.Printf("INFO: Successfully queued verification email for user %s (%s)", user.ID, user.Email)
		}
	} else {
		log.Printf("WARN: outboxRepo is nil in authHandler. Register did not queue email for user %s (%s)", user.ID, user.Email)
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"success": true,
		"message": "Account created successfully",
		"data":    user,
	})
}
