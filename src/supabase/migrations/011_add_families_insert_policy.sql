-- FIX: Add missing INSERT policy for families table
-- Users should be able to create new families (no family_id yet)

DROP POLICY IF EXISTS "Users can create families" ON families;

CREATE POLICY "Users can create families"
ON families FOR INSERT
WITH CHECK (true);  -- Anyone authenticated can create a family

-- Alternative (more restrictive): only allow via function
-- But for now, simple approach: authenticated users can create families
