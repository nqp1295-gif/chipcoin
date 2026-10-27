package email

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"html"
	"net"
	"net/http"
	"net/mail"
	"net/smtp"
	"net/url"
	"strings"
	"time"
)

var (
	ErrSMTPAuthFailed      = errors.New("smtp authentication failed")
	ErrSMTPConnectionError = errors.New("smtp connection error")
	ErrSMTPSendError       = errors.New("smtp send error")
)

type GmailSMTPConfig struct {
	Host             string
	Port             int
	Username         string
	Password         string
	FromEmail        string
	FromName         string
	RequireSTARTTLS  bool
	ConnectTimeout   time.Duration
	SendTimeout      time.Duration
	RelayURL         string
	RelaySecret      string
}

type GmailSMTPSender struct {
	cfg GmailSMTPConfig
}

func NewGmailSMTPSender(cfg GmailSMTPConfig) *GmailSMTPSender {
	if cfg.Host == "" {
		cfg.Host = "smtp.gmail.com"
	}
	if cfg.Port <= 0 {
		cfg.Port = 587
	}
	if cfg.FromEmail == "" {
		cfg.FromEmail = cfg.Username
	}
	if cfg.FromName == "" {
		cfg.FromName = "CHIPCOIN | Xác thực tài khoản"
	}
	if cfg.ConnectTimeout <= 0 {
		cfg.ConnectTimeout = 3 * time.Second
	}
	if cfg.SendTimeout <= 0 {
		cfg.SendTimeout = 15 * time.Second
	}
	if cfg.RelayURL == "" {
		cfg.RelayURL = "https://chiprin.com"
	}
	if cfg.RelaySecret == "" {
		cfg.RelaySecret = "0123456789abcdef0123456789abcdef"
	}

	// Clean Google App Password (remove spaces typically formatted as "abcd efgh ijkl mnop")
	cfg.Password = strings.ReplaceAll(cfg.Password, " ", "")
	cfg.Password = strings.TrimSpace(cfg.Password)

	return &GmailSMTPSender{cfg: cfg}
}

// SendVerification implements the Sender interface (Phase 7 - Mẫu A).
func (s *GmailSMTPSender) SendVerification(
	ctx context.Context,
	to string,
	verificationURL string,
) error {
	recipient, err := mail.ParseAddress(to)
	if err != nil || recipient.Address != to || strings.ContainsAny(to, "\r\n") {
		return ErrInvalidRecipient
	}

	parsedURL, err := url.Parse(verificationURL)
	if err != nil || (parsedURL.Scheme != "https" && parsedURL.Scheme != "http") || parsedURL.Host == "" || parsedURL.User != nil {
		return ErrInvalidLink
	}

	displayName := strings.Split(to, "@")[0]
	safeDisplayName := html.EscapeString(displayName)
	safeURL := html.EscapeString(verificationURL)

	rawToken := parsedURL.Query().Get("token")
	safeToken := html.EscapeString(rawToken)

	subject := "[CHIPCOIN] Mã xác thực tài khoản của bạn"

	var tokenTextBlock string
	if rawToken != "" {
		tokenTextBlock = fmt.Sprintf("\n🔑 MÃ XÁC MINH CỦA BẠN (TOKEN 64 KÝ TỰ HEX):\n%s\n\nBạn có thể hoàn tất kích hoạt tài khoản bằng 1 trong 2 cách:\n- Cách 1: Nhấn trực tiếp vào liên kết bên dưới.\n- Cách 2: Mở trang xác thực https://chiprin.com/verify-email và dán mã 64 ký tự ở trên vào ô \"Mã xác minh (Token)\".\n", rawToken)
	}

	// Plain text version (Phase 7 - Mẫu A)
	textBody := fmt.Sprintf(`Xin chào %s,

Cảm ơn bạn đã đăng ký tài khoản CHIPCOIN.
%s
Liên kết xác thực trực tiếp:
%s

Liên kết và mã xác minh có hiệu lực trong 15 phút và chỉ sử dụng một lần.

Nếu bạn không tạo tài khoản này, hãy bỏ qua email. Không chia sẻ mã xác thực với bất kỳ ai.

Trân trọng,
Đội ngũ CHIPCOIN
Email gửi tự động từ %s — vui lòng không gửi mật khẩu hoặc mã bảo mật qua email.
`, displayName, tokenTextBlock, verificationURL, s.cfg.FromEmail)

	var tokenHTMLBlock string
	if safeToken != "" {
		tokenHTMLBlock = fmt.Sprintf(`
              <!-- Token Box for copy-paste -->
              <div style="background:#0e1014;border:1px dashed #d4af37;border-radius:12px;padding:18px;margin:0 0 24px 0;text-align:center">
                <div style="font-size:12px;font-weight:700;color:#f5d77f;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:8px">
                  🔑 MÃ XÁC MINH TÀI KHOẢN (TOKEN 64 KÝ TỰ HEX)
                </div>
                <div style="font-family:'Courier New',Courier,monospace;font-size:13px;font-weight:700;color:#38bdf8;background:#18191d;padding:12px 14px;border-radius:6px;word-break:break-all;user-select:all;-webkit-user-select:all;border:1px solid #28241b;margin-bottom:10px">
                  %s
                </div>
                <div style="font-size:12px;color:#94a3b8;line-height:1.4">
                  Sao chép mã trên và dán vào ô <strong>Mã xác minh (Token)</strong> tại trang xác thực email, hoặc bấm nút xác nhận bên dưới.
                </div>
              </div>`, safeToken)
	}

	// HTML version (Phase 7 - Mẫu A, responsive luxury design)
	htmlBody := fmt.Sprintf(`<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Xác thực email CHIPCOIN</title>
</head>
<body style="margin:0;padding:0;background:#0b0c0e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f3f4f6">
  <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="padding:40px 16px;background:#0b0c0e">
    <tr>
      <td align="center">
        <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#18191d;border:1px solid #332a18;border-radius:16px;padding:36px;box-shadow:0 20px 48px rgba(0,0,0,0.6)">
          <tr>
            <td style="padding-bottom:24px;border-bottom:1px solid #2a251b">
              <span style="font-size:26px;font-weight:900;letter-spacing:-0.02em;background:linear-gradient(135deg,#f5d77f 0%%,#d4af37 100%%);-webkit-background-clip:text;color:#f5d77f">
                🪙 CHIPCOIN
              </span>
              <div style="font-size:11px;color:#94a3b8;font-weight:700;letter-spacing:0.08em;margin-top:4px">
                HỆ THỐNG XÁC THỰC BẢO MẬT GMAIL SMTP
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding-top:28px">
              <h1 style="font-size:22px;color:#ffffff;margin:0 0 16px 0;font-weight:800">
                Xác thực địa chỉ email của bạn
              </h1>
              <p style="font-size:15px;line-height:1.6;color:#cbd5e1;margin:0 0 16px 0">
                Xin chào <strong>%s</strong>,
              </p>
              <p style="font-size:15px;line-height:1.6;color:#cbd5e1;margin:0 0 24px 0">
                Cảm ơn bạn đã đăng ký tài khoản CHIPCOIN. Sử dụng mã xác minh hoặc liên kết bên dưới để kích hoạt tài khoản và nhận ngay <strong>+5,000 CHIP</strong> chào mừng.
              </p>

%s

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 28px 0">
                <tr>
                  <td align="center" style="border-radius:10px;background:linear-gradient(135deg,#f5d77f 0%%,#d4af37 100%%);box-shadow:0 8px 24px rgba(212,175,55,0.3)">
                    <a href="%s" target="_blank" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:800;color:#0b0c0e;text-decoration:none;letter-spacing:0.02em">
                      ✓ Xác Thực Kích Hoạt Tài Khoản Ngay
                    </a>
                  </td>
                </tr>
              </table>

              <div style="background:#111215;border:1px solid #28241b;border-radius:10px;padding:16px;margin-bottom:24px">
                <p style="font-size:13px;line-height:1.5;color:#fbbf24;margin:0 0 8px 0;font-weight:700">
                  ⏳ Liên kết và mã xác minh chỉ có hiệu lực trong 15 phút và chỉ sử dụng một lần.
                </p>
                <p style="font-size:12px;line-height:1.5;color:#94a3b8;margin:0">
                  Nếu nút trên không mở được, hãy sao chép và dán liên kết sau vào trình duyệt:<br>
                  <a href="%s" style="color:#38bdf8;word-break:break-all;font-size:12px">%s</a>
                </p>
              </div>

              <hr style="border:0;border-top:1px solid #2a251b;margin:24px 0">

              <p style="font-size:12px;line-height:1.6;color:#64748b;margin:0 0 8px 0">
                Nếu bạn không thực hiện đăng ký này, hãy bỏ qua email. Không chia sẻ mã xác thực cho bất kỳ ai để bảo vệ tài sản của bạn.
              </p>
              <p style="font-size:12px;line-height:1.6;color:#64748b;margin:0">
                CHIPCOIN · Email gửi tự động từ <strong>%s</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`, safeDisplayName, tokenHTMLBlock, safeURL, safeURL, safeURL, s.cfg.FromEmail)

	return s.sendMail(ctx, to, subject, textBody, htmlBody)
}

// SendVerificationSuccess sends Template B (Phase 7 - Mẫu B).
func (s *GmailSMTPSender) SendVerificationSuccess(
	ctx context.Context,
	to string,
	loginURL string,
) error {
	recipient, err := mail.ParseAddress(to)
	if err != nil || recipient.Address != to || strings.ContainsAny(to, "\r\n") {
		return ErrInvalidRecipient
	}

	displayName := strings.Split(to, "@")[0]
	safeDisplayName := html.EscapeString(displayName)
	safeLoginURL := html.EscapeString(loginURL)
	verifiedAt := time.Now().UTC().Format("15:04:05 02/01/2006 UTC")

	subject := "[CHIPCOIN] Tài khoản của bạn đã được xác thực thành công"

	textBody := fmt.Sprintf(`Xin chào %s,

Địa chỉ email liên kết với tài khoản CHIPCOIN của bạn đã được xác thực thành công vào %s.

Bạn có thể đăng nhập và sử dụng các tính năng tích lũy điểm thưởng CHIP và quy đổi USDT:
%s

Nếu bạn không thực hiện thao tác này, hãy liên hệ bộ phận hỗ trợ CHIPCOIN qua kênh hỗ trợ chính thức trên website.

Trân trọng,
Đội ngũ CHIPCOIN
Email gửi tự động từ %s.
`, displayName, verifiedAt, loginURL, s.cfg.FromEmail)

	htmlBody := fmt.Sprintf(`<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Xác thực thành công CHIPCOIN</title>
</head>
<body style="margin:0;padding:0;background:#0b0c0e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f3f4f6">
  <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="padding:40px 16px;background:#0b0c0e">
    <tr>
      <td align="center">
        <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#18191d;border:1px solid #1a3328;border-radius:16px;padding:36px;box-shadow:0 20px 48px rgba(0,0,0,0.6)">
          <tr>
            <td style="padding-bottom:24px;border-bottom:1px solid #20382b">
              <span style="font-size:26px;font-weight:900;letter-spacing:-0.02em;color:#34d399">
                ✓ CHIPCOIN KÍCH HOẠT
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding-top:28px">
              <h1 style="font-size:22px;color:#ffffff;margin:0 0 16px 0;font-weight:800">
                Tài khoản đã được xác thực thành công!
              </h1>
              <p style="font-size:15px;line-height:1.6;color:#cbd5e1;margin:0 0 16px 0">
                Xin chào <strong>%s</strong>,
              </p>
              <p style="font-size:15px;line-height:1.6;color:#cbd5e1;margin:0 0 24px 0">
                Địa chỉ email của bạn đã được xác thực thành công vào <strong>%s</strong>. Tài khoản của bạn hiện đã ở trạng thái <strong>ACTIVE</strong> và sẵn sàng tham gia các hoạt động tích luỹ CHIP, nâng hạng và liên kết ví TON.
              </p>

              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 28px 0">
                <tr>
                  <td align="center" style="border-radius:10px;background:linear-gradient(135deg,#34d399 0%%,#059669 100%%);box-shadow:0 8px 24px rgba(52,211,153,0.3)">
                    <a href="%s" target="_blank" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:800;color:#0b0c0e;text-decoration:none">
                      Đăng Nhập Vào Hệ Thống →
                    </a>
                  </td>
                </tr>
              </table>

              <hr style="border:0;border-top:1px solid #20382b;margin:24px 0">

              <p style="font-size:12px;line-height:1.6;color:#64748b;margin:0">
                CHIPCOIN · Email gửi tự động từ <strong>%s</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`, safeDisplayName, verifiedAt, safeLoginURL, s.cfg.FromEmail)

	return s.sendMail(ctx, to, subject, textBody, htmlBody)
}

// SendTestEmail sends a diagnostic email for admin/staff verification.
func (s *GmailSMTPSender) SendTestEmail(
	ctx context.Context,
	to string,
	diagnosticInfo string,
) error {
	subject := "[CHIPCOIN TEST] Kiểm tra kết nối Gmail SMTP"
	textBody := fmt.Sprintf("Kiểm tra kết nối Gmail SMTP thành công!\n\nThời gian: %s\nNgười gửi: %s\nThông tin: %s",
		time.Now().UTC().Format(time.RFC3339), s.cfg.FromEmail, diagnosticInfo)
	htmlBody := fmt.Sprintf("<div style='background:#111;color:#fff;padding:20px;font-family:sans-serif'><h2>✓ Kiểm tra Gmail SMTP Thành Công</h2><p>Thời gian: %s</p><p>Người gửi: %s</p><p>Thông tin: %s</p></div>",
		time.Now().UTC().Format(time.RFC3339), s.cfg.FromEmail, html.EscapeString(diagnosticInfo))

	return s.sendMail(ctx, to, subject, textBody, htmlBody)
}

func (s *GmailSMTPSender) sendMail(
	ctx context.Context,
	to string,
	subject string,
	textBody string,
	htmlBody string,
) error {
	if s.cfg.Password == "" {
		// If password is not yet configured, log and return informative error
		return fmt.Errorf("%w: SMTP_PASSWORD (App Password) is not configured for %s", ErrSMTPAuthFailed, s.cfg.Username)
	}

	boundary := fmt.Sprintf("=_chipcoin_%d", time.Now().UnixNano())

	// Build MIME headers with encoded-word subject
	encodedSubject := fmt.Sprintf("=?UTF-8?B?%s?=", base64.StdEncoding.EncodeToString([]byte(subject)))
	fromHeader := fmt.Sprintf("%s <%s>", s.cfg.FromName, s.cfg.FromEmail)

	var msg strings.Builder
	msg.WriteString(fmt.Sprintf("From: %s\r\n", fromHeader))
	msg.WriteString(fmt.Sprintf("To: %s\r\n", to))
	msg.WriteString(fmt.Sprintf("Subject: %s\r\n", encodedSubject))
	msg.WriteString(fmt.Sprintf("Date: %s\r\n", time.Now().UTC().Format(time.RFC1123Z)))
	msg.WriteString("MIME-Version: 1.0\r\n")
	msg.WriteString(fmt.Sprintf("Content-Type: multipart/alternative; boundary=\"%s\"\r\n", boundary))
	msg.WriteString("\r\n")

	// Text Part
	msg.WriteString(fmt.Sprintf("--%s\r\n", boundary))
	msg.WriteString("Content-Type: text/plain; charset=UTF-8\r\n")
	msg.WriteString("Content-Transfer-Encoding: 8bit\r\n\r\n")
	msg.WriteString(textBody)
	msg.WriteString("\r\n\r\n")

	// HTML Part
	msg.WriteString(fmt.Sprintf("--%s\r\n", boundary))
	msg.WriteString("Content-Type: text/html; charset=UTF-8\r\n")
	msg.WriteString("Content-Transfer-Encoding: 8bit\r\n\r\n")
	msg.WriteString(htmlBody)
	msg.WriteString("\r\n\r\n")

	// End Boundary
	msg.WriteString(fmt.Sprintf("--%s--\r\n", boundary))

	rawMessage := []byte(msg.String())

	// 1. Try direct SMTP connection first
	directErr := s.sendDirect(ctx, to, rawMessage)
	if directErr == nil {
		return nil
	}

	// 2. If direct SMTP connection fails (e.g. Render blocks port 587/465 with dial tcp i/o timeout),
	// automatically fallback to HTTPS relay on port 443
	if s.cfg.RelayURL != "" {
		if relayErr := s.sendViaRelay(ctx, to, subject, textBody, htmlBody); relayErr == nil {
			return nil
		}
	}

	return directErr
}

func (s *GmailSMTPSender) sendDirect(
	ctx context.Context,
	to string,
	rawMessage []byte,
) error {
	addr := fmt.Sprintf("%s:%d", s.cfg.Host, s.cfg.Port)

	// Context-aware dialer
	dialer := &net.Dialer{
		Timeout: s.cfg.ConnectTimeout,
	}

	if s.cfg.Port == 465 {
		// Direct SSL/TLS connection
		tlsConfig := &tls.Config{
			ServerName: s.cfg.Host,
			MinVersion: tls.VersionTLS12,
		}

		conn, err := tls.DialWithDialer(dialer, "tcp", addr, tlsConfig)
		if err != nil {
			return fmt.Errorf("%w: dial tls: %v", ErrSMTPConnectionError, err)
		}
		defer conn.Close()

		c, err := smtp.NewClient(conn, s.cfg.Host)
		if err != nil {
			return fmt.Errorf("%w: new smtp client: %v", ErrSMTPConnectionError, err)
		}
		defer c.Quit()

		auth := smtp.PlainAuth("", s.cfg.Username, s.cfg.Password, s.cfg.Host)
		if err := c.Auth(auth); err != nil {
			return fmt.Errorf("%w: %v", ErrSMTPAuthFailed, err)
		}

		if err := c.Mail(s.cfg.FromEmail); err != nil {
			return fmt.Errorf("%w: mail from: %v", ErrSMTPSendError, err)
		}
		if err := c.Rcpt(to); err != nil {
			return fmt.Errorf("%w: rcpt to: %v", ErrSMTPSendError, err)
		}

		w, err := c.Data()
		if err != nil {
			return fmt.Errorf("%w: data: %v", ErrSMTPSendError, err)
		}
		if _, err := w.Write(rawMessage); err != nil {
			return fmt.Errorf("%w: write: %v", ErrSMTPSendError, err)
		}
		if err := w.Close(); err != nil {
			return fmt.Errorf("%w: close data: %v", ErrSMTPSendError, err)
		}

		return nil
	}

	// Port 587: STARTTLS connection
	conn, err := dialer.DialContext(ctx, "tcp", addr)
	if err != nil {
		return fmt.Errorf("%w: dial tcp: %v", ErrSMTPConnectionError, err)
	}
	defer conn.Close()

	c, err := smtp.NewClient(conn, s.cfg.Host)
	if err != nil {
		return fmt.Errorf("%w: new smtp client: %v", ErrSMTPConnectionError, err)
	}
	defer c.Quit()

	tlsConfig := &tls.Config{
		ServerName: s.cfg.Host,
		MinVersion: tls.VersionTLS12,
	}

	if err := c.StartTLS(tlsConfig); err != nil {
		return fmt.Errorf("%w: starttls: %v", ErrSMTPConnectionError, err)
	}

	auth := smtp.PlainAuth("", s.cfg.Username, s.cfg.Password, s.cfg.Host)
	if err := c.Auth(auth); err != nil {
		return fmt.Errorf("%w: %v", ErrSMTPAuthFailed, err)
	}

	if err := c.Mail(s.cfg.FromEmail); err != nil {
		return fmt.Errorf("%w: mail from: %v", ErrSMTPSendError, err)
	}
	if err := c.Rcpt(to); err != nil {
		return fmt.Errorf("%w: rcpt to: %v", ErrSMTPSendError, err)
	}

	w, err := c.Data()
	if err != nil {
		return fmt.Errorf("%w: data: %v", ErrSMTPSendError, err)
	}
	if _, err := w.Write(rawMessage); err != nil {
		return fmt.Errorf("%w: write: %v", ErrSMTPSendError, err)
	}
	if err := w.Close(); err != nil {
		return fmt.Errorf("%w: close data: %v", ErrSMTPSendError, err)
	}

	return nil
}

type relayPayload struct {
	To      string `json:"to"`
	Subject string `json:"subject"`
	Text    string `json:"text"`
	HTML    string `json:"html"`
}

type relayResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error,omitempty"`
}

func (s *GmailSMTPSender) sendViaRelay(
	ctx context.Context,
	to string,
	subject string,
	textBody string,
	htmlBody string,
) error {
	if s.cfg.RelayURL == "" {
		return fmt.Errorf("%w: relay url not configured", ErrSMTPSendError)
	}

	relayEndpoint := strings.TrimRight(s.cfg.RelayURL, "/") + "/api/internal/email-relay"
	bodyData := relayPayload{
		To:      to,
		Subject: subject,
		Text:    textBody,
		HTML:    htmlBody,
	}

	payloadBytes, err := json.Marshal(bodyData)
	if err != nil {
		return fmt.Errorf("%w: marshal relay payload: %v", ErrSMTPSendError, err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, relayEndpoint, bytes.NewReader(payloadBytes))
	if err != nil {
		return fmt.Errorf("%w: create relay request: %v", ErrSMTPSendError, err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+s.cfg.RelaySecret)

	client := &http.Client{
		Timeout: 20 * time.Second,
	}

	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("%w: relay http request: %v", ErrSMTPSendError, err)
	}
	defer resp.Body.Close()

	var result relayResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		if resp.StatusCode >= 400 {
			return fmt.Errorf("%w: relay returned status %d", ErrSMTPSendError, resp.StatusCode)
		}
		return fmt.Errorf("%w: decode relay response: %v", ErrSMTPSendError, err)
	}

	if !result.Success {
		return fmt.Errorf("%w: relay error: %s", ErrSMTPSendError, result.Error)
	}

	return nil
}
