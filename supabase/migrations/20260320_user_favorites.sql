-- User favorites (watchlist)
-- Lock-in: User-curated data, forces registration, enables notifications
CREATE TABLE user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  consignataria_slug TEXT NOT NULL,
  notify_new_remate BOOLEAN DEFAULT false,
  notify_catalog BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, consignataria_slug)
);

-- RLS: Users can only manage their own favorites
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own favorites" ON user_favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorites" ON user_favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own favorites" ON user_favorites
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites" ON user_favorites
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes for fast lookups
CREATE INDEX idx_user_favorites_user ON user_favorites(user_id);
CREATE INDEX idx_user_favorites_slug ON user_favorites(consignataria_slug);

-- Aggregated follower counts (for consignatarias to see their audience)
CREATE VIEW consignataria_followers AS
SELECT 
  consignataria_slug,
  COUNT(*) as follower_count
FROM user_favorites
GROUP BY consignataria_slug;

COMMENT ON TABLE user_favorites IS 'User favorites/watchlist for consignatarias - core lock-in mechanism';
