-- Dólar OFICIAL histórico diario (venta), para servir series largas en USD.
-- Fuentes: BCRA estadisticascambiarias (2006-2010, tipoCotizacion A3500) +
-- ArgentinaDatos (2011→hoy) + dolarapi (upkeep diario en scrape-mag-detailed).
-- Aplicada a prod el 2026-07-05 vía Supabase MCP.
CREATE TABLE IF NOT EXISTS public.usd_oficial_history (
  date date PRIMARY KEY,
  venta numeric NOT NULL,
  compra numeric,
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.usd_oficial_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY usd_oficial_history_public_read
  ON public.usd_oficial_history FOR SELECT USING (true);
