-- FIX: Resolve infinite recursion in RLS policies
-- Problem: Migration 009 created circular reference between policies
-- - families policies query memberships
-- - memberships policies query families
-- Solution: Use direct ID matching instead of subqueries where possible

-- ============================================================================
-- DROP ALL RECURSIVE POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "Users can select own family" ON families;
DROP POLICY IF EXISTS "Users can update own family" ON families;
DROP POLICY IF EXISTS "Users can view their own memberships" ON memberships;
DROP POLICY IF EXISTS "Users can see fellow family members" ON memberships;

-- ============================================================================
-- RE-CREATE FAMILIES POLICIES (simplified, no recursion)
-- ============================================================================
CREATE POLICY "Users can view their own family"
ON families FOR SELECT
USING (
  -- Direct: user has a membership record for this family
  EXISTS (
    SELECT 1 FROM memberships 
    WHERE memberships.family_id = families.id 
    AND memberships.profile_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own family"
ON families FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM memberships 
    WHERE memberships.family_id = families.id 
    AND memberships.profile_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM memberships 
    WHERE memberships.family_id = families.id 
    AND memberships.profile_id = auth.uid()
  )
);

-- ============================================================================
-- RE-CREATE MEMBERSHIPS POLICIES (simplified, no family query)
-- ============================================================================
CREATE POLICY "Users can view memberships for their family"
ON memberships FOR SELECT
USING (
  -- Direct: user is part of the family
  profile_id = auth.uid()
  OR family_id IN (
    SELECT family_id FROM memberships WHERE profile_id = auth.uid()
  )
);

CREATE POLICY "Users can insert memberships for their family"
ON memberships FOR INSERT
WITH CHECK (
  profile_id = auth.uid()
  OR family_id IN (
    SELECT family_id FROM memberships WHERE profile_id = auth.uid()
  )
);

-- ============================================================================
-- NOTE: Other RLS policies use memberships safely (no back-reference)
-- - children/progress/sessions/garden_state query memberships
-- - memberships does NOT query those tables back
-- - This prevents circular recursion
-- ============================================================================
