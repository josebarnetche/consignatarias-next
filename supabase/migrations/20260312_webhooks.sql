-- Webhooks table for Subasto API real-time notifications
-- See: specs/api-webhooks-spec.md

CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  secret TEXT NOT NULL,
  filters JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  active BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  owner_email TEXT,
  description TEXT,
  
  -- Delivery tracking
  last_triggered_at TIMESTAMPTZ,
  total_deliveries INTEGER DEFAULT 0,
  failed_deliveries INTEGER DEFAULT 0
);

-- Index for active webhook lookups during event dispatch
CREATE INDEX idx_webhooks_active ON webhooks (active) WHERE active = TRUE;

-- Index for filtering by event type
CREATE INDEX idx_webhooks_events ON webhooks USING GIN (events);

-- RLS: webhooks are managed via API (service role), not direct user access
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

-- Comment for documentation
COMMENT ON TABLE webhooks IS 'Webhook subscriptions for Subasto API real-time event notifications';
COMMENT ON COLUMN webhooks.events IS 'Array of event types: remate.created, remate.updated, remate.cancelled, remate.starting_soon, remate.live, price.update';
COMMENT ON COLUMN webhooks.filters IS 'Optional filters: { provincia, consignataria_slug }';
COMMENT ON COLUMN webhooks.secret IS 'Customer secret for HMAC-SHA256 signature verification';
