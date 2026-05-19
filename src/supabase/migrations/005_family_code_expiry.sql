-- Migration: Add family code expiry
-- Allows regenerating stale family codes after 7 days

BEGIN;

-- Add expires_at column to families table
ALTER TABLE families ADD COLUMN expires_at TIMESTAMP;

-- Set expiry for existing families (7 days from now)
UPDATE families 
SET expires_at = NOW() + INTERVAL '7 days'
WHERE expires_at IS NULL;

-- Create function to auto-generate expires_at on new families
CREATE OR REPLACE FUNCTION set_family_code_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at := NOW() + INTERVAL '7 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to families table
DROP TRIGGER IF EXISTS family_code_expiry_trigger ON families;
CREATE TRIGGER family_code_expiry_trigger
BEFORE INSERT ON families
FOR EACH ROW
EXECUTE FUNCTION set_family_code_expiry();

-- RLS: Allow users to see family expiry if they're members
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see family_code and expires_at" ON families FOR SELECT
USING (
  id IN (
    SELECT family_id FROM profiles 
    WHERE id = auth.uid()
  )
);

COMMIT;
