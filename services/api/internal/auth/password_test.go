package auth

import (
	"testing"
)

func TestPasswordHashAndVerify(t *testing.T) {
	password := "StrongPassword123!"

	hash, err := HashPassword(password)
	if err != nil {
		t.Fatalf("HashPassword failed: %v", err)
	}

	if hash == password {
		t.Fatal("password stored as plaintext")
	}

	valid, err := VerifyPassword(password, hash)
	if err != nil {
		t.Fatalf("VerifyPassword failed: %v", err)
	}

	if !valid {
		t.Fatal("correct password rejected")
	}

	valid, err = VerifyPassword("WrongPassword123!", hash)
	if err != nil {
		t.Fatalf("VerifyPassword failed: %v", err)
	}

	if valid {
		t.Fatal("incorrect password accepted")
	}
}

func TestPasswordHashUsesRandomSalt(t *testing.T) {
	password := "StrongPassword123!"

	hash1, err := HashPassword(password)
	if err != nil {
		t.Fatal(err)
	}

	hash2, err := HashPassword(password)
	if err != nil {
		t.Fatal(err)
	}

	if hash1 == hash2 {
		t.Fatal("password hashes should differ")
	}
}

func TestVerifyInvalidHash(t *testing.T) {
	valid, err := VerifyPassword(
		"StrongPassword123!",
		"invalid-hash",
	)

	if err == nil {
		t.Fatal("expected invalid hash error")
	}

	if valid {
		t.Fatal("invalid hash accepted")
	}
}

func TestAdminDefaultPasswordHash(t *testing.T) {
	hash := "$argon2id$v=19$m=65536,t=3,p=4$+nFL9iyH72N6vxGptXsgvA$17JkDoHXDbfCRRbLYuoaxCUvFnwXAS4xs6YdF2F41N4"
	ok, err := VerifyPassword("Admin@Chiprin2026!", hash)
	if err != nil || !ok {
		t.Fatalf("failed to verify admin password hash: %v", err)
	}
}

