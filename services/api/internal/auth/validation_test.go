package auth

import "testing"

func TestIsValidUsername(t *testing.T) {
	tests := []struct {
		username string
		valid    bool
	}{
		{"satoshi_vn", true},
		{"projin995", true},
		{"regular_user_1", true},
		{"admin", true},
		{"alex-99", true},
		{"john.doe", true},
		{"Nguyen Van A", true},
		{"Đức Anh", true},
		{"Trần Thị Mai", true},
		{"Le_Van_88", true},
		{"an", true},
		{"vu", true},

		// Invalid cases
		{"", false},
		{"a", false},
		{"   ", false},
		{".admin", false},
		{"admin.", false},
		{"-user", false},
		{"user-", false},
		{"Nguyen  Van", false}, // double space
		{"admin<script>", false},
		{"user@domain", false}, // '@' inside not letter/digit
		{"this_is_a_very_long_username_that_exceeds_fifty_characters_limit_12345", false},
	}

	for _, tt := range tests {
		got := IsValidUsername(tt.username)
		if got != tt.valid {
			t.Errorf("IsValidUsername(%q) = %v; want %v", tt.username, got, tt.valid)
		}
	}
}

func TestValidateRegister(t *testing.T) {
	// Valid with @ prefix and extra spaces
	req := &RegisterRequest{
		Username: "@Nguyen Van A",
		Email:    "test@example.com",
		Password: "Password123!@#",
	}
	if err := ValidateRegister(req); err != nil {
		t.Fatalf("ValidateRegister failed: %v", err)
	}
	if req.Username != "Nguyen Van A" {
		t.Fatalf("expected username 'Nguyen Van A', got %q", req.Username)
	}

	// Invalid short username
	reqInvalid := &RegisterRequest{
		Username: "x",
		Email:    "test@example.com",
		Password: "Password123!@#",
	}
	if err := ValidateRegister(reqInvalid); err != ErrInvalidUsername {
		t.Fatalf("expected ErrInvalidUsername, got %v", err)
	}
}
