package auth

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"

	"golang.org/x/crypto/argon2"
)

func HashPassword(password string) (string, error) {
	salt := make([]byte, 16)

	if _, err := rand.Read(salt); err != nil {
		return "", err
	}

	hash := argon2.IDKey(
		[]byte(password),
		salt,
		3,
		64*1024,
		4,
		32,
	)

	return fmt.Sprintf(
		"$argon2id$v=19$m=65536,t=3,p=4$%s$%s",
		base64.RawStdEncoding.EncodeToString(salt),
		base64.RawStdEncoding.EncodeToString(hash),
	), nil
}
func VerifyPassword(password, encodedHash string) (bool, error) {
	parts := strings.Split(encodedHash, "$")

	if len(parts) != 6 {
		return false, errors.New("invalid password hash format")
	}

	if parts[1] != "argon2id" || parts[2] != "v=19" {
		return false, errors.New("unsupported password hash")
	}

	var memory uint32
	var iterations uint32
	var parallelism uint8

	n, err := fmt.Sscanf(
		parts[3],
		"m=%d,t=%d,p=%d",
		&memory,
		&iterations,
		&parallelism,
	)

	if err != nil || n != 3 {
		return false, errors.New("invalid argon2 parameters")
	}

	// Chỉ chấp nhận cấu hình hashing của MVP.
	// Tránh xử lý tham số tùy ý lấy từ database.
	if memory != 65536 || iterations != 3 || parallelism != 4 {
		return false, errors.New("unsupported argon2 parameters")
	}

	salt, err := base64.RawStdEncoding.DecodeString(parts[4])
	if err != nil || len(salt) != 16 {
		return false, errors.New("invalid password salt")
	}

	expectedHash, err := base64.RawStdEncoding.DecodeString(parts[5])
	if err != nil || len(expectedHash) != 32 {
		return false, errors.New("invalid password hash")
	}

	actualHash := argon2.IDKey(
		[]byte(password),
		salt,
		iterations,
		memory,
		parallelism,
		uint32(len(expectedHash)),
	)

	return subtle.ConstantTimeCompare(
		actualHash,
		expectedHash,
	) == 1, nil
}
