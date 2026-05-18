-- ENHANCED FAMILY MEMBERSHIP & HUMAN-FRIENDLY CODES

-- 1. Add human-friendly family_code to families
ALTER TABLE families ADD COLUMN IF NOT EXISTS family_code TEXT UNIQUE;
ALTER TABLE families ADD COLUMN IF NOT EXISTS display_name TEXT;

-- 2. Create memberships table for robust role management
CREATE TABLE IF NOT EXISTS memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'guardian')),
    label TEXT, -- e.g., 'Father', 'Mother', 'Grandpa'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(family_id, profile_id)
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_memberships_profile ON memberships(profile_id);
CREATE INDEX IF NOT EXISTS idx_memberships_family ON memberships(family_id);

-- 3. Function to generate random human-friendly code (e.g., TT-ABCD)
CREATE OR REPLACE FUNCTION generate_family_code() 
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- No I, O, 0, 1 for clarity
  result TEXT := 'TT-';
  i INTEGER := 0;
BEGIN
  FOR i IN 1..4 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 4. Update existing families with codes if missing
-- Note: This is a safe baseline update.
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM families WHERE family_code IS NULL) THEN
    UPDATE families SET family_code = generate_family_code() WHERE family_code IS NULL;
  END IF;
END $$;

-- RLS
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own memberships" 
ON memberships FOR SELECT 
USING (profile_id = auth.uid());

-- Policy for family members to see each other
CREATE POLICY "Users can see fellow family members"
ON memberships FOR SELECT
USING (family_id IN (SELECT family_id FROM memberships WHERE profile_id = auth.uid()));
