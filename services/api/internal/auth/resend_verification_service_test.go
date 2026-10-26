package auth

import (
	"context"
	"errors"
	"testing"
)

type mockResendOutboxRepository struct {
	called     bool
	receivedID string
	err        error
}

func (m *mockResendOutboxRepository) QueueResend(
	ctx context.Context,
	userID string,
) error {
	m.called = true
	m.receivedID = userID

	return m.err
}

func TestResendVerificationServiceSuccess(t *testing.T) {
	mock := &mockResendOutboxRepository{}

	service, err := NewResendVerificationService(mock)
	if err != nil {
		t.Fatal(err)
	}

	err = service.RequestResend(
		context.Background(),
		"  user-123  ",
	)
	if err != nil {
		t.Fatal(err)
	}

	if !mock.called {
		t.Fatal("expected repository to be called")
	}

	if mock.receivedID != "user-123" {
		t.Fatalf(
			"unexpected user ID: %s",
			mock.receivedID,
		)
	}
}

func TestResendVerificationServiceEmptyUserID(t *testing.T) {
	mock := &mockResendOutboxRepository{}

	service, err := NewResendVerificationService(mock)
	if err != nil {
		t.Fatal(err)
	}

	err = service.RequestResend(
		context.Background(),
		"   ",
	)

	if !errors.Is(err, ErrResendUserIDRequired) {
		t.Fatalf(
			"expected user ID required error, got %v",
			err,
		)
	}

	if mock.called {
		t.Fatal("repository must not be called")
	}
}

func TestResendVerificationServiceRateLimited(t *testing.T) {
	mock := &mockResendOutboxRepository{
		err: ErrResendRateLimited,
	}

	service, err := NewResendVerificationService(mock)
	if err != nil {
		t.Fatal(err)
	}

	err = service.RequestResend(
		context.Background(),
		"user-123",
	)

	if !errors.Is(err, ErrResendRateLimited) {
		t.Fatalf(
			"expected rate limit error, got %v",
			err,
		)
	}
}

func TestResendVerificationServiceNotEligible(t *testing.T) {
	mock := &mockResendOutboxRepository{
		err: ErrResendNotEligible,
	}

	service, err := NewResendVerificationService(mock)
	if err != nil {
		t.Fatal(err)
	}

	err = service.RequestResend(
		context.Background(),
		"user-123",
	)

	if !errors.Is(err, ErrResendNotEligible) {
		t.Fatalf(
			"expected not eligible error, got %v",
			err,
		)
	}
}

func TestResendVerificationServiceRepositoryError(t *testing.T) {
	dbErr := errors.New("database unavailable")

	mock := &mockResendOutboxRepository{
		err: dbErr,
	}

	service, err := NewResendVerificationService(mock)
	if err != nil {
		t.Fatal(err)
	}

	err = service.RequestResend(
		context.Background(),
		"user-123",
	)

	if !errors.Is(err, dbErr) {
		t.Fatalf(
			"expected wrapped database error, got %v",
			err,
		)
	}
}

func TestResendVerificationServiceNilRepository(t *testing.T) {
	_, err := NewResendVerificationService(nil)

	if err == nil {
		t.Fatal("expected constructor error")
	}
}

func TestResendVerificationServiceNilReceiver(t *testing.T) {
	var service *ResendVerificationService

	err := service.RequestResend(
		context.Background(),
		"user-123",
	)

	if err == nil {
		t.Fatal("expected configuration error")
	}
}
