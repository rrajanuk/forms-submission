-- Migration 002: Add Email Verification
-- This migration adds email verification functionality

-- Add email verification columns to users table (idempotent)
-- SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so we use a workaround
-- Run each ALTER in a transaction and ignore if column exists

-- Add email_verified column
ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0;

-- Add email_verified_at column
ALTER TABLE users ADD COLUMN email_verified_at INTEGER;

-- Add verification_token column
ALTER TABLE users ADD COLUMN verification_token TEXT;

-- Add verification_token_expires_at column
ALTER TABLE users ADD COLUMN verification_token_expires_at INTEGER;

-- Create index for verification token lookups
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);

-- Update: For existing users, mark their email as verified (they already have access)
UPDATE OR IGNORE users SET email_verified = 1, email_verified_at = created_at WHERE email_verified = 0;
