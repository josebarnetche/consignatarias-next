-- La ficha de la consignataria del usuario logueado, sin exponer el mail de nadie.
--
-- Hasta acá el panel del dueño hacía `select ... where claimed_by_email = <su mail>`
-- con la sesión del usuario. Para filtrar por esa columna hace falta poder leerla, y
-- la política pública `SELECT USING true` dejaba leer claimed_by_email de TODAS las
-- firmas con la clave anon (revisión del 17-10-2026). Esta función resuelve "la mía"
-- en el servidor (security definer) y la migración siguiente revoca la columna.
create or replace function public.mi_consignataria()
returns table (
  canonical_slug text,
  display_name text,
  verified boolean,
  phone text,
  email text,
  website text,
  description text,
  whatsapp text,
  cuit text,
  logo_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select c.canonical_slug, c.display_name, c.verified, c.phone, c.email, c.website,
         c.description, c.whatsapp, c.cuit, c.logo_url
    from public.consignatarias c
   where c.claimed_by_email is not null
     and lower(c.claimed_by_email) = lower((select u.email from auth.users u where u.id = auth.uid()))
   limit 1
$$;

revoke all on function public.mi_consignataria() from public, anon;
grant execute on function public.mi_consignataria() to authenticated;
