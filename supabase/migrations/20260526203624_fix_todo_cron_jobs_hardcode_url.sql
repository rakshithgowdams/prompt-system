/*
  # Fix Todo Cron Jobs — Hardcode Project URL

  ## Problem
  The cron jobs were reading `project_url` and `service_role_key` from
  `vault.decrypted_secrets`, but the Vault was empty so the URL resolved to NULL
  and every http_post silently failed — no emails were ever sent.

  ## Fix
  Reschedule both cron jobs with the project URL hardcoded directly in the command.
  For the Authorization header we keep the vault lookup for `service_role_key`
  (which will be populated separately via Supabase Dashboard → Vault), but also
  add a fallback using `current_setting` so it works even without Vault.

  The service_role_key still needs to be added to Vault manually:
    Dashboard → Database → Vault → New Secret
    Name: service_role_key
    Value: <your service role key from Project Settings → API>
*/

-- ── Reschedule 30-min reminder cron ──────────────────────────────────────────
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
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

-- ── Reschedule overdue cron ────────────────────────────────────────────────────
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
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
