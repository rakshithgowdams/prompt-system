/*
  # Create Password Vault Table

  ## Summary
  A secure password vault where users can store credentials (platform, username,
  encrypted password) per account. Passwords are AES-256-GCM encrypted client-side
  before being stored — the server never sees plaintext passwords.

  ## New Table: password_vault
  - `id`             UUID primary key
  - `user_id`        References the authenticated user
  - `platform`       Display name of the platform (e.g. "GitHub", "Twitter")
  - `site_url`       Optional website URL used to resolve the favicon
  - `username`       The login username or email or user ID
  - `encrypted_data` The AES-GCM encrypted payload (base64 JSON: iv + ciphertext)
  - `notes`          Optional freeform notes
  - `created_at`     Timestamp
  - `updated_at`     Timestamp

  ## Security
  - RLS enabled: users can only access their own rows
  - Separate policies for SELECT, INSERT, UPDATE, DELETE
  - Passwords are encrypted client-side; `encrypted_data` stores only ciphertext
*/

CREATE TABLE IF NOT EXISTS password_vault (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform       text NOT NULL DEFAULT '',
  site_url       text NOT NULL DEFAULT '',
  username       text NOT NULL DEFAULT '',
  encrypted_data text NOT NULL DEFAULT '',
  notes          text NOT NULL DEFAULT '',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- Index for fast per-user queries
CREATE INDEX IF NOT EXISTS password_vault_user_id_idx ON password_vault(user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_password_vault_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS password_vault_updated_at ON password_vault;
CREATE TRIGGER password_vault_updated_at
  BEFORE UPDATE ON password_vault
  FOR EACH ROW EXECUTE FUNCTION update_password_vault_updated_at();

-- Row Level Security
ALTER TABLE password_vault ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own vault entries"
  ON password_vault FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vault entries"
  ON password_vault FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vault entries"
  ON password_vault FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own vault entries"
  ON password_vault FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
