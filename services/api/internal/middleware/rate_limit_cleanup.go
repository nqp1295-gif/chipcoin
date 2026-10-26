package middleware

import (
	"context"
	"errors"
	"reflect"
	"time"
)

type RateLimitCleaner interface {
	CleanupExpired(now time.Time) int
}

func isNilCleaner(c RateLimitCleaner) bool {
	if c == nil {
		return true
	}
	v := reflect.ValueOf(c)
	switch v.Kind() {
	case reflect.Chan, reflect.Func, reflect.Interface, reflect.Map, reflect.Pointer, reflect.Slice:
		return v.IsNil()
	default:
		return false
	}
}

type RateLimitCleanupScheduler struct {
	interval time.Duration
	limiters []RateLimitCleaner
}

func NewRateLimitCleanupScheduler(
	interval time.Duration,
	limiters ...RateLimitCleaner,
) (*RateLimitCleanupScheduler, error) {
	if interval <= 0 {
		return nil, errors.New("cleanup interval must be positive")
	}

	if len(limiters) == 0 {
		return nil, errors.New("at least one rate limiter is required")
	}

	for _, limiter := range limiters {
		if isNilCleaner(limiter) {
			return nil, errors.New("rate limiter cannot be nil")
		}
	}

	copied := make([]RateLimitCleaner, len(limiters))
	copy(copied, limiters)

	return &RateLimitCleanupScheduler{
		interval: interval,
		limiters: copied,
	}, nil
}

// CleanupNow executes one cleanup cycle.
func (s *RateLimitCleanupScheduler) CleanupNow(
	now time.Time,
) int {
	if s == nil {
		return 0
	}

	removed := 0

	for _, limiter := range s.limiters {
		removed += limiter.CleanupExpired(now)
	}

	return removed
}

// Run blocks until ctx is cancelled.
// Start it in one goroutine during API initialization.
func (s *RateLimitCleanupScheduler) Run(
	ctx context.Context,
) error {
	if s == nil || s.interval <= 0 {
		return errors.New("cleanup scheduler is not configured")
	}

	if ctx == nil {
		return errors.New("cleanup context is required")
	}

	ticker := time.NewTicker(s.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return nil

		case now := <-ticker.C:
			s.CleanupNow(now)
		}
	}
}
