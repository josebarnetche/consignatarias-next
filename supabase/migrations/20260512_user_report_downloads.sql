-- ============================================================
-- user_report_downloads — tracking de descargas por user × report
-- ============================================================
-- Granular: una fila por descarga. Para stats agregados, usar la RPC
-- get_user_report_stats() o queries de agregación.

CREATE TABLE IF NOT EXISTS user_report_downloads (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_slug TEXT NOT NULL,
  downloaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip INET,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_urd_user_report
  ON user_report_downloads(user_id, report_slug);
CREATE INDEX IF NOT EXISTS idx_urd_downloaded_at
  ON user_report_downloads(downloaded_at);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE user_report_downloads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS urd_owner_read ON user_report_downloads;
CREATE POLICY urd_owner_read
  ON user_report_downloads FOR SELECT
  USING (auth.uid() = user_id);

-- Writes happen via service role from /api/reportes/[slug]/download.

-- ============================================================
-- RPC: get_user_report_stats — per-report aggregate for current user
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_report_stats(p_user_id UUID)
RETURNS TABLE (
  report_slug TEXT,
  download_count INTEGER,
  first_downloaded_at TIMESTAMPTZ,
  last_downloaded_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    report_slug,
    COUNT(*)::INTEGER AS download_count,
    MIN(downloaded_at) AS first_downloaded_at,
    MAX(downloaded_at) AS last_downloaded_at
  FROM user_report_downloads
  WHERE user_id = p_user_id
  GROUP BY report_slug
$$;

REVOKE ALL ON FUNCTION public.get_user_report_stats FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_report_stats TO authenticated, service_role;

-- ============================================================
-- RPC: record_report_download — atomic insert + return new count
-- ============================================================
CREATE OR REPLACE FUNCTION public.record_report_download(
  p_user_id UUID,
  p_report_slug TEXT,
  p_ip INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  INSERT INTO user_report_downloads (user_id, report_slug, ip, user_agent)
  VALUES (p_user_id, p_report_slug, p_ip, p_user_agent);

  SELECT COUNT(*)::INTEGER INTO v_count
  FROM user_report_downloads
  WHERE user_id = p_user_id AND report_slug = p_report_slug;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.record_report_download FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_report_download TO service_role;

COMMENT ON TABLE user_report_downloads IS 'Tracking granular de descargas de reportes por usuario PRO. Sólo accesible por owner (RLS) o service_role.';
