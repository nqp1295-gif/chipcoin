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
