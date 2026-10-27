package config

import (
	"errors"
	"fmt"
	"net/url"
	"os"
	"strconv"
	"strings"
)

var ErrInvalidEmailConfig = errors.New("invalid email configuration")

type EmailConfig struct {
	Enabled           bool
	Provider          string
	APIKey            string
	SMTPHost          string
	SMTPPort          int
	SMTPUsername      string
	SMTPPassword      string
	SMTPFromEmail     string
	SMTPFromName      string
	SMTPRequireTLS    bool
	From              string
	PublicURL         string
	TTLMinutes        int
	ResendCooldownSec int
	ResendMaxPerHour  int
}

func LoadEmailConfig() (EmailConfig, error) {
	publicURL := strings.TrimRight(strings.TrimSpace(os.Getenv("APP_PUBLIC_URL")), "/")
	if publicURL == "" {
		publicURL = strings.TrimRight(strings.TrimSpace(os.Getenv("PUBLIC_WEB_URL")), "/")
	}

	smtpPort := 587
	if portStr := strings.TrimSpace(os.Getenv("SMTP_PORT")); portStr != "" {
		if p, err := strconv.Atoi(portStr); err == nil && p > 0 {
			smtpPort = p
		}
	}

	ttlMin := 15
	if ttlStr := strings.TrimSpace(os.Getenv("EMAIL_VERIFICATION_TTL_MINUTES")); ttlStr != "" {
		if t, err := strconv.Atoi(ttlStr); err == nil && t > 0 {
			ttlMin = t
		}
	}

	cooldownSec := 60
	if cdStr := strings.TrimSpace(os.Getenv("EMAIL_RESEND_COOLDOWN_SECONDS")); cdStr != "" {
		if c, err := strconv.Atoi(cdStr); err == nil && c > 0 {
			cooldownSec = c
		}
	}

	maxPerHour := 3
	if maxStr := strings.TrimSpace(os.Getenv("EMAIL_RESEND_MAX_PER_HOUR")); maxStr != "" {
		if m, err := strconv.Atoi(maxStr); err == nil && m > 0 {
			maxPerHour = m
		}
	}

	smtpHost := strings.TrimSpace(os.Getenv("SMTP_HOST"))
	if smtpHost == "" {
		smtpHost = "smtp.gmail.com"
	}

	smtpUsername := strings.TrimSpace(os.Getenv("SMTP_USERNAME"))
	if smtpUsername == "" {
		smtpUsername = "jinofc.ytb@gmail.com"
	}

	smtpFromEmail := strings.TrimSpace(os.Getenv("SMTP_FROM_EMAIL"))
	if smtpFromEmail == "" {
		smtpFromEmail = smtpUsername
	}

	smtpFromName := strings.TrimSpace(os.Getenv("SMTP_FROM_NAME"))
	if smtpFromName == "" {
		smtpFromName = "CHIPCOIN | Xác thực tài khoản"
	}

	fromHeader := strings.TrimSpace(os.Getenv("EMAIL_FROM"))
	if fromHeader == "" {
		fromHeader = fmt.Sprintf("%s <%s>", smtpFromName, smtpFromEmail)
	}

	cfg := EmailConfig{
		Enabled:           strings.EqualFold(os.Getenv("EMAIL_ENABLED"), "true"),
		Provider:          strings.ToLower(strings.TrimSpace(os.Getenv("EMAIL_PROVIDER"))),
		APIKey:            strings.TrimSpace(os.Getenv("RESEND_API_KEY")),
		SMTPHost:          smtpHost,
		SMTPPort:          smtpPort,
		SMTPUsername:      smtpUsername,
		SMTPPassword:      strings.TrimSpace(os.Getenv("SMTP_PASSWORD")),
		SMTPFromEmail:     smtpFromEmail,
		SMTPFromName:      smtpFromName,
		SMTPRequireTLS:    !strings.EqualFold(os.Getenv("SMTP_STARTTLS_REQUIRED"), "false"),
		From:              fromHeader,
		PublicURL:         publicURL,
		TTLMinutes:        ttlMin,
		ResendCooldownSec: cooldownSec,
		ResendMaxPerHour:  maxPerHour,
	}

	if !cfg.Enabled {
		return cfg, nil
	}

	// Validate supported providers
	switch cfg.Provider {
	case "resend":
		if cfg.APIKey == "" {
			return EmailConfig{}, fmt.Errorf("%w: missing RESEND_API_KEY", ErrInvalidEmailConfig)
		}
		if cfg.From == "" {
			return EmailConfig{}, fmt.Errorf("%w: missing EMAIL_FROM", ErrInvalidEmailConfig)
		}

	case "gmail_smtp", "smtp", "gmail":
		if cfg.SMTPHost == "" {
			return EmailConfig{}, fmt.Errorf("%w: missing SMTP_HOST", ErrInvalidEmailConfig)
		}
		if cfg.SMTPUsername == "" {
			return EmailConfig{}, fmt.Errorf("%w: missing SMTP_USERNAME", ErrInvalidEmailConfig)
		}

	default:
		return EmailConfig{}, fmt.Errorf("%w: unsupported provider '%s'", ErrInvalidEmailConfig, cfg.Provider)
	}

	if cfg.PublicURL == "" {
		return EmailConfig{}, fmt.Errorf("%w: missing APP_PUBLIC_URL", ErrInvalidEmailConfig)
	}

	parsedURL, err := url.Parse(cfg.PublicURL)
	if err != nil ||
		parsedURL.Scheme != "https" ||
		parsedURL.Host == "" ||
		parsedURL.User != nil ||
		parsedURL.RawQuery != "" ||
		parsedURL.Fragment != "" {
		return EmailConfig{}, fmt.Errorf(
			"%w: APP_PUBLIC_URL must be a valid HTTPS URL",
			ErrInvalidEmailConfig,
		)
	}

	return cfg, nil
}
