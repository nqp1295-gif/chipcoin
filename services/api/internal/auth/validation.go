package auth

import (
	"errors"
	"net/mail"
	"regexp"
	"strings"
	"unicode"
	"unicode/utf8"
)

var (
	ErrInvalidUsername = errors.New("invalid username")
	ErrInvalidEmail    = errors.New("invalid email")
	ErrWeakPassword    = errors.New("password does not meet security requirements")
)

// usernamePattern giữ lại để tương thích ngược, cho phép 2-50 ký tự
var usernamePattern = regexp.MustCompile(`^[\p{L}\p{N}][\p{L}\p{N}_.\s-]{0,48}[\p{L}\p{N}]$`)

type RegisterRequest struct {
	Username     string `json:"username"`
	Email        string `json:"email"`
	Password     string `json:"password"`
	ReferralCode string `json:"referral_code,omitempty"`
}

// IsValidUsername kiểm tra tên người dùng:
// - Độ dài từ 2 đến 50 ký tự (runes)
// - Bắt đầu và kết thúc bằng chữ cái hoặc chữ số (hỗ trợ cả Unicode tiếng Việt)
// - Các ký tự bên trong cho phép: chữ cái, chữ số, '_', '-', '.', ' '
// - Không chứa 2 khoảng trắng liên tiếp
func IsValidUsername(u string) bool {
	u = strings.TrimSpace(u)
	runes := []rune(u)
	n := len(runes)
	if n < 2 || n > 50 {
		return false
	}

	// Ký tự đầu và cuối phải là chữ cái hoặc số
	if !unicode.IsLetter(runes[0]) && !unicode.IsDigit(runes[0]) {
		return false
	}
	if !unicode.IsLetter(runes[n-1]) && !unicode.IsDigit(runes[n-1]) {
		return false
	}

	for i, r := range runes {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			continue
		}
		if r == '_' || r == '-' || r == '.' || r == ' ' {
			// Không cho phép 2 khoảng trắng liên tiếp
			if r == ' ' && i > 0 && runes[i-1] == ' ' {
				return false
			}
			continue
		}
		return false
	}

	return true
}

func ValidateRegister(req *RegisterRequest) error {
	req.Username = strings.TrimSpace(req.Username)
	req.Username = strings.TrimPrefix(req.Username, "@")
	req.Username = strings.Join(strings.Fields(req.Username), " ")
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	if !IsValidUsername(req.Username) {
		return ErrInvalidUsername
	}

	if len(req.Email) > 254 {
		return ErrInvalidEmail
	}

	address, err := mail.ParseAddress(req.Email)
	if err != nil || address.Address != req.Email {
		return ErrInvalidEmail
	}

	if utf8.RuneCountInString(req.Password) < 12 ||
		len(req.Password) > 1024 {
		return ErrWeakPassword
	}

	return nil
}
