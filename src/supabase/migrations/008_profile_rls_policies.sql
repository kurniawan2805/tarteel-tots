-- Add RLS policies for profiles table
-- Required for users to create and view their own profiles during signup

-- Allow users to insert their own profile (during signup)
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

-- Allow users to view profiles in their family (for member display)
CREATE POLICY "Users can view profiles in their family"
ON profiles FOR SELECT
USING (family_id IN (SELECT family_id FROM memberships WHERE profile_id = auth.uid()));
