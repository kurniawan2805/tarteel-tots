-- Add RLS policies for profiles table
-- Required for users to create and view their own profiles during signup

-- First, make sure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (so we can recreate them)
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles in their family" ON profiles;

-- ============ ESSENTIAL POLICIES (work independently) ============

-- Allow users to insert their own profile (during signup)
-- CRITICAL: This is what enables signup to work
CREATE POLICY "Users can insert their own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Allow users to view their own profile
CREATE POLICY "Users can view their own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ============ OPTIONAL: Cross-table policy (requires migration 003) ============
-- NOTE: Only enable this AFTER migration 003_membership_roles.sql is applied!
-- If migration 003 has been applied, uncomment the block below:

/*
-- Allow users to view profiles in their family (for member display)
CREATE POLICY "Users can view profiles in their family"
ON profiles FOR SELECT
USING (
  family_id IS NOT NULL AND family_id IN (
    SELECT family_id FROM memberships WHERE profile_id = auth.uid()
  )
);
*/

