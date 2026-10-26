package auth

// Role constants according to the system hierarchy:
// - Quản Trị Viên: RoleAdmin
// - Trợ Lý: RoleAssistant
// - Chuyên Viên: RoleSpecialist
// - Người Dùng: RoleUser
const (
	RoleOwner      = "OWNER"
	RoleAdmin      = "ADMIN"       // Quản Trị Viên
	RoleAssistant  = "ASSISTANT"   // Trợ Lý
	RoleSpecialist = "SPECIALIST"  // Chuyên Viên
	RoleUser       = "USER"        // Người Dùng
)

// RoleTitles maps English role code to Vietnamese title.
var RoleTitles = map[string]string{
	RoleOwner:      "Chủ Sở Hữu",
	RoleAdmin:      "Quản Trị Viên",
	RoleAssistant:  "Trợ Lý",
	RoleSpecialist: "Chuyên Viên",
	RoleUser:       "Người Dùng",
}

// IsValidRole checks if the role is allowed by the database constraint.
func IsValidRole(role string) bool {
	switch role {
	case RoleOwner, RoleAdmin, RoleAssistant, RoleSpecialist, RoleUser:
		return true
	default:
		return false
	}
}

// IsSystemRole checks if the role belongs to the system management group.
func IsSystemRole(role string) bool {
	switch role {
	case RoleOwner, RoleAdmin, RoleAssistant, RoleSpecialist:
		return true
	default:
		return false
	}
}

// HasAnySystemRole returns true if the user possesses at least one system role.
func HasAnySystemRole(roles []string) bool {
	for _, r := range roles {
		if IsSystemRole(r) {
			return true
		}
	}
	return false
}
