-- Migration: Switch primary keys to UUID for offline-first compatibility
-- FINAL HARDENED VERSION: Wraps every single table/column change in existence checks.

BEGIN;

-- 1. DROP POLICIES ON AFFECTED TABLES
-- This uses dynamic SQL to only attempt dropping policies on tables that actually exist.
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('children', 'progress', 'sessions', 'garden_state', 'grade_history', 'events', 'child_audit_log')
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON ' || quote_ident(r.tablename);
    END LOOP;
END $$;

-- 2. DROP TRIGGER THAT DEPENDS ON CHILDREN/AUDIT_LOG
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'child_changes_trigger') THEN
        DROP TRIGGER IF EXISTS child_changes_trigger ON children;
    END IF;
END $$;
DROP FUNCTION IF EXISTS log_child_changes();

-- 3. ALTER COLUMNS TO UUID
-- Every table is now treated as optional to prevent "relation does not exist" errors.

-- CHILDREN
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'children') THEN
        ALTER TABLE children ALTER COLUMN id DROP IDENTITY IF EXISTS;
        ALTER TABLE children ALTER COLUMN id SET DATA TYPE UUID USING (uuid_generate_v4());
        ALTER TABLE children ALTER COLUMN id SET DEFAULT uuid_generate_v4();
    END IF;
END $$;

-- PROGRESS
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'progress') THEN
        ALTER TABLE progress ALTER COLUMN id DROP IDENTITY IF EXISTS;
        ALTER TABLE progress ALTER COLUMN id SET DATA TYPE UUID USING (uuid_generate_v4());
        ALTER TABLE progress ALTER COLUMN id SET DEFAULT uuid_generate_v4();
        ALTER TABLE progress ALTER COLUMN child_id SET DATA TYPE UUID USING (uuid_generate_v4());
    END IF;
END $$;

-- SESSIONS
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sessions') THEN
        ALTER TABLE sessions ALTER COLUMN id DROP IDENTITY IF EXISTS;
        ALTER TABLE sessions ALTER COLUMN id SET DATA TYPE UUID USING (uuid_generate_v4());
        ALTER TABLE sessions ALTER COLUMN id SET DEFAULT uuid_generate_v4();
        ALTER TABLE sessions ALTER COLUMN child_id SET DATA TYPE UUID USING (uuid_generate_v4());
    END IF;
END $$;

-- GARDEN STATE
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'garden_state') THEN
        ALTER TABLE garden_state ALTER COLUMN child_id SET DATA TYPE UUID USING (uuid_generate_v4());
    END IF;
END $$;

-- GRADE HISTORY
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'grade_history') THEN
        ALTER TABLE grade_history ALTER COLUMN id DROP IDENTITY IF EXISTS;
        ALTER TABLE grade_history ALTER COLUMN id SET DATA TYPE UUID USING (uuid_generate_v4());
        ALTER TABLE grade_history ALTER COLUMN id SET DEFAULT uuid_generate_v4();
        ALTER TABLE grade_history ALTER COLUMN progress_id SET DATA TYPE UUID USING (uuid_generate_v4());
        ALTER TABLE grade_history ALTER COLUMN child_id SET DATA TYPE UUID USING (uuid_generate_v4());
    END IF;
END $$;

-- EVENTS
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'events') THEN
        ALTER TABLE events ALTER COLUMN child_id SET DATA TYPE UUID USING (uuid_generate_v4());
    END IF;
END $$;

-- CHILD AUDIT LOG
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'child_audit_log') THEN
        ALTER TABLE child_audit_log ALTER COLUMN id DROP IDENTITY IF EXISTS;
        ALTER TABLE child_audit_log ALTER COLUMN id SET DATA TYPE UUID USING (uuid_generate_v4());
        ALTER TABLE child_audit_log ALTER COLUMN id SET DEFAULT uuid_generate_v4();
        ALTER TABLE child_audit_log ALTER COLUMN child_id SET DATA TYPE UUID USING (uuid_generate_v4());
    END IF;
END $$;


-- 4. RECREATE TRIGGER & FUNCTION (updated for UUID)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'child_audit_log') AND 
       EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'children') THEN
        
        CREATE OR REPLACE FUNCTION log_child_changes()
        RETURNS TRIGGER AS $$
        DECLARE
          tracked_fields TEXT[] := ARRAY['name', 'age', 'avatar', 'daily_goal_minutes'];
          field_name TEXT;
        BEGIN
          FOREACH field_name IN ARRAY tracked_fields LOOP
            IF OLD IS NULL THEN
              CASE field_name
                WHEN 'name' THEN
                  INSERT INTO child_audit_log (child_id, family_id, changed_by, field_name, old_value, new_value)
                  VALUES (NEW.id, NEW.family_id, NEW.created_by, field_name, NULL, NEW.name);
                WHEN 'age' THEN
                  INSERT INTO child_audit_log (child_id, family_id, changed_by, field_name, old_value, new_value)
                  VALUES (NEW.id, NEW.family_id, NEW.created_by, field_name, NULL, NEW.age::text);
                WHEN 'avatar' THEN
                  INSERT INTO child_audit_log (child_id, family_id, changed_by, field_name, old_value, new_value)
                  VALUES (NEW.id, NEW.family_id, NEW.created_by, field_name, NULL, NEW.avatar);
                WHEN 'daily_goal_minutes' THEN
                  INSERT INTO child_audit_log (child_id, family_id, changed_by, field_name, old_value, new_value)
                  VALUES (NEW.id, NEW.family_id, NEW.created_by, field_name, NULL, NEW.daily_goal_minutes::text);
              END CASE;
            ELSE
              CASE field_name
                WHEN 'name' THEN
                  IF OLD.name IS DISTINCT FROM NEW.name THEN
                    INSERT INTO child_audit_log (child_id, family_id, changed_by, field_name, old_value, new_value)
                    VALUES (NEW.id, NEW.family_id, NEW.updated_by, field_name, OLD.name, NEW.name);
                  END IF;
                WHEN 'age' THEN
                  IF OLD.age IS DISTINCT FROM NEW.age THEN
                    INSERT INTO child_audit_log (child_id, family_id, changed_by, field_name, old_value, new_value)
                    VALUES (NEW.id, NEW.family_id, NEW.updated_by, field_name, OLD.age::text, NEW.age::text);
                  END IF;
                WHEN 'avatar' THEN
                  IF OLD.avatar IS DISTINCT FROM NEW.avatar THEN
                    INSERT INTO child_audit_log (child_id, family_id, changed_by, field_name, old_value, new_value)
                    VALUES (NEW.id, NEW.family_id, NEW.updated_by, field_name, OLD.avatar, NEW.avatar);
                  END IF;
                WHEN 'daily_goal_minutes' THEN
                  IF OLD.daily_goal_minutes IS DISTINCT FROM NEW.daily_goal_minutes THEN
                    INSERT INTO child_audit_log (child_id, family_id, changed_by, field_name, old_value, new_value)
                    VALUES (NEW.id, NEW.family_id, NEW.updated_by, field_name, OLD.daily_goal_minutes::text, NEW.daily_goal_minutes::text);
                  END IF;
              END CASE;
            END IF;
          END LOOP;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        CREATE TRIGGER child_changes_trigger
        AFTER INSERT OR UPDATE ON children
        FOR EACH ROW
        EXECUTE FUNCTION log_child_changes();
    END IF;
END $$;


-- 5. RECREATE RELEVANT POLICIES

-- CHILDREN
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'children') THEN
        CREATE POLICY "Users can view family children" ON children FOR SELECT USING (family_id IN (SELECT DISTINCT family_id FROM memberships WHERE profile_id = auth.uid()));
        CREATE POLICY "Users can insert children to their family" ON children FOR INSERT WITH CHECK (family_id IN (SELECT DISTINCT family_id FROM memberships WHERE profile_id = auth.uid()));
        CREATE POLICY "Users can update family children" ON children FOR UPDATE USING (family_id IN (SELECT DISTINCT family_id FROM memberships WHERE profile_id = auth.uid()));
        CREATE POLICY "Users can delete family children" ON children FOR DELETE USING (family_id IN (SELECT DISTINCT family_id FROM memberships WHERE profile_id = auth.uid()));
    END IF;
END $$;

-- PROGRESS
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'progress') THEN
        CREATE POLICY "Users can view progress for their family children" ON progress FOR SELECT USING (child_id IN (SELECT id FROM children WHERE family_id IN (SELECT DISTINCT family_id FROM memberships WHERE profile_id = auth.uid())));
        CREATE POLICY "Users can insert progress for their family children" ON progress FOR INSERT WITH CHECK (child_id IN (SELECT id FROM children WHERE family_id IN (SELECT DISTINCT family_id FROM memberships WHERE profile_id = auth.uid())));
        CREATE POLICY "Users can update progress for their family children" ON progress FOR UPDATE USING (child_id IN (SELECT id FROM children WHERE family_id IN (SELECT DISTINCT family_id FROM memberships WHERE profile_id = auth.uid())));
    END IF;
END $$;

-- SESSIONS
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sessions') THEN
        CREATE POLICY "Users can view family sessions" ON sessions FOR SELECT USING (family_id IN (SELECT DISTINCT family_id FROM memberships WHERE profile_id = auth.uid()));
        CREATE POLICY "Users can insert family sessions" ON sessions FOR INSERT WITH CHECK (family_id IN (SELECT DISTINCT family_id FROM memberships WHERE profile_id = auth.uid()));
        CREATE POLICY "Users can update family sessions" ON sessions FOR UPDATE USING (family_id IN (SELECT DISTINCT family_id FROM memberships WHERE profile_id = auth.uid()));
    END IF;
END $$;

-- GARDEN STATE
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'garden_state') THEN
        CREATE POLICY "Users can view garden state for their family" ON garden_state FOR SELECT USING (child_id IN (SELECT id FROM children WHERE family_id IN (SELECT DISTINCT family_id FROM memberships WHERE profile_id = auth.uid())));
        CREATE POLICY "Users can update garden state for their family" ON garden_state FOR UPDATE USING (child_id IN (SELECT id FROM children WHERE family_id IN (SELECT DISTINCT family_id FROM memberships WHERE profile_id = auth.uid())));
        CREATE POLICY "Users can insert garden state for their family" ON garden_state FOR INSERT WITH CHECK (child_id IN (SELECT id FROM children WHERE family_id IN (SELECT DISTINCT family_id FROM memberships WHERE profile_id = auth.uid())));
    END IF;
END $$;

-- GRADE HISTORY
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'grade_history') THEN
        CREATE POLICY "Users can view grade history for their family" ON grade_history FOR SELECT USING (family_id IN (SELECT family_id FROM profiles WHERE id = auth.uid()));
        CREATE POLICY "Users can insert grade history for their family" ON grade_history FOR INSERT WITH CHECK (family_id IN (SELECT family_id FROM profiles WHERE id = auth.uid()));
    END IF;
END $$;

-- EVENTS
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'events') THEN
        CREATE POLICY "Users can view events in their family" ON events FOR SELECT USING (family_id IN (SELECT family_id FROM profiles WHERE id = auth.uid()));
        CREATE POLICY "Users can insert events for their family" ON events FOR INSERT WITH CHECK (family_id IN (SELECT family_id FROM profiles WHERE id = auth.uid()));
    END IF;
END $$;

-- AUDIT LOG
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'child_audit_log') THEN
        CREATE POLICY "Users can view audit log for their family children" ON child_audit_log FOR SELECT USING (family_id IN (SELECT family_id FROM memberships WHERE profile_id = auth.uid()));
        CREATE POLICY "Users can insert audit log for their family" ON child_audit_log FOR INSERT WITH CHECK (family_id IN (SELECT family_id FROM memberships WHERE profile_id = auth.uid()));
    END IF;
END $$;

COMMIT;
