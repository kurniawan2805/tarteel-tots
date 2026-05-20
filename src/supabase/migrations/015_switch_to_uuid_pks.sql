-- Migration: Switch primary keys to UUID for offline-first compatibility
-- This allows generating unique IDs on the client side without server roundtrips

-- 1. Create temporary tables or alter existing ones
-- Note: This is a destructive change for existing data in these tables.
-- In a production environment, we would use a more complex migration path.

BEGIN;

-- CHILDREN
ALTER TABLE children ALTER COLUMN id DROP IDENTITY IF EXISTS;
ALTER TABLE children ALTER COLUMN id SET DATA TYPE UUID USING (uuid_generate_v4());
ALTER TABLE children ALTER COLUMN id SET DEFAULT uuid_generate_v4();

-- Update references
ALTER TABLE progress ALTER COLUMN child_id SET DATA TYPE UUID USING (uuid_generate_v4());
ALTER TABLE sessions ALTER COLUMN child_id SET DATA TYPE UUID USING (uuid_generate_v4());
ALTER TABLE garden_state ALTER COLUMN child_id SET DATA TYPE UUID USING (uuid_generate_v4());
ALTER TABLE grade_history ALTER COLUMN child_id SET DATA TYPE UUID USING (uuid_generate_v4());

-- PROGRESS
ALTER TABLE progress ALTER COLUMN id DROP IDENTITY IF EXISTS;
ALTER TABLE progress ALTER COLUMN id SET DATA TYPE UUID USING (uuid_generate_v4());
ALTER TABLE progress ALTER COLUMN id SET DEFAULT uuid_generate_v4();
ALTER TABLE grade_history ALTER COLUMN progress_id SET DATA TYPE UUID USING (uuid_generate_v4());

-- SESSIONS
ALTER TABLE sessions ALTER COLUMN id DROP IDENTITY IF EXISTS;
ALTER TABLE sessions ALTER COLUMN id SET DATA TYPE UUID USING (uuid_generate_v4());
ALTER TABLE sessions ALTER COLUMN id SET DEFAULT uuid_generate_v4();

-- GRADE HISTORY
ALTER TABLE grade_history ALTER COLUMN id DROP IDENTITY IF EXISTS;
ALTER TABLE grade_history ALTER COLUMN id SET DATA TYPE UUID USING (uuid_generate_v4());
ALTER TABLE grade_history ALTER COLUMN id SET DEFAULT uuid_generate_v4();

COMMIT;
