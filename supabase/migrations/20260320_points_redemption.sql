-- Points System Redemption — v1.9.8
-- Run this in Supabase SQL Editor

-- Track point redemptions (1 month PRO free)
CREATE TABLE IF NOT EXISTS point_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consignataria_slug TEXT NOT NULL,
  points_redeemed INTEGER NOT NULL DEFAULT 4500,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  pro_expires_at TIMESTAMPTZ NOT NULL,
  
  -- Only one redemption per user (early adopter bonus)
  UNIQUE(user_id)
);

-- Index for checking redemption status
CREATE INDEX IF NOT EXISTS idx_point_redemptions_user 
ON point_redemptions(user_id);

-- Index for finding active redeemed PRO
CREATE INDEX IF NOT EXISTS idx_point_redemptions_active
ON point_redemptions(pro_expires_at)
WHERE pro_expires_at > NOW();

-- RLS policies
ALTER TABLE point_redemptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own redemptions
CREATE POLICY "Users can view own redemptions" ON point_redemptions
  FOR SELECT USING (auth.uid() = user_id);

-- Only service role can insert (via API)
CREATE POLICY "Service role can insert" ON point_redemptions
  FOR INSERT WITH CHECK (false);

-- Grant service role full access
GRANT ALL ON point_redemptions TO service_role;

-- Optional: Track all point transactions for audit trail
CREATE TABLE IF NOT EXISTS point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consignataria_slug TEXT,
  action TEXT NOT NULL,
  points INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_point_transactions_user 
ON point_transactions(user_id, created_at DESC);

ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON point_transactions
  FOR SELECT USING (auth.uid() = user_id);

GRANT ALL ON point_transactions TO service_role;
