-- Migration: RLS Audit Fix
-- Date: 2026-03-23
-- Reason: Supabase security alert - rls_disabled_in_public
-- Action: Enable RLS on ALL public tables to ensure security

-- ============================================================
--  ENABLE RLS ON ALL TABLES (idempotent - safe to re-run)
-- ============================================================

-- Core tables
ALTER TABLE IF EXISTS consignatarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS consignataria_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS consignataria_auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS consignataria_videos ENABLE ROW LEVEL SECURITY;

-- User data tables
ALTER TABLE IF EXISTS user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_dtes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS alertas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS alerta_logs ENABLE ROW LEVEL SECURITY;

-- Frigorificos
ALTER TABLE IF EXISTS frigorifico_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS frigorifico_profiles ENABLE ROW LEVEL SECURITY;

-- Analytics & logs
ALTER TABLE IF EXISTS profile_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS outreach_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS point_transactions ENABLE ROW LEVEL SECURITY;

-- Lead capture
ALTER TABLE IF EXISTS newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- System
ALTER TABLE IF EXISTS webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS remitente_entries ENABLE ROW LEVEL SECURITY;

-- Market data (if exists)
ALTER TABLE IF EXISTS market_price_snapshots ENABLE ROW LEVEL SECURITY;

-- ============================================================
--  BASIC POLICIES (if not exists)
--  Service role bypass for API access, restrict anon
-- ============================================================

-- consignatarias: public read, service_role write
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'consignatarias' AND policyname = 'consignatarias_public_read'
  ) THEN
    CREATE POLICY consignatarias_public_read ON consignatarias FOR SELECT USING (true);
  END IF;
END $$;

-- consignataria_auctions: public read
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'consignataria_auctions' AND policyname = 'auctions_public_read'
  ) THEN
    CREATE POLICY auctions_public_read ON consignataria_auctions FOR SELECT USING (true);
  END IF;
END $$;

-- consignataria_videos: public read
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'consignataria_videos' AND policyname = 'videos_public_read'
  ) THEN
    CREATE POLICY videos_public_read ON consignataria_videos FOR SELECT USING (true);
  END IF;
END $$;

-- frigorifico_profiles: public read
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'frigorifico_profiles' AND policyname = 'frigorificos_public_read'
  ) THEN
    CREATE POLICY frigorificos_public_read ON frigorifico_profiles FOR SELECT USING (true);
  END IF;
END $$;

-- market_price_snapshots: public read (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'market_price_snapshots') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = 'market_price_snapshots' AND policyname = 'market_prices_public_read'
    ) THEN
      CREATE POLICY market_prices_public_read ON market_price_snapshots FOR SELECT USING (true);
    END IF;
  END IF;
END $$;

-- ============================================================
--  VERIFY (will show in logs)
-- ============================================================
-- Run this query in Supabase SQL Editor to verify:
-- SELECT schemaname, tablename, rowsecurity FROM pg_tables 
-- WHERE schemaname = 'public' ORDER BY tablename;
