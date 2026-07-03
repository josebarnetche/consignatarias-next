-- Reconciliación repo↔prod (Proyecto C): remate_favorites (drift, HARDENED sin
-- USING(true)) + fix de las 0 políticas de user_favorites + view followers.
-- Aplicada como reconcile_favorites_followers_2026_07_03.
CREATE TABLE IF NOT EXISTS public.remate_favorites (
  id BIGSERIAL PRIMARY KEY, remate_id INTEGER NOT NULL, consignataria_slug TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(remate_id, user_id), UNIQUE(remate_id, session_id)
);
CREATE INDEX IF NOT EXISTS idx_favorites_slug ON public.remate_favorites(consignataria_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_favorites_remate ON public.remate_favorites(remate_id);
GRANT SELECT, INSERT, DELETE ON public.remate_favorites TO authenticated;
GRANT SELECT, INSERT ON public.remate_favorites TO anon;
GRANT USAGE, SELECT ON SEQUENCE public.remate_favorites_id_seq TO authenticated, anon;
ALTER TABLE public.remate_favorites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view all favorites" ON public.remate_favorites;
DROP POLICY IF EXISTS favorites_scoped_select ON public.remate_favorites;
DROP POLICY IF EXISTS "Users can insert own favorites" ON public.remate_favorites;
DROP POLICY IF EXISTS "Users can delete own favorites" ON public.remate_favorites;
CREATE POLICY favorites_scoped_select ON public.remate_favorites FOR SELECT
  USING ((auth.uid() IS NOT NULL AND auth.uid() = user_id) OR user_id IS NULL);
CREATE POLICY "Users can insert own favorites" ON public.remate_favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id OR (user_id IS NULL AND session_id IS NOT NULL));
CREATE POLICY "Users can delete own favorites" ON public.remate_favorites FOR DELETE
  USING (auth.uid() = user_id OR (user_id IS NULL AND session_id IS NOT NULL));
CREATE OR REPLACE FUNCTION public.get_remate_watchers(p_remate_id integer)
RETURNS bigint LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT count(*) FROM remate_favorites WHERE remate_id = p_remate_id; $$;
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own favorites" ON public.user_favorites;
DROP POLICY IF EXISTS "Users can insert own favorites" ON public.user_favorites;
DROP POLICY IF EXISTS "Users can update own favorites" ON public.user_favorites;
DROP POLICY IF EXISTS "Users can delete own favorites" ON public.user_favorites;
CREATE POLICY "Users can view own favorites"   ON public.user_favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own favorites" ON public.user_favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own favorites" ON public.user_favorites FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own favorites" ON public.user_favorites FOR DELETE USING (auth.uid() = user_id);
DROP VIEW IF EXISTS public.consignataria_followers;
CREATE VIEW public.consignataria_followers WITH (security_invoker = on) AS
  SELECT consignataria_slug, COUNT(*) AS follower_count FROM public.user_favorites GROUP BY consignataria_slug;
