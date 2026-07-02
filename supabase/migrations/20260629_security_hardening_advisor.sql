-- ============================================================================
-- Security hardening — second pass (Supabase advisor findings), 2026-06-29.
--
-- Applied via Supabase migration `security_hardening_advisor_2026_06_29`.
-- These are live issues the database linter surfaced that the repo/code audit
-- couldn't see (deployed-only objects). Only the unambiguously safe fixes:
-- trigger functions (fire regardless of EXECUTE grants), service-role-only
-- RPCs, SECURITY DEFINER views, and anon-readable email-tracking PII.
-- ============================================================================

-- 1) SECURITY DEFINER views → run with the QUERYING user's perms (respect RLS).
DO $$
BEGIN
  IF to_regclass('public.value_events_daily') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public.value_events_daily SET (security_invoker = on)';
  END IF;
  IF to_regclass('public.value_events_by_entity') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public.value_events_by_entity SET (security_invoker = on)';
  END IF;
END $$;

-- 2) Trigger functions exposed as RPC. Triggers run them regardless of EXECUTE
-- grants, so revoking direct EXECUTE only removes the PostgREST attack surface.
DO $$
BEGIN
  IF to_regprocedure('public.handle_new_user_subscription()') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.handle_new_user_subscription() FROM PUBLIC, anon, authenticated';
  END IF;
  IF to_regprocedure('public.redeem_api_invite_on_signup()') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.redeem_api_invite_on_signup() FROM PUBLIC, anon, authenticated';
  END IF;
END $$;

-- 3) Service-role-only RPCs that were anon-executable. increment_api_usage is
-- the worst: anon could inflate any API key's usage → quota-exhaustion DoS
-- against a paying customer. Both are called only via the service_role client.
DO $$
BEGIN
  IF to_regprocedure('public.increment_api_usage(uuid)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.increment_api_usage(uuid) FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.increment_api_usage(uuid) TO service_role';
  END IF;
  IF to_regprocedure('public.record_report_download(uuid,text,inet,text)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.record_report_download(uuid,text,inet,text) FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.record_report_download(uuid,text,inet,text) TO service_role';
  END IF;
END $$;

-- 4) email_tracking: anon had FOR ALL USING(true) → anon could SELECT every
-- recipient's email + IP + user-agent (PII) and UPDATE/DELETE rows. Restrict
-- anon to INSERT only (the open-tracking pixel logs a row); reads happen via
-- service_role, and the open-count bump goes through the increment_aperturas
-- SECURITY DEFINER function (unaffected by this policy).
DO $$
BEGIN
  IF to_regclass('public.email_tracking') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS allow_anon_insert_tracking ON public.email_tracking';
    EXECUTE 'REVOKE ALL ON public.email_tracking FROM anon, authenticated';
    EXECUTE 'GRANT INSERT ON public.email_tracking TO anon';
    EXECUTE 'CREATE POLICY email_tracking_anon_insert ON public.email_tracking FOR INSERT TO anon WITH CHECK (true)';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- NOT changed here — need a product decision (see audit notes):
--   * fpt_approvals.fpt_anon_all (anon FOR ALL USING(true)) — anyone can flip
--     approval state. Likely floresparati flow; confirm intended access first.
--   * increment_aperturas(integer) — anon-executable SECURITY DEFINER; confirm
--     the open-tracking pixel path before revoking anon EXECUTE.
--   * storage bucket `consignataria-assets` allows public listing.
--   * Auth: enable leaked-password (HaveIBeenPwned) protection in dashboard.
-- ----------------------------------------------------------------------------
