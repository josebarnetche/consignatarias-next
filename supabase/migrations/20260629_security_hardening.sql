-- ============================================================================
-- Security hardening — audit remediation 2026-06-29 (defensive / idempotent).
--
-- Applied to production via Supabase migration `security_hardening_2026_06_29`.
-- Uses the REAL deployed policy names and guards every object with existence
-- checks, so it applies cleanly against the actual schema (which is a subset of
-- the repo migrations) and is safe to re-run. Every table/function touched here
-- is accessed only via the service_role client (verified), so locking
-- anon/authenticated out does NOT break the app.
-- ============================================================================

-- C2 — alertas / alerta_logs: the only policy was a public `USING(true)` ALL
-- policy, so anon could read every user's plaintext api_key + webhook_url and
-- do full CRUD. Lock to service_role.
DO $$
BEGIN
  IF to_regclass('public.alertas') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.alertas ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Service role full access alertas" ON public.alertas';
    EXECUTE 'DROP POLICY IF EXISTS "Service role has full access to alertas" ON public.alertas';
    EXECUTE 'REVOKE ALL ON public.alertas FROM anon, authenticated';
    EXECUTE 'DROP POLICY IF EXISTS alertas_service_only ON public.alertas';
    EXECUTE 'CREATE POLICY alertas_service_only ON public.alertas FOR ALL TO service_role USING (true) WITH CHECK (true)';
  END IF;
  IF to_regclass('public.alerta_logs') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.alerta_logs ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Service role full access alerta_logs" ON public.alerta_logs';
    EXECUTE 'DROP POLICY IF EXISTS "Service role has full access to alerta_logs" ON public.alerta_logs';
    EXECUTE 'REVOKE ALL ON public.alerta_logs FROM anon, authenticated';
    EXECUTE 'DROP POLICY IF EXISTS alerta_logs_service_only ON public.alerta_logs';
    EXECUTE 'CREATE POLICY alerta_logs_service_only ON public.alerta_logs FOR ALL TO service_role USING (true) WITH CHECK (true)';
  END IF;
END $$;

-- H4 — subscriptions: `Public read subscriptions USING(true)` exposed plan /
-- status + Rebill customer/subscription IDs. All reads are service_role.
DO $$
BEGIN
  IF to_regclass('public.subscriptions') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Public read subscriptions" ON public.subscriptions';
    EXECUTE 'REVOKE ALL ON public.subscriptions FROM anon, authenticated';
  END IF;
END $$;

-- C3 — SECURITY DEFINER functions reachable via PostgREST. Lock to service_role.
-- get_user_report_stats(p_user_id) was the live IDOR (EXECUTE to anon +
-- authenticated → any caller reads any user's download history).
DO $$
BEGIN
  IF to_regprocedure('public.get_user_report_stats(uuid)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.get_user_report_stats(uuid) FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_user_report_stats(uuid) TO service_role';
  END IF;
  IF to_regprocedure('public.get_top_viewed_entities(integer)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.get_top_viewed_entities(integer) FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_top_viewed_entities(integer) TO service_role';
  END IF;
  -- Future-proof: these aren't deployed to this project, but lock them if so.
  IF to_regprocedure('public.award_points(uuid,character varying,integer,jsonb)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.award_points(uuid,character varying,integer,jsonb) FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.award_points(uuid,character varying,integer,jsonb) TO service_role';
  END IF;
  IF to_regprocedure('public.redeem_points_for_pro(uuid)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.redeem_points_for_pro(uuid) FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.redeem_points_for_pro(uuid) TO service_role';
  END IF;
END $$;

-- M — profile_views: keep anon INSERT (public beacon), remove read/mutate.
DO $$
BEGIN
  IF to_regclass('public.profile_views') IS NOT NULL THEN
    EXECUTE 'REVOKE SELECT, UPDATE, DELETE ON public.profile_views FROM anon, authenticated';
  END IF;
END $$;

-- Future-proof guards for tables not deployed to this project today
-- (consignataria_leads / whatsapp_clicks / remate_favorites). No-ops now.
DO $$
BEGIN
  IF to_regclass('public.consignataria_leads') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.consignataria_leads ENABLE ROW LEVEL SECURITY';
    EXECUTE 'REVOKE ALL ON public.consignataria_leads FROM anon, authenticated';
  END IF;
  IF to_regclass('public.whatsapp_clicks') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.whatsapp_clicks ENABLE ROW LEVEL SECURITY';
    EXECUTE 'REVOKE ALL ON public.whatsapp_clicks FROM anon, authenticated';
  END IF;
  IF to_regclass('public.remate_favorites') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.remate_favorites ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view all favorites" ON public.remate_favorites';
    EXECUTE 'DROP POLICY IF EXISTS favorites_scoped_select ON public.remate_favorites';
    EXECUTE 'CREATE POLICY favorites_scoped_select ON public.remate_favorites FOR SELECT USING ((auth.uid() IS NOT NULL AND auth.uid() = user_id) OR user_id IS NULL)';
  END IF;
END $$;

-- Durable, cross-instance rate limiter backing lib/rate-limit-db.ts.
CREATE TABLE IF NOT EXISTS public.rate_limit_hits (
  bucket       TEXT        NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count        INTEGER     NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, window_start)
);
ALTER TABLE public.rate_limit_hits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rate_limit_hits FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.bump_rate_limit(
  p_bucket TEXT,
  p_window_start TIMESTAMPTZ
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  INSERT INTO rate_limit_hits (bucket, window_start, count)
  VALUES (p_bucket, p_window_start, 1)
  ON CONFLICT (bucket, window_start)
  DO UPDATE SET count = rate_limit_hits.count + 1
  RETURNING count INTO new_count;
  RETURN new_count;
END;
$$;

REVOKE ALL ON FUNCTION public.bump_rate_limit(text, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bump_rate_limit(text, timestamptz) TO service_role;
