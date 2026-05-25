/*
  # Notion Pages + File Sharing

  ## New Tables

  ### notion_pages
  Rich-text document pages attached to a project.
  - id, project_id, user_id
  - title: page title
  - content: JSON blocks (array of { id, type, content } blocks)
  - icon: emoji or icon name
  - cover: optional cover image path
  - created_at, updated_at

  ### file_shares
  Shareable links for project files/folders.
  - id: UUID, also used as the share token in the URL
  - user_id: owner
  - project_id: which project
  - folder_id: optional — if set, shares the whole folder
  - file_id: optional — if set, shares a single file
  - share_name: display name for the share
  - password_hash: bcrypt-style hash — NULL means no password
  - access_type: 'anyone' | 'password'
  - allow_download: whether recipient can download
  - expires_at: optional expiry timestamp
  - view_count: how many times accessed
  - created_at

  ## Security
  - RLS enabled on both tables
  - notion_pages: only owner can CRUD
  - file_shares: owner can CRUD; public can SELECT where token matches (handled by Edge Function / public route)
*/

-- ── notion_pages ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notion_pages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text NOT NULL DEFAULT 'Untitled',
  content     jsonb NOT NULL DEFAULT '[]'::jsonb,
  icon        text NOT NULL DEFAULT '📄',
  cover       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notion_pages_project_id_idx ON notion_pages(project_id);
CREATE INDEX IF NOT EXISTS notion_pages_user_id_idx    ON notion_pages(user_id);

ALTER TABLE notion_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can select own pages"
  ON notion_pages FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owner can insert own pages"
  ON notion_pages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can update own pages"
  ON notion_pages FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can delete own pages"
  ON notion_pages FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_notion_pages_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS notion_pages_updated_at ON notion_pages;
CREATE TRIGGER notion_pages_updated_at
  BEFORE UPDATE ON notion_pages
  FOR EACH ROW EXECUTE FUNCTION update_notion_pages_updated_at();


-- ── file_shares ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS file_shares (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id    uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  folder_id     uuid REFERENCES folders(id) ON DELETE CASCADE,
  file_id       uuid REFERENCES project_files(id) ON DELETE CASCADE,
  share_name    text NOT NULL DEFAULT '',
  password_hash text,
  access_type   text NOT NULL DEFAULT 'anyone' CHECK (access_type IN ('anyone', 'password')),
  allow_download boolean NOT NULL DEFAULT true,
  expires_at    timestamptz,
  view_count    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS file_shares_user_id_idx    ON file_shares(user_id);
CREATE INDEX IF NOT EXISTS file_shares_project_id_idx ON file_shares(project_id);

ALTER TABLE file_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can select own shares"
  ON file_shares FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owner can insert own shares"
  ON file_shares FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can update own shares"
  ON file_shares FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can delete own shares"
  ON file_shares FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Public can look up a share by id (no auth needed for share preview)
CREATE POLICY "Public can view any share by id"
  ON file_shares FOR SELECT TO anon
  USING (true);
