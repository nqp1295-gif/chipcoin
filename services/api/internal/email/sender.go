package email

import (
	"context"
	"errors"
)

var (
	ErrInvalidRecipient = errors.New("invalid email recipient")
	ErrInvalidLink      = errors.New("invalid verification link")
	ErrDeliveryFailed   = errors.New("email delivery failed")
)

type Sender interface {
	SendVerification(
		ctx context.Context,
		to string,
		verificationURL string,
	) error
}
