-- La serie de dispersión es la superficie PAGA (PRD §5: "Banda histórica / serie
-- de dispersión → Enterprise"). La policy `using (true)` del 20260921 la dejaba
-- leer entera con la anon key desde PostgREST, salteando la API y su cuota.
--
-- Se copió del precedente de las otras series de mercado, pero esas son dato
-- público (el INMAG lo publica el MAG). Esta es derivada y propia.
--
-- `/api/precios?vr=historico` usa service_role, que bypassa RLS, así que cerrar
-- la lectura pública no toca el endpoint. La banda del DÍA sigue siendo pública:
-- vive en vr-bandas.json, no acá.
drop policy if exists vr_bandas_history_public_read on public.vr_bandas_history;

comment on table public.vr_bandas_history is
  'Serie histórica de la banda VR (P10/mediana/P90) por categoría y fecha, sobre ventana móvil de lotes del MAG. SIN lectura pública: es la superficie Enterprise, se sirve por /api/precios?vr=historico con service_role. Escribe scripts/compute-vr-bandas.mjs.';
