-- Tabla de clics de WhatsApp por consignataria. El código
-- (/api/track/whatsapp, SmartWhatsAppCTA, WhatsAppFAB) ya inserta acá vía
-- service_role, pero la tabla nunca se había desplegado en este proyecto → cada
-- clic-lead se perdía en silencio (el error se tragaba con "table might not
-- exist yet"). RLS on, sin acceso anon (escrituras service_role, que bypassa RLS).
-- Aplicada como migración `whatsapp_clicks_table_2026_07_02`.
CREATE TABLE IF NOT EXISTS public.whatsapp_clicks (
  id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  consignataria_slug TEXT NOT NULL,
  source             TEXT DEFAULT 'profile',
  clicked_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_clicks_slug_date
  ON public.whatsapp_clicks (consignataria_slug, clicked_at DESC);

ALTER TABLE public.whatsapp_clicks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.whatsapp_clicks FROM anon, authenticated;
