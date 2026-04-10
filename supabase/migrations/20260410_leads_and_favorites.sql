-- =================================================================
-- LEADS CAPTURE SYSTEM
-- Enables "Capturar leads" before WhatsApp contact
-- =================================================================

CREATE TABLE IF NOT EXISTS consignataria_leads (
  id BIGSERIAL PRIMARY KEY,
  consignataria_slug TEXT NOT NULL,
  
  -- Lead info
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  message TEXT,
  
  -- Context
  source TEXT DEFAULT 'profile', -- 'profile', 'go_landing', 'remate'
  remate_id INTEGER, -- If inquiry is about specific remate
  
  -- Status
  status TEXT DEFAULT 'new', -- 'new', 'contacted', 'converted', 'archived'
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  contacted_at TIMESTAMPTZ,
  
  -- Prevent spam
  ip_hash TEXT -- Hashed IP for rate limiting
);

-- Indexes
CREATE INDEX idx_leads_slug_date ON consignataria_leads(consignataria_slug, created_at DESC);
CREATE INDEX idx_leads_status ON consignataria_leads(consignataria_slug, status);

-- =================================================================
-- REMATE FAVORITES (Demand Signals)
-- Track when users save/favorite remates
-- =================================================================

CREATE TABLE IF NOT EXISTS remate_favorites (
  id BIGSERIAL PRIMARY KEY,
  remate_id INTEGER NOT NULL, -- From remates.json id
  consignataria_slug TEXT NOT NULL,
  
  -- User identification (anonymous or logged in)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT, -- For anonymous users
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint: one favorite per user/session per remate
  UNIQUE(remate_id, user_id),
  UNIQUE(remate_id, session_id)
);

-- Index for dashboard queries
CREATE INDEX idx_favorites_slug ON remate_favorites(consignataria_slug, created_at DESC);
CREATE INDEX idx_favorites_remate ON remate_favorites(remate_id);

-- =================================================================
-- HELPER FUNCTIONS
-- =================================================================

-- Get lead count for dashboard
CREATE OR REPLACE FUNCTION get_lead_count(p_slug TEXT, p_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER 
  FROM consignataria_leads 
  WHERE consignataria_slug = p_slug 
    AND created_at >= NOW() - (p_days || ' days')::INTERVAL;
$$ LANGUAGE SQL STABLE;

-- Get favorite count for a remate (social proof)
CREATE OR REPLACE FUNCTION get_remate_watchers(p_remate_id INTEGER)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER 
  FROM remate_favorites 
  WHERE remate_id = p_remate_id;
$$ LANGUAGE SQL STABLE;

-- =================================================================
-- PERMISSIONS
-- =================================================================

-- Leads: service role can do everything, anon can insert
GRANT SELECT, INSERT, UPDATE ON consignataria_leads TO service_role;
GRANT INSERT ON consignataria_leads TO anon;
GRANT USAGE, SELECT ON SEQUENCE consignataria_leads_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE consignataria_leads_id_seq TO anon;

-- Favorites: authenticated users can manage their own
GRANT SELECT, INSERT, DELETE ON remate_favorites TO authenticated;
GRANT SELECT, INSERT ON remate_favorites TO anon;
GRANT USAGE, SELECT ON SEQUENCE remate_favorites_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE remate_favorites_id_seq TO anon;

-- RLS for favorites
ALTER TABLE remate_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all favorites" ON remate_favorites
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own favorites" ON remate_favorites
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    (user_id IS NULL AND session_id IS NOT NULL)
  );

CREATE POLICY "Users can delete own favorites" ON remate_favorites
  FOR DELETE USING (
    auth.uid() = user_id OR 
    (user_id IS NULL AND session_id IS NOT NULL)
  );
