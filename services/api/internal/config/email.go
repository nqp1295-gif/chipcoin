package config

import (
	"errors"
	"fmt"
	"net/url"
	"os"
	"strings"
)

var ErrInvalidEmailConfig = errors.New("invalid email configuration")

type EmailConfig struct {
	Enabled   bool
	Provider  string
	APIKey    string
	From      string
	PublicURL string
}

func LoadEmailConfig() (EmailConfig, error) {
	cfg := EmailConfig{
		Enabled:   strings.EqualFold(os.Getenv("EMAIL_ENABLED"), "true"),
		Provider:  strings.ToLower(strings.TrimSpace(os.Getenv("EMAIL_PROVIDER"))),
		APIKey:    strings.TrimSpace(os.Getenv("RESEND_API_KEY")),
		From:      strings.TrimSpace(os.Getenv("EMAIL_FROM")),
		PublicURL: strings.TrimRight(strings.TrimSpace(os.Getenv("APP_PUBLIC_URL")), "/"),
	}

	if !cfg.Enabled {
		return cfg, nil
	}

	if cfg.Provider != "resend" {
		return EmailConfig{}, fmt.Errorf(
			"%w: unsupported provider",
			ErrInvalidEmailConfig,
		)
	}

	if cfg.APIKey == "" {
		return EmailConfig{}, fmt.Errorf(
			"%w: missing RESEND_API_KEY",
			ErrInvalidEmailConfig,
		)
	}

	if cfg.From == "" {
		return EmailConfig{}, fmt.Errorf(
			"%w: missing EMAIL_FROM",
			ErrInvalidEmailConfig,
		)
	}

	if cfg.PublicURL == "" {
		return EmailConfig{}, fmt.Errorf(
			"%w: missing APP_PUBLIC_URL",
			ErrInvalidEmailConfig,
		)
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
