-- Add profile fields for owner editing
-- Applied via Supabase MCP on 2026-03-10

ALTER TABLE consignatarias ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE consignatarias ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE consignatarias ADD COLUMN IF NOT EXISTS whatsapp TEXT;
