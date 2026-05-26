/*
  # Create notify_signups table

  1. New Tables
    - `notify_signups`
      - `id` (uuid, primary key)
      - `email` (text, not null)
      - `tier` (text — 'standard' or 'premium')
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS
    - Allow inserts from anyone (public), no select (to protect emails)
    - Unique constraint on email + tier to prevent duplicates
*/

CREATE TABLE IF NOT EXISTS notify_signups (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text NOT NULL,
  tier       text NOT NULL CHECK (tier IN ('standard', 'premium')),
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS notify_signups_email_tier_idx
  ON notify_signups (email, tier);

ALTER TABLE notify_signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert a notify signup"
  ON notify_signups
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
