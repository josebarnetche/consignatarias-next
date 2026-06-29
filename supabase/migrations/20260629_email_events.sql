-- Eventos de email de Resend (deliverability + aperturas/clicks).
-- Hasta ahora volábamos a ciegas: sin webhook, no sabíamos tasa de apertura,
-- click, bounce ni quejas. Esta tabla recibe los eventos del webhook de Resend
-- (/api/webhooks/resend) para poder medir el canal email — que es EL canal de la
-- estrategia (alertas, liquidación de arrendamiento, cierre mensual).
--
-- Append-only. Dedupe de reintentos del webhook vía processed_webhook_events
-- (source='resend', event_id=svix-id), igual que el webhook de Rebill.
CREATE TABLE IF NOT EXISTS email_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email_id TEXT,            -- id del email en Resend (para hilar sent→delivered→opened)
  type TEXT NOT NULL,       -- sent|delivered|delivery_delayed|opened|clicked|bounced|complained
  recipient TEXT,           -- destinatario (to)
  subject TEXT,             -- para bucketear por campaña mientras no taggeamos
  campaign TEXT,            -- de data.tags si está presente
  link TEXT,                -- para clicks
  bounce_type TEXT,         -- hard/soft en bounces
  occurred_at TIMESTAMPTZ,  -- timestamp del evento según Resend
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw JSONB
);

CREATE INDEX IF NOT EXISTS idx_email_events_type ON email_events(type);
CREATE INDEX IF NOT EXISTS idx_email_events_created ON email_events(created_at);
CREATE INDEX IF NOT EXISTS idx_email_events_campaign ON email_events(campaign);
CREATE INDEX IF NOT EXISTS idx_email_events_email_id ON email_events(email_id);

ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON email_events
  FOR ALL
  USING (auth.role() = 'service_role');
