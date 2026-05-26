/*
  # Create bug_reports table

  ## Summary
  Stores user-submitted bug reports and error feedback from the application.

  ## New Tables
  - `bug_reports`
    - `id` (uuid, primary key)
    - `user_id` (uuid, nullable FK to auth.users — allows anonymous reports)
    - `title` (text) — short description of the issue
    - `description` (text) — full details from the user
    - `page_url` (text) — URL where the error occurred
    - `user_agent` (text) — browser/device info
    - `error_stack` (text, nullable) — JS error stack trace if available
    - `status` (text) — 'open' | 'in_progress' | 'resolved', default 'open'
    - `created_at` (timestamptz)

  ## Security
  - RLS enabled
  - Authenticated users can insert their own reports
  - Unauthenticated users can also insert (for anonymous error reports)
  - Users can read their own reports
  - No user can read others' reports
*/

CREATE TABLE IF NOT EXISTS bug_reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title       text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  page_url    text NOT NULL DEFAULT '',
  user_agent  text NOT NULL DEFAULT '',
  error_stack text,
  status      text NOT NULL DEFAULT 'open'
                CHECK (status IN ('open', 'in_progress', 'resolved')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can insert a bug report
CREATE POLICY "Anyone can submit a bug report"
  ON bug_reports
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Authenticated users can read their own reports
CREATE POLICY "Users can read own bug reports"
  ON bug_reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
