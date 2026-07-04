-- Motor de alertas de precio por UMBRAL ("avisame cuando el X cruce $Y"). Dos
-- puertas: captura email (humano) + API/webhook (agentes IA). El cron price-alerts
-- detecta el CRUCE (last_value del otro lado → ahora cruzado) y dispara una vez.
-- Aplicada como price_alerts_2026_07_03.
CREATE TABLE IF NOT EXISTS public.price_alerts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email text,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  webhook_url text,
  category text NOT NULL,
  threshold numeric NOT NULL CHECK (threshold > 0),
  direction text NOT NULL DEFAULT 'above' CHECK (direction IN ('above','below')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','fired','unsubscribed')),
  last_value numeric,
  last_fired_at timestamptz,
  source text NOT NULL DEFAULT 'web' CHECK (source IN ('web','api')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT price_alerts_has_target CHECK (email IS NOT NULL OR user_id IS NOT NULL OR webhook_url IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_price_alerts_active ON public.price_alerts (category, status) WHERE status = 'active';
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.price_alerts FROM anon, authenticated;
CREATE OR REPLACE FUNCTION public.update_price_alerts_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS price_alerts_updated_at ON public.price_alerts;
CREATE TRIGGER price_alerts_updated_at BEFORE UPDATE ON public.price_alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_price_alerts_updated_at();
