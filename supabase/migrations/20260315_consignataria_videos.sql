-- v1.7.0 Video Catalogs Migration
-- Created: 2026-03-15 by JARVIS
-- Purpose: Store YouTube video metadata for consignataria profiles

-- Video catalog table
CREATE TABLE IF NOT EXISTS consignataria_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consignataria_id UUID NOT NULL REFERENCES consignatarias(id) ON DELETE CASCADE,
  youtube_video_id VARCHAR(11) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  remate_id INTEGER REFERENCES remates(id) ON DELETE SET NULL,
  video_type VARCHAR(20) DEFAULT 'remate' CHECK (video_type IN ('remate', 'lote', 'institucional', 'tour')),
  published_at TIMESTAMP WITH TIME ZONE,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_featured BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  
  UNIQUE(consignataria_id, youtube_video_id)
);

-- Index for profile video galleries (featured first, then by date)
CREATE INDEX IF NOT EXISTS idx_videos_consignataria 
  ON consignataria_videos(consignataria_id, is_featured DESC, published_at DESC);

-- Index for auction video lookup
CREATE INDEX IF NOT EXISTS idx_videos_remate 
  ON consignataria_videos(remate_id) 
  WHERE remate_id IS NOT NULL;

-- Enable RLS
ALTER TABLE consignataria_videos ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Videos are viewable by everyone"
  ON consignataria_videos FOR SELECT
  USING (true);

-- Consignataria owners can manage their videos
CREATE POLICY "Consignataria owners can insert videos"
  ON consignataria_videos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM consignatarias c
      WHERE c.id = consignataria_id
      AND c.claimed_by = auth.uid()
    )
  );

CREATE POLICY "Consignataria owners can update videos"
  ON consignataria_videos FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM consignatarias c
      WHERE c.id = consignataria_id
      AND c.claimed_by = auth.uid()
    )
  );

CREATE POLICY "Consignataria owners can delete videos"
  ON consignataria_videos FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM consignatarias c
      WHERE c.id = consignataria_id
      AND c.claimed_by = auth.uid()
    )
  );

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_consignataria_videos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_consignataria_videos_updated_at
  BEFORE UPDATE ON consignataria_videos
  FOR EACH ROW
  EXECUTE FUNCTION update_consignataria_videos_updated_at();

-- Comment
COMMENT ON TABLE consignataria_videos IS 'YouTube video metadata for consignataria profiles (v1.7.0)';
