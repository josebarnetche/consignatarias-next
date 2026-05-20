-- Mi Ganado — the user's herd composition, valued daily at the INMAG.
-- Free feature (login only, no PRO gate). It is a regresabilidad hook: the
-- producer sets his herd once and comes back to see what it's worth as the
-- daily index moves. Lock-in: his own herd data + a value he watches over time.
CREATE TABLE user_ganado (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  -- items: [{ "categoria": "novillos", "cabezas": 120, "peso": 450 }, ...]
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- snapshot of the last value the user saw, to compute "Δ desde tu última visita"
  last_seen_at TIMESTAMPTZ,
  last_seen_value_ars NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- RLS: a user can only ever touch their own herd row.
ALTER TABLE user_ganado ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ganado" ON user_ganado
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ganado" ON user_ganado
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ganado" ON user_ganado
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own ganado" ON user_ganado
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_user_ganado_user ON user_ganado(user_id);

COMMENT ON TABLE user_ganado IS 'Mi Ganado — user herd composition valued daily at INMAG; core regresabilidad/lock-in feature (free, login-gated)';
