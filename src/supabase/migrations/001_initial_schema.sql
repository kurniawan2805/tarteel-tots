-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Families table
CREATE TABLE families (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles (Parents)
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT CHECK (role IN ('mother', 'father', 'guardian')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Children
CREATE TABLE children (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  avatar_url TEXT,
  memorization_baseline JSONB DEFAULT '{}',
  daily_goal_minutes INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Progress Tracking (Tikrar Log)
CREATE TABLE progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  surah INTEGER NOT NULL,
  surah_name TEXT,
  ayah_number INTEGER NOT NULL,
  ayah_text TEXT,
  grade TEXT CHECK (grade IN ('needs_help', 'good', 'perfect')),
  repetition_count INTEGER DEFAULT 0,
  last_review TIMESTAMPTZ,
  next_review TIMESTAMPTZ,
  review_interval_days INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Session Logs
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  date DATE DEFAULT CURRENT_DATE,
  duration INTEGER DEFAULT 0,
  mode TEXT CHECK (mode IN ('interactive', 'live_guide', 'audio_only')),
  screen_time INTEGER DEFAULT 0,
  audio_only_time INTEGER DEFAULT 0,
  ayahs_reviewed INTEGER DEFAULT 0,
  ayahs_new INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garden State
CREATE TABLE garden_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id REFERENCES children(id) ON DELETE CASCADE UNIQUE,
  growth_stage INTEGER DEFAULT 0,
  last_watered TIMESTAMPTZ,
  streak_days INTEGER DEFAULT 0,
  last_session_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_profiles_family_id ON profiles(family_id);
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_children_family_id ON children(family_id);
CREATE INDEX idx_progress_child_id ON progress(child_id);
CREATE INDEX idx_progress_next_review ON progress(next_review);
CREATE INDEX idx_progress_grade ON progress(grade);
CREATE INDEX idx_sessions_child_id ON sessions(child_id);
CREATE INDEX idx_sessions_date ON sessions(date);
CREATE INDEX idx_garden_child_id ON garden_state(child_id);

-- Enable Row Level Security
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE garden_state ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their family"
  ON families FOR SELECT
  USING (id IN (SELECT family_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can create families"
  ON families FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can view family children"
  ON children FOR SELECT
  USING (family_id IN (SELECT family_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert family children"
  ON children FOR INSERT
  WITH CHECK (family_id IN (SELECT family_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update family children"
  ON children FOR UPDATE
  USING (family_id IN (SELECT family_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can view progress"
  ON progress FOR SELECT
  USING (child_id IN (
    SELECT c.id FROM children c
    JOIN profiles p ON c.family_id = p.family_id
    WHERE p.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert progress"
  ON progress FOR INSERT
  WITH CHECK (child_id IN (
    SELECT c.id FROM children c
    JOIN profiles p ON c.family_id = p.family_id
    WHERE p.user_id = auth.uid()
  ));

CREATE POLICY "Users can update progress"
  ON progress FOR UPDATE
  USING (child_id IN (
    SELECT c.id FROM children c
    JOIN profiles p ON c.family_id = p.family_id
    WHERE p.user_id = auth.uid()
  ));

CREATE POLICY "Users can view sessions"
  ON sessions FOR SELECT
  USING (family_id IN (SELECT family_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert sessions"
  ON sessions FOR INSERT
  WITH CHECK (family_id IN (SELECT family_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can view garden"
  ON garden_state FOR SELECT
  USING (child_id IN (
    SELECT c.id FROM children c
    JOIN profiles p ON c.family_id = p.family_id
    WHERE p.user_id = auth.uid()
  ));

CREATE POLICY "Users can upsert garden"
  ON garden_state FOR ALL
  USING (child_id IN (
    SELECT c.id FROM children c
    JOIN profiles p ON c.family_id = p.family_id
    WHERE p.user_id = auth.uid()
  ));

-- Enable Realtime for progress and sessions
ALTER PUBLICATION supabase_realtime ADD TABLE progress;
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE garden_state;

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_children_updated_at BEFORE UPDATE ON children
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_progress_updated_at BEFORE UPDATE ON progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_garden_state_updated_at BEFORE UPDATE ON garden_state
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
