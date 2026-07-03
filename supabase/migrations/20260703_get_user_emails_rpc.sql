-- Resuelve emails desde auth.users para un set de user_ids. Necesario porque
-- user_favorites/alertas tienen FK a auth.users (NO public.users), así que el embed
-- PostgREST `users(email)` no existe (era el bug de los crons de reminders/alerts).
-- SECURITY DEFINER para leer auth.users; restringido a service_role (los crons lo
-- llaman server-side). NO expuesto a anon/authenticated. Aplicada como
-- get_user_emails_rpc_2026_07_03.
CREATE OR REPLACE FUNCTION public.get_user_emails(p_ids uuid[])
RETURNS TABLE (id uuid, email text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id, u.email::text
  FROM auth.users u
  WHERE u.id = ANY(p_ids);
$$;
REVOKE ALL ON FUNCTION public.get_user_emails(uuid[]) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_emails(uuid[]) TO service_role;
