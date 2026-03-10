-- Migration: Use existing market_price_snapshots table for daily INMAG history
-- The scraper now writes daily snapshots to Supabase via REST API
-- Table already exists from 20260308000005_market_prices migration
-- This file documents the integration point

-- Verify the table exists and has the right schema
-- market_price_snapshots: id, date, inmag_value, inmag_prev, inmag_change_pct,
--   corn_usd_tn, corn_prev, corn_change_pct, usd_blue, usd_blue_prev,
--   usd_oficial, usd_oficial_prev, raw_data, created_at
