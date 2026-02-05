-- Flyway Migration V1: Baseline Schema
-- =====================================
-- Creates the core tables for swim activity storage.

-- Swim Activity table (aggregate root)
CREATE TABLE swim_activity (
    id UUID PRIMARY KEY,
    source VARCHAR(16) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    pool_length_meters INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_source CHECK (source IN ('GARMIN', 'FORM', 'MERGED')),
    CONSTRAINT chk_pool_length CHECK (pool_length_meters > 0),
    CONSTRAINT chk_time_range CHECK (end_time > start_time)
);

-- Swim Length table (individual pool lengths)
CREATE TABLE swim_length (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES swim_activity(id) ON DELETE CASCADE,
    length_index INTEGER NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    distance_meters INTEGER NOT NULL,
    stroke_count INTEGER,
    stroke_rate INTEGER,
    
    CONSTRAINT chk_length_index CHECK (length_index >= 0),
    CONSTRAINT chk_length_distance CHECK (distance_meters > 0),
    CONSTRAINT chk_length_time_range CHECK (end_time > start_time),
    CONSTRAINT chk_stroke_count CHECK (stroke_count IS NULL OR stroke_count >= 0),
    CONSTRAINT chk_stroke_rate CHECK (stroke_rate IS NULL OR stroke_rate >= 0),
    CONSTRAINT uq_activity_length_index UNIQUE (activity_id, length_index)
);

-- Swim Lap table (grouped lengths)
CREATE TABLE swim_lap (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES swim_activity(id) ON DELETE CASCADE,
    lap_index INTEGER NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    distance_meters INTEGER NOT NULL,
    duration_millis BIGINT NOT NULL,
    confidence VARCHAR(16) NOT NULL,
    
    CONSTRAINT chk_lap_index CHECK (lap_index >= 0),
    CONSTRAINT chk_lap_distance CHECK (distance_meters > 0),
    CONSTRAINT chk_lap_duration CHECK (duration_millis > 0),
    CONSTRAINT chk_lap_time_range CHECK (end_time > start_time),
    CONSTRAINT chk_confidence CHECK (confidence IN ('HIGH', 'MEDIUM', 'LOW')),
    CONSTRAINT uq_activity_lap_index UNIQUE (activity_id, lap_index)
);

-- Lap-Length junction table
CREATE TABLE lap_length (
    lap_id UUID NOT NULL REFERENCES swim_lap(id) ON DELETE CASCADE,
    length_id UUID NOT NULL REFERENCES swim_length(id) ON DELETE CASCADE,
    
    PRIMARY KEY (lap_id, length_id)
);

-- Indexes for common queries
CREATE INDEX idx_activity_start_time ON swim_activity(start_time);
CREATE INDEX idx_activity_source ON swim_activity(source);
CREATE INDEX idx_length_activity ON swim_length(activity_id);
CREATE INDEX idx_lap_activity ON swim_lap(activity_id);

-- Comments
COMMENT ON TABLE swim_activity IS 'Swim activity sessions with merged data from FORM and Garmin devices';
COMMENT ON TABLE swim_length IS 'Individual pool lengths (atomic unit of swim tracking)';
COMMENT ON TABLE swim_lap IS 'Logical groupings of lengths (e.g., 100m intervals)';
COMMENT ON COLUMN swim_activity.source IS 'Data origin: GARMIN, FORM, or MERGED';
COMMENT ON COLUMN swim_lap.confidence IS 'Merge quality indicator: HIGH, MEDIUM, or LOW';
