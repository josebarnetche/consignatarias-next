-- ============================================================
-- api_keys + api_usage_daily — Enterprise API auth + quota
-- ============================================================
-- Already executed in Supabase Studio on 2026-05-12.
-- Persisted here as part of the migration tree.

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  prefix TEXT NOT NULL UNIQUE,
  hash TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT 'live'
    CHECK (environment IN ('live','test')),
  allowed_ips INET[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id
  ON api_keys(user_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix_active
  ON api_keys(prefix) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS api_usage_daily (
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (api_key_id, date)
);

CREATE INDEX IF NOT EXISTS idx_api_usage_daily_date
  ON api_usage_daily(date);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_daily ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS api_keys_owner_read ON api_keys;
CREATE POLICY api_keys_owner_read
  ON api_keys FOR SELECT
  USING (auth.uid() = user_id);

-- Writes happen via service role from /api/internal/keys, no client policies.

DROP POLICY IF EXISTS api_usage_daily_owner_read ON api_usage_daily;
CREATE POLICY api_usage_daily_owner_read
  ON api_usage_daily FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM api_keys k
      WHERE k.id = api_usage_daily.api_key_id
        AND k.user_id = auth.uid()
    )
  );

-- ============================================================
-- RPC: increment_api_usage(key_id) — atomic upsert + count
-- ============================================================
CREATE OR REPLACE FUNCTION public.increment_api_usage(p_key_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  INSERT INTO api_usage_daily (api_key_id, date, request_count)
  VALUES (p_key_id, current_date, 1)
  ON CONFLICT (api_key_id, date)
  DO UPDATE SET request_count = api_usage_daily.request_count + 1
  RETURNING request_count INTO v_count;

  UPDATE api_keys SET last_used_at = now() WHERE id = p_key_id;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_api_usage FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_api_usage TO service_role;

COMMENT ON TABLE api_keys IS 'Enterprise API keys (Starter/Growth/Scale). Hash is HMAC-SHA256(secret, server pepper).';
COMMENT ON TABLE api_usage_daily IS 'Per-key per-day request counter. Monthly quota = SUM where date_trunc(month) = current month.';
