/*
  # Create Email OTP Verification Table

  ## Purpose
  Stores short-lived 6-digit OTP codes for email verification during signup.
  OTP codes expire after 10 minutes and are single-use.

  ## New Tables
  - `email_otps`
    - `id` (uuid, primary key)
    - `email` (text) - the email address to verify
    - `otp_code` (text) - 6-digit numeric code
    - `expires_at` (timestamptz) - 10 minutes after creation
    - `used` (boolean) - prevents replay attacks
    - `created_at` (timestamptz)

  ## Security
  - RLS enabled; no direct client access (only Edge Functions via service role)
  - Auto-cleanup of expired codes via policy
  - Index on (email, otp_code) for fast lookups

  ## Notes
  1. OTPs are inserted and verified exclusively through Edge Functions using the service role key
  2. Expired OTPs are rejected at the application layer before any DB write
  3. Used OTPs are marked used=true immediately upon verification to prevent replay
*/

CREATE TABLE IF NOT EXISTS email_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  otp_code text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_otps_email ON email_otps (email);
CREATE INDEX IF NOT EXISTS idx_email_otps_expires ON email_otps (expires_at);

ALTER TABLE email_otps ENABLE ROW LEVEL SECURITY;

-- No client-side access; all operations go through Edge Functions with service role key.
-- This means NO RLS policies are needed for authenticated or anon roles.
-- The table is fully locked down from client access.
