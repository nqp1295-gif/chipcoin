package auth

import (
	"context"
	"testing"
)

func TestNewResendLookupRepositoryNilDatabase(
	t *testing.T,
) {
	_, err := NewResendLookupRepository(nil)

	if err == nil {
		t.Fatal("expected constructor error")
	}
}

func TestResendLookupRepositoryNilReceiver(
	t *testing.T,
) {
	var repo *ResendLookupRepository

	_, _, err := repo.FindEligibleUserID(
		context.Background(),
		"user@example.com",
	)

	if err == nil {
		t.Fatal("expected configuration error")
	}
}
