package middleware

import (
	"net/http"
	"strings"
)

// CORSConfig defines allowed origins for cross-origin requests.
type CORSConfig struct {
	AllowedOrigins []string
}

// CORSMiddleware provides Cross-Origin Resource Sharing handling.
func CORSMiddleware(cfg CORSConfig) func(http.Handler) http.Handler {
	allowedMap := make(map[string]bool, len(cfg.AllowedOrigins))
	for _, o := range cfg.AllowedOrigins {
		clean := strings.TrimSpace(o)
		if clean != "" {
			allowedMap[clean] = true
		}
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")

			isAllowed := false
			if origin != "" {
				if allowedMap["*"] || allowedMap[origin] {
					isAllowed = true
				}
			}

			if isAllowed {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Access-Control-Allow-Credentials", "true")
				w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
				w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept")
				w.Header().Set("Access-Control-Max-Age", "86400")
				w.Header().Set("Vary", "Origin")
			}

			// Preflight OPTIONS handling
			if r.Method == http.MethodOptions {
				w.Header().Set("Content-Length", "0")
				w.WriteHeader(http.StatusNoContent)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
