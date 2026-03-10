-- Subscriptions table for Rebill integration
-- Applied via Supabase MCP on 2026-03-10

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('consignataria', 'frigorifico')),
  entity_slug TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  rebill_subscription_id TEXT,
  rebill_customer_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','past_due','cancelled')),
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sub_entity ON subscriptions(entity_type, entity_slug);
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read subscriptions" ON subscriptions FOR SELECT USING (true);

CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
