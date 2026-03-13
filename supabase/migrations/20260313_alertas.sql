-- Migration: Create alertas tables for persistent webhook subscriptions
-- Date: 2026-03-13
-- Author: JARVIS

-- Alertas table: stores user alert subscriptions
CREATE TABLE IF NOT EXISTS alertas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  api_key TEXT NOT NULL,
  name TEXT NOT NULL,
  webhook_url TEXT NOT NULL,
  filters JSONB DEFAULT '{}',
  events TEXT[] DEFAULT ARRAY['remate.created'],
  frequency TEXT DEFAULT 'immediate' CHECK (frequency IN ('immediate', 'daily_digest', 'weekly_digest')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  triggers_count INT DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alerta logs table: tracks webhook delivery attempts
CREATE TABLE IF NOT EXISTS alerta_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alerta_id UUID REFERENCES alertas(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  payload JSONB,
  delivered_at TIMESTAMPTZ,
  response_code INT,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_alertas_status ON alertas(status);
CREATE INDEX IF NOT EXISTS idx_alertas_user_id ON alertas(user_id);
CREATE INDEX IF NOT EXISTS idx_alertas_api_key ON alertas(api_key);
CREATE INDEX IF NOT EXISTS idx_alertas_frequency ON alertas(frequency) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_alerta_logs_alerta_id ON alerta_logs(alerta_id);
CREATE INDEX IF NOT EXISTS idx_alerta_logs_created_at ON alerta_logs(created_at);

-- Add api_key column to users table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'api_key'
  ) THEN
    ALTER TABLE users ADD COLUMN api_key TEXT UNIQUE;
    CREATE INDEX idx_users_api_key ON users(api_key) WHERE api_key IS NOT NULL;
  END IF;
END $$;

-- RLS policies (optional, for direct client access in future)
ALTER TABLE alertas ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerta_logs ENABLE ROW LEVEL SECURITY;

-- Service role bypass (API routes use service_role key)
CREATE POLICY "Service role has full access to alertas" ON alertas
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access to alerta_logs" ON alerta_logs
  FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE alertas IS 'Persistent alert subscriptions for webhook notifications';
COMMENT ON TABLE alerta_logs IS 'Delivery logs for alert webhook notifications';
COMMENT ON COLUMN alertas.filters IS 'JSON filters: provincia, consignataria, tipo, categoria, precio_min, precio_max, keywords';
COMMENT ON COLUMN alertas.events IS 'Array of event types: remate.created, remate.updated, remate.cancelled, remate.starting_soon, remate.live, price.update';
COMMENT ON COLUMN alertas.frequency IS 'Delivery frequency: immediate, daily_digest, weekly_digest';
