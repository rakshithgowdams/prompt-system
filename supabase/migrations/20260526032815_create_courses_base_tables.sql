/*
  # Courses Schema — Base Tables (Part 1)
  Creates courses, course_sections, course_enrollments, course_certificates,
  lesson_progress, course_notes without cross-table policy dependencies.
  course_lessons policies are added in Part 2 after enrollments table exists.
*/

-- ── courses ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS courses (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title                   text NOT NULL DEFAULT '',
  description             text NOT NULL DEFAULT '',
  short_description       text NOT NULL DEFAULT '',
  cover_image             text,
  category                text NOT NULL DEFAULT 'General',
  level                   text NOT NULL DEFAULT 'beginner'
                            CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  language                text NOT NULL DEFAULT 'English',
  tags                    text[] NOT NULL DEFAULT '{}',
  is_published            boolean NOT NULL DEFAULT false,
  is_free                 boolean NOT NULL DEFAULT true,
  total_duration_minutes  integer NOT NULL DEFAULT 0,
  requirements            text[] NOT NULL DEFAULT '{}',
  what_you_learn          text[] NOT NULL DEFAULT '{}',
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Instructor can read own courses"
  ON courses FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Any user can read published courses"
  ON courses FOR SELECT TO authenticated
  USING (is_published = true);

CREATE POLICY "Instructor can insert own courses"
  ON courses FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Instructor can update own courses"
  ON courses FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Instructor can delete own courses"
  ON courses FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ── course_sections ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS course_sections (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  position    integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE course_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Instructor can read own sections"
  ON course_sections FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Students can read sections of published courses"
  ON course_sections FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = course_sections.course_id AND c.is_published = true
    )
  );

CREATE POLICY "Instructor can insert own sections"
  ON course_sections FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Instructor can update own sections"
  ON course_sections FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Instructor can delete own sections"
  ON course_sections FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ── course_enrollments ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS course_enrollments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id        uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enrolled_at      timestamptz NOT NULL DEFAULT now(),
  completed_at     timestamptz,
  last_accessed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, user_id)
);

ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Student can read own enrollments"
  ON course_enrollments FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Instructor can read enrollments for own courses"
  ON course_enrollments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = course_enrollments.course_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Student can enroll themselves"
  ON course_enrollments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Student can update own enrollment"
  ON course_enrollments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── course_lessons ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS course_lessons (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id                uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  section_id               uuid NOT NULL REFERENCES course_sections(id) ON DELETE CASCADE,
  user_id                  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title                    text NOT NULL DEFAULT '',
  description              text NOT NULL DEFAULT '',
  lesson_type              text NOT NULL DEFAULT 'video'
                             CHECK (lesson_type IN ('video', 'image', 'resource', 'text')),
  video_path               text,
  video_url                text,
  video_duration_minutes   numeric(6,2) NOT NULL DEFAULT 0,
  content                  text NOT NULL DEFAULT '',
  position                 integer NOT NULL DEFAULT 0,
  is_preview               boolean NOT NULL DEFAULT false,
  resources                jsonb NOT NULL DEFAULT '[]',
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE course_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Instructor can read own lessons"
  ON course_lessons FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Students can read preview lessons of published courses"
  ON course_lessons FOR SELECT TO authenticated
  USING (
    is_preview = true
    AND EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = course_lessons.course_id AND c.is_published = true
    )
  );

CREATE POLICY "Enrolled students can read all lessons"
  ON course_lessons FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM course_enrollments ce
      WHERE ce.course_id = course_lessons.course_id AND ce.user_id = auth.uid()
    )
  );

CREATE POLICY "Instructor can insert own lessons"
  ON course_lessons FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Instructor can update own lessons"
  ON course_lessons FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Instructor can delete own lessons"
  ON course_lessons FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ── lesson_progress ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lesson_progress (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id               uuid NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
  course_id               uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id                 uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed               boolean NOT NULL DEFAULT false,
  completed_at            timestamptz,
  watch_position_seconds  integer NOT NULL DEFAULT 0,
  UNIQUE (lesson_id, user_id)
);

ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Student can read own lesson progress"
  ON lesson_progress FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Student can insert own lesson progress"
  ON lesson_progress FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Student can update own lesson progress"
  ON lesson_progress FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── course_notes ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS course_notes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id  uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id  uuid REFERENCES course_lessons(id) ON DELETE SET NULL,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content    text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE course_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Student can read own notes"
  ON course_notes FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Student can insert own notes"
  ON course_notes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Student can update own notes"
  ON course_notes FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Student can delete own notes"
  ON course_notes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ── course_certificates ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS course_certificates (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id          uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  certificate_number text NOT NULL UNIQUE DEFAULT upper(replace(gen_random_uuid()::text, '-', '')),
  issued_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, user_id)
);

ALTER TABLE course_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Student can read own certificates"
  ON course_certificates FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Instructor can read certificates for own courses"
  ON course_certificates FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = course_certificates.course_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "System can issue certificates"
  ON course_certificates FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_courses_user_id ON courses(user_id);
CREATE INDEX IF NOT EXISTS idx_courses_is_published ON courses(is_published);
CREATE INDEX IF NOT EXISTS idx_course_sections_course_id ON course_sections(course_id);
CREATE INDEX IF NOT EXISTS idx_course_lessons_course_id ON course_lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_course_lessons_section_id ON course_lessons(section_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON course_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_id ON lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_course_id ON lesson_progress(course_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON course_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_lesson_id ON course_notes(lesson_id);
CREATE INDEX IF NOT EXISTS idx_certificates_user_id ON course_certificates(user_id);

-- ── Helper functions ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_course_progress(p_course_id uuid, p_user_id uuid)
RETURNS numeric AS $$
DECLARE
  total_lessons integer;
  completed_lessons integer;
BEGIN
  SELECT COUNT(*) INTO total_lessons
  FROM course_lessons
  WHERE course_id = p_course_id;

  IF total_lessons = 0 THEN RETURN 0; END IF;

  SELECT COUNT(*) INTO completed_lessons
  FROM lesson_progress
  WHERE course_id = p_course_id
    AND user_id = p_user_id
    AND completed = true;

  RETURN ROUND((completed_lessons::numeric / total_lessons::numeric) * 100, 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION issue_certificate_if_complete(p_course_id uuid, p_user_id uuid)
RETURNS uuid AS $$
DECLARE
  progress numeric;
  cert_id uuid;
BEGIN
  SELECT get_course_progress(p_course_id, p_user_id) INTO progress;
  IF progress < 100 THEN RETURN NULL; END IF;

  UPDATE course_enrollments
  SET completed_at = now()
  WHERE course_id = p_course_id AND user_id = p_user_id AND completed_at IS NULL;

  INSERT INTO course_certificates (course_id, user_id)
  VALUES (p_course_id, p_user_id)
  ON CONFLICT (course_id, user_id) DO NOTHING
  RETURNING id INTO cert_id;

  IF cert_id IS NULL THEN
    SELECT id INTO cert_id FROM course_certificates
    WHERE course_id = p_course_id AND user_id = p_user_id;
  END IF;

  RETURN cert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
