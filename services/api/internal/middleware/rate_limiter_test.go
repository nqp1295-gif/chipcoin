package middleware

import (
	"sync"
	"testing"
	"time"
)

func TestRateLimiterAllowsWithinLimit(t *testing.T) {
	limiter := NewRateLimiter(
		3,
		time.Minute,
		100,
	)

	now := time.Now()

	for i := 0; i < 3; i++ {
		if !limiter.AllowAt("client-a", now) {
			t.Fatalf(
				"request %d should be allowed",
				i+1,
			)
		}
	}
}

func TestRateLimiterBlocksOverLimit(t *testing.T) {
	limiter := NewRateLimiter(
		2,
		time.Minute,
		100,
	)

	now := time.Now()

	if !limiter.AllowAt("client-a", now) {
		t.Fatal("first request should pass")
	}

	if !limiter.AllowAt("client-a", now) {
		t.Fatal("second request should pass")
	}

	if limiter.AllowAt("client-a", now) {
		t.Fatal("third request should be blocked")
	}
}

func TestRateLimiterResetsAfterWindow(t *testing.T) {
	limiter := NewRateLimiter(
		1,
		time.Minute,
		100,
	)

	start := time.Now()

	if !limiter.AllowAt("client-a", start) {
		t.Fatal("first request should pass")
	}

	if limiter.AllowAt(
		"client-a",
		start.Add(30*time.Second),
	) {
		t.Fatal("request within window should be blocked")
	}

	if !limiter.AllowAt(
		"client-a",
		start.Add(time.Minute),
	) {
		t.Fatal("request after reset should pass")
	}
}

func TestRateLimiterIndependentKeys(t *testing.T) {
	limiter := NewRateLimiter(
		1,
		time.Minute,
		100,
	)

	now := time.Now()

	if !limiter.AllowAt("client-a", now) {
		t.Fatal("client-a should pass")
	}

	if !limiter.AllowAt("client-b", now) {
		t.Fatal("client-b should pass")
	}

	if limiter.AllowAt("client-a", now) {
		t.Fatal("client-a should be blocked")
	}
}

func TestRateLimiterMaxEntries(t *testing.T) {
	limiter := NewRateLimiter(
		10,
		time.Minute,
		2,
	)

	now := time.Now()

	if !limiter.AllowAt("client-a", now) {
		t.Fatal("client-a should pass")
	}

	if !limiter.AllowAt("client-b", now) {
		t.Fatal("client-b should pass")
	}

	if limiter.AllowAt("client-c", now) {
		t.Fatal("new key should be blocked at capacity")
	}
}

func TestRateLimiterExpiredEntryCleanup(t *testing.T) {
	limiter := NewRateLimiter(
		1,
		time.Minute,
		1,
	)

	start := time.Now()

	if !limiter.AllowAt("client-a", start) {
		t.Fatal("client-a should pass")
	}

	if !limiter.AllowAt(
		"client-b",
		start.Add(2*time.Minute),
	) {
		t.Fatal("expired entry should be removed")
	}
}

func TestRateLimiterEmptyKey(t *testing.T) {
	limiter := NewRateLimiter(
		10,
		time.Minute,
		100,
	)

	if limiter.Allow("") {
		t.Fatal("empty key must be rejected")
	}
}

func TestRateLimiterConcurrentRequests(t *testing.T) {
	const (
		limit    = 10
		requests = 100
	)

	limiter := NewRateLimiter(
		limit,
		time.Minute,
		100,
	)

	var wg sync.WaitGroup
	var mu sync.Mutex

	allowed := 0

	for i := 0; i < requests; i++ {
		wg.Add(1)

		go func() {
			defer wg.Done()

			if limiter.Allow("shared-client") {
				mu.Lock()
				allowed++
				mu.Unlock()
			}
		}()
	}

	wg.Wait()

	if allowed != limit {
		t.Fatalf(
			"expected %d allowed requests, got %d",
			limit,
			allowed,
		)
	}
}
func TestRateLimiterRetryAfter(t *testing.T) {
	limiter := NewRateLimiter(
		1,
		time.Minute,
		100,
	)

	start := time.Date(
		2026, 10, 26,
		10, 0, 0, 0,
		time.UTC,
	)

	allowed, retry := limiter.AllowAtWithRetry(
		"client-a",
		start,
	)

	if !allowed || retry != 0 {
		t.Fatalf(
			"expected allowed=true, retry=0; got %v, %v",
			allowed,
			retry,
		)
	}

	allowed, retry = limiter.AllowAtWithRetry(
		"client-a",
		start.Add(20*time.Second),
	)

	if allowed {
		t.Fatal("request should be blocked")
	}

	if retry != 40*time.Second {
		t.Fatalf(
			"expected retry 40s, got %v",
			retry,
		)
	}
}

func TestRateLimiterCleanupExpired(t *testing.T) {
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

	limiter.AllowAt("client-a", start)
	limiter.AllowAt("client-b", start)

	if limiter.EntryCount() != 2 {
		t.Fatal("expected 2 entries")
	}

	removed := limiter.CleanupExpired(
		start.Add(2 * time.Minute),
	)

	if removed != 2 {
		t.Fatalf(
			"expected 2 removed entries, got %d",
			removed,
		)
	}

	if limiter.EntryCount() != 0 {
		t.Fatal("expected empty limiter")
	}
}

func TestRateLimiterCleanupKeepsActiveEntries(t *testing.T) {
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
		start.Add(30*time.Second),
	)

	removed := limiter.CleanupExpired(
		start.Add(70 * time.Second),
	)

	if removed != 1 {
		t.Fatalf(
			"expected 1 expired entry, got %d",
			removed,
		)
	}

	if limiter.EntryCount() != 1 {
		t.Fatal("active entry should remain")
	}
}
