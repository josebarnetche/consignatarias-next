-- Serie Novillitos 401/420 kg del MAG (haciinfo000307), diaria desde el 9/12/2005
-- (dato heredado de la era Liniers; el propio MAG la publica para contratos de
-- arrendamiento con la categoría vieja). Backfill: scripts/backfill-novillitos.mjs;
-- upkeep diario: /api/cron/scrape-mag-detailed.
-- Aplicada a prod el 2026-07-05 vía Supabase MCP.
CREATE TABLE IF NOT EXISTS public.mag_novillito_history (
  date date PRIMARY KEY,
  price_max numeric,
  price_min numeric,
  price_avg numeric,
  price_median numeric,
  head_count integer,
  total_kgs numeric,
  kg_per_head numeric,
  total_amount numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mag_novillito_history ENABLE ROW LEVEL SECURITY;

-- Dato público (misma política que mag_inmag_history): lectura abierta,
-- escritura solo service-role (sin policy de INSERT/UPDATE para anon/auth).
CREATE POLICY mag_novillito_history_public_read
  ON public.mag_novillito_history FOR SELECT USING (true);
