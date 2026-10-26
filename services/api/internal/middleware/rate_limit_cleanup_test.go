package middleware

import (
	"context"
	"fmt"
	"sync"
	"testing"
	"time"
)

type mockRateLimitCleaner struct {
	mu      sync.Mutex
	calls   int
	removed int
}

func (m *mockRateLimitCleaner) CleanupExpired(
	now time.Time,
) int {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.calls++
	return m.removed
}

func (m *mockRateLimitCleaner) CallCount() int {
	m.mu.Lock()
	defer m.mu.Unlock()

	return m.calls
}

func TestCleanupSchedulerRejectsInvalidConfig(t *testing.T) {
	cleaner := &mockRateLimitCleaner{}

	tests := []struct {
		name     string
		interval time.Duration
		limiters []RateLimitCleaner
	}{
		{
			name:     "zero interval",
			interval: 0,
			limiters: []RateLimitCleaner{cleaner},
		},
		{
			name:     "negative interval",
			interval: -time.Second,
			limiters: []RateLimitCleaner{cleaner},
		},
		{
			name:     "no limiters",
			interval: time.Minute,
			limiters: nil,
		},
		{
			name:     "nil limiter",
			interval: time.Minute,
			limiters: []RateLimitCleaner{nil},
		},
		{
			name:     "typed nil limiter",
			interval: time.Minute,
			limiters: []RateLimitCleaner{(*RateLimiter)(nil)},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := NewRateLimitCleanupScheduler(
				tt.interval,
				tt.limiters...,
			)

			if err == nil {
				t.Fatal("expected configuration error")
			}
		})
	}
}

func TestCleanupSchedulerCleanupNow(t *testing.T) {
	first := &mockRateLimitCleaner{removed: 2}
	second := &mockRateLimitCleaner{removed: 3}

	scheduler, err := NewRateLimitCleanupScheduler(
		time.Minute,
		first,
		second,
	)
	if err != nil {
		t.Fatal(err)
	}

	removed := scheduler.CleanupNow(time.Now())

	if removed != 5 {
		t.Fatalf("expected 5 removed, got %d", removed)
	}

	if first.CallCount() != 1 {
		t.Fatal("first limiter was not cleaned")
	}

	if second.CallCount() != 1 {
		t.Fatal("second limiter was not cleaned")
	}
}

func TestCleanupSchedulerRunAndStop(t *testing.T) {
	cleaner := &mockRateLimitCleaner{}

	scheduler, err := NewRateLimitCleanupScheduler(
		5*time.Millisecond,
		cleaner,
	)
	if err != nil {
		t.Fatal(err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	done := make(chan error, 1)

	go func() {
		done <- scheduler.Run(ctx)
	}()

	deadline := time.After(500 * time.Millisecond)

	for cleaner.CallCount() == 0 {
		select {
		case <-deadline:
			t.Fatal("scheduler did not execute cleanup")

		case <-time.After(time.Millisecond):
		}
	}

	cancel()

	select {
	case err := <-done:
		if err != nil {
			t.Fatalf("scheduler returned error: %v", err)
		}

	case <-time.After(time.Second):
		t.Fatal("scheduler did not stop after cancellation")
	}
}

func TestCleanupSchedulerCancelledContext(t *testing.T) {
	cleaner := &mockRateLimitCleaner{}

	scheduler, err := NewRateLimitCleanupScheduler(
		time.Minute,
		cleaner,
	)
	if err != nil {
		t.Fatal(err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	done := make(chan error, 1)

	go func() {
		done <- scheduler.Run(ctx)
	}()

	select {
	case err := <-done:
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

	case <-time.After(time.Second):
		t.Fatal("cancelled scheduler did not stop")
	}
}

func TestCleanupSchedulerNilContext(t *testing.T) {
	cleaner := &mockRateLimitCleaner{}

	scheduler, err := NewRateLimitCleanupScheduler(
		time.Minute,
		cleaner,
	)
	if err != nil {
		t.Fatal(err)
	}

	if err := scheduler.Run(nil); err == nil {
		t.Fatal("expected error for nil context")
	}
}

func TestCleanupSchedulerRealLimiter(t *testing.T) {
	limiter := NewRateLimiter(
		5,
		time.Minute,
		100,
	)

	start := time.Date(
		2026, 10, 26,
		10, 0, 0, 0,
		time.UTC,
	)

	limiter.AllowAt("expired", start)

	limiter.AllowAt(
		"active",
		start.Add(90*time.Second),
	)

	scheduler, err := NewRateLimitCleanupScheduler(
		time.Minute,
		limiter,
	)
	if err != nil {
		t.Fatal(err)
	}

	removed := scheduler.CleanupNow(
		start.Add(2 * time.Minute),
	)

	if removed != 1 {
		t.Fatalf("expected 1 removed, got %d", removed)
	}

	if limiter.EntryCount() != 1 {
		t.Fatal("active limiter entry should remain")
	}
}

func TestCleanupSchedulerConcurrentRequestsAndCleanup(t *testing.T) {
	limiter := NewRateLimiter(
		100,
		5*time.Millisecond,
		500,
	)

	scheduler, err := NewRateLimitCleanupScheduler(
		2*time.Millisecond,
		limiter,
	)
	if err != nil {
		t.Fatal(err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	errCh := make(chan error, 1)
	go func() {
		errCh <- scheduler.Run(ctx)
	}()

	var wg sync.WaitGroup
	workers := 10
	iterations := 50

	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			for j := 0; j < iterations; j++ {
				key := fmt.Sprintf("key-%d-%d", workerID, j%5)
				limiter.AllowWithRetry(key)
				time.Sleep(200 * time.Microsecond)
			}
		}(i)
	}

	wg.Wait()
	cancel()

	select {
	case err := <-errCh:
		if err != nil {
			t.Fatalf("scheduler returned error: %v", err)
		}
	case <-time.After(time.Second):
		t.Fatal("scheduler did not stop in time after cancellation")
	}
}

func TestCleanupSchedulerHTTPAndEmailLimiters(t *testing.T) {
	httpLimiter := NewHTTPRateLimiter(HTTPRateLimitConfig{
		GlobalLimit:  10,
		GlobalWindow: time.Minute,
		IPLimit:      5,
		IPWindow:     time.Minute,
		MaxEntries:   100,
	})

	emailLimiter, err := NewEmailRateLimiter(
		[]byte("0123456789abcdef0123456789abcdef"),
		5,
		time.Hour,
		100,
	)
	if err != nil {
		t.Fatal(err)
	}

	// Verify both satisfy RateLimitCleaner
	var _ RateLimitCleaner = httpLimiter
	var _ RateLimitCleaner = emailLimiter

	scheduler, err := NewRateLimitCleanupScheduler(
		time.Minute,
		httpLimiter,
		emailLimiter,
	)
	if err != nil {
		t.Fatal(err)
	}

	removed := scheduler.CleanupNow(time.Now())
	if removed < 0 {
		t.Fatalf("unexpected removed count: %d", removed)
	}
}
