-- EVENT SOURCING FOR MULTI-USER SYNC

CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY, -- Client-generated UUID
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    child_id BIGINT REFERENCES children(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'GRADED_CHUNK', 'SETTING_CHANGED', etc.
    payload JSONB NOT NULL,
    client_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexing for performance
CREATE INDEX idx_events_family_id ON events(family_id);
CREATE INDEX idx_events_child_id ON events(child_id);
CREATE INDEX idx_events_type ON events(type);

-- RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view events in their family" 
ON events FOR SELECT 
USING (family_id IN (SELECT family_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert events for their family" 
ON events FOR INSERT 
WITH CHECK (family_id IN (SELECT family_id FROM profiles WHERE id = auth.uid()));
