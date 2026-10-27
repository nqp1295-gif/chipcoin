package config

import (
	"errors"
	"testing"
)

func TestEmailConfigDisabled(t *testing.T) {
	t.Setenv("EMAIL_ENABLED", "false")
	t.Setenv("EMAIL_PROVIDER", "")
	t.Setenv("RESEND_API_KEY", "")
	t.Setenv("EMAIL_FROM", "")
	t.Setenv("APP_PUBLIC_URL", "")

	cfg, err := LoadEmailConfig()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if cfg.Enabled {
		t.Fatal("email should be disabled")
	}
}

func TestEmailConfigEnabled(t *testing.T) {
	t.Setenv("EMAIL_ENABLED", "true")
	t.Setenv("EMAIL_PROVIDER", "resend")
	t.Setenv("RESEND_API_KEY", "test_key")
	t.Setenv("EMAIL_FROM", "DAOCOIN <verify@example.com>")
	t.Setenv("APP_PUBLIC_URL", "https://daocoin.example")

	cfg, err := LoadEmailConfig()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !cfg.Enabled {
		t.Fatal("email should be enabled")
	}

	if cfg.Provider != "resend" {
		t.Fatalf("unexpected provider: %s", cfg.Provider)
	}
}

func TestEmailConfigGmailSMTP(t *testing.T) {
	t.Setenv("EMAIL_ENABLED", "true")
	t.Setenv("EMAIL_PROVIDER", "gmail_smtp")
	t.Setenv("SMTP_HOST", "smtp.gmail.com")
	t.Setenv("SMTP_PORT", "587")
	t.Setenv("SMTP_USERNAME", "medubaiso1@gmail.com")
	t.Setenv("SMTP_PASSWORD", "sample_app_password")
	t.Setenv("SMTP_FROM_EMAIL", "medubaiso1@gmail.com")
	t.Setenv("SMTP_FROM_NAME", "CHIPCOIN | Xác thực tài khoản")
	t.Setenv("SMTP_STARTTLS_REQUIRED", "true")
	t.Setenv("PUBLIC_WEB_URL", "https://chipcoin.io")

	cfg, err := LoadEmailConfig()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !cfg.Enabled {
		t.Fatal("email should be enabled")
	}

	if cfg.Provider != "gmail_smtp" {
		t.Fatalf("unexpected provider: %s", cfg.Provider)
	}

	if cfg.SMTPUsername != "medubaiso1@gmail.com" {
		t.Fatalf("unexpected username: %s", cfg.SMTPUsername)
	}

	if cfg.SMTPPort != 587 {
		t.Fatalf("unexpected port: %d", cfg.SMTPPort)
	}

	if cfg.PublicURL != "https://chipcoin.io" {
		t.Fatalf("unexpected public url: %s", cfg.PublicURL)
	}
}

func TestEmailConfigMissingAPIKey(t *testing.T) {
	t.Setenv("EMAIL_ENABLED", "true")
	t.Setenv("EMAIL_PROVIDER", "resend")
	t.Setenv("RESEND_API_KEY", "")
	t.Setenv("EMAIL_FROM", "verify@example.com")
	t.Setenv("APP_PUBLIC_URL", "https://daocoin.example")

	_, err := LoadEmailConfig()

	if !errors.Is(err, ErrInvalidEmailConfig) {
		t.Fatalf("expected ErrInvalidEmailConfig, got %v", err)
	}
}

func TestEmailConfigInvalidPublicURL(t *testing.T) {
	t.Setenv("EMAIL_ENABLED", "true")
	t.Setenv("EMAIL_PROVIDER", "resend")
	t.Setenv("RESEND_API_KEY", "test_key")
	t.Setenv("EMAIL_FROM", "verify@example.com")
	t.Setenv("APP_PUBLIC_URL", "http://daocoin.example")

	_, err := LoadEmailConfig()

	if !errors.Is(err, ErrInvalidEmailConfig) {
		t.Fatalf("expected ErrInvalidEmailConfig, got %v", err)
	}
}
