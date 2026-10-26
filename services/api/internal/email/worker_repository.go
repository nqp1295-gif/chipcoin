package email

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type OutboxJob struct {
	ID                  string
	UserID              string
	VerificationTokenID string
	RecipientEmail      string
	EncryptedToken      []byte
	Attempts            int
	MaxAttempts         int
}

type JobEligibility struct {
	IsEligible bool
	Reason     string
}

type WorkerRepository interface {
	ClaimJobs(ctx context.Context, batchSize int, leaseTimeout time.Duration, now time.Time) ([]OutboxJob, error)
	CheckEligibility(ctx context.Context, userID, tokenID string, now time.Time) (JobEligibility, error)
	MarkSent(ctx context.Context, jobID string, sentAt time.Time) error
	MarkFailed(ctx context.Context, jobID string, errMessage string, failedAt time.Time) error
	ScheduleRetry(ctx context.Context, jobID string, nextAttemptAt time.Time, errMessage string, now time.Time) error
}

type OutboxWorkerRepository struct {
	db *pgxpool.Pool
}

func NewOutboxWorkerRepository(db *pgxpool.Pool) (*OutboxWorkerRepository, error) {
	if db == nil {
		return nil, errors.New("database pool is required for outbox worker repository")
	}
	return &OutboxWorkerRepository{db: db}, nil
}

func (r *OutboxWorkerRepository) ClaimJobs(
	ctx context.Context,
	batchSize int,
	leaseTimeout time.Duration,
	now time.Time,
) ([]OutboxJob, error) {
	if r == nil || r.db == nil {
		return nil, errors.New("outbox worker repository is not configured")
	}

	if batchSize <= 0 {
		batchSize = 10
	}
	if leaseTimeout <= 0 {
		leaseTimeout = 5 * time.Minute
	}

	rows, err := r.db.Query(
		ctx,
		`
		WITH claimable AS (
			SELECT id
			FROM email_outbox
			WHERE (status = 'PENDING' AND next_attempt_at <= $1)
			   OR (status = 'PROCESSING' AND locked_at < $1 - $2::interval)
			ORDER BY next_attempt_at ASC, created_at ASC
			LIMIT $3
			FOR UPDATE SKIP LOCKED
		)
		UPDATE email_outbox o
		SET status = 'PROCESSING',
		    locked_at = $1,
		    attempts = o.attempts + 1,
		    updated_at = $1
		FROM claimable c
		WHERE o.id = c.id
		RETURNING o.id, o.user_id, o.verification_token_id, o.recipient_email, o.encrypted_token, o.attempts, o.max_attempts;
		`,
		now,
		fmt.Sprintf("%d seconds", int(leaseTimeout.Seconds())),
		batchSize,
	)
	if err != nil {
		return nil, fmt.Errorf("claim outbox jobs: %w", err)
	}
	defer rows.Close()

	var jobs []OutboxJob
	for rows.Next() {
		var job OutboxJob
		if err := rows.Scan(
			&job.ID,
			&job.UserID,
			&job.VerificationTokenID,
			&job.RecipientEmail,
			&job.EncryptedToken,
			&job.Attempts,
			&job.MaxAttempts,
		); err != nil {
			return nil, fmt.Errorf("scan claimed job: %w", err)
		}
		jobs = append(jobs, job)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate claimed jobs: %w", err)
	}

	return jobs, nil
}

func (r *OutboxWorkerRepository) CheckEligibility(
	ctx context.Context,
	userID, tokenID string,
	now time.Time,
) (JobEligibility, error) {
	if r == nil || r.db == nil {
		return JobEligibility{}, errors.New("outbox worker repository is not configured")
	}

	var (
		userStatus    string
		verifiedAt    *time.Time
		tokenUsedAt   *time.Time
		tokenExpireAt time.Time
	)

	err := r.db.QueryRow(
		ctx,
		`
		SELECT u.status, u.email_verified_at, t.used_at, t.expires_at
		FROM users u
		JOIN email_verification_tokens t ON t.id = $2
		WHERE u.id = $1;
		`,
		userID,
		tokenID,
	).Scan(&userStatus, &verifiedAt, &tokenUsedAt, &tokenExpireAt)

	if errors.Is(err, pgx.ErrNoRows) {
		return JobEligibility{IsEligible: false, Reason: "user or token not found"}, nil
	}
	if err != nil {
		return JobEligibility{}, fmt.Errorf("check job eligibility: %w", err)
	}

	if userStatus != "PENDING" || verifiedAt != nil {
		return JobEligibility{IsEligible: false, Reason: "account already verified or inactive"}, nil
	}

	if tokenUsedAt != nil {
		return JobEligibility{IsEligible: false, Reason: "verification token already used"}, nil
	}

	if now.After(tokenExpireAt) {
		return JobEligibility{IsEligible: false, Reason: "verification token expired"}, nil
	}

	return JobEligibility{IsEligible: true}, nil
}

func (r *OutboxWorkerRepository) MarkSent(
	ctx context.Context,
	jobID string,
	sentAt time.Time,
) error {
	if r == nil || r.db == nil {
		return errors.New("outbox worker repository is not configured")
	}

	_, err := r.db.Exec(
		ctx,
		`
		UPDATE email_outbox
		SET status = 'SENT',
		    sent_at = $2,
		    locked_at = NULL,
		    last_error = NULL,
		    updated_at = $2
		WHERE id = $1;
		`,
		jobID,
		sentAt,
	)
	if err != nil {
		return fmt.Errorf("mark job sent: %w", err)
	}
	return nil
}

func (r *OutboxWorkerRepository) MarkFailed(
	ctx context.Context,
	jobID string,
	errMessage string,
	failedAt time.Time,
) error {
	if r == nil || r.db == nil {
		return errors.New("outbox worker repository is not configured")
	}

	_, err := r.db.Exec(
		ctx,
		`
		UPDATE email_outbox
		SET status = 'FAILED',
		    last_error = $2,
		    locked_at = NULL,
		    updated_at = $3
		WHERE id = $1;
		`,
		jobID,
		errMessage,
		failedAt,
	)
	if err != nil {
		return fmt.Errorf("mark job failed: %w", err)
	}
	return nil
}

func (r *OutboxWorkerRepository) ScheduleRetry(
	ctx context.Context,
	jobID string,
	nextAttemptAt time.Time,
	errMessage string,
	now time.Time,
) error {
	if r == nil || r.db == nil {
		return errors.New("outbox worker repository is not configured")
	}

	_, err := r.db.Exec(
		ctx,
		`
		UPDATE email_outbox
		SET status = 'PENDING',
		    next_attempt_at = $2,
		    last_error = $3,
		    locked_at = NULL,
		    updated_at = $4
		WHERE id = $1;
		`,
		jobID,
		nextAttemptAt,
		errMessage,
		now,
	)
	if err != nil {
		return fmt.Errorf("schedule job retry: %w", err)
	}
	return nil
}
