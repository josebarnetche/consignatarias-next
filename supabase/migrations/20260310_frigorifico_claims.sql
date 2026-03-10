-- Migration: Frigorifico claims table
-- Date: 2026-03-10

-- ============================================================
--  TABLE: frigorifico_claims
-- ============================================================
CREATE TABLE IF NOT EXISTS frigorifico_claims (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  frigorifico_cuit    TEXT NOT NULL,
  frigorifico_name    TEXT NOT NULL,
  claimant_name       TEXT,
  claimant_email      TEXT NOT NULL,
  claimant_phone      TEXT,
  claimant_role       TEXT,
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes         TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
--  INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_frigo_claims_cuit ON frigorifico_claims(frigorifico_cuit);
CREATE INDEX IF NOT EXISTS idx_frigo_claims_status ON frigorifico_claims(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_frigo_claims_unique_pending
  ON frigorifico_claims(frigorifico_cuit, claimant_email)
  WHERE status = 'pending';

-- ============================================================
--  RLS — enabled, no anon policies (service_role only)
-- ============================================================
ALTER TABLE frigorifico_claims ENABLE ROW LEVEL SECURITY;

-- ============================================================
--  AUTO-UPDATE updated_at
-- ============================================================
CREATE TRIGGER trg_frigo_claims_updated_at
  BEFORE UPDATE ON frigorifico_claims
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
