package auth

import (
	"context"
	"errors"
	"testing"
	"time"
)

type mockVerificationRepository struct {
	storedUserID string
	storedHash   string
	storedExpiry time.Time

	verifyHash string

	createErr error
	verifyErr error
}

func (m *mockVerificationRepository) CreateToken(
	ctx context.Context,
	userID string,
	tokenHash string,
	expiresAt time.Time,
) error {
	if m.createErr != nil {
		return m.createErr
	}

	m.storedUserID = userID
	m.storedHash = tokenHash
	m.storedExpiry = expiresAt

	return nil
}

func (m *mockVerificationRepository) VerifyToken(
	ctx context.Context,
	tokenHash string,
) error {
	m.verifyHash = tokenHash
	return m.verifyErr
}

func TestVerificationServiceIssueToken(t *testing.T) {
	mock := &mockVerificationRepository{}
	service := NewVerificationService(mock)

	before := time.Now().UTC()

	token, err := service.IssueToken(
		context.Background(),
		"test-user-id",
	)

	if err != nil {
		t.Fatal(err)
	}

	if len(token) != 64 {
		t.Fatalf("expected 64-character token, got %d", len(token))
	}

	if mock.storedUserID != "test-user-id" {
		t.Fatal("incorrect user ID")
	}

	if mock.storedHash == token {
		t.Fatal("raw token must not be stored")
	}

	expectedHash, err := HashVerificationToken(token)
	if err != nil {
		t.Fatal(err)
	}

	if mock.storedHash != expectedHash {
		t.Fatal("stored token hash mismatch")
	}

	minExpiry := before.Add(VerificationTokenTTL)
	maxExpiry := time.Now().UTC().Add(VerificationTokenTTL)

	if mock.storedExpiry.Before(minExpiry) ||
		mock.storedExpiry.After(maxExpiry) {
		t.Fatal("incorrect token expiration")
	}
}

func TestVerificationServiceVerifyEmail(t *testing.T) {
	mock := &mockVerificationRepository{}
	service := NewVerificationService(mock)

	token, err := GenerateVerificationToken()
	if err != nil {
		t.Fatal(err)
	}

	if err := service.VerifyEmail(context.Background(), token); err != nil {
		t.Fatal(err)
	}

	expectedHash, err := HashVerificationToken(token)
	if err != nil {
		t.Fatal(err)
	}

	if mock.verifyHash != expectedHash {
		t.Fatal("verification hash mismatch")
	}
}

func TestVerificationServiceRejectsInvalidToken(t *testing.T) {
	mock := &mockVerificationRepository{}
	service := NewVerificationService(mock)

	err := service.VerifyEmail(context.Background(), "")

	if !errors.Is(err, ErrVerificationTokenRequired) {
		t.Fatalf("unexpected error: %v", err)
	}

	err = service.VerifyEmail(context.Background(), "invalid-token")

	if !errors.Is(err, ErrInvalidVerificationToken) {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestVerificationServicePropagatesRepositoryError(t *testing.T) {
	mock := &mockVerificationRepository{
		verifyErr: ErrVerificationExpired,
	}

	service := NewVerificationService(mock)

	token, err := GenerateVerificationToken()
	if err != nil {
		t.Fatal(err)
	}

	err = service.VerifyEmail(context.Background(), token)

	if !errors.Is(err, ErrVerificationExpired) {
		t.Fatalf("expected expired token error, got %v", err)
	}
}

func TestVerificationServiceIssueTokenFailure(t *testing.T) {
	mock := &mockVerificationRepository{
		createErr: ErrVerificationUserNotEligible,
	}

	service := NewVerificationService(mock)

	token, err := service.IssueToken(
		context.Background(),
		"test-user-id",
	)

	if token != "" {
		t.Fatal("token must not be returned when storage fails")
	}

	if !errors.Is(err, ErrVerificationUserNotEligible) {
		t.Fatalf("unexpected error: %v", err)
	}
}
