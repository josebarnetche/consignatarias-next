-- El auth de alertas/* migró al sistema canónico api_keys (hasheadas, lib/api-auth).
-- La columna alertas.api_key guardaba la API key en TEXTO PLANO (liability) y era la
-- clave de ownership. Ahora el ownership es por user_id (alineado con los crons).
-- Tabla vacía → drop seguro. Aplicada como alertas_drop_plaintext_api_key_2026_07_03.
ALTER TABLE public.alertas DROP COLUMN IF EXISTS api_key;
CREATE INDEX IF NOT EXISTS idx_alertas_user_id ON public.alertas (user_id);
