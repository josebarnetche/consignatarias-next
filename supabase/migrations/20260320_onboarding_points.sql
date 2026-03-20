-- Onboarding points system
-- Gamification: 4500 points = 1 month PRO free
-- Points earned by completing profile actions

-- Add onboarding_points column to consignatarias
ALTER TABLE consignatarias ADD COLUMN IF NOT EXISTS onboarding_points INTEGER DEFAULT 0;
ALTER TABLE consignatarias ADD COLUMN IF NOT EXISTS points_redeemed_at TIMESTAMPTZ;

-- Point transaction log (audit trail + undo capability)
CREATE TABLE point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consignataria_id UUID REFERENCES consignatarias(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  points INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Consignataria owners can view their transactions
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own point transactions" ON point_transactions
  FOR SELECT USING (
    consignataria_id IN (
      SELECT id FROM consignatarias WHERE claimed_by = auth.uid()
    )
  );

-- Index for fast lookups
CREATE INDEX idx_point_transactions_consignataria ON point_transactions(consignataria_id);
CREATE INDEX idx_point_transactions_action ON point_transactions(action);

-- Function to award points (prevents duplicates)
CREATE OR REPLACE FUNCTION award_points(
  p_consignataria_id UUID,
  p_action VARCHAR(50),
  p_points INTEGER,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS INTEGER AS $$
DECLARE
  existing_count INTEGER;
  new_total INTEGER;
BEGIN
  -- Check if points already awarded for this action
  SELECT COUNT(*) INTO existing_count
  FROM point_transactions
  WHERE consignataria_id = p_consignataria_id AND action = p_action;
  
  IF existing_count > 0 THEN
    RETURN (SELECT onboarding_points FROM consignatarias WHERE id = p_consignataria_id);
  END IF;
  
  -- Award points
  INSERT INTO point_transactions (consignataria_id, action, points, metadata)
  VALUES (p_consignataria_id, p_action, p_points, p_metadata);
  
  UPDATE consignatarias 
  SET onboarding_points = COALESCE(onboarding_points, 0) + p_points
  WHERE id = p_consignataria_id
  RETURNING onboarding_points INTO new_total;
  
  RETURN new_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to redeem points for PRO (called by webhook)
CREATE OR REPLACE FUNCTION redeem_points_for_pro(
  p_consignataria_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  current_points INTEGER;
BEGIN
  SELECT onboarding_points INTO current_points
  FROM consignatarias WHERE id = p_consignataria_id;
  
  IF current_points >= 4500 THEN
    -- Mark redemption
    UPDATE consignatarias 
    SET 
      onboarding_points = onboarding_points - 4500,
      points_redeemed_at = NOW()
    WHERE id = p_consignataria_id;
    
    -- Log transaction
    INSERT INTO point_transactions (consignataria_id, action, points, metadata)
    VALUES (p_consignataria_id, 'PRO_REDEMPTION', -4500, '{"months": 1}'::jsonb);
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE point_transactions IS 'Audit log for onboarding points - gamification system';
COMMENT ON COLUMN consignatarias.onboarding_points IS 'Current points balance. 4500 = 1 month PRO free';
COMMENT ON COLUMN consignatarias.points_redeemed_at IS 'When points were last redeemed for PRO';
