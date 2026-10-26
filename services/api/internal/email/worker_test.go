package email

import (
	"context"
	"errors"
	"testing"
	"time"
)

type mockWorkerRepo struct {
	jobs             []OutboxJob
	eligibility      map[string]JobEligibility
	sentJobs         []string
	failedJobs       map[string]string
	retriedJobs      map[string]time.Time
	claimErr         error
	eligibilityErr   error
}

func newMockWorkerRepo() *mockWorkerRepo {
	return &mockWorkerRepo{
		eligibility: make(map[string]JobEligibility),
		failedJobs:  make(map[string]string),
		retriedJobs: make(map[string]time.Time),
	}
}

func (m *mockWorkerRepo) ClaimJobs(ctx context.Context, batchSize int, leaseTimeout time.Duration, now time.Time) ([]OutboxJob, error) {
	if m.claimErr != nil {
		return nil, m.claimErr
	}
	result := m.jobs
	m.jobs = nil
	return result, nil
}

func (m *mockWorkerRepo) CheckEligibility(ctx context.Context, userID, tokenID string, now time.Time) (JobEligibility, error) {
	if m.eligibilityErr != nil {
		return JobEligibility{}, m.eligibilityErr
	}
	if e, ok := m.eligibility[userID+":"+tokenID]; ok {
		return e, nil
	}
	return JobEligibility{IsEligible: true}, nil
}

func (m *mockWorkerRepo) MarkSent(ctx context.Context, jobID string, sentAt time.Time) error {
	m.sentJobs = append(m.sentJobs, jobID)
	return nil
}

func (m *mockWorkerRepo) MarkFailed(ctx context.Context, jobID string, errMessage string, failedAt time.Time) error {
	m.failedJobs[jobID] = errMessage
	return nil
}

func (m *mockWorkerRepo) ScheduleRetry(ctx context.Context, jobID string, nextAttemptAt time.Time, errMessage string, now time.Time) error {
	m.retriedJobs[jobID] = nextAttemptAt
	return nil
}

type mockSender struct {
	sent   []string
	err    error
}

func (s *mockSender) SendVerification(ctx context.Context, to string, verificationURL string) error {
	if s.err != nil {
		return s.err
	}
	s.sent = append(s.sent, to)
	return nil
}

func setupTestWorker(t *testing.T, repo WorkerRepository, sender Sender) (*Worker, *TokenCipher) {
	t.Helper()
	key := []byte("0123456789abcdef0123456789abcdef")
	cipher, err := NewTokenCipher(key)
	if err != nil {
		t.Fatal(err)
	}

	worker, err := NewWorker(
		repo,
		cipher,
		sender,
		WorkerConfig{
			BatchSize:    10,
			PollInterval: 10 * time.Millisecond,
			PublicURL:    "https://daocoin.app",
			RetryBackoff: func(attempts int) time.Duration {
				return time.Minute * time.Duration(attempts)
			},
		},
	)
	if err != nil {
		t.Fatal(err)
	}

	return worker, cipher
}

func TestWorkerProcessBatchSuccess(t *testing.T) {
	repo := newMockWorkerRepo()
	sender := &mockSender{}
	worker, cipher := setupTestWorker(t, repo, sender)

	token := "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
	encToken, err := cipher.Encrypt(token)
	if err != nil {
		t.Fatal(err)
	}

	repo.jobs = []OutboxJob{
		{
			ID:                  "job-1",
			UserID:              "user-1",
			VerificationTokenID: "tok-1",
			RecipientEmail:      "alice@example.com",
			EncryptedToken:      encToken,
			Attempts:            1,
			MaxAttempts:         5,
		},
	}

	processed, err := worker.ProcessBatch(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if processed != 1 {
		t.Fatalf("expected 1 processed job, got %d", processed)
	}

	if len(sender.sent) != 1 || sender.sent[0] != "alice@example.com" {
		t.Fatalf("expected 1 email sent to alice, got %v", sender.sent)
	}

	if len(repo.sentJobs) != 1 || repo.sentJobs[0] != "job-1" {
		t.Fatalf("expected job-1 to be marked sent, got %v", repo.sentJobs)
	}
}

func TestWorkerProcessBatchIneligibleStaleJob(t *testing.T) {
	repo := newMockWorkerRepo()
	sender := &mockSender{}
	worker, cipher := setupTestWorker(t, repo, sender)

	token := "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
	encToken, err := cipher.Encrypt(token)
	if err != nil {
		t.Fatal(err)
	}

	repo.jobs = []OutboxJob{
		{
			ID:                  "job-stale",
			UserID:              "user-stale",
			VerificationTokenID: "tok-stale",
			RecipientEmail:      "bob@example.com",
			EncryptedToken:      encToken,
			Attempts:            1,
			MaxAttempts:         5,
		},
	}

	repo.eligibility["user-stale:tok-stale"] = JobEligibility{
		IsEligible: false,
		Reason:     "account already active",
	}

	processed, err := worker.ProcessBatch(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if processed != 1 {
		t.Fatalf("expected 1 processed, got %d", processed)
	}

	if len(sender.sent) != 0 {
		t.Fatal("sender should not be called for stale job")
	}

	if _, ok := repo.failedJobs["job-stale"]; !ok {
		t.Fatal("expected job-stale to be marked failed")
	}
}

func TestWorkerProcessBatchDeliveryFailureRetry(t *testing.T) {
	repo := newMockWorkerRepo()
	sender := &mockSender{err: errors.New("network timeout")}
	worker, cipher := setupTestWorker(t, repo, sender)

	token := "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
	encToken, err := cipher.Encrypt(token)
	if err != nil {
		t.Fatal(err)
	}

	repo.jobs = []OutboxJob{
		{
			ID:                  "job-retry",
			UserID:              "user-1",
			VerificationTokenID: "tok-1",
			RecipientEmail:      "carol@example.com",
			EncryptedToken:      encToken,
			Attempts:            2,
			MaxAttempts:         5,
		},
	}

	processed, err := worker.ProcessBatch(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if processed != 1 {
		t.Fatalf("expected 1 processed, got %d", processed)
	}

	if len(repo.sentJobs) != 0 {
		t.Fatal("failed send should not be marked sent")
	}

	if _, ok := repo.retriedJobs["job-retry"]; !ok {
		t.Fatal("expected job-retry to be scheduled for retry")
	}
}

func TestWorkerProcessBatchMaxAttemptsReached(t *testing.T) {
	repo := newMockWorkerRepo()
	sender := &mockSender{err: errors.New("permanent smtp bounce")}
	worker, cipher := setupTestWorker(t, repo, sender)

	token := "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
	encToken, err := cipher.Encrypt(token)
	if err != nil {
		t.Fatal(err)
	}

	repo.jobs = []OutboxJob{
		{
			ID:                  "job-max",
			UserID:              "user-1",
			VerificationTokenID: "tok-1",
			RecipientEmail:      "dave@example.com",
			EncryptedToken:      encToken,
			Attempts:            5,
			MaxAttempts:         5,
		},
	}

	processed, err := worker.ProcessBatch(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if processed != 1 {
		t.Fatalf("expected 1 processed, got %d", processed)
	}

	if _, ok := repo.failedJobs["job-max"]; !ok {
		t.Fatal("expected job-max to be marked failed when max attempts is reached")
	}
}

func TestWorkerRunAndStop(t *testing.T) {
	repo := newMockWorkerRepo()
	sender := &mockSender{}
	worker, _ := setupTestWorker(t, repo, sender)

	ctx, cancel := context.WithCancel(context.Background())

	errCh := make(chan error, 1)
	go func() {
		errCh <- worker.Run(ctx)
	}()

	time.Sleep(20 * time.Millisecond)
	cancel()

	select {
	case err := <-errCh:
		if err != nil {
			t.Fatalf("worker returned unexpected error on shutdown: %v", err)
		}
	case <-time.After(time.Second):
		t.Fatal("worker did not shut down after cancellation")
	}
}
