-- RPC: Get top viewed entities in the last N days
-- Used by admin dashboard to show most popular profiles

CREATE OR REPLACE FUNCTION get_top_viewed_entities(days_back INT DEFAULT 30)
RETURNS TABLE(entity_slug TEXT, view_count BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    entity_slug,
    COUNT(*) AS view_count
  FROM profile_views
  WHERE viewed_at >= NOW() - (days_back || ' days')::INTERVAL
  GROUP BY entity_slug
  ORDER BY view_count DESC
  LIMIT 10;
$$;
