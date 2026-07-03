-- Datos de usuario desde auth.users para el cron onboarding-emails (que consultaba
-- public.users, inexistente). display_name = name/full_name de la metadata (OAuth).
-- SECURITY DEFINER, service_role only. Aplicada como get_user_infos_rpcs_2026_07_03.
CREATE OR REPLACE FUNCTION public.get_user_infos(p_ids uuid[])
RETURNS TABLE (id uuid, email text, display_name text, created_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT u.id, u.email::text,
         coalesce(u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'full_name'),
         u.created_at
  FROM auth.users u WHERE u.id = ANY(p_ids);
$$;
REVOKE ALL ON FUNCTION public.get_user_infos(uuid[]) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_infos(uuid[]) TO service_role;

CREATE OR REPLACE FUNCTION public.get_recent_user_infos(p_from timestamptz, p_to timestamptz)
RETURNS TABLE (id uuid, email text, display_name text, created_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT u.id, u.email::text,
         coalesce(u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'full_name'),
         u.created_at
  FROM auth.users u WHERE u.created_at >= p_from AND u.created_at <= p_to;
$$;
REVOKE ALL ON FUNCTION public.get_recent_user_infos(timestamptz, timestamptz) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_recent_user_infos(timestamptz, timestamptz) TO service_role;
