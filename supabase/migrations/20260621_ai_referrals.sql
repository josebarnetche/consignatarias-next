-- AI-referral attribution: dato propio y unificado del tráfico que llega desde motores
-- de IA (ChatGPT, Perplexity, Copilot, Claude, Gemini, etc.). GA4 fragmenta este tráfico
-- en Referral/Unassigned/AI-Assistant y no lo expone por engine vía Data API (los params
-- del evento ai_referral no están como custom dimensions). Esta tabla lo hace queryable
-- y atribuible: es la métrica de la tesis de citabilidad (¿somos la fuente que la IA cita?).

CREATE TABLE IF NOT EXISTS ai_referrals (
  id BIGSERIAL PRIMARY KEY,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  engine       TEXT NOT NULL,                 -- 'chatgpt' | 'perplexity' | 'copilot' | 'gemini' | 'claude' | 'grok' | 'deepseek' | ...
  landing_page TEXT,                          -- path de aterrizaje (la página que la IA citó)
  referrer     TEXT,                          -- document.referrer crudo (host), para auditar
  utm_source   TEXT,                          -- si vino tageado (?utm_source=chatgpt.com)
  detected_via TEXT DEFAULT 'referrer',       -- 'referrer' | 'utm'
  path         TEXT                            -- path completo con query al detectar
);

-- Consulta típica del dashboard: por engine y por día en los últimos N días
CREATE INDEX IF NOT EXISTS idx_ai_referrals_created  ON ai_referrals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_referrals_engine   ON ai_referrals(engine, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_referrals_landing  ON ai_referrals(landing_page, created_at DESC);

GRANT INSERT ON ai_referrals TO service_role;
GRANT SELECT ON ai_referrals TO service_role;
GRANT USAGE, SELECT ON SEQUENCE ai_referrals_id_seq TO service_role;

-- RLS on: solo service_role escribe (vía el beacon /api/track/ai-referral). Sin policies
-- para anon/authenticated = sin acceso directo desde el cliente.
ALTER TABLE ai_referrals ENABLE ROW LEVEL SECURITY;
