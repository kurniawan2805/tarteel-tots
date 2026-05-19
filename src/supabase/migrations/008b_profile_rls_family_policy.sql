-- OPTIONAL: Add cross-table RLS policy for profiles
-- This should be run AFTER migration 003_membership_roles.sql is applied
-- (requires memberships table to exist)

-- Add the policy that lets users view family members' profiles
CREATE POLICY "Users can view profiles in their family"
ON profiles FOR SELECT
USING (
  family_id IS NOT NULL AND family_id IN (
    SELECT family_id FROM memberships WHERE profile_id = auth.uid()
  )
);
