-- Migration: Frigorifico profiles table (claimed/verified frigorificos)
-- Date: 2026-03-11

-- ============================================================
--  TABLE: frigorifico_profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS frigorifico_profiles (
  cuit              TEXT PRIMARY KEY,
  display_name      TEXT NOT NULL,
  phone             TEXT,
  email             TEXT,
  website           TEXT,
  description       TEXT,
  claimed_by_email  TEXT,
  verified          BOOLEAN NOT NULL DEFAULT false,
  featured          BOOLEAN NOT NULL DEFAULT false,
  claimed_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
--  INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_frigo_profiles_email ON frigorifico_profiles(claimed_by_email);
CREATE INDEX IF NOT EXISTS idx_frigo_profiles_verified ON frigorifico_profiles(verified);

-- ============================================================
--  RLS — enabled, no anon policies (service_role only)
-- ============================================================
ALTER TABLE frigorifico_profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================
--  AUTO-UPDATE updated_at
-- ============================================================
CREATE TRIGGER trg_frigo_profiles_updated_at
  BEFORE UPDATE ON frigorifico_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
