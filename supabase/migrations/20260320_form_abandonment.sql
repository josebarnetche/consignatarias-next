-- Form abandonment tracking for recovery campaigns
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS form_abandonment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  slug TEXT,
  form_type TEXT DEFAULT 'claim',
  captured_at TIMESTAMPTZ DEFAULT NOW(),
  converted_at TIMESTAMPTZ, -- Set when they complete the form
  recovery_sent_at TIMESTAMPTZ, -- Set when we send recovery email
  
  UNIQUE(email, slug)
);

-- Index for recovery campaigns
CREATE INDEX IF NOT EXISTS idx_form_abandonment_unconverted 
ON form_abandonment(captured_at) 
WHERE converted_at IS NULL;

-- RLS: Only service role can access
ALTER TABLE form_abandonment ENABLE ROW LEVEL SECURITY;

-- No public access
CREATE POLICY "Service role only" ON form_abandonment
  FOR ALL USING (false);
