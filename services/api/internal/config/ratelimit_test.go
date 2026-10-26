package config

import (
	"encoding/base64"
	"os"
	"strings"
	"testing"
	"time"
)

func clearRateLimitEnv() {
	vars := []string{
		"RESEND_VERIFICATION_ENABLED",
		"RATE_LIMIT_GLOBAL_LIMIT",
		"RATE_LIMIT_GLOBAL_WINDOW",
		"RATE_LIMIT_IP_LIMIT",
		"RATE_LIMIT_IP_WINDOW",
		"RATE_LIMIT_EMAIL_LIMIT",
		"RATE_LIMIT_EMAIL_WINDOW",
		"RATE_LIMIT_MAX_ENTRIES",
		"RATE_LIMIT_CLEANUP_INTERVAL",
		"EMAIL_RATE_LIMIT_HMAC_SECRET",
		"TOKEN_ENCRYPTION_KEY",
	}
	for _, v := range vars {
		os.Unsetenv(v)
	}
}

func TestLoadRateLimitConfigDefaults(t *testing.T) {
	clearRateLimitEnv()

	cfg, err := LoadRateLimitConfig()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if cfg.ResendVerificationEnabled {
		t.Fatal("expected resend verification to be disabled by default")
	}

	if cfg.GlobalLimit != 100 || cfg.GlobalWindow != time.Minute {
		t.Fatalf("unexpected global rate limit defaults: %d, %v", cfg.GlobalLimit, cfg.GlobalWindow)
	}

	if cfg.IPLimit != 10 || cfg.IPWindow != time.Minute {
		t.Fatalf("unexpected IP rate limit defaults: %d, %v", cfg.IPLimit, cfg.IPWindow)
	}

	if cfg.EmailLimit != 5 || cfg.EmailWindow != time.Hour {
		t.Fatalf("unexpected email rate limit defaults: %d, %v", cfg.EmailLimit, cfg.EmailWindow)
	}

	if cfg.MaxEntries != 10000 {
		t.Fatalf("unexpected max entries: %d", cfg.MaxEntries)
	}

	if cfg.CleanupInterval != 5*time.Minute {
		t.Fatalf("unexpected cleanup interval: %v", cfg.CleanupInterval)
	}
}

func TestLoadRateLimitConfigCustomValues(t *testing.T) {
	clearRateLimitEnv()

	t.Setenv("RATE_LIMIT_GLOBAL_LIMIT", "200")
	t.Setenv("RATE_LIMIT_GLOBAL_WINDOW", "2m")
	t.Setenv("RATE_LIMIT_IP_LIMIT", "20")
	t.Setenv("RATE_LIMIT_IP_WINDOW", "30s")
	t.Setenv("RATE_LIMIT_EMAIL_LIMIT", "10")
	t.Setenv("RATE_LIMIT_EMAIL_WINDOW", "2h")
	t.Setenv("RATE_LIMIT_MAX_ENTRIES", "5000")
	t.Setenv("RATE_LIMIT_CLEANUP_INTERVAL", "10m")

	cfg, err := LoadRateLimitConfig()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if cfg.GlobalLimit != 200 || cfg.GlobalWindow != 2*time.Minute {
		t.Fatalf("unexpected global settings: %d, %v", cfg.GlobalLimit, cfg.GlobalWindow)
	}

	if cfg.IPLimit != 20 || cfg.IPWindow != 30*time.Second {
		t.Fatalf("unexpected IP settings: %d, %v", cfg.IPLimit, cfg.IPWindow)
	}

	if cfg.EmailLimit != 10 || cfg.EmailWindow != 2*time.Hour {
		t.Fatalf("unexpected email settings: %d, %v", cfg.EmailLimit, cfg.EmailWindow)
	}

	if cfg.MaxEntries != 5000 || cfg.CleanupInterval != 10*time.Minute {
		t.Fatalf("unexpected capacity settings: %d, %v", cfg.MaxEntries, cfg.CleanupInterval)
	}
}

func TestLoadRateLimitConfigInvalidValues(t *testing.T) {
	tests := []struct {
		envKey string
		val    string
	}{
		{"RATE_LIMIT_GLOBAL_LIMIT", "0"},
		{"RATE_LIMIT_GLOBAL_LIMIT", "-5"},
		{"RATE_LIMIT_GLOBAL_LIMIT", "abc"},
		{"RATE_LIMIT_GLOBAL_WINDOW", "-1s"},
		{"RATE_LIMIT_GLOBAL_WINDOW", "invalid"},
		{"RATE_LIMIT_IP_LIMIT", "0"},
		{"RATE_LIMIT_IP_WINDOW", "0s"},
		{"RATE_LIMIT_EMAIL_LIMIT", "-1"},
		{"RATE_LIMIT_EMAIL_WINDOW", "not-a-duration"},
		{"RATE_LIMIT_MAX_ENTRIES", "0"},
		{"RATE_LIMIT_CLEANUP_INTERVAL", "0m"},
	}

	for _, tt := range tests {
		t.Run(tt.envKey+"="+tt.val, func(t *testing.T) {
			clearRateLimitEnv()
			t.Setenv(tt.envKey, tt.val)

			_, err := LoadRateLimitConfig()
			if err == nil {
				t.Fatalf("expected error for %s=%s", tt.envKey, tt.val)
			}
		})
	}
}

func TestLoadRateLimitConfigEnabledRequiresSecrets(t *testing.T) {
	clearRateLimitEnv()
	t.Setenv("RESEND_VERIFICATION_ENABLED", "true")

	// Missing secrets
	_, err := LoadRateLimitConfig()
	if err == nil || !strings.Contains(err.Error(), "EMAIL_RATE_LIMIT_HMAC_SECRET") {
		t.Fatalf("expected missing HMAC secret error, got %v", err)
	}

	// Short HMAC secret
	t.Setenv("EMAIL_RATE_LIMIT_HMAC_SECRET", "too-short")
	_, err = LoadRateLimitConfig()
	if err == nil || !strings.Contains(err.Error(), "EMAIL_RATE_LIMIT_HMAC_SECRET") {
		t.Fatalf("expected short HMAC secret error, got %v", err)
	}

	// Valid 32-byte HMAC secret, missing encryption key
	t.Setenv("EMAIL_RATE_LIMIT_HMAC_SECRET", "0123456789abcdef0123456789abcdef")
	_, err = LoadRateLimitConfig()
	if err == nil || !strings.Contains(err.Error(), "TOKEN_ENCRYPTION_KEY") {
		t.Fatalf("expected missing TOKEN_ENCRYPTION_KEY error, got %v", err)
	}

	// Valid base64 encryption key
	rawKey := make([]byte, 32)
	for i := range rawKey {
		rawKey[i] = byte(i)
	}
	encodedKey := base64.StdEncoding.EncodeToString(rawKey)
	t.Setenv("TOKEN_ENCRYPTION_KEY", encodedKey)

	cfg, err := LoadRateLimitConfig()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !cfg.ResendVerificationEnabled {
		t.Fatal("expected resend verification to be enabled")
	}

	if len(cfg.EmailHMACSecret) < 32 || len(cfg.TokenEncryptionKey) != 32 {
		t.Fatalf("secrets not properly loaded: %d, %d", len(cfg.EmailHMACSecret), len(cfg.TokenEncryptionKey))
	}
}
