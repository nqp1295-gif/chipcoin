-- Migration: Add referred_by_code to users table for referral tracking
-- This column stores the referral code that was used when the user registered

ALTER TABLE users
ADD COLUMN IF NOT EXISTS referred_by_code VARCHAR(50) DEFAULT NULL;

-- Index for efficient lookup of referrals by referrer code
CREATE INDEX IF NOT EXISTS idx_users_referred_by_code
ON users (referred_by_code)
WHERE referred_by_code IS NOT NULL;

COMMENT ON COLUMN users.referred_by_code IS 'The referral code (e.g. CHIP-ALEX-99) used during registration to link this user to their referrer';
