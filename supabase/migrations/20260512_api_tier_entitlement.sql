-- ============================================================
-- user_subscriptions.api_tier — separar PRO Usuario de Enterprise API
-- ============================================================
-- Razón: user_subscriptions.tier ('free' | 'pro') = PRO Usuario ARS $7.900,
-- da acceso de lectura premium (reportes, filtros, archivo INMAG) — NO da
-- acceso a API ni control de remates.
--
-- Enterprise (API USD 99/500/700+) es un producto distinto y debe convivir:
-- un mismo user puede ser PRO Usuario y a la vez tener API tier.

ALTER TABLE user_subscriptions
  ADD COLUMN IF NOT EXISTS api_tier TEXT NOT NULL DEFAULT 'none'
    CHECK (api_tier IN ('none','starter','growth','scale'));

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_api_tier
  ON user_subscriptions(api_tier) WHERE api_tier <> 'none';

COMMENT ON COLUMN user_subscriptions.api_tier IS
  'Enterprise API tier (none|starter|growth|scale). Independiente de tier (PRO Usuario). Un user puede tener ambos.';
