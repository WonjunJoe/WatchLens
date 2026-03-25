-- supabase/migrations/001_create_tables.sql

CREATE TABLE IF NOT EXISTS watch_records (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    video_id TEXT,
    video_title TEXT NOT NULL,
    channel_name TEXT,
    channel_url TEXT,
    watched_at TIMESTAMPTZ NOT NULL,
    is_shorts BOOLEAN DEFAULT false,
    source TEXT DEFAULT 'takeout',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS search_records (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    query TEXT NOT NULL,
    search_url TEXT,
    searched_at TIMESTAMPTZ NOT NULL,
    source TEXT DEFAULT 'takeout',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_watch_records_watched_at ON watch_records(watched_at);
CREATE INDEX IF NOT EXISTS idx_search_records_searched_at ON search_records(searched_at);
