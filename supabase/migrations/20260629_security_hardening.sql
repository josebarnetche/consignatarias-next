-- ============================================================================
-- Security hardening — audit remediation 2026-06-29
--
-- Closes anon-key-exploitable holes found in the security audit. Every table
-- touched here is only ever read/written by server code through the
-- service_role client (which has BYPASSRLS), so enabling RLS / dropping the
-- permissive policies removes anon/authenticated access WITHOUT breaking the
-- app. Verified callers before writing this migration.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- C1 (CRITICAL) — consignataria_leads: RLS was NEVER enabled.
-- Under Supabase's default public-schema grants the anon key could SELECT all
-- lead PII (name/phone/email/message) and UPDATE/DELETE rows. Leads are only
-- ever captured/read via the service_role client (API routes + admin), so we
-- lock the table to service_role entirely.
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.consignataria_leads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.consignataria_leads FROM anon;
REVOKE ALL ON public.consignataria_leads FROM authenticated;
-- No policies for anon/authenticated => zero rows reachable with the public key.
-- service_role bypasses RLS and keeps full access for the capture/admin paths.

-- ---------------------------------------------------------------------------
-- C2 (CRITICAL) — alertas / alerta_logs: the only policy was
-- `FOR ALL USING (true) WITH CHECK (true)` with no TO clause, so it applied to
-- anon. The table stores `api_key` (plaintext alert credential) + webhook_url.
-- Anon could read every user's alert key and tamper with any alert.
-- Both tables are accessed exclusively via requireServiceClient() in
-- src/app/api/alertas/*, so drop the public policies and revoke direct grants.
-- (Plaintext-key-at-rest hardening is tracked separately — this stops the
-- anon read, which was the critical exposure.)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Service role has full access to alertas" ON public.alertas;
DROP POLICY IF EXISTS "Service role has full access to alerta_logs" ON public.alerta_logs;
ALTER TABLE IF EXISTS public.alertas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.alerta_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.alertas FROM anon, authenticated;
REVOKE ALL ON public.alerta_logs FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- C3 (CRITICAL/HIGH) — SECURITY DEFINER functions callable by anon via
-- PostgREST. `award_points` / `redeem_points_for_pro` let anyone grant
-- themselves (or any consignataria) free PRO and arbitrary points. Both are
-- only invoked by server code through the service_role client.
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.award_points(uuid, varchar, integer, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.redeem_points_for_pro(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.award_points(uuid, varchar, integer, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.redeem_points_for_pro(uuid) TO service_role;

-- get_top_viewed_entities — aggregate only, but tighten to service_role
-- (called from src/app/api/admin/dashboard via service client).
REVOKE ALL ON FUNCTION public.get_top_viewed_entities(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_top_viewed_entities(int) TO service_role;

-- get_user_report_stats(p_user_id) — IDOR: it filters on the caller-supplied
-- id, so any authenticated user could read another user's download history by
-- calling it directly through PostgREST. The legitimate caller (lib/reports.ts)
-- uses the service_role client and passes the already-authenticated user's id,
-- so revoke direct EXECUTE from authenticated/PUBLIC and keep service_role only.
REVOKE ALL ON FUNCTION public.get_user_report_stats(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_report_stats(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_report_stats(uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- H4 (HIGH) — subscriptions: `Public read subscriptions USING (true)` exposed
-- plan/status + Rebill customer/subscription IDs for every entity. All reads
-- go through the service_role client (cuenta/dashboard pages, admin, API),
-- so drop the public read and revoke direct grants.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public read subscriptions" ON public.subscriptions;
ALTER TABLE IF EXISTS public.subscriptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.subscriptions FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- M (MEDIUM) — whatsapp_clicks: RLS never enabled (created after the
-- 20260323 audit fix). Inserted via the service_role client in
-- /api/track/whatsapp; analytics read via service_role. Lock to service_role.
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.whatsapp_clicks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.whatsapp_clicks FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- M (MEDIUM) — remate_favorites: `FOR SELECT USING (true)` leaked every
-- authenticated user's auth UUID. Scope reads so a logged-in user sees only
-- their own rows; anonymous (session-based) favorites stay readable so the
-- favorites feature keeps working for guests. Insert/delete policies (already
-- owner/session-scoped) are unchanged.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view all favorites" ON public.remate_favorites;
CREATE POLICY "favorites_scoped_select" ON public.remate_favorites
  FOR SELECT
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR user_id IS NULL
  );

-- ---------------------------------------------------------------------------
-- M (MEDIUM) — profile_views: `INSERT WITH CHECK (true)` allows anon write
-- spam. Keep anon insert (it's a public beacon) but ensure no read access.
-- (Read path is service_role only; revoke any stray SELECT grant.)
-- ---------------------------------------------------------------------------
REVOKE SELECT, UPDATE, DELETE ON public.profile_views FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- Guardrail: table to back the durable rate limiter (replaces the in-memory
-- per-instance Map that is ineffective on serverless). Keyed by bucket+window.
-- Written/read only by the service_role client from lib/rate-limit-db.ts.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rate_limit_hits (
  bucket       TEXT        NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count        INTEGER     NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, window_start)
);
ALTER TABLE public.rate_limit_hits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rate_limit_hits FROM anon, authenticated;

-- Atomic increment-and-return for a fixed window. SECURITY DEFINER but locked
-- to service_role only.
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

REVOKE ALL ON FUNCTION public.bump_rate_limit(text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bump_rate_limit(text, timestamptz) TO service_role;
