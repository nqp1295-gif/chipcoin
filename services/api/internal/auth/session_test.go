package auth

import (
	"net/http/httptest"
	"testing"
)

func TestGenerateSessionToken(t *testing.T) {
	token1, err := GenerateSessionToken()
	if err != nil {
		t.Fatal(err)
	}

	token2, err := GenerateSessionToken()
	if err != nil {
		t.Fatal(err)
	}

	if token1 == token2 {
		t.Fatal("session tokens must be different")
	}

	if err := ValidateSessionToken(token1); err != nil {
		t.Fatalf("generated token invalid: %v", err)
	}
}

func TestHashSessionToken(t *testing.T) {
	token := "test-session-token"

	hash1 := HashSessionToken(token)
	hash2 := HashSessionToken(token)

	if hash1 != hash2 {
		t.Fatal("same token must produce same hash")
	}

	if hash1 == token {
		t.Fatal("token must not be stored as plaintext")
	}

	if len(hash1) != 64 {
		t.Fatal("SHA-256 hex hash must have 64 characters")
	}
}

func TestInvalidSessionToken(t *testing.T) {
	invalidTokens := []string{
		"",
		"invalid",
		"abc123",
	}

	for _, token := range invalidTokens {
		if err := ValidateSessionToken(token); err == nil {
			t.Fatalf("invalid token accepted: %q", token)
		}
	}
}

func TestSessionCookie(t *testing.T) {
	recorder := httptest.NewRecorder()

	SetSessionCookie(recorder, "test-token", true)

	cookies := recorder.Result().Cookies()

	if len(cookies) != 1 {
		t.Fatal("expected one cookie")
	}

	cookie := cookies[0]

	if !cookie.HttpOnly {
		t.Fatal("cookie must be HttpOnly")
	}

	if !cookie.Secure {
		t.Fatal("cookie must be Secure")
	}

	if cookie.Name != SessionCookieName {
		t.Fatal("unexpected cookie name")
	}
}

func TestClearSessionCookie(t *testing.T) {
	recorder := httptest.NewRecorder()

	ClearSessionCookie(recorder, true)

	cookies := recorder.Result().Cookies()

	if len(cookies) != 1 {
		t.Fatal("expected one cookie")
	}

	if cookies[0].MaxAge >= 0 {
		t.Fatal("cookie must be expired")
	}
}
