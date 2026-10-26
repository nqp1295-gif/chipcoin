package email

import (
	"bytes"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"strings"
	"testing"
)

func newTestTokenCipher(t *testing.T) *TokenCipher {
	t.Helper()

	key := make([]byte, TokenEncryptionKeySize)

	if _, err := rand.Read(key); err != nil {
		t.Fatal(err)
	}

	c, err := NewTokenCipher(key)
	if err != nil {
		t.Fatal(err)
	}

	return c
}

func TestTokenCipherEncryptDecrypt(t *testing.T) {
	c := newTestTokenCipher(t)

	token := strings.Repeat("a", 64)

	encrypted, err := c.Encrypt(token)
	if err != nil {
		t.Fatal(err)
	}

	if bytes.Contains(encrypted, []byte(token)) {
		t.Fatal("ciphertext contains plaintext token")
	}

	decrypted, err := c.Decrypt(encrypted)
	if err != nil {
		t.Fatal(err)
	}

	if decrypted != token {
		t.Fatal("decrypted token mismatch")
	}
}

func TestTokenCipherUsesRandomNonce(t *testing.T) {
	c := newTestTokenCipher(t)

	token := strings.Repeat("b", 64)

	first, err := c.Encrypt(token)
	if err != nil {
		t.Fatal(err)
	}

	second, err := c.Encrypt(token)
	if err != nil {
		t.Fatal(err)
	}

	if bytes.Equal(first, second) {
		t.Fatal("encryptions should produce different ciphertext")
	}
}

func TestTokenCipherRejectsTampering(t *testing.T) {
	c := newTestTokenCipher(t)

	encrypted, err := c.Encrypt(strings.Repeat("c", 64))
	if err != nil {
		t.Fatal(err)
	}

	encrypted[len(encrypted)-1] ^= 0x01

	_, err = c.Decrypt(encrypted)

	if !errors.Is(err, ErrInvalidCiphertext) {
		t.Fatalf("expected invalid ciphertext, got %v", err)
	}
}

func TestTokenCipherRejectsWrongKey(t *testing.T) {
	first := newTestTokenCipher(t)
	second := newTestTokenCipher(t)

	encrypted, err := first.Encrypt(strings.Repeat("d", 64))
	if err != nil {
		t.Fatal(err)
	}

	_, err = second.Decrypt(encrypted)

	if !errors.Is(err, ErrInvalidCiphertext) {
		t.Fatalf("expected wrong-key rejection, got %v", err)
	}
}

func TestTokenCipherRejectsShortCiphertext(t *testing.T) {
	c := newTestTokenCipher(t)

	_, err := c.Decrypt([]byte("short"))

	if !errors.Is(err, ErrInvalidCiphertext) {
		t.Fatalf("expected invalid ciphertext, got %v", err)
	}
}

func TestTokenCipherRejectsInvalidKey(t *testing.T) {
	_, err := NewTokenCipher([]byte("short"))

	if !errors.Is(err, ErrInvalidEncryptionKey) {
		t.Fatalf("expected invalid key, got %v", err)
	}
}

func TestTokenCipherRejectsEmptyToken(t *testing.T) {
	c := newTestTokenCipher(t)

	_, err := c.Encrypt("")

	if !errors.Is(err, ErrInvalidCiphertext) {
		t.Fatalf("expected empty token rejection, got %v", err)
	}
}

func TestDecodeTokenEncryptionKey(t *testing.T) {
	key := make([]byte, TokenEncryptionKeySize)

	if _, err := rand.Read(key); err != nil {
		t.Fatal(err)
	}

	encoded := base64.StdEncoding.EncodeToString(key)

	decoded, err := DecodeTokenEncryptionKey(encoded)
	if err != nil {
		t.Fatal(err)
	}

	if !bytes.Equal(key, decoded) {
		t.Fatal("decoded key mismatch")
	}
}

func TestDecodeTokenEncryptionKeyRejectsInvalid(t *testing.T) {
	_, err := DecodeTokenEncryptionKey("invalid-key")

	if !errors.Is(err, ErrInvalidEncryptionKey) {
		t.Fatalf("expected invalid encryption key, got %v", err)
	}
}
