package email

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
)

var (
	ErrInvalidEncryptionKey = errors.New("invalid encryption key")
	ErrInvalidCiphertext    = errors.New("invalid ciphertext")
)

const TokenEncryptionKeySize = 32

// TokenCipher encrypts and decrypts verification tokens
// using AES-256-GCM.
type TokenCipher struct {
	aead cipher.AEAD
}

// NewTokenCipher creates a cipher using a 32-byte AES key.
func NewTokenCipher(key []byte) (*TokenCipher, error) {
	if len(key) != TokenEncryptionKeySize {
		return nil, ErrInvalidEncryptionKey
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, fmt.Errorf("create AES cipher: %w", err)
	}

	aead, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("create GCM cipher: %w", err)
	}

	return &TokenCipher{
		aead: aead,
	}, nil
}

// Encrypt encrypts a token and returns nonce + ciphertext.
//
// The result can be stored directly in PostgreSQL BYTEA.
func (c *TokenCipher) Encrypt(token string) ([]byte, error) {
	if c == nil || c.aead == nil {
		return nil, ErrInvalidEncryptionKey
	}

	if token == "" {
		return nil, ErrInvalidCiphertext
	}

	nonce := make([]byte, c.aead.NonceSize())

	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, fmt.Errorf("generate nonce: %w", err)
	}

	ciphertext := c.aead.Seal(
		nil,
		nonce,
		[]byte(token),
		nil,
	)

	result := make([]byte, 0, len(nonce)+len(ciphertext))
	result = append(result, nonce...)
	result = append(result, ciphertext...)

	return result, nil
}

// Decrypt authenticates and decrypts nonce + ciphertext.
func (c *TokenCipher) Decrypt(data []byte) (string, error) {
	if c == nil || c.aead == nil {
		return "", ErrInvalidEncryptionKey
	}

	nonceSize := c.aead.NonceSize()

	if len(data) < nonceSize+c.aead.Overhead() {
		return "", ErrInvalidCiphertext
	}

	nonce := data[:nonceSize]
	ciphertext := data[nonceSize:]

	plaintext, err := c.aead.Open(
		nil,
		nonce,
		ciphertext,
		nil,
	)

	if err != nil {
		return "", ErrInvalidCiphertext
	}

	return string(plaintext), nil
}

// DecodeTokenEncryptionKey decodes a base64-encoded
// 32-byte encryption key.
func DecodeTokenEncryptionKey(encoded string) ([]byte, error) {
	key, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return nil, ErrInvalidEncryptionKey
	}

	if len(key) != TokenEncryptionKeySize {
		return nil, ErrInvalidEncryptionKey
	}

	return key, nil
}
