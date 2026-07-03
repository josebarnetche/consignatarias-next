-- Reconciliación repo↔prod (Proyecto C): sell_zone_alerts + webhooks (drift).
-- Ambas service-role-only. Aplicada como reconcile_sellzone_webhooks_2026_07_03.
CREATE TABLE IF NOT EXISTS public.sell_zone_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL, categoria TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','unsubscribed')),
  source TEXT DEFAULT 'vender-ahora',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_sent_at TIMESTAMPTZ, last_sent_zone TEXT, UNIQUE (email, categoria)
);
CREATE INDEX IF NOT EXISTS idx_sell_zone_alerts_active ON public.sell_zone_alerts(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_sell_zone_alerts_email ON public.sell_zone_alerts(email);
ALTER TABLE public.sell_zone_alerts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sell_zone_alerts FROM anon, authenticated;
DROP POLICY IF EXISTS "Service role full access" ON public.sell_zone_alerts;
CREATE POLICY sell_zone_alerts_service_only ON public.sell_zone_alerts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE OR REPLACE FUNCTION public.update_sell_zone_alerts_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS sell_zone_alerts_updated_at ON public.sell_zone_alerts;
CREATE TRIGGER sell_zone_alerts_updated_at BEFORE UPDATE ON public.sell_zone_alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_sell_zone_alerts_updated_at();
CREATE TABLE IF NOT EXISTS public.webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), url TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}', secret TEXT NOT NULL, filters JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(), active BOOLEAN DEFAULT TRUE,
  owner_email TEXT, description TEXT, last_triggered_at TIMESTAMPTZ,
  total_deliveries INTEGER DEFAULT 0, failed_deliveries INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON public.webhooks (active) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_webhooks_events ON public.webhooks USING GIN (events);
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.webhooks FROM anon, authenticated;
