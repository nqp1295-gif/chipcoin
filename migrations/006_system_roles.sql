-- DAOCOIN Migration 006: System Roles Hierarchy
-- Adds Quản Trị Viên (ADMIN), Trợ Lý (ASSISTANT), Chuyên Viên (SPECIALIST), Người Dùng (USER)

BEGIN;

-- Drop old check constraint and add updated hierarchy
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;

ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_check 
    CHECK (role IN ('USER', 'SPECIALIST', 'ASSISTANT', 'ADMIN', 'OWNER'));

INSERT INTO schema_migrations (version) VALUES ('006_system_roles') ON CONFLICT (version) DO NOTHING;

COMMIT;
