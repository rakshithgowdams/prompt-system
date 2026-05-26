/*
  # Todo Email Automation

  ## Schema changes

  ### todos table
  - `created_email_sent_at`   — timestamptz: set when "todo created" email is sent (prevents duplicates)
  - `reminder_sent_at`        — timestamptz: set when "30 min left" reminder is sent
  - `completed_email_sent_at` — timestamptz: set when "todo completed" email is sent
  - `overdue_sent_at`         — timestamptz: set when "overdue" alert is sent
  - Reset `completed_email_sent_at` to NULL when todo is un-completed (handled in client hook)

  ### user_profiles table
  - `todo_emails_enabled` — boolean DEFAULT true: opt-out toggle surfaced in Settings

  ## Indexes
  Two partial indexes so cron-job queries are fast even with thousands of todos:
  - `todos_reminder_scan_idx`  — covers the 30-min reminder cron scan
  - `todos_overdue_scan_idx`   — covers the overdue cron scan

  ## Cron jobs (pg_cron + pg_net — both pre-installed on Supabase)
  - `todo-reminder-30min` — every 5 minutes, calls /functions/v1/todo-reminder
  - `todo-overdue`        — every 15 minutes, calls /functions/v1/todo-overdue

  ## IMPORTANT: One-time manual setup required
  Before the cron jobs will work, add these two secrets in Supabase Dashboard → Vault:
    - `project_url`       = https://<your-project-ref>.supabase.co
    - `service_role_key`  = <your service_role secret from Project Settings → API>
  The cron jobs will silently no-op until those secrets exist.
*/

-- ── 1. Add email-tracking columns to todos ───────────────────────────────────
ALTER TABLE todos
  ADD COLUMN IF NOT EXISTS created_email_sent_at   timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_sent_at        timestamptz,
  ADD COLUMN IF NOT EXISTS completed_email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS overdue_sent_at         timestamptz;

-- ── 2. Add preference column to user_profiles ────────────────────────────────
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS todo_emails_enabled boolean NOT NULL DEFAULT true;

-- ── 3. Performance indexes for cron scans ────────────────────────────────────
CREATE INDEX IF NOT EXISTS todos_reminder_scan_idx
  ON todos (due_at)
  WHERE completed = false AND reminder_sent_at IS NULL AND due_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS todos_overdue_scan_idx
  ON todos (due_at)
  WHERE completed = false AND overdue_sent_at IS NULL AND due_at IS NOT NULL;

-- ── 4. Enable extensions (idempotent on Supabase) ────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ── 5. Schedule 30-min reminder cron (every 5 min) ───────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'todo-reminder-30min') THEN
    PERFORM cron.unschedule('todo-reminder-30min');
  END IF;
END $$;

SELECT cron.schedule(
  'todo-reminder-30min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/todo-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

-- ── 6. Schedule overdue cron (every 15 min) ──────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'todo-overdue') THEN
    PERFORM cron.unschedule('todo-overdue');
  END IF;
END $$;

SELECT cron.schedule(
  'todo-overdue',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/todo-overdue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
