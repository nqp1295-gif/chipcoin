package email

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"html"
	"net/http"
	"net/mail"
	"net/url"
	"strings"
	"time"
)

const defaultResendAPIURL = "https://api.resend.com/emails"

type ResendSender struct {
	apiKey string
	from   string
	apiURL string
	client *http.Client
}

func NewResendSender(
	apiKey string,
	from string,
) *ResendSender {

	return &ResendSender{
		apiKey: apiKey,
		from:   from,
		apiURL: defaultResendAPIURL,
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

type resendRequest struct {
	From    string   `json:"from"`
	To      []string `json:"to"`
	Subject string   `json:"subject"`
	HTML    string   `json:"html"`
}

func (s *ResendSender) SendVerification(
	ctx context.Context,
	to string,
	verificationURL string,
) error {

	recipient, err := mail.ParseAddress(to)
	if err != nil ||
		recipient.Address != to ||
		strings.ContainsAny(to, "\r\n") {
		return ErrInvalidRecipient
	}

	parsedURL, err := url.Parse(verificationURL)
	if err != nil ||
		parsedURL.Scheme != "https" ||
		parsedURL.Host == "" ||
		parsedURL.User != nil {
		return ErrInvalidLink
	}

	if s.apiKey == "" || s.from == "" {
		return fmt.Errorf("%w: sender not configured", ErrDeliveryFailed)
	}

	safeURL := html.EscapeString(verificationURL)

	body := resendRequest{
		From:    s.from,
		To:      []string{to},
		Subject: "Verify your DAOCOIN account",
		HTML: fmt.Sprintf(
			`<html>
				<body>
					<h2>Welcome to DAOCOIN</h2>
					<p>Please verify your email address.</p>
					<p>
						<a href="%s">
							Verify Email
						</a>
					</p>
					<p>This link expires in 15 minutes.</p>
					<p>If you did not register, ignore this email.</p>
				</body>
			</html>`,
			safeURL,
		),
	}

	payload, err := json.Marshal(body)
	if err != nil {
		return fmt.Errorf("%w: encode request", ErrDeliveryFailed)
	}

	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		s.apiURL,
		bytes.NewReader(payload),
	)

	if err != nil {
		return fmt.Errorf("%w: create request", ErrDeliveryFailed)
	}

	req.Header.Set("Authorization", "Bearer "+s.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return fmt.Errorf("%w: provider request", ErrDeliveryFailed)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf(
			"%w: provider returned HTTP %d",
			ErrDeliveryFailed,
			resp.StatusCode,
		)
	}

	return nil
}
