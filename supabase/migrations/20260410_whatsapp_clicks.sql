-- WhatsApp click tracking for dashboard analytics
-- Enables "X clics en WhatsApp" metric for consignatarias

CREATE TABLE IF NOT EXISTS whatsapp_clicks (
  id BIGSERIAL PRIMARY KEY,
  consignataria_slug TEXT NOT NULL,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT DEFAULT 'profile' -- 'profile', 'go_landing', 'fab', 'remate'
);

-- Index for efficient dashboard queries (last 30 days by slug)
CREATE INDEX idx_whatsapp_clicks_slug_date 
  ON whatsapp_clicks(consignataria_slug, clicked_at DESC);

-- RPC function to increment click (atomic, handles high concurrency)
CREATE OR REPLACE FUNCTION increment_whatsapp_click(
  p_slug TEXT,
  p_date TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO whatsapp_clicks (consignataria_slug, clicked_at)
  VALUES (p_slug, COALESCE(p_date::TIMESTAMPTZ, NOW()));
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT, INSERT ON whatsapp_clicks TO authenticated;
GRANT SELECT, INSERT ON whatsapp_clicks TO service_role;
GRANT USAGE, SELECT ON SEQUENCE whatsapp_clicks_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE whatsapp_clicks_id_seq TO service_role;
