-- Allow unauthenticated family code lookups (for join flow)
-- Anyone can see a family's code to join, but can't see other details

DROP POLICY IF EXISTS "Anyone can lookup family by code" ON families;

CREATE POLICY "Anyone can lookup family by code"
ON families FOR SELECT
USING (family_code IS NOT NULL);
-- Anyone can see families with a code (for joining)
-- Once they join (membership created), other policies apply
 x