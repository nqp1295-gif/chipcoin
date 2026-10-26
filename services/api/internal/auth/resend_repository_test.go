package auth

import (
	"testing"
	"time"
)

func TestResendRateLimitConstants(t *testing.T) {
	if ResendCooldown != 60*time.Second {
		t.Fatalf(
			"expected 60-second cooldown, got %v",
			ResendCooldown,
		)
	}

	if ResendMaxHourly != 5 {
		t.Fatalf(
			"expected maximum 5 requests/hour, got %d",
			ResendMaxHourly,
		)
	}
}
