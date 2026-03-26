-- supabase/migrations/002_video_metadata.sql

CREATE TABLE IF NOT EXISTS video_metadata (
    video_id TEXT PRIMARY KEY,
    title TEXT,
    channel_id TEXT,
    category_id INT,
    category_name TEXT,
    tags TEXT[],
    default_language TEXT,
    duration_seconds INT,
    view_count BIGINT,
    like_count BIGINT,
    comment_count BIGINT,
    published_at TIMESTAMPTZ,
    fetched_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_video_metadata_category_id ON video_metadata(category_id);

ALTER TABLE watch_records DROP COLUMN IF EXISTS source;
ALTER TABLE search_records DROP COLUMN IF EXISTS source;
