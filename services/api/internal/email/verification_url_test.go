package email

import (
	"errors"
	"net/url"
	"strings"
	"testing"
)

func TestBuildVerificationURLSuccess(t *testing.T) {

	token := strings.Repeat("a", 64)

	result, err := BuildVerificationURL(
		"https://daocoin.example",
		token,
	)

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	parsedURL, err := url.Parse(result)
	if err != nil {
		t.Fatal(err)
	}

	if parsedURL.Scheme != "https" {
		t.Fatal("expected HTTPS")
	}

	if parsedURL.Host != "daocoin.example" {
		t.Fatalf("unexpected host: %s", parsedURL.Host)
	}

	if parsedURL.Path != "/verify-email" {
		t.Fatalf("unexpected path: %s", parsedURL.Path)
	}

	if parsedURL.Query().Get("token") != token {
		t.Fatal("verification token mismatch")
	}
}

func TestBuildVerificationURLEmptyToken(t *testing.T) {

	_, err := BuildVerificationURL(
		"https://daocoin.example",
		"",
	)

	if !errors.Is(err, ErrInvalidVerificationURL) {
		t.Fatalf(
			"expected ErrInvalidVerificationURL, got %v",
			err,
		)
	}
}

func TestBuildVerificationURLInvalidToken(t *testing.T) {

	testCases := []string{
		"invalid-token",
		strings.Repeat("z", 64),
		strings.Repeat("A", 64),
		strings.Repeat("a", 63),
	}

	for _, token := range testCases {
		_, err := BuildVerificationURL(
			"https://daocoin.example",
			token,
		)

		if !errors.Is(err, ErrInvalidVerificationURL) {
			t.Fatalf(
				"expected invalid token error, got %v",
				err,
			)
		}
	}
}

func TestBuildVerificationURLRejectHTTP(t *testing.T) {

	_, err := BuildVerificationURL(
		"http://daocoin.example",
		strings.Repeat("a", 64),
	)

	if !errors.Is(err, ErrInvalidVerificationURL) {
		t.Fatalf(
			"expected ErrInvalidVerificationURL, got %v",
			err,
		)
	}
}

func TestBuildVerificationURLRejectQuery(t *testing.T) {

	_, err := BuildVerificationURL(
		"https://daocoin.example?redirect=evil",
		strings.Repeat("a", 64),
	)

	if !errors.Is(err, ErrInvalidVerificationURL) {
		t.Fatalf(
			"expected ErrInvalidVerificationURL, got %v",
			err,
		)
	}
}

func TestBuildVerificationURLRejectCredentials(t *testing.T) {

	_, err := BuildVerificationURL(
		"https://user:password@daocoin.example",
		strings.Repeat("a", 64),
	)

	if !errors.Is(err, ErrInvalidVerificationURL) {
		t.Fatalf(
			"expected ErrInvalidVerificationURL, got %v",
			err,
		)
	}
}

func TestBuildVerificationURLRejectCustomPath(t *testing.T) {

	_, err := BuildVerificationURL(
		"https://daocoin.example/redirect",
		strings.Repeat("a", 64),
	)

	if !errors.Is(err, ErrInvalidVerificationURL) {
		t.Fatalf(
			"expected ErrInvalidVerificationURL, got %v",
			err,
		)
	}
}
