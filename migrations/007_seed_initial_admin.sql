-- Migration 007: Seed initial system administrator account (Quản Trị Viên)
-- Default credentials:
-- Email: admin@chiprin.com
-- Password: Admin@Chiprin2026!
-- Role: ADMIN (Quản Trị Viên)

DO $$
DECLARE
    v_user_id UUID;
    v_hash TEXT := '$argon2id$v=19$m=65536,t=3,p=4$+nFL9iyH72N6vxGptXsgvA$17JkDoHXDbfCRRbLYuoaxCUvFnwXAS4xs6YdF2F41N4';
BEGIN
    -- 1. Insert user if email does not already exist
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@chiprin.com') THEN
        INSERT INTO users (
            username,
            email,
            password_hash,
            status,
            email_verified_at,
            created_at,
            updated_at
        )
        VALUES (
            'admin',
            'admin@chiprin.com',
            v_hash,
            'ACTIVE',
            NOW(),
            NOW(),
            NOW()
        )
        RETURNING id INTO v_user_id;

        -- 2. Assign ADMIN role
        INSERT INTO user_roles (user_id, role, granted_by, created_at)
        VALUES (v_user_id, 'ADMIN', NULL, NOW())
        ON CONFLICT (user_id, role) DO NOTHING;

        -- 3. Create wallet
        INSERT INTO wallets (user_id, created_at)
        VALUES (v_user_id, NOW())
        ON CONFLICT (user_id) DO NOTHING;
    ELSE
        -- Ensure existing admin has ADMIN role
        SELECT id INTO v_user_id FROM users WHERE email = 'admin@chiprin.com';
        INSERT INTO user_roles (user_id, role, granted_by, created_at)
        VALUES (v_user_id, 'ADMIN', NULL, NOW())
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
END $$;

INSERT INTO schema_migrations (version) 
VALUES ('007_seed_initial_admin') 
ON CONFLICT (version) DO NOTHING;
