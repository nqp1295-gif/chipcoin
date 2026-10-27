package email

import (
	"context"
	"errors"
	"strings"
	"testing"
)

func TestGmailSMTPSenderValidation(t *testing.T) {
	sender := NewGmailSMTPSender(GmailSMTPConfig{
		Username:  "medubaiso1@gmail.com",
		Password:  "",
		FromEmail: "medubaiso1@gmail.com",
		FromName:  "CHIPCOIN | Xác thực tài khoản",
	})

	ctx := context.Background()

	// 1. Invalid recipient email
	err := sender.SendVerification(ctx, "invalid-email", "https://chipcoin.io/verify-email?token=123")
	if !errors.Is(err, ErrInvalidRecipient) {
		t.Fatalf("expected ErrInvalidRecipient, got %v", err)
	}

	// 2. CRLF injection in email
	err = sender.SendVerification(ctx, "test@example.com\r\nBcc: evil@example.com", "https://chipcoin.io/verify-email?token=123")
	if !errors.Is(err, ErrInvalidRecipient) {
		t.Fatalf("expected ErrInvalidRecipient on CRLF injection, got %v", err)
	}

	// 3. Invalid verification URL
	err = sender.SendVerification(ctx, "user@example.com", "ftp://invalid-url")
	if !errors.Is(err, ErrInvalidLink) {
		t.Fatalf("expected ErrInvalidLink on ftp scheme, got %v", err)
	}

	// 4. Missing password produces ErrSMTPAuthFailed
	err = sender.SendVerification(ctx, "user@example.com", "https://chipcoin.io/verify-email?token=abc")
	if !errors.Is(err, ErrSMTPAuthFailed) {
		t.Fatalf("expected ErrSMTPAuthFailed when password missing, got %v", err)
	}

	// 5. SendVerificationSuccess recipient validation
	err = sender.SendVerificationSuccess(ctx, "invalid-email", "https://chipcoin.io/login")
	if !errors.Is(err, ErrInvalidRecipient) {
		t.Fatalf("expected ErrInvalidRecipient on SendVerificationSuccess, got %v", err)
	}
}

func TestGmailSMTPSenderDefaults(t *testing.T) {
	sender := NewGmailSMTPSender(GmailSMTPConfig{
		Username: "medubaiso1@gmail.com",
	})

	if sender.cfg.Host != "smtp.gmail.com" {
		t.Fatalf("expected default host smtp.gmail.com, got %s", sender.cfg.Host)
	}
	if sender.cfg.Port != 587 {
		t.Fatalf("expected default port 587, got %d", sender.cfg.Port)
	}
	if sender.cfg.FromEmail != "medubaiso1@gmail.com" {
		t.Fatalf("expected default from email medubaiso1@gmail.com, got %s", sender.cfg.FromEmail)
	}
	if !strings.Contains(sender.cfg.FromName, "CHIPCOIN") {
		t.Fatalf("expected CHIPCOIN in FromName, got %s", sender.cfg.FromName)
	}
}
