/*
  # Fix Todo Cron Jobs — Use Anon Key (JWT Verification Disabled)

  ## Problem
  The service_role_key was not stored in Vault, so the Authorization header was NULL
  and the edge functions rejected or ignored the requests.

  ## Fix
  Both `todo-reminder` and `todo-overdue` edge functions have `verifyJWT = false`,
  meaning they accept any valid Supabase key. We switch the cron Authorization
  header to use the anon key (which is safe for server-to-server calls on JWT-
  verification-disabled functions). The anon key is public by design.

  Inside the functions, all DB access uses `SUPABASE_SERVICE_ROLE_KEY` (set as an
  Edge Function secret), so data security is maintained regardless of which key
  is used to invoke the function.
*/

-- ── Reschedule 30-min reminder cron with anon key ─────────────────────────────
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
    url := 'https://igkgdltwlsnxdlqkhuul.supabase.co/functions/v1/todo-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlna2dkbHR3bHNueGRscWtodXVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MTE2MzcsImV4cCI6MjA5NTI4NzYzN30.LlX5YUGGxDwcgIToxEt0_YV8cVP2DaKBV8YGVCiYUws'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

-- ── Reschedule overdue cron with anon key ─────────────────────────────────────
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
    url := 'https://igkgdltwlsnxdlqkhuul.supabase.co/functions/v1/todo-overdue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlna2dkbHR3bHNueGRscWtodXVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MTE2MzcsImV4cCI6MjA5NTI4NzYzN30.LlX5YUGGxDwcgIToxEt0_YV8cVP2DaKBV8YGVCiYUws'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
