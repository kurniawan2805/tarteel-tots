-- Conflict resolution metadata
-- Tracks when multiple parents grade same Ayah concurrently

ALTER TABLE grade_history ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;
ALTER TABLE grade_history ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE grade_history ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE grade_history ADD COLUMN IF NOT EXISTS conflict_count INT DEFAULT 1;

-- Index for finding conflicts (same progress_id with multiple grades in short time window)
CREATE INDEX IF NOT EXISTS idx_grade_history_progress_timestamp ON grade_history(progress_id, graded_at);

-- Mark the latest/active grade as is_active = true
UPDATE grade_history SET is_active = true
WHERE id IN (
  SELECT id FROM grade_history gh1
  WHERE graded_at = (
    SELECT MAX(graded_at) FROM grade_history gh2 WHERE gh2.progress_id = gh1.progress_id
  )
);

-- Function to detect and mark conflicts
CREATE OR REPLACE FUNCTION detect_grade_conflicts()
RETURNS TRIGGER AS $$
DECLARE
  conflict_count INT;
  conflict_window INTERVAL := '30 seconds'::INTERVAL;
BEGIN
  -- Count different grades for this progress in last 30 seconds
  SELECT COUNT(DISTINCT grade) INTO conflict_count
  FROM grade_history
  WHERE progress_id = NEW.progress_id
    AND graded_at >= (NEW.graded_at - conflict_window)
    AND graded_at <= (NEW.graded_at + conflict_window);
  
  -- Update conflict_count
  UPDATE grade_history SET conflict_count = conflict_count
  WHERE progress_id = NEW.progress_id
    AND graded_at >= (NEW.graded_at - conflict_window)
    AND graded_at <= (NEW.graded_at + conflict_window);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to detect conflicts on insert
CREATE TRIGGER detect_conflicts_trigger
AFTER INSERT ON grade_history
FOR EACH ROW
EXECUTE FUNCTION detect_grade_conflicts();
