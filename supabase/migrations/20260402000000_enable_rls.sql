-- Enable RLS on all user-data tables
ALTER TABLE watch_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE youtube_dashboard_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_dashboard_results ENABLE ROW LEVEL SECURITY;

-- watch_records: user_id is TEXT, auth.uid() is UUID → cast
CREATE POLICY "Users access own watch_records" ON watch_records
  FOR ALL USING (user_id = auth.uid()::text);

CREATE POLICY "Users access own search_records" ON search_records
  FOR ALL USING (user_id = auth.uid()::text);

-- dashboard results: user_id is UUID
CREATE POLICY "Users access own youtube_results" ON youtube_dashboard_results
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users access own instagram_results" ON instagram_dashboard_results
  FOR ALL USING (user_id = auth.uid());
