/*
  # Course Q&A + Reviews System

  ## New Tables
  1. `course_questions`  — student-posted questions on a course (with optional lesson context)
  2. `course_answers`    — threaded replies to questions (enrolled users + instructor)
  3. `course_votes`      — polymorphic upvotes for questions and answers (one per user per item)
  4. `course_reviews`    — exactly one review per (student, course); UNIQUE(course_id, user_id)

  ## Modifications
  - `courses`: adds denormalized `avg_rating` (numeric) and `reviews_count` (int) columns
    so course cards never need a JOIN/aggregate to show the rating.

  ## Triggers
  - INSERT/UPDATE/DELETE on `course_reviews` → recompute `courses.avg_rating` + `reviews_count`
  - INSERT/DELETE on `course_answers` → maintain `course_questions.answer_count`
  - INSERT/DELETE on `course_votes` → maintain `upvote_count` on questions/answers
  - BEFORE INSERT on `course_answers` → snapshot `is_instructor` from courses ownership
  - BEFORE UPDATE on questions/answers → bump `updated_at`

  ## Security
  - RLS on all four tables; anon can read questions/answers/reviews on published courses
  - Only enrolled users (or the course owner) can post questions and answers
  - Only enrolled non-owner students can post reviews (DB + policy dual enforcement)
  - UNIQUE(course_id, user_id) on course_reviews is the hard DB guarantee for one-per-student
*/

-- ── 1. Extend courses with denormalized review aggregate columns ─────────────
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS avg_rating    numeric(3, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reviews_count integer       NOT NULL DEFAULT 0;

-- ── 2. course_questions ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS course_questions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id    uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id    uuid REFERENCES course_lessons(id) ON DELETE SET NULL,
  title        text NOT NULL CHECK (char_length(title) BETWEEN 5 AND 200),
  body         text NOT NULL CHECK (char_length(body) BETWEEN 10 AND 5000),
  is_resolved  boolean NOT NULL DEFAULT false,
  upvote_count integer NOT NULL DEFAULT 0,
  answer_count integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS course_questions_course_id_idx ON course_questions(course_id);
CREATE INDEX IF NOT EXISTS course_questions_user_id_idx   ON course_questions(user_id);
CREATE INDEX IF NOT EXISTS course_questions_created_idx   ON course_questions(course_id, created_at DESC);

ALTER TABLE course_questions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON course_questions TO authenticated;
GRANT SELECT ON course_questions TO anon;

CREATE POLICY "Read questions on accessible courses"
  ON course_questions FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = course_questions.course_id
        AND (c.is_published = true OR c.user_id = auth.uid())
    )
  );

CREATE POLICY "Enrolled users can post questions"
  ON course_questions FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      EXISTS (SELECT 1 FROM course_enrollments e WHERE e.course_id = course_questions.course_id AND e.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM courses c WHERE c.id = course_questions.course_id AND c.user_id = auth.uid())
    )
  );

CREATE POLICY "Author can update own question"
  ON course_questions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Author can delete own question"
  ON course_questions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Instructor can resolve question"
  ON course_questions FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM courses c WHERE c.id = course_questions.course_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM courses c WHERE c.id = course_questions.course_id AND c.user_id = auth.uid()));

-- ── 3. course_answers ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS course_answers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id   uuid NOT NULL REFERENCES course_questions(id) ON DELETE CASCADE,
  course_id     uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body          text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
  is_instructor boolean NOT NULL DEFAULT false,
  upvote_count  integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS course_answers_question_id_idx ON course_answers(question_id);
CREATE INDEX IF NOT EXISTS course_answers_course_id_idx   ON course_answers(course_id);
CREATE INDEX IF NOT EXISTS course_answers_created_idx     ON course_answers(question_id, created_at);

ALTER TABLE course_answers ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON course_answers TO authenticated;
GRANT SELECT ON course_answers TO anon;

CREATE POLICY "Read answers on accessible courses"
  ON course_answers FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (SELECT 1 FROM courses c WHERE c.id = course_answers.course_id AND (c.is_published = true OR c.user_id = auth.uid()))
  );

CREATE POLICY "Enrolled users or instructor can answer"
  ON course_answers FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      EXISTS (SELECT 1 FROM course_enrollments e WHERE e.course_id = course_answers.course_id AND e.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM courses c WHERE c.id = course_answers.course_id AND c.user_id = auth.uid())
    )
  );

CREATE POLICY "Author can update own answer"
  ON course_answers FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Author can delete own answer"
  ON course_answers FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ── 4. course_votes ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS course_votes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('question', 'answer')),
  target_id   uuid NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS course_votes_target_idx ON course_votes(target_type, target_id);
CREATE INDEX IF NOT EXISTS course_votes_user_idx   ON course_votes(user_id);

ALTER TABLE course_votes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON course_votes TO authenticated;

CREATE POLICY "Authenticated users can read votes"
  ON course_votes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can cast own votes"
  ON course_votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can retract own votes"
  ON course_votes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ── 5. course_reviews — STRICT one per (student, course) ─────────────────────
CREATE TABLE IF NOT EXISTS course_reviews (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id               uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id                 uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating                  smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title                   text CHECK (title IS NULL OR char_length(title) <= 120),
  body                    text CHECK (body IS NULL OR char_length(body) <= 1000),
  instructor_response     text CHECK (instructor_response IS NULL OR char_length(instructor_response) <= 1000),
  instructor_responded_at timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, user_id)
);

CREATE INDEX IF NOT EXISTS course_reviews_course_id_idx ON course_reviews(course_id);
CREATE INDEX IF NOT EXISTS course_reviews_user_id_idx   ON course_reviews(user_id);
CREATE INDEX IF NOT EXISTS course_reviews_created_idx   ON course_reviews(course_id, created_at DESC);

ALTER TABLE course_reviews ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON course_reviews TO authenticated;
GRANT SELECT ON course_reviews TO anon;

CREATE POLICY "Read reviews on accessible courses"
  ON course_reviews FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (SELECT 1 FROM courses c WHERE c.id = course_reviews.course_id AND (c.is_published = true OR c.user_id = auth.uid()))
  );

CREATE POLICY "Enrolled non-owner students can post review"
  ON course_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM course_enrollments e WHERE e.course_id = course_reviews.course_id AND e.user_id = auth.uid())
    AND NOT EXISTS (SELECT 1 FROM courses c WHERE c.id = course_reviews.course_id AND c.user_id = auth.uid())
  );

CREATE POLICY "Author can update own review"
  ON course_reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Author can delete own review"
  ON course_reviews FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Instructor can respond to review"
  ON course_reviews FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM courses c WHERE c.id = course_reviews.course_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM courses c WHERE c.id = course_reviews.course_id AND c.user_id = auth.uid()));

-- ── 6. Aggregate review stats trigger ────────────────────────────────────────
CREATE OR REPLACE FUNCTION recompute_course_review_stats(p_course_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_avg   numeric(3,2);
  v_count integer;
BEGIN
  SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 0), COUNT(*)
  INTO v_avg, v_count
  FROM course_reviews WHERE course_id = p_course_id;

  UPDATE courses SET avg_rating = v_avg, reviews_count = v_count WHERE id = p_course_id;
END;
$$;

CREATE OR REPLACE FUNCTION trg_course_review_changed()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recompute_course_review_stats(OLD.course_id);
    RETURN OLD;
  ELSE
    IF TG_OP = 'UPDATE' THEN NEW.updated_at := now(); END IF;
    PERFORM recompute_course_review_stats(NEW.course_id);
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS course_reviews_stats_trigger ON course_reviews;
CREATE TRIGGER course_reviews_stats_trigger
  AFTER INSERT OR UPDATE OF rating OR DELETE ON course_reviews
  FOR EACH ROW EXECUTE FUNCTION trg_course_review_changed();

DROP TRIGGER IF EXISTS course_reviews_updated_trigger ON course_reviews;
CREATE TRIGGER course_reviews_updated_trigger
  BEFORE UPDATE ON course_reviews
  FOR EACH ROW EXECUTE FUNCTION trg_course_review_changed();

-- ── 7. Answer count trigger ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_answer_count_changed()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE course_questions SET answer_count = answer_count + 1 WHERE id = NEW.question_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE course_questions SET answer_count = GREATEST(0, answer_count - 1) WHERE id = OLD.question_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS course_answers_count_trigger ON course_answers;
CREATE TRIGGER course_answers_count_trigger
  AFTER INSERT OR DELETE ON course_answers
  FOR EACH ROW EXECUTE FUNCTION trg_answer_count_changed();

-- ── 8. Vote count trigger ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_vote_count_changed()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_type  text;
  v_id    uuid;
  v_delta integer;
BEGIN
  IF TG_OP = 'INSERT' THEN v_type := NEW.target_type; v_id := NEW.target_id; v_delta := 1;
  ELSIF TG_OP = 'DELETE' THEN v_type := OLD.target_type; v_id := OLD.target_id; v_delta := -1;
  END IF;
  IF v_type = 'question' THEN
    UPDATE course_questions SET upvote_count = GREATEST(0, upvote_count + v_delta) WHERE id = v_id;
  ELSIF v_type = 'answer' THEN
    UPDATE course_answers SET upvote_count = GREATEST(0, upvote_count + v_delta) WHERE id = v_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS course_votes_count_trigger ON course_votes;
CREATE TRIGGER course_votes_count_trigger
  AFTER INSERT OR DELETE ON course_votes
  FOR EACH ROW EXECUTE FUNCTION trg_vote_count_changed();

-- ── 9. Snapshot is_instructor on answer insert ───────────────────────────────
CREATE OR REPLACE FUNCTION trg_set_answer_is_instructor()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.is_instructor := EXISTS (SELECT 1 FROM courses c WHERE c.id = NEW.course_id AND c.user_id = NEW.user_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS course_answers_instructor_flag ON course_answers;
CREATE TRIGGER course_answers_instructor_flag
  BEFORE INSERT ON course_answers
  FOR EACH ROW EXECUTE FUNCTION trg_set_answer_is_instructor();

-- ── 10. Bump updated_at on question/answer edits ─────────────────────────────
CREATE OR REPLACE FUNCTION trg_bump_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS course_questions_updated_trigger ON course_questions;
CREATE TRIGGER course_questions_updated_trigger
  BEFORE UPDATE ON course_questions
  FOR EACH ROW EXECUTE FUNCTION trg_bump_updated_at();

DROP TRIGGER IF EXISTS course_answers_updated_trigger ON course_answers;
CREATE TRIGGER course_answers_updated_trigger
  BEFORE UPDATE ON course_answers
  FOR EACH ROW EXECUTE FUNCTION trg_bump_updated_at();
