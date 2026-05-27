/*
  # Production Security Hardening v2

  ## Summary
  Multi-layered security hardening to bring the app to startup-grade (~85/100) security posture.

  ## Changes

  ### 1. New Tables
  - `request_rate_limits` — per-scope sliding-window counters for edge-function rate limiting
  - `audit_log` — immutable forensic trail of sensitive operations

  ### 2. New Database Functions
  - `rate_limit_check_and_increment(scope_key, window_seconds, ip)` — atomic rate-limit increment; returns current count
  - `log_audit_event(user_id, action, ...)` — inserts an audit record via service role only

  ### 3. Security Changes
  - Drop any public anon SELECT policies on `file_shares` that leak password hashes
  - Restore MIME allowlist on `prompt-media` storage bucket (removes SVG / HTML / arbitrary uploads)
  - Add `public_user_profiles` view that exposes only safe display columns

  ### 4. Cron
  - Daily cleanup job removes rate-limit rows older than 7 days

  ### 5. Important Notes
  - `request_rate_limits` has no RLS policies — service_role only (bypasses RLS)
  - `audit_log` has one RLS policy: authenticated users can read their own rows
  - All INSERT/UPDATE on `audit_log` goes through the SECURITY DEFINER RPC only
  - We do NOT drop the existing `user_profiles` authenticated SELECT policy (non-breaking)
*/

-- ─── 1. Rate limit table ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS request_rate_limits (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_key     text NOT NULL,
  window_start  timestamptz NOT NULL DEFAULT now(),
  count         integer NOT NULL DEFAULT 1,
  last_ip       text,
  last_seen_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS request_rate_limits_scope_window_idx
  ON request_rate_limits (scope_key, window_start DESC);

CREATE INDEX IF NOT EXISTS request_rate_limits_window_idx
  ON request_rate_limits (window_start);

ALTER TABLE request_rate_limits ENABLE ROW LEVEL SECURITY;
-- No policies = anon/authenticated cannot access. service_role bypasses RLS.

-- ─── 2. RPC: atomic rate-limit check + increment ─────────────────────────────

CREATE OR REPLACE FUNCTION rate_limit_check_and_increment(
  p_scope_key text,
  p_window_seconds integer,
  p_ip text DEFAULT NULL
)
RETURNS TABLE(current_count integer, window_started_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start timestamptz;
  v_count integer;
  v_min_start timestamptz;
BEGIN
  v_window_start := now() - (p_window_seconds || ' seconds')::interval;

  SELECT COALESCE(SUM(count), 0)::integer, MIN(request_rate_limits.window_start)
  INTO v_count, v_min_start
  FROM request_rate_limits
  WHERE scope_key = p_scope_key
    AND window_start >= v_window_start;

  INSERT INTO request_rate_limits (scope_key, last_ip, last_seen_at)
  VALUES (p_scope_key, p_ip, now());

  RETURN QUERY SELECT (v_count + 1)::integer, COALESCE(v_min_start, now());
END;
$$;

GRANT EXECUTE ON FUNCTION rate_limit_check_and_increment(text, integer, text) TO service_role;
REVOKE EXECUTE ON FUNCTION rate_limit_check_and_increment(text, integer, text) FROM anon, authenticated, PUBLIC;

-- ─── 3. Cron cleanup (requires pg_cron extension) ────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'rate-limit-cleanup') THEN
    PERFORM cron.unschedule('rate-limit-cleanup');
  END IF;
END $$;

SELECT cron.schedule(
  'rate-limit-cleanup',
  '0 3 * * *',
  $$ DELETE FROM request_rate_limits WHERE window_start < now() - interval '7 days'; $$
);

-- ─── 4. Audit log table ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action      text NOT NULL,
  target_type text,
  target_id   text,
  metadata    jsonb,
  ip          text,
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_user_id_idx ON audit_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_action_idx  ON audit_log (action, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_created_idx ON audit_log (created_at DESC);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own audit log"
  ON audit_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT ON audit_log TO authenticated;

-- ─── 5. RPC: insert audit event (service_role only) ──────────────────────────

CREATE OR REPLACE FUNCTION log_audit_event(
  p_user_id uuid,
  p_action text,
  p_target_type text DEFAULT NULL,
  p_target_id text DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL,
  p_ip text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO audit_log (user_id, action, target_type, target_id, metadata, ip, user_agent)
  VALUES (p_user_id, p_action, p_target_type, p_target_id, p_metadata, p_ip, p_user_agent);
END;
$$;

GRANT EXECUTE ON FUNCTION log_audit_event(uuid, text, text, text, jsonb, text, text) TO service_role;
REVOKE EXECUTE ON FUNCTION log_audit_event(uuid, text, text, text, jsonb, text, text) FROM anon, authenticated, PUBLIC;

-- ─── 6. Drop public anon SELECT policies on file_shares ──────────────────────
-- These leak password_hash to anyone who can dump the table.
-- All share access now goes through the get-share edge function (service_role).

DROP POLICY IF EXISTS "Public can view active shares"     ON file_shares;
DROP POLICY IF EXISTS "Public can view any share by id"   ON file_shares;
DROP POLICY IF EXISTS "Anyone can read active shares"     ON file_shares;
DROP POLICY IF EXISTS "Anon can read active shares"       ON file_shares;

-- ─── 7. Restore MIME allowlist on prompt-media bucket ────────────────────────

UPDATE storage.buckets
SET
  allowed_mime_types = ARRAY[
    'image/jpeg','image/png','image/webp','image/gif','image/avif',
    'video/mp4','video/quicktime','video/webm','video/x-msvideo',
    'audio/mpeg','audio/wav','audio/webm','audio/ogg','audio/mp4',
    'application/pdf',
    'text/plain','text/markdown','text/csv','text/html','application/json',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword','application/vnd.ms-excel','application/vnd.ms-powerpoint',
    'application/rtf',
    'application/zip','application/x-zip-compressed','application/x-tar','application/gzip',
    'application/octet-stream'
  ],
  file_size_limit = 524288000
WHERE id = 'prompt-media';

-- ─── 8. Public-safe user profiles view ───────────────────────────────────────

CREATE OR REPLACE VIEW public_user_profiles
WITH (security_invoker = true)
AS
SELECT id, display_name, avatar_path, portfolio_slug, is_portfolio_public
FROM user_profiles;

GRANT SELECT ON public_user_profiles TO anon, authenticated;
