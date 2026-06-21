-- Sistema interno de conteo de EVENTOS DE VALOR.
-- Captura propia, unificada y queryable de las acciones con valor atribuible del journey
-- (recurrencia, lead, engagement, funnel, conversión, descubrimiento AI, B2B). GA4 fragmenta
-- y no expone esto por engine/entidad; esta tabla sí. La taxonomía + pesos viven en
-- src/lib/value-events.ts (fuente de verdad). El beacon /api/track/event deriva el peso de
-- ahí y NO confía en el cliente.

CREATE TABLE IF NOT EXISTS value_events (
  id          BIGSERIAL PRIMARY KEY,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event       TEXT NOT NULL,            -- 'calendar_subscribe' | 'contact_whatsapp' | ...
  weight      SMALLINT NOT NULL DEFAULT 1, -- proximidad a la plata (del registro server-side)
  entity_type TEXT,                     -- 'consignataria' | 'frigorifico' | 'categoria' | 'remate' | 'global'
  entity_slug TEXT,
  source      TEXT,                     -- 'ai' | 'organic' | 'direct' | 'referral' | 'social' | 'unknown'
  ai_engine   TEXT,                     -- 'chatgpt' | 'perplexity' | ... | NULL
  path        TEXT,
  session_id  TEXT,
  meta        JSONB
);

CREATE INDEX IF NOT EXISTS idx_value_events_created ON value_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_value_events_event   ON value_events(event, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_value_events_entity  ON value_events(entity_type, entity_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_value_events_source  ON value_events(source, created_at DESC);

GRANT INSERT, SELECT ON value_events TO service_role;
GRANT USAGE, SELECT ON SEQUENCE value_events_id_seq TO service_role;
ALTER TABLE value_events ENABLE ROW LEVEL SECURITY;

-- Índice de valor diario ponderado, por evento / fuente / engine (en hora argentina).
CREATE OR REPLACE VIEW value_events_daily AS
SELECT
  (created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date AS day,
  event,
  COALESCE(source, 'unknown') AS source,
  ai_engine,
  count(*)    AS n,
  sum(weight) AS value
FROM value_events
GROUP BY 1, 2, 3, 4;

-- Top entidades por valor capturado (qué consignatarias/categorías generan más valor).
CREATE OR REPLACE VIEW value_events_by_entity AS
SELECT
  entity_type,
  entity_slug,
  count(*)    AS events,
  sum(weight) AS value
FROM value_events
WHERE entity_slug IS NOT NULL
GROUP BY 1, 2;

GRANT SELECT ON value_events_daily, value_events_by_entity TO service_role;
