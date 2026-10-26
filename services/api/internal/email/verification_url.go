package email

import (
	"errors"
	"net/url"
	"strings"
)

var ErrInvalidVerificationURL = errors.New("invalid verification URL")

// BuildVerificationURL creates a verification link for DAOCOIN.
//
// The raw token must only be passed to trusted email delivery code.
// Never log the returned URL or expose it in a public API response.
func BuildVerificationURL(
	publicURL string,
	token string,
) (string, error) {

	if token == "" {
		return "", ErrInvalidVerificationURL
	}

	// A verification token is a 32-byte random value encoded
	// as 64 hexadecimal characters.
	if len(token) != 64 {
		return "", ErrInvalidVerificationURL
	}

	for _, ch := range token {
		if !strings.ContainsRune("0123456789abcdef", ch) {
			return "", ErrInvalidVerificationURL
		}
	}

	parsedURL, err := url.Parse(publicURL)

	if err != nil {
		return "", ErrInvalidVerificationURL
	}

	if parsedURL.Scheme != "https" ||
		parsedURL.Host == "" ||
		parsedURL.User != nil ||
		parsedURL.RawQuery != "" ||
		parsedURL.Fragment != "" {
		return "", ErrInvalidVerificationURL
	}

	// Restrict the public URL to the application origin.
	if parsedURL.Path != "" && parsedURL.Path != "/" {
		return "", ErrInvalidVerificationURL
	}

	parsedURL.Path = "/verify-email"
	parsedURL.RawPath = ""

	query := url.Values{}
	query.Set("token", token)

	parsedURL.RawQuery = query.Encode()

	return parsedURL.String(), nil
}
