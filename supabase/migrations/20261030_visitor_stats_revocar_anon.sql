-- visitor_stats() deja de poder llamarse con la clave pública.
--
-- visitor_stats() es una FUNCIÓN (no tabla ni vista), SECURITY DEFINER, dueña postgres:
-- corre saltando la RLS de `visitors` y devuelve totales, breakdowns por fuente/motor de
-- IA/device y los últimos 12 visitantes con su landing y si están registrados. Al
-- 30-10-2026 la ACL era {=X, anon=X, authenticated=X, service_role=X}: cualquiera con la
-- clave anon (que va en el código del sitio) podía leerla vía /rest/v1/rpc/visitor_stats.
-- Lo marcan los lints 0028 y 0029 del advisor de seguridad.
--
-- Único uso en el código: src/app/(terminal)/admin/ops/page.tsx → fetchVisitorStats(),
-- que llama con createAdminClient() (service role). Ningún otro objeto de la base la
-- referencia. Se revoca de PUBLIC (el default de Postgres para funciones, que si no se
-- quita deja a anon y authenticated habilitados igual), anon y authenticated, y se
-- deja explícito el EXECUTE de service_role.
revoke execute on function public.visitor_stats() from public, anon, authenticated;
grant execute on function public.visitor_stats() to service_role;

-- ROLLBACK (deja la ACL exactamente como estaba antes de esta migración):
--   grant execute on function public.visitor_stats() to public, anon, authenticated;
