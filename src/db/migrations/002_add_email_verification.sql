-- Migration 002: Add Email Verification
-- This migration adds email verification functionality

-- Add email verification columns to users table
ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN email_verified_at INTEGER;
ALTER TABLE users ADD COLUMN verification_token TEXT;
ALTER TABLE users ADD COLUMN verification_token_expires_at INTEGER;

-- Create index for verification token lookups
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);

-- Update: For existing users, mark their email as verified (they already have access)
UPDATE users SET email_verified = 1, email_verified_at = created_at WHERE email_verified = 0;
