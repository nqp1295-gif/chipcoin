package auth

import (
	"strings"
	"testing"
	"time"
)

func TestGenerateVerificationToken(t *testing.T) {
	token, err := GenerateVerificationToken()

	if err != nil {
		t.Fatalf("generate token failed: %v", err)
	}

	if len(token) != 64 {
		t.Fatalf("expected 64 characters, got %d", len(token))
	}
}

func TestVerificationTokensAreUnique(t *testing.T) {
	token1, err := GenerateVerificationToken()
	if err != nil {
		t.Fatal(err)
	}

	token2, err := GenerateVerificationToken()
	if err != nil {
		t.Fatal(err)
	}

	if token1 == token2 {
		t.Fatal("verification tokens must be unique")
	}
}

func TestHashVerificationToken(t *testing.T) {
	token, err := GenerateVerificationToken()
	if err != nil {
		t.Fatal(err)
	}

	hash, err := HashVerificationToken(token)
	if err != nil {
		t.Fatal(err)
	}

	if len(hash) != 64 {
		t.Fatalf("expected SHA-256 hex hash length 64, got %d", len(hash))
	}

	if hash == token {
		t.Fatal("hash must differ from raw token")
	}
}

func TestInvalidVerificationToken(t *testing.T) {
	_, err := HashVerificationToken("invalid-token")

	if err == nil {
		t.Fatal("expected invalid token error")
	}
}

func TestVerificationTokenExpiration(t *testing.T) {
	now := time.Now().UTC()

	expiresAt := VerificationTokenExpiresAt(now)

	if expiresAt.Sub(now) != 15*time.Minute {
		t.Fatal("incorrect verification token TTL")
	}

	if IsVerificationTokenExpired(expiresAt, now) {
		t.Fatal("token should not be expired")
	}

	if !IsVerificationTokenExpired(
		expiresAt,
		now.Add(16*time.Minute),
	) {
		t.Fatal("token should be expired")
	}
}

func TestVerificationTokenFormat(t *testing.T) {
	token, err := GenerateVerificationToken()

	if err != nil {
		t.Fatal(err)
	}

	if strings.Contains(token, " ") {
		t.Fatal("token contains whitespace")
	}
}
