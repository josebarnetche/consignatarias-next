-- Mi Ganado — value history + weekly-alert opt-in.
-- Builds the "registro de valor" retention loop on top of user_ganado:
--   1. A per-day snapshot of what the producer's herd was worth, so we can draw
--      the evolution of HIS OWN herd over time (his libreta, growing).
--   2. An opt-in flag for the Monday value email ("tu hacienda vale $X, cambió $Y").
-- Runs AFTER 20260520_user_ganado.sql (sorts later: longer same-prefix slug).

-- ── 1. value snapshots ─────────────────────────────────────────────────────
CREATE TABLE ganado_value_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  snapshot_date DATE NOT NULL,
  value_ars NUMERIC NOT NULL,
  cabezas INTEGER NOT NULL,
  kilos NUMERIC NOT NULL,
  inmag_value NUMERIC,              -- the INMAG $/kg that produced this value
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, snapshot_date)    -- one snapshot per producer per day
);

ALTER TABLE ganado_value_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own snapshots" ON ganado_value_snapshots
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own snapshots" ON ganado_value_snapshots
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Snapshots are immutable once written for a given day; the daily upsert is an
-- INSERT ... ON CONFLICT DO UPDATE on (user_id, snapshot_date) which the update
-- policy below allows so a same-day re-valuation (edited herd) refreshes the row.
CREATE POLICY "Users can update own snapshots" ON ganado_value_snapshots
  FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX idx_ganado_snapshots_user_date
  ON ganado_value_snapshots(user_id, snapshot_date DESC);

COMMENT ON TABLE ganado_value_snapshots IS
  'Mi Ganado — daily value snapshot per producer; powers the herd-value evolution chart (registro de valor) and the weekly alert delta';

-- ── 2. weekly alert opt-in on user_ganado ─────────────────────────────────
ALTER TABLE user_ganado
  ADD COLUMN IF NOT EXISTS alerts_opt_in BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN user_ganado.alerts_opt_in IS
  'Producer opted into the Monday "tu hacienda vale $X" value email';
