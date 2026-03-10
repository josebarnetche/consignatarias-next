-- Profile views analytics table
-- Applied via Supabase MCP on 2026-03-10

CREATE TABLE IF NOT EXISTS profile_views (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_slug TEXT NOT NULL,
  viewed_at TIMESTAMPTZ DEFAULT now(),
  referrer TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_views_slug ON profile_views(entity_slug, viewed_at);
ALTER TABLE profile_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert views" ON profile_views FOR INSERT WITH CHECK (true);
