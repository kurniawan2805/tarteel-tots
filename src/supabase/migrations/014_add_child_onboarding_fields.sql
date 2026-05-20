-- Migration: Add missing onboarding columns to children table
-- These are needed for the personalized learning paths set during onboarding

ALTER TABLE children ADD COLUMN IF NOT EXISTS learning_path TEXT DEFAULT 'juz_amma';
ALTER TABLE children ADD COLUMN IF NOT EXISTS direction TEXT DEFAULT 'backwards';
ALTER TABLE children ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing records to have defaults
UPDATE children SET learning_path = 'juz_amma' WHERE learning_path IS NULL;
UPDATE children SET direction = 'backwards' WHERE direction IS NULL;
