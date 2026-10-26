package auth

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

type mockResendLookup struct {
	userID string
	found  bool
	err    error

	called        bool
	receivedEmail string
}

func (m *mockResendLookup) FindEligibleUserID(
	ctx context.Context,
	emailAddress string,
) (string, bool, error) {
	m.called = true
	m.receivedEmail = emailAddress

	return m.userID, m.found, m.err
}

type mockResendRequester struct {
	called     bool
	receivedID string
	err        error
}

func (m *mockResendRequester) RequestResend(
	ctx context.Context,
	userID string,
) error {
	m.called = true
	m.receivedID = userID

	return m.err
}

func newTestResendHandler(
	t *testing.T,
	lookup *mockResendLookup,
	service *mockResendRequester,
) *ResendVerificationHandler {
	t.Helper()

	handler, err := NewResendVerificationHandler(
		lookup,
		service,
	)

	if err != nil {
		t.Fatal(err)
	}

	return handler
}

func performResendRequest(
	handler *ResendVerificationHandler,
	method string,
	body string,
) *httptest.ResponseRecorder {
	req := httptest.NewRequest(
		method,
		"/api/v1/auth/resend-verification",
		strings.NewReader(body),
	)

	rec := httptest.NewRecorder()

	handler.ResendVerification(rec, req)

	return rec
}

func TestResendHandlerSuccess(t *testing.T) {
	lookup := &mockResendLookup{
		userID: "user-123",
		found:  true,
	}

	service := &mockResendRequester{}

	handler := newTestResendHandler(
		t,
		lookup,
		service,
	)

	rec := performResendRequest(
		handler,
		http.MethodPost,
		`{"email":"  USER@EXAMPLE.COM  "}`,
	)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	if !lookup.called {
		t.Fatal("expected lookup to be called")
	}

	if lookup.receivedEmail != "user@example.com" {
		t.Fatalf(
			"unexpected normalized email: %s",
			lookup.receivedEmail,
		)
	}

	if !service.called || service.receivedID != "user-123" {
		t.Fatal("expected resend service to be called")
	}
}

func TestResendHandlerUnknownEmail(t *testing.T) {
	lookup := &mockResendLookup{
		found: false,
	}

	service := &mockResendRequester{}

	handler := newTestResendHandler(
		t,
		lookup,
		service,
	)

	rec := performResendRequest(
		handler,
		http.MethodPost,
		`{"email":"unknown@example.com"}`,
	)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	if service.called {
		t.Fatal("service must not be called for unknown email")
	}
}

func TestResendHandlerRateLimited(t *testing.T) {
	lookup := &mockResendLookup{
		userID: "user-123",
		found:  true,
	}

	service := &mockResendRequester{
		err: ErrResendRateLimited,
	}

	handler := newTestResendHandler(
		t,
		lookup,
		service,
	)

	rec := performResendRequest(
		handler,
		http.MethodPost,
		`{"email":"user@example.com"}`,
	)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
}

func TestResendHandlerNotEligible(t *testing.T) {
	lookup := &mockResendLookup{
		userID: "user-123",
		found:  true,
	}

	service := &mockResendRequester{
		err: ErrResendNotEligible,
	}

	handler := newTestResendHandler(
		t,
		lookup,
		service,
	)

	rec := performResendRequest(
		handler,
		http.MethodPost,
		`{"email":"user@example.com"}`,
	)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
}

func TestResendHandlerInvalidEmail(t *testing.T) {
	lookup := &mockResendLookup{}
	service := &mockResendRequester{}

	handler := newTestResendHandler(
		t,
		lookup,
		service,
	)

	rec := performResendRequest(
		handler,
		http.MethodPost,
		`{"email":"not-an-email"}`,
	)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}

	if lookup.called {
		t.Fatal("lookup must not be called")
	}
}

func TestResendHandlerMalformedJSON(t *testing.T) {
	lookup := &mockResendLookup{}
	service := &mockResendRequester{}

	handler := newTestResendHandler(
		t,
		lookup,
		service,
	)

	rec := performResendRequest(
		handler,
		http.MethodPost,
		`{"email":`,
	)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
}

func TestResendHandlerMultipleJSONObjects(t *testing.T) {
	lookup := &mockResendLookup{}
	service := &mockResendRequester{}

	handler := newTestResendHandler(
		t,
		lookup,
		service,
	)

	rec := performResendRequest(
		handler,
		http.MethodPost,
		`{"email":"a@example.com"}{"email":"b@example.com"}`,
	)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
}

func TestResendHandlerMethodNotAllowed(t *testing.T) {
	lookup := &mockResendLookup{}
	service := &mockResendRequester{}

	handler := newTestResendHandler(
		t,
		lookup,
		service,
	)

	rec := performResendRequest(
		handler,
		http.MethodGet,
		"",
	)

	if rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("expected 405, got %d", rec.Code)
	}
}

func TestResendHandlerLookupError(t *testing.T) {
	lookup := &mockResendLookup{
		err: errors.New("database unavailable"),
	}

	service := &mockResendRequester{}

	handler := newTestResendHandler(
		t,
		lookup,
		service,
	)

	rec := performResendRequest(
		handler,
		http.MethodPost,
		`{"email":"user@example.com"}`,
	)

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500, got %d", rec.Code)
	}
}

func TestResendHandlerServiceError(t *testing.T) {
	lookup := &mockResendLookup{
		userID: "user-123",
		found:  true,
	}

	service := &mockResendRequester{
		err: errors.New("unexpected error"),
	}

	handler := newTestResendHandler(
		t,
		lookup,
		service,
	)

	rec := performResendRequest(
		handler,
		http.MethodPost,
		`{"email":"user@example.com"}`,
	)

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500, got %d", rec.Code)
	}
}

func TestResendHandlerGenericResponse(t *testing.T) {
	cases := []struct {
		name    string
		lookup  *mockResendLookup
		service *mockResendRequester
	}{
		{
			name: "unknown",
			lookup: &mockResendLookup{
				found: false,
			},
			service: &mockResendRequester{},
		},
		{
			name: "eligible",
			lookup: &mockResendLookup{
				userID: "user-123",
				found:  true,
			},
			service: &mockResendRequester{},
		},
		{
			name: "rate_limited",
			lookup: &mockResendLookup{
				userID: "user-123",
				found:  true,
			},
			service: &mockResendRequester{
				err: ErrResendRateLimited,
			},
		},
	}

	var expected []byte

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			handler := newTestResendHandler(
				t,
				tc.lookup,
				tc.service,
			)

			rec := performResendRequest(
				handler,
				http.MethodPost,
				`{"email":"user@example.com"}`,
			)

			var result map[string]any

			if err := json.Unmarshal(
				rec.Body.Bytes(),
				&result,
			); err != nil {
				t.Fatal(err)
			}

			normalized, err := json.Marshal(result)
			if err != nil {
				t.Fatal(err)
			}

			if expected == nil {
				expected = bytes.Clone(normalized)
				return
			}

			if !bytes.Equal(expected, normalized) {
				t.Fatal("responses must be identical")
			}
		})
	}
}

func TestNewResendVerificationHandlerNilDependencies(t *testing.T) {
	_, err := NewResendVerificationHandler(
		nil,
		nil,
	)

	if err == nil {
		t.Fatal("expected constructor error")
	}
}
