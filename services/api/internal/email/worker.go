package email

import (
	"context"
	"errors"
	"fmt"
	"time"
)

type WorkerConfig struct {
	BatchSize     int
	PollInterval  time.Duration
	LeaseTimeout  time.Duration
	PublicURL     string
	RetryBackoff  func(attempts int) time.Duration
	NowFunc       func() time.Time
}

type Worker struct {
	repo   WorkerRepository
	cipher *TokenCipher
	sender Sender
	cfg    WorkerConfig
}

func NewWorker(
	repo WorkerRepository,
	cipher *TokenCipher,
	sender Sender,
	cfg WorkerConfig,
) (*Worker, error) {
	if repo == nil {
		return nil, errors.New("worker repository is required")
	}
	if cipher == nil {
		return nil, errors.New("token cipher is required")
	}
	if sender == nil {
		return nil, errors.New("email sender is required")
	}
	if cfg.PublicURL == "" {
		return nil, errors.New("public URL is required")
	}

	if cfg.BatchSize <= 0 {
		cfg.BatchSize = 10
	}
	if cfg.PollInterval <= 0 {
		cfg.PollInterval = 2 * time.Second
	}
	if cfg.LeaseTimeout <= 0 {
		cfg.LeaseTimeout = 5 * time.Minute
	}
	if cfg.RetryBackoff == nil {
		cfg.RetryBackoff = DefaultRetryBackoff
	}
	if cfg.NowFunc == nil {
		cfg.NowFunc = func() time.Time { return time.Now().UTC() }
	}

	return &Worker{
		repo:   repo,
		cipher: cipher,
		sender: sender,
		cfg:    cfg,
	}, nil
}

func DefaultRetryBackoff(attempts int) time.Duration {
	if attempts < 1 {
		attempts = 1
	}
	// 1m, 2m, 4m, 8m...
	shift := attempts - 1
	if shift > 6 {
		shift = 6
	}
	return time.Duration(1<<shift) * time.Minute
}

func (w *Worker) ProcessBatch(ctx context.Context) (int, error) {
	if w == nil {
		return 0, errors.New("worker is nil")
	}

	now := w.cfg.NowFunc()
	jobs, err := w.repo.ClaimJobs(ctx, w.cfg.BatchSize, w.cfg.LeaseTimeout, now)
	if err != nil {
		return 0, fmt.Errorf("claim outbox batch: %w", err)
	}

	processed := 0

	for _, job := range jobs {
		processed++

		// 1. Check user and token eligibility
		eligibility, err := w.repo.CheckEligibility(ctx, job.UserID, job.VerificationTokenID, now)
		if err != nil {
			// Transient DB error while checking eligibility: reschedule retry
			_ = w.repo.ScheduleRetry(ctx, job.ID, now.Add(w.cfg.RetryBackoff(job.Attempts)), err.Error(), now)
			continue
		}

		if !eligibility.IsEligible {
			_ = w.repo.MarkFailed(ctx, job.ID, "stale job: "+eligibility.Reason, now)
			continue
		}

		// 2. Decrypt verification token
		rawToken, err := w.cipher.Decrypt(job.EncryptedToken)
		if err != nil {
			_ = w.repo.MarkFailed(ctx, job.ID, "decrypt token failed: "+err.Error(), now)
			continue
		}

		// 3. Build verification link
		verificationURL, err := BuildVerificationURL(w.cfg.PublicURL, rawToken)
		if err != nil {
			_ = w.repo.MarkFailed(ctx, job.ID, "build verification url failed: "+err.Error(), now)
			continue
		}

		// 4. Send verification email via provider
		err = w.sender.SendVerification(ctx, job.RecipientEmail, verificationURL)
		if err == nil {
			_ = w.repo.MarkSent(ctx, job.ID, now)
			continue
		}

		// 5. Handle delivery failure
		if job.Attempts >= job.MaxAttempts {
			_ = w.repo.MarkFailed(ctx, job.ID, fmt.Sprintf("max delivery attempts reached (%d): %v", job.MaxAttempts, err), now)
		} else {
			nextAttempt := now.Add(w.cfg.RetryBackoff(job.Attempts))
			_ = w.repo.ScheduleRetry(ctx, job.ID, nextAttempt, err.Error(), now)
		}
	}

	return processed, nil
}

func (w *Worker) Run(ctx context.Context) error {
	if w == nil {
		return errors.New("worker is nil")
	}

	ticker := time.NewTicker(w.cfg.PollInterval)
	defer ticker.Stop()

	// Initial run immediately
	_, _ = w.ProcessBatch(ctx)

	for {
		select {
		case <-ctx.Done():
			return nil
		case <-ticker.C:
			_, _ = w.ProcessBatch(ctx)
		}
	}
}
