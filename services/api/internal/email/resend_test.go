package email

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestResendSenderSuccess(t *testing.T) {

	server := httptest.NewServer(
		http.HandlerFunc(func(
			w http.ResponseWriter,
			r *http.Request,
		) {

			if r.Method != http.MethodPost {
				t.Errorf("expected POST, got %s", r.Method)
			}

			if r.Header.Get("Authorization") != "Bearer test_api_key" {
				t.Error("missing authorization header")
			}

			var payload resendRequest

			if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
				t.Error(err)
				return
			}

			if len(payload.To) != 1 ||
				payload.To[0] != "test@example.com" {
				t.Error("incorrect recipient")
			}

			if !strings.Contains(
				payload.HTML,
				"https://daocoin.example/verify-email",
			) {
				t.Error("verification link missing")
			}

			w.WriteHeader(http.StatusOK)
		}),
	)
	defer server.Close()

	sender := NewResendSender(
		"test_api_key",
		"DAOCOIN <verify@example.com>",
	)

	sender.apiURL = server.URL

	err := sender.SendVerification(
		context.Background(),
		"test@example.com",
		"https://daocoin.example/verify-email",
	)

	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
}

func TestResendSenderInvalidRecipient(t *testing.T) {

	sender := NewResendSender(
		"test_api_key",
		"verify@example.com",
	)

	err := sender.SendVerification(
		context.Background(),
		"invalid-email",
		"https://daocoin.example/verify-email",
	)

	if !errors.Is(err, ErrInvalidRecipient) {
		t.Fatalf(
			"expected ErrInvalidRecipient, got %v",
			err,
		)
	}
}

func TestResendSenderInvalidLink(t *testing.T) {

	sender := NewResendSender(
		"test_api_key",
		"verify@example.com",
	)

	err := sender.SendVerification(
		context.Background(),
		"test@example.com",
		"http://daocoin.example/verify-email",
	)

	if !errors.Is(err, ErrInvalidLink) {
		t.Fatalf(
			"expected ErrInvalidLink, got %v",
			err,
		)
	}
}

func TestResendSenderProviderFailure(t *testing.T) {

	server := httptest.NewServer(
		http.HandlerFunc(func(
			w http.ResponseWriter,
			r *http.Request,
		) {
			http.Error(
				w,
				"provider unavailable",
				http.StatusServiceUnavailable,
			)
		}),
	)
	defer server.Close()

	sender := NewResendSender(
		"test_api_key",
		"verify@example.com",
	)

	sender.apiURL = server.URL

	err := sender.SendVerification(
		context.Background(),
		"test@example.com",
		"https://daocoin.example/verify-email",
	)

	if !errors.Is(err, ErrDeliveryFailed) {
		t.Fatalf(
			"expected ErrDeliveryFailed, got %v",
			err,
		)
	}
}
