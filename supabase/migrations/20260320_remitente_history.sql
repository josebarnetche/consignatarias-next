-- Historical Remitente Entries for Supply Chain Analytics
-- Required for BATTLE #6 Sprint 3: Patterns page with heatmaps, trends, historical analysis
-- 
-- Data source: MAG haciinfo000006 (scraped daily)
-- Purpose: Track remitente movements over time to enable:
--   - Origin heatmaps by localidad
--   - Top historical establishments per consignataria  
--   - Volume trends over time
--   - Seasonal patterns analysis

-- ============================================================
-- REMITENTE ENTRIES TABLE (Historical)
-- ============================================================

CREATE TABLE IF NOT EXISTS remitente_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core identifiers
  consignataria_slug TEXT NOT NULL REFERENCES consignatarias(slug) ON DELETE CASCADE,
  mag_id TEXT, -- MAG consignatario ID (e.g., "538" for SVB)
  
  -- Remitente data
  remitente TEXT NOT NULL, -- Establishment/producer name
  localidad TEXT, -- City/district
  provincia TEXT, -- Province code (BUE, CBA, SFE, etc.)
  cabezas INTEGER NOT NULL DEFAULT 0, -- Head count
  categorias JSONB, -- Breakdown by category if available
  
  -- Date tracking
  remate_date DATE NOT NULL, -- Date of the auction/entry
  scrape_date DATE NOT NULL DEFAULT CURRENT_DATE, -- When we captured this
  period_start DATE, -- MAG report period start
  period_end DATE, -- MAG report period end
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Prevent duplicate entries for same remitente on same date
  CONSTRAINT unique_remitente_entry UNIQUE (consignataria_slug, remitente, localidad, remate_date)
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Fast lookups by consignataria (most common query)
CREATE INDEX idx_remitente_entries_consig 
  ON remitente_entries(consignataria_slug);

-- Date-based queries for trends
CREATE INDEX idx_remitente_entries_date 
  ON remitente_entries(remate_date DESC);

-- Locality-based queries for heatmaps
CREATE INDEX idx_remitente_entries_localidad 
  ON remitente_entries(localidad);

-- Province aggregations
CREATE INDEX idx_remitente_entries_provincia 
  ON remitente_entries(provincia);

-- Compound index for common pattern queries
CREATE INDEX idx_remitente_entries_consig_date 
  ON remitente_entries(consignataria_slug, remate_date DESC);

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE remitente_entries ENABLE ROW LEVEL SECURITY;

-- Public read access (this data is already public from MAG)
CREATE POLICY "remitente_entries_public_read" 
  ON remitente_entries FOR SELECT 
  USING (true);

-- Only authenticated service role can insert (scraper)
CREATE POLICY "remitente_entries_service_insert" 
  ON remitente_entries FOR INSERT 
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Get top localidades for a consignataria over a time period
CREATE OR REPLACE FUNCTION get_top_localidades(
  p_consig_slug TEXT,
  p_limit INTEGER DEFAULT 10,
  p_days INTEGER DEFAULT 90
)
RETURNS TABLE (
  localidad TEXT,
  provincia TEXT,
  total_cabezas BIGINT,
  entry_count BIGINT
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.localidad,
    r.provincia,
    SUM(r.cabezas)::BIGINT as total_cabezas,
    COUNT(*)::BIGINT as entry_count
  FROM remitente_entries r
  WHERE r.consignataria_slug = p_consig_slug
    AND r.remate_date >= CURRENT_DATE - (p_days || ' days')::INTERVAL
  GROUP BY r.localidad, r.provincia
  ORDER BY SUM(r.cabezas) DESC
  LIMIT p_limit;
END;
$$;

-- Get top remitentes (establishments) for a consignataria
CREATE OR REPLACE FUNCTION get_top_remitentes(
  p_consig_slug TEXT,
  p_limit INTEGER DEFAULT 10,
  p_days INTEGER DEFAULT 90
)
RETURNS TABLE (
  remitente TEXT,
  localidad TEXT,
  provincia TEXT,
  total_cabezas BIGINT,
  entry_count BIGINT,
  last_entry DATE
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.remitente,
    r.localidad,
    r.provincia,
    SUM(r.cabezas)::BIGINT as total_cabezas,
    COUNT(*)::BIGINT as entry_count,
    MAX(r.remate_date) as last_entry
  FROM remitente_entries r
  WHERE r.consignataria_slug = p_consig_slug
    AND r.remate_date >= CURRENT_DATE - (p_days || ' days')::INTERVAL
  GROUP BY r.remitente, r.localidad, r.provincia
  ORDER BY SUM(r.cabezas) DESC
  LIMIT p_limit;
END;
$$;

-- Get volume trends over time for a consignataria
CREATE OR REPLACE FUNCTION get_volume_trends(
  p_consig_slug TEXT,
  p_days INTEGER DEFAULT 90
)
RETURNS TABLE (
  week_start DATE,
  total_cabezas BIGINT,
  unique_remitentes BIGINT,
  unique_localidades BIGINT
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE_TRUNC('week', r.remate_date)::DATE as week_start,
    SUM(r.cabezas)::BIGINT as total_cabezas,
    COUNT(DISTINCT r.remitente)::BIGINT as unique_remitentes,
    COUNT(DISTINCT r.localidad)::BIGINT as unique_localidades
  FROM remitente_entries r
  WHERE r.consignataria_slug = p_consig_slug
    AND r.remate_date >= CURRENT_DATE - (p_days || ' days')::INTERVAL
  GROUP BY DATE_TRUNC('week', r.remate_date)
  ORDER BY week_start DESC;
END;
$$;

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON TABLE remitente_entries IS 'Historical remitente (producer) entry data from MAG for supply chain analytics';
COMMENT ON COLUMN remitente_entries.remitente IS 'Name of the establishment/producer who sent livestock';
COMMENT ON COLUMN remitente_entries.localidad IS 'City/district where the establishment is located';
COMMENT ON COLUMN remitente_entries.provincia IS 'Province code (BUE, CBA, SFE, etc.)';
COMMENT ON COLUMN remitente_entries.cabezas IS 'Number of head of cattle in this entry';
