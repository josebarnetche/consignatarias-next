-- ============================================================
-- api_keys.quota_alert_month — track 80% alerts (avoid duplicates)
-- ============================================================
-- The cron /api/cron/quota-alerts sets this to current YYYY-MM the first
-- time we email a user about their key crossing 80% of monthly quota.
-- On the 1st of next month the cron will alert again because the value
-- no longer matches the current month.

ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS quota_alert_month TEXT;

COMMENT ON COLUMN api_keys.quota_alert_month IS
  'YYYY-MM of the last month we emailed an 80%-quota alert. Cron skips keys where this equals current month.';
