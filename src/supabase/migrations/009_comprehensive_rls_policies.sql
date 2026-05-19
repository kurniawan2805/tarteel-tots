-- COMPREHENSIVE RLS POLICIES FOR FAMILY DATA ISOLATION
-- Ensures users can only access data from their own family

-- ============================================================================
-- DROP ALL EXISTING POLICIES (clean slate before re-creating)
-- ============================================================================
DROP POLICY IF EXISTS "Users see family_code and expires_at" ON families;
DROP POLICY IF EXISTS "Users can select own family" ON families;
DROP POLICY IF EXISTS "Users can update own family" ON families;

DROP POLICY IF EXISTS "Users can view family children" ON children;
DROP POLICY IF EXISTS "Users can insert children to their family" ON children;
DROP POLICY IF EXISTS "Users can update family children" ON children;
DROP POLICY IF EXISTS "Users can delete family children" ON children;
DROP POLICY IF EXISTS "Users can manage family children" ON children;

DROP POLICY IF EXISTS "Users can view progress for their family children" ON progress;
DROP POLICY IF EXISTS "Users can insert progress for their family children" ON progress;
DROP POLICY IF EXISTS "Users can update progress for their family children" ON progress;
DROP POLICY IF EXISTS "Users can manage family progress" ON progress;

DROP POLICY IF EXISTS "Users can view family sessions" ON sessions;
DROP POLICY IF EXISTS "Users can insert family sessions" ON sessions;
DROP POLICY IF EXISTS "Users can update family sessions" ON sessions;
DROP POLICY IF EXISTS "Users can view sessions" ON sessions;
DROP POLICY IF EXISTS "Users can manage sessions" ON sessions;

DROP POLICY IF EXISTS "Users can view garden state for their family" ON garden_state;
DROP POLICY IF EXISTS "Users can update garden state for their family" ON garden_state;
DROP POLICY IF EXISTS "Users can insert garden state for their family" ON garden_state;
DROP POLICY IF EXISTS "Users can view garden state" ON garden_state;
DROP POLICY IF EXISTS "Users can manage garden state" ON garden_state;

-- ============================================================================
-- 1. FAMILIES TABLE - Users can only see/access their own family
-- ============================================================================

CREATE POLICY "Users can select own family"
ON families FOR SELECT
USING (
  id IN (
    SELECT DISTINCT family_id FROM memberships WHERE profile_id = auth.uid()
  )
);

CREATE POLICY "Users can update own family"
ON families FOR UPDATE
USING (
  id IN (
    SELECT DISTINCT family_id FROM memberships WHERE profile_id = auth.uid()
  )
)
WITH CHECK (
  id IN (
    SELECT DISTINCT family_id FROM memberships WHERE profile_id = auth.uid()
  )
);

-- ============================================================================
-- 2. CHILDREN TABLE - Users can only see children in their family
-- ============================================================================
DROP POLICY IF EXISTS "Users can view family children" ON children;
DROP POLICY IF EXISTS "Users can manage family children" ON children;

CREATE POLICY "Users can view family children"
ON children FOR SELECT
USING (
  family_id IN (
    SELECT DISTINCT family_id FROM memberships WHERE profile_id = auth.uid()
  )
);

CREATE POLICY "Users can insert children to their family"
ON children FOR INSERT
WITH CHECK (
  family_id IN (
    SELECT DISTINCT family_id FROM memberships WHERE profile_id = auth.uid()
  )
);

CREATE POLICY "Users can update family children"
ON children FOR UPDATE
USING (
  family_id IN (
    SELECT DISTINCT family_id FROM memberships WHERE profile_id = auth.uid()
  )
)
WITH CHECK (
  family_id IN (
    SELECT DISTINCT family_id FROM memberships WHERE profile_id = auth.uid()
  )
);

CREATE POLICY "Users can delete family children"
ON children FOR DELETE
USING (
  family_id IN (
    SELECT DISTINCT family_id FROM memberships WHERE profile_id = auth.uid()
  )
);

-- ============================================================================
-- 3. PROGRESS TABLE - Users can only access progress for their family's children
-- ============================================================================
DROP POLICY IF EXISTS "Users can view progress for their family children" ON progress;
DROP POLICY IF EXISTS "Users can update progress for their family children" ON progress;
DROP POLICY IF EXISTS "Users can manage family progress" ON progress;

CREATE POLICY "Users can view progress for their family children"
ON progress FOR SELECT
USING (
  child_id IN (
    SELECT id FROM children 
    WHERE family_id IN (
      SELECT DISTINCT family_id FROM memberships WHERE profile_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can insert progress for their family children"
ON progress FOR INSERT
WITH CHECK (
  child_id IN (
    SELECT id FROM children 
    WHERE family_id IN (
      SELECT DISTINCT family_id FROM memberships WHERE profile_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can update progress for their family children"
ON progress FOR UPDATE
USING (
  child_id IN (
    SELECT id FROM children 
    WHERE family_id IN (
      SELECT DISTINCT family_id FROM memberships WHERE profile_id = auth.uid()
    )
  )
)
WITH CHECK (
  child_id IN (
    SELECT id FROM children 
    WHERE family_id IN (
      SELECT DISTINCT family_id FROM memberships WHERE profile_id = auth.uid()
    )
  )
);

-- ============================================================================
-- 4. SESSIONS TABLE - Users can only see sessions from their family
-- ============================================================================
DROP POLICY IF EXISTS "Users can view sessions" ON sessions;
DROP POLICY IF EXISTS "Users can manage sessions" ON sessions;

CREATE POLICY "Users can view family sessions"
ON sessions FOR SELECT
USING (
  family_id IN (
    SELECT DISTINCT family_id FROM memberships WHERE profile_id = auth.uid()
  )
);

CREATE POLICY "Users can insert family sessions"
ON sessions FOR INSERT
WITH CHECK (
  family_id IN (
    SELECT DISTINCT family_id FROM memberships WHERE profile_id = auth.uid()
  )
);

CREATE POLICY "Users can update family sessions"
ON sessions FOR UPDATE
USING (
  family_id IN (
    SELECT DISTINCT family_id FROM memberships WHERE profile_id = auth.uid()
  )
)
WITH CHECK (
  family_id IN (
    SELECT DISTINCT family_id FROM memberships WHERE profile_id = auth.uid()
  )
);

-- ============================================================================
-- 5. GARDEN_STATE TABLE - Users can only manage gardens for their family's children
-- ============================================================================
DROP POLICY IF EXISTS "Users can view garden state" ON garden_state;
DROP POLICY IF EXISTS "Users can manage garden state" ON garden_state;

CREATE POLICY "Users can view garden state for their family"
ON garden_state FOR SELECT
USING (
  child_id IN (
    SELECT id FROM children 
    WHERE family_id IN (
      SELECT DISTINCT family_id FROM memberships WHERE profile_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can update garden state for their family"
ON garden_state FOR UPDATE
USING (
  child_id IN (
    SELECT id FROM children 
    WHERE family_id IN (
      SELECT DISTINCT family_id FROM memberships WHERE profile_id = auth.uid()
    )
  )
)
WITH CHECK (
  child_id IN (
    SELECT id FROM children 
    WHERE family_id IN (
      SELECT DISTINCT family_id FROM memberships WHERE profile_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can insert garden state for their family"
ON garden_state FOR INSERT
WITH CHECK (
  child_id IN (
    SELECT id FROM children 
    WHERE family_id IN (
      SELECT DISTINCT family_id FROM memberships WHERE profile_id = auth.uid()
    )
  )
);

-- ============================================================================
-- SUMMARY OF POLICIES
-- ============================================================================
-- families: SELECT/UPDATE own family only (via memberships)
-- children: SELECT/INSERT/UPDATE/DELETE own family's children only
-- progress: SELECT/INSERT/UPDATE own family's children's progress only
-- sessions: SELECT/INSERT/UPDATE own family's sessions only
-- garden_state: SELECT/INSERT/UPDATE own family's children's garden state only
-- 
-- All policies use memberships table as source of truth for family membership
-- This ensures data isolation even if profiles.family_id is inconsistent
