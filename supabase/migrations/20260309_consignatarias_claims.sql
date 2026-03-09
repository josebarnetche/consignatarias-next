-- Migration: Consignatarias + Claims tables
-- Date: 2026-03-09
-- Version: v0.8.0 / v0.8.1

-- ============================================================
--  TABLE: consignatarias
-- ============================================================
CREATE TABLE IF NOT EXISTS consignatarias (
  canonical_slug    TEXT PRIMARY KEY,
  display_name      TEXT NOT NULL,
  cuit              TEXT,
  province          TEXT,
  phone             TEXT,
  email             TEXT,
  website           TEXT,
  verified          BOOLEAN NOT NULL DEFAULT FALSE,
  claimed_at        TIMESTAMPTZ,
  claimed_by_email  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
--  TABLE: consignataria_claims
-- ============================================================
CREATE TABLE IF NOT EXISTS consignataria_claims (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consignataria_slug  TEXT NOT NULL REFERENCES consignatarias(canonical_slug) ON DELETE CASCADE,
  claimant_name       TEXT,
  claimant_email      TEXT NOT NULL,
  claimant_phone      TEXT,
  claimant_role       TEXT,
  cuit                TEXT,
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes         TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
--  INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_claims_slug ON consignataria_claims(consignataria_slug);
CREATE INDEX IF NOT EXISTS idx_claims_status ON consignataria_claims(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_claims_unique_pending
  ON consignataria_claims(consignataria_slug, claimant_email)
  WHERE status = 'pending';

-- ============================================================
--  RLS — enabled, no anon policies (service_role only)
-- ============================================================
ALTER TABLE consignatarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE consignataria_claims ENABLE ROW LEVEL SECURITY;

-- ============================================================
--  AUTO-UPDATE updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_consignatarias_updated_at
  BEFORE UPDATE ON consignatarias
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_claims_updated_at
  BEFORE UPDATE ON consignataria_claims
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
