-- El auth de alertas/* migró al sistema canónico api_keys (hasheadas, lib/api-auth).
-- La columna alertas.api_key guardaba la API key en TEXTO PLANO (liability) y era la
-- clave de ownership. Ahora el ownership es por user_id (alineado con los crons).
-- Aplicada a prod como alertas_drop_plaintext_api_key_2026_07_03 (prod tenía 0 filas).
--
-- GUARD: NO es "drop a ciegas". Si un entorno divergente (staging/local/otro prod)
-- tuviera datos en api_key, este DROP destruiría información irreversiblemente. Por
-- eso: solo dropea si la columna existe Y no tiene ningún valor; si tiene datos,
-- FALLA con un mensaje claro para forzar una migración manual del ownership antes.
DO $$
DECLARE
  n_con_datos bigint;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'alertas' AND column_name = 'api_key'
  ) THEN
    SELECT count(*) INTO n_con_datos FROM public.alertas WHERE api_key IS NOT NULL;
    IF n_con_datos > 0 THEN
      RAISE EXCEPTION 'alertas.api_key tiene % fila(s) con datos: NO se dropea automaticamente. Migra el ownership a user_id (o haci backup) antes de correr esto.', n_con_datos;
    END IF;
    ALTER TABLE public.alertas DROP COLUMN api_key;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_alertas_user_id ON public.alertas (user_id);
