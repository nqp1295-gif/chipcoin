package email

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/mail"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type DiagnosticsHandler struct {
	cfg    GmailSMTPConfig
	sender Sender
	db     *pgxpool.Pool
	url    string
}

func NewDiagnosticsHandler(
	cfg GmailSMTPConfig,
	sender Sender,
	db *pgxpool.Pool,
	publicURL string,
) *DiagnosticsHandler {
	return &DiagnosticsHandler{
		cfg:    cfg,
		sender: sender,
		db:     db,
		url:    publicURL,
	}
}

type emailTestRequest struct {
	To       string `json:"to"`
	Template string `json:"template"` // "verification", "success", "test"
}

func (h *DiagnosticsHandler) Status(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.Header().Set("Allow", http.MethodGet)
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	metrics := map[string]int{
		"pending":    0,
		"processing": 0,
		"sent":       0,
		"failed":     0,
	}

	if h.db != nil {
		ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
		defer cancel()

		rows, err := h.db.Query(ctx, `SELECT status, count(*) FROM email_outbox GROUP BY status;`)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var st string
				var cnt int
				if err := rows.Scan(&st, &cnt); err == nil {
					metrics[strings.ToLower(st)] = cnt
				}
			}
		}
	}

	resp := map[string]any{
		"service":           "daocoin-email-worker",
		"provider":          "gmail_smtp",
		"smtp_host":         h.cfg.Host,
		"smtp_port":         h.cfg.Port,
		"smtp_username":     h.cfg.Username,
		"smtp_from_email":   h.cfg.FromEmail,
		"smtp_from_name":    h.cfg.FromName,
		"starttls_required": h.cfg.RequireSTARTTLS,
		"public_url":        h.url,
		"password_set":      h.cfg.Password != "",
		"metrics":           metrics,
		"timestamp":         time.Now().UTC().Format(time.RFC3339),
	}

	_ = json.NewEncoder(w).Encode(resp)
}

func (h *DiagnosticsHandler) TestSend(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Set("Allow", http.MethodPost)
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	var req emailTestRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]any{
			"success": false,
			"error":   "invalid JSON payload",
		})
		return
	}

	to := strings.TrimSpace(req.To)
	if to == "" {
		to = h.cfg.Username
	}

	if _, err := mail.ParseAddress(to); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]any{
			"success": false,
			"error":   "invalid recipient email address: " + to,
		})
		return
	}

	start := time.Now()
	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()

	var sendErr error
	var templateUsed string

	switch req.Template {
	case "success":
		templateUsed = "Mẫu B: Thông báo xác thực thành công"
		loginURL := h.url + "/login"
		if ext, ok := h.sender.(ExtendedSender); ok {
			sendErr = ext.SendVerificationSuccess(ctx, to, loginURL)
		} else {
			sendErr = h.sender.SendVerification(ctx, to, loginURL)
		}

	case "test":
		templateUsed = "Mẫu C: Kiểm tra kết nối chẩn đoán Gmail SMTP"
		if ext, ok := h.sender.(ExtendedSender); ok {
			sendErr = ext.SendTestEmail(ctx, to, "Trực tiếp từ Cổng Quản Trị Hệ Thống CHIPCOIN")
		} else {
			sendErr = h.sender.SendVerification(ctx, to, h.url+"/verify-email?token="+strings.Repeat("a", 64))
		}

	default: // "verification"
		templateUsed = "Mẫu A: Yêu cầu xác thực tài khoản"
		sampleToken := strings.Repeat("0", 63) + "1"
		sampleURL := fmt.Sprintf("%s/verify-email?token=%s", h.url, sampleToken)
		sendErr = h.sender.SendVerification(ctx, to, sampleURL)
	}

	durationMs := time.Since(start).Milliseconds()

	if sendErr != nil {
		w.WriteHeader(http.StatusBadGateway)
		_ = json.NewEncoder(w).Encode(map[string]any{
			"success":     false,
			"error":       sendErr.Error(),
			"duration_ms": durationMs,
			"to":          to,
			"template":    templateUsed,
			"provider":    "gmail_smtp",
		})
		return
	}

	_ = json.NewEncoder(w).Encode(map[string]any{
		"success":     true,
		"message":     fmt.Sprintf("Email %s đã được gửi thành công qua Gmail SMTP (%s:%d)", templateUsed, h.cfg.Host, h.cfg.Port),
		"duration_ms": durationMs,
		"to":          to,
		"template":    templateUsed,
		"sender":      fmt.Sprintf("%s <%s>", h.cfg.FromName, h.cfg.FromEmail),
	})
}
