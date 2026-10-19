-- El mail del dueño de cada consignataria deja de ser legible con la clave pública.
--
-- La política `SELECT USING true` de `consignatarias` (la ficha es pública) dejaba leer
-- también `claimed_by_email` con la clave anon que va en el código del sitio (revisión
-- del 17-10-2026). Un permiso de columna no se puede revocar si el de tabla sigue
-- vigente: se revoca SELECT de la tabla y se vuelve a dar columna por columna, todas
-- menos claimed_by_email. El panel del dueño en el navegador usa mi_consignataria()
-- (migración anterior); el servidor usa el service role, que no pasa por estos grants.
-- Si se agrega una columna pública a la tabla, hay que sumarla al GRANT de abajo.
revoke select on public.consignatarias from anon, authenticated;
grant select (
  id, canonical_slug, display_name, name, cuit, matricula, province, location, category,
  website, phone, email, verified, featured, created_at, updated_at, claimed_at,
  description, logo_url, whatsapp, onboarding_points, points_redeemed_at,
  region_operativa, especialidad, anos_oficio, bio_referente, referente_nombre,
  referente_cargo, foto_referente_url, medios_pago
) on public.consignatarias to anon, authenticated;
