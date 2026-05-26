/*
  # Extend user_profiles with portfolio / bio fields

  1. New columns on `user_profiles`
    - `bio`               (text, short personal bio)
    - `headline`          (text, e.g. "Full-stack Developer at XYZ")
    - `location`          (text)
    - `website_url`       (text)
    - `linkedin_url`      (text)
    - `github_url`        (text)
    - `twitter_url`       (text)
    - `instagram_url`     (text)
    - `college`           (text, college / university attended)
    - `school`            (text, school attended)
    - `college_year`      (text, e.g. "2019 – 2023")
    - `school_year`       (text, e.g. "2015 – 2019")
    - `degree`            (text, e.g. "B.Tech Computer Science")
    - `experience_years`  (smallint, total years of professional experience)
    - `experience_title`  (text, current/latest job title)
    - `experience_company`(text, current/latest employer)
    - `skills`            (text[], list of skill tags)
    - `is_portfolio_public` (boolean, whether the portfolio page is public)

  2. No existing columns are dropped or altered — purely additive.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='bio') THEN
    ALTER TABLE user_profiles ADD COLUMN bio text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='headline') THEN
    ALTER TABLE user_profiles ADD COLUMN headline text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='location') THEN
    ALTER TABLE user_profiles ADD COLUMN location text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='website_url') THEN
    ALTER TABLE user_profiles ADD COLUMN website_url text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='linkedin_url') THEN
    ALTER TABLE user_profiles ADD COLUMN linkedin_url text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='github_url') THEN
    ALTER TABLE user_profiles ADD COLUMN github_url text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='twitter_url') THEN
    ALTER TABLE user_profiles ADD COLUMN twitter_url text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='instagram_url') THEN
    ALTER TABLE user_profiles ADD COLUMN instagram_url text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='college') THEN
    ALTER TABLE user_profiles ADD COLUMN college text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='school') THEN
    ALTER TABLE user_profiles ADD COLUMN school text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='college_year') THEN
    ALTER TABLE user_profiles ADD COLUMN college_year text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='school_year') THEN
    ALTER TABLE user_profiles ADD COLUMN school_year text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='degree') THEN
    ALTER TABLE user_profiles ADD COLUMN degree text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='experience_years') THEN
    ALTER TABLE user_profiles ADD COLUMN experience_years smallint DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='experience_title') THEN
    ALTER TABLE user_profiles ADD COLUMN experience_title text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='experience_company') THEN
    ALTER TABLE user_profiles ADD COLUMN experience_company text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='skills') THEN
    ALTER TABLE user_profiles ADD COLUMN skills text[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='is_portfolio_public') THEN
    ALTER TABLE user_profiles ADD COLUMN is_portfolio_public boolean DEFAULT false;
  END IF;
END $$;
