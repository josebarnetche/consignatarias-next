-- Outreach Log - tracks emails sent to consignatarias
-- Used to prevent duplicate emails and track response rates

CREATE TABLE IF NOT EXISTS outreach_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL, -- 'post_remate_results', 'verification_reminder', etc.
  consignataria_slug VARCHAR(255) NOT NULL,
  email_sent_to VARCHAR(255) NOT NULL,
  auction_date DATE,
  auction_title TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  response_received_at TIMESTAMP WITH TIME ZONE,
  response_type VARCHAR(50), -- 'image', 'text', 'no_response'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for checking if we already sent today
CREATE INDEX IF NOT EXISTS idx_outreach_log_type_slug_date 
  ON outreach_log(type, consignataria_slug, sent_at);

-- Index for finding pending responses
CREATE INDEX IF NOT EXISTS idx_outreach_log_response 
  ON outreach_log(type, response_received_at) 
  WHERE response_received_at IS NULL;

-- RLS: Only service role can write, public can't read
ALTER TABLE outreach_log ENABLE ROW LEVEL SECURITY;

-- No public access - this is internal tracking
CREATE POLICY "Service role only"
  ON outreach_log
  FOR ALL
  USING (false)
  WITH CHECK (false);
