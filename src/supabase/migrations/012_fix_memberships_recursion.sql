-- FIX: Remove recursive subquery from memberships policy

DROP POLICY IF EXISTS "Users can view memberships for their family" ON memberships;
DROP POLICY IF EXISTS "Users can insert memberships for their family" ON memberships;

-- Direct check only - no subquery on same table
CREATE POLICY "Users can view memberships"
ON memberships FOR SELECT
USING (
  profile_id = auth.uid()
);

CREATE POLICY "Users can insert own membership"
ON memberships FOR INSERT
WITH CHECK (
  profile_id = auth.uid()
);

-- Admins can manage memberships (optional - for now just owner)
-- This keeps it simple: you can only view/insert your own membership record
