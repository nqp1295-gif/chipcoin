package auth

import (
	"context"
	"errors"
	"fmt"
	"strings"
)

var ErrResendUserIDRequired = errors.New(
	"resend verification user ID is required",
)

// ResendOutboxRepository defines the database operation
// required by ResendVerificationService.
type ResendOutboxRepository interface {
	QueueResend(
		ctx context.Context,
		userID string,
	) error
}

type ResendVerificationService struct {
	repo ResendOutboxRepository
}

func NewResendVerificationService(
	repo ResendOutboxRepository,
) (*ResendVerificationService, error) {
	if repo == nil {
		return nil, errors.New(
			"resend verification repository is required",
		)
	}

	return &ResendVerificationService{
		repo: repo,
	}, nil
}

// RequestResend queues a verification email.
//
// This method does not send email directly.
// The Outbox Worker will process the queued job later.
func (s *ResendVerificationService) RequestResend(
	ctx context.Context,
	userID string,
) error {
	if s == nil || s.repo == nil {
		return errors.New("resend verification service is not configured")
	}

	userID = strings.TrimSpace(userID)

	if userID == "" {
		return ErrResendUserIDRequired
	}

	err := s.repo.QueueResend(ctx, userID)
	if err != nil {
		return fmt.Errorf(
			"queue verification resend: %w",
			err,
		)
	}

	return nil
}
