-- Tabla de leads/consultas hacia una consignataria. La usa /api/leads (valida,
-- rate-limita por ip_hash+slug+día e inserta vía service_role). No estaba
-- desplegada en este proyecto → el form de contacto tiraba 500. Contiene PII
-- (name/phone/email/message): RLS on, sin acceso anon (todo pasa por el endpoint
-- con service_role, que bypassa RLS). Aplicada como `consignataria_leads_table_2026_07_02`.
CREATE TABLE IF NOT EXISTS public.consignataria_leads (
  id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  consignataria_slug TEXT NOT NULL,
  name               TEXT NOT NULL,
  phone              TEXT,
  email              TEXT,
  message            TEXT,
  source             TEXT DEFAULT 'profile',
  remate_id          INTEGER,
  status             TEXT DEFAULT 'new',
  ip_hash            TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cons_leads_slug_date
  ON public.consignataria_leads (consignataria_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cons_leads_ratelimit
  ON public.consignataria_leads (consignataria_slug, ip_hash, created_at DESC);

ALTER TABLE public.consignataria_leads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.consignataria_leads FROM anon, authenticated;
