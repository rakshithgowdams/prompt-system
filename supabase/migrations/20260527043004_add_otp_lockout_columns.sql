/*
  # Add OTP brute-force lockout columns to email_otps

  ## Summary
  Adds two columns to `email_otps` to support account lockout after repeated
  failed OTP attempts, closing the brute-force gap in the verify-otp flow.

  ## Changes
  - `failed_attempts` (integer, default 0): incremented on each wrong code
  - `locked_until` (timestamptz, nullable): set to now()+15min when failed_attempts reaches 5

  ## Index
  - Sparse index on (email, locked_until) WHERE locked_until IS NOT NULL for fast lock checks
*/

ALTER TABLE email_otps
  ADD COLUMN IF NOT EXISTS failed_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until timestamptz;

CREATE INDEX IF NOT EXISTS email_otps_locked_idx
  ON email_otps (email, locked_until)
  WHERE locked_until IS NOT NULL;
