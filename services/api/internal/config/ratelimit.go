package config

import (
	"encoding/base64"
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

var (
	ErrInvalidRateLimitConfig = errors.New("invalid rate limit configuration")
	ErrInvalidSecretConfig    = errors.New("invalid secret configuration")
)

type RateLimitConfig struct {
	ResendVerificationEnabled bool

	GlobalLimit  int
	GlobalWindow time.Duration

	IPLimit  int
	IPWindow time.Duration

	EmailLimit  int
	EmailWindow time.Duration

	MaxEntries      int
	CleanupInterval time.Duration

	EmailHMACSecret    []byte
	TokenEncryptionKey []byte
}

func LoadRateLimitConfig() (RateLimitConfig, error) {
	cfg := RateLimitConfig{
		ResendVerificationEnabled: strings.EqualFold(os.Getenv("RESEND_VERIFICATION_ENABLED"), "true"),
		GlobalLimit:               100,
		GlobalWindow:              time.Minute,
		IPLimit:                   10,
		IPWindow:                  time.Minute,
		EmailLimit:                5,
		EmailWindow:               time.Hour,
		MaxEntries:                10000,
		CleanupInterval:           5 * time.Minute,
	}

	if val := os.Getenv("RATE_LIMIT_GLOBAL_LIMIT"); val != "" {
		n, err := strconv.Atoi(val)
		if err != nil || n <= 0 {
			return RateLimitConfig{}, fmt.Errorf("%w: RATE_LIMIT_GLOBAL_LIMIT must be positive integer", ErrInvalidRateLimitConfig)
		}
		cfg.GlobalLimit = n
	}

	if val := os.Getenv("RATE_LIMIT_GLOBAL_WINDOW"); val != "" {
		d, err := time.ParseDuration(val)
		if err != nil || d <= 0 {
			return RateLimitConfig{}, fmt.Errorf("%w: RATE_LIMIT_GLOBAL_WINDOW must be positive duration", ErrInvalidRateLimitConfig)
		}
		cfg.GlobalWindow = d
	}

	if val := os.Getenv("RATE_LIMIT_IP_LIMIT"); val != "" {
		n, err := strconv.Atoi(val)
		if err != nil || n <= 0 {
			return RateLimitConfig{}, fmt.Errorf("%w: RATE_LIMIT_IP_LIMIT must be positive integer", ErrInvalidRateLimitConfig)
		}
		cfg.IPLimit = n
	}

	if val := os.Getenv("RATE_LIMIT_IP_WINDOW"); val != "" {
		d, err := time.ParseDuration(val)
		if err != nil || d <= 0 {
			return RateLimitConfig{}, fmt.Errorf("%w: RATE_LIMIT_IP_WINDOW must be positive duration", ErrInvalidRateLimitConfig)
		}
		cfg.IPWindow = d
	}

	if val := os.Getenv("RATE_LIMIT_EMAIL_LIMIT"); val != "" {
		n, err := strconv.Atoi(val)
		if err != nil || n <= 0 {
			return RateLimitConfig{}, fmt.Errorf("%w: RATE_LIMIT_EMAIL_LIMIT must be positive integer", ErrInvalidRateLimitConfig)
		}
		cfg.EmailLimit = n
	}

	if val := os.Getenv("RATE_LIMIT_EMAIL_WINDOW"); val != "" {
		d, err := time.ParseDuration(val)
		if err != nil || d <= 0 {
			return RateLimitConfig{}, fmt.Errorf("%w: RATE_LIMIT_EMAIL_WINDOW must be positive duration", ErrInvalidRateLimitConfig)
		}
		cfg.EmailWindow = d
	}

	if val := os.Getenv("RATE_LIMIT_MAX_ENTRIES"); val != "" {
		n, err := strconv.Atoi(val)
		if err != nil || n <= 0 {
			return RateLimitConfig{}, fmt.Errorf("%w: RATE_LIMIT_MAX_ENTRIES must be positive integer", ErrInvalidRateLimitConfig)
		}
		cfg.MaxEntries = n
	}

	if val := os.Getenv("RATE_LIMIT_CLEANUP_INTERVAL"); val != "" {
		d, err := time.ParseDuration(val)
		if err != nil || d <= 0 {
			return RateLimitConfig{}, fmt.Errorf("%w: RATE_LIMIT_CLEANUP_INTERVAL must be positive duration", ErrInvalidRateLimitConfig)
		}
		cfg.CleanupInterval = d
	}

	hmacRaw := strings.TrimSpace(os.Getenv("EMAIL_RATE_LIMIT_HMAC_SECRET"))
	if hmacRaw != "" {
		cfg.EmailHMACSecret = parseSecretBytes(hmacRaw)
	}

	encRaw := strings.TrimSpace(os.Getenv("TOKEN_ENCRYPTION_KEY"))
	if encRaw != "" {
		cfg.TokenEncryptionKey = parseSecretBytes(encRaw)
	}

	if cfg.ResendVerificationEnabled {
		if len(cfg.EmailHMACSecret) < 32 {
			return RateLimitConfig{}, fmt.Errorf(
				"%w: EMAIL_RATE_LIMIT_HMAC_SECRET must contain at least 32 bytes when resend verification is enabled",
				ErrInvalidSecretConfig,
			)
		}

		if len(cfg.TokenEncryptionKey) != 32 {
			return RateLimitConfig{}, fmt.Errorf(
				"%w: TOKEN_ENCRYPTION_KEY must contain exactly 32 bytes when resend verification is enabled",
				ErrInvalidSecretConfig,
			)
		}
	}

	return cfg, nil
}

func parseSecretBytes(raw string) []byte {
	// Try base64 decoding first
	if decoded, err := base64.StdEncoding.DecodeString(raw); err == nil && len(decoded) >= 32 {
		return decoded
	}
	// Fall back to raw UTF-8 bytes
	return []byte(raw)
}
