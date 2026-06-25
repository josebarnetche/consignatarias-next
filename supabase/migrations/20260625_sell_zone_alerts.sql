-- Sell-zone alerts (FASE 1 del motor de alertas personalizadas).
-- Un productor deja su email + categoría y recibe un mail SOLO cuando esa
-- categoría entra en "zona de venta" (percentil alto en dólares reales), no por
-- cada tick. Es la palanca de retención validada (patrón Bushel/DTN: avisar
-- sobre TU posición, no publicar un feed genérico).
--
-- Single opt-in, contacto consentido (lo deja el propio usuario en el sitio).
-- El dedupe vive en la propia fila (last_sent_zone + last_sent_at): no re-mandamos
-- la misma zona dos veces, ni más de una vez por ventana.
CREATE TABLE IF NOT EXISTS sell_zone_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  categoria TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed')),
  source TEXT DEFAULT 'vender-ahora',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Estado de envío para dedupe: qué zona avisamos por última vez y cuándo.
  last_sent_at TIMESTAMPTZ,
  last_sent_zone TEXT,
  UNIQUE (email, categoria)
);

CREATE INDEX IF NOT EXISTS idx_sell_zone_alerts_active
  ON sell_zone_alerts(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_sell_zone_alerts_email
  ON sell_zone_alerts(email);

ALTER TABLE sell_zone_alerts ENABLE ROW LEVEL SECURITY;

-- Solo service-role: la captura y el envío corren server-side. Sin acceso público.
CREATE POLICY "Service role full access" ON sell_zone_alerts
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION update_sell_zone_alerts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sell_zone_alerts_updated_at
  BEFORE UPDATE ON sell_zone_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_sell_zone_alerts_updated_at();
