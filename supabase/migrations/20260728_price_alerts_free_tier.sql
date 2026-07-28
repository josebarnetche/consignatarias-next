-- Free tier de alertas vía MCP: crear_alerta_precio deja de requerir API key.
-- Para poder limitar por origen (3 activas por IP sin key), guardamos la IP de
-- creación. Solo se setea en alertas source='api' creadas sin key; las alertas
-- con key o web siguen igual.
ALTER TABLE public.price_alerts ADD COLUMN IF NOT EXISTS origin_ip text;
CREATE INDEX IF NOT EXISTS idx_price_alerts_origin_ip
  ON public.price_alerts (origin_ip) WHERE origin_ip IS NOT NULL AND status = 'active';
