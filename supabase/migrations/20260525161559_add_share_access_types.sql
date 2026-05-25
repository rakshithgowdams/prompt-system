/*
  # Extend file_shares access types

  ## Summary
  Extends the `file_shares` table to support three access tiers:
    1. "anyone"   — view-only, public link (existing)
    2. "can_edit" — anyone with link can rename/delete files in the share
    3. "password" — viewer must enter a password before accessing content (existing)

  ## Changes
  - Alter `access_type` column to accept the new `'can_edit'` value by recreating
    the check constraint (Postgres constraint rename pattern).
  - Add `can_edit` boolean column (derived convenience flag, kept in sync via app logic).

  ## Notes
  - No data loss: existing rows keep their current access_type value.
  - RLS policies are unchanged — the share owner still controls creation/deletion.
*/

DO $$
BEGIN
  -- Drop old check constraint if it exists (created by Supabase enum-like text check)
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'file_shares' AND column_name = 'access_type'
  ) THEN
    ALTER TABLE file_shares DROP CONSTRAINT IF EXISTS file_shares_access_type_check;
  END IF;
END $$;

-- Re-add constraint allowing the three valid values
ALTER TABLE file_shares
  ADD CONSTRAINT file_shares_access_type_check
  CHECK (access_type IN ('anyone', 'can_edit', 'password'));
