package middleware

import (
	"sync"
	"time"
)

type rateLimitEntry struct {
	count   int
	resetAt time.Time
}

type RateLimiter struct {
	mu      sync.Mutex
	entries map[string]rateLimitEntry

	limit  int
	window time.Duration

	maxEntries int
}

func NewRateLimiter(
	limit int,
	window time.Duration,
	maxEntries int,
) *RateLimiter {
	if limit <= 0 {
		panic("rate limiter limit must be positive")
	}

	if window <= 0 {
		panic("rate limiter window must be positive")
	}

	if maxEntries <= 0 {
		panic("rate limiter maxEntries must be positive")
	}

	return &RateLimiter{
		entries:    make(map[string]rateLimitEntry),
		limit:      limit,
		window:     window,
		maxEntries: maxEntries,
	}
}

// Allow preserves compatibility with existing middleware.
func (r *RateLimiter) Allow(key string) bool {
	allowed, _ := r.AllowWithRetry(key)
	return allowed
}

// AllowWithRetry returns the remaining wait time when blocked.
func (r *RateLimiter) AllowWithRetry(
	key string,
) (bool, time.Duration) {
	return r.AllowAtWithRetry(key, time.Now())
}

// AllowAt preserves compatibility with existing tests.
func (r *RateLimiter) AllowAt(
	key string,
	now time.Time,
) bool {
	allowed, _ := r.AllowAtWithRetry(key, now)
	return allowed
}

// AllowAtWithRetry allows deterministic testing.
func (r *RateLimiter) AllowAtWithRetry(
	key string,
	now time.Time,
) (bool, time.Duration) {
	if r == nil || key == "" {
		return false, 0
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	entry, exists := r.entries[key]

	if exists && !now.Before(entry.resetAt) {
		delete(r.entries, key)
		exists = false
	}

	if exists {
		if entry.count >= r.limit {
			return false, entry.resetAt.Sub(now)
		}

		entry.count++
		r.entries[key] = entry
		return true, 0
	}

	// Remove expired entries before enforcing capacity.
	if len(r.entries) >= r.maxEntries {
		r.cleanupExpiredLocked(now)
	}

	// Fail closed if capacity is exhausted.
	if len(r.entries) >= r.maxEntries {
		return false, r.window
	}

	r.entries[key] = rateLimitEntry{
		count:   1,
		resetAt: now.Add(r.window),
	}

	return true, 0
}

// CleanupExpired can be called periodically.
func (r *RateLimiter) CleanupExpired(
	now time.Time,
) int {
	if r == nil {
		return 0
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	return r.cleanupExpiredLocked(now)
}

func (r *RateLimiter) cleanupExpiredLocked(
	now time.Time,
) int {
	removed := 0

	for key, entry := range r.entries {
		if !now.Before(entry.resetAt) {
			delete(r.entries, key)
			removed++
		}
	}

	return removed
}

// EntryCount supports monitoring and testing.
func (r *RateLimiter) EntryCount() int {
	if r == nil {
		return 0
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	return len(r.entries)
}
