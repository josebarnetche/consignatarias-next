-- Dedup de los emails de onboarding (dte_upload_reminder / first_dte_success /
-- dte_retention_reminder). Antes se trackeaba en outreach_log (de outreach a
-- consignatarias: exige consignataria_slug NOT NULL, sin user_id) → fallaba.
-- Aplicada como onboarding_email_log_2026_07_03.
CREATE TABLE IF NOT EXISTS public.onboarding_email_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL,
  email_type text NOT NULL,
  email_sent_to text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_onboarding_email_log_user_type ON public.onboarding_email_log (user_id, email_type);
CREATE INDEX IF NOT EXISTS idx_onboarding_email_log_type_created ON public.onboarding_email_log (email_type, created_at DESC);
ALTER TABLE public.onboarding_email_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.onboarding_email_log FROM anon, authenticated;
