/*
  # Create todos table

  ## Summary
  Adds a `todos` table for user task management with optional due date/time and priority.

  ## New Tables
  - `todos`
    - `id` (uuid, primary key)
    - `user_id` (uuid, references auth.users)
    - `title` (text, required)
    - `notes` (text, optional description)
    - `due_at` (timestamptz, optional deadline)
    - `priority` ('low' | 'medium' | 'high')
    - `completed` (boolean, default false)
    - `completed_at` (timestamptz, set when completed)
    - `created_at` (timestamptz)

  ## Security
  - RLS enabled
  - Users can only CRUD their own todos
*/

CREATE TABLE IF NOT EXISTS todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  notes text DEFAULT NULL,
  due_at timestamptz DEFAULT NULL,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own todos"
  ON todos FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own todos"
  ON todos FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own todos"
  ON todos FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own todos"
  ON todos FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS todos_user_id_idx ON todos(user_id);
CREATE INDEX IF NOT EXISTS todos_due_at_idx ON todos(due_at);
