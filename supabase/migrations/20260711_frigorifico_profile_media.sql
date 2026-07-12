-- Migration: frigorifico_profiles — paridad de medios con consignatarias
-- Date: 2026-07-11
-- Agrega logo por frigorífico + whatsapp + localidad editable, para que un
-- frigorífico reclamado deje de ser "el registro scrapeado + una tilde" y pueda
-- enriquecer su perfil como una consignataria (Fundación: logo + edición self-service).

ALTER TABLE frigorifico_profiles ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE frigorifico_profiles ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE frigorifico_profiles ADD COLUMN IF NOT EXISTS location TEXT;
