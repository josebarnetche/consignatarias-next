-- ============================================================
-- user_subscriptions — PRO tier para productores (demand-side)
-- ============================================================
-- Diferente de la tabla `subscriptions` existente (que es para
-- consignatarias/frigorificos como entidades). Esta es por user
-- individual: cada auth.users tiene una fila con su tier.

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro')),
  rebill_customer_id TEXT,
  rebill_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'past_due', 'cancelled')),
  current_period_end TIMESTAMPTZ,
  upgraded_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_tier ON user_subscriptions(tier);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_email ON user_subscriptions(lower(email));

-- ============================================================
-- RLS: user_subscriptions
-- ============================================================
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscription row
CREATE POLICY "Users read own subscription"
  ON user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Only service_role can insert/update (webhook + auto-provision)

-- ============================================================
-- Trigger: auto-create user_subscriptions row on auth signup
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_subscriptions (user_id, email, tier, status)
  VALUES (
    NEW.id,
    NEW.email,
    'free',
    'active'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_subscription();

-- ============================================================
-- Trigger: updated_at on row changes
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_user_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_subscriptions_updated_at ON user_subscriptions;
CREATE TRIGGER trg_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_subscriptions_updated_at();

-- ============================================================
-- consignatarias.medios_pago — campo PRO-gated del perfil
-- ============================================================
-- JSONB array de objetos:
-- [
--   { "metodo": "transferencia", "plazo_dias": 7, "comentario": "USD oficial al cierre del día" },
--   { "metodo": "cheque", "plazo_dias": 30, "comentario": "Banco propio" },
--   ...
-- ]
ALTER TABLE consignatarias
  ADD COLUMN IF NOT EXISTS medios_pago JSONB DEFAULT '[]'::JSONB;

-- ============================================================
-- COMMENTS
-- ============================================================
COMMENT ON TABLE user_subscriptions IS 'Suscripciones PRO de usuarios individuales (productores/contadores/brokers). Distinta de la tabla subscriptions que es para entidades (consignataria/frigorifico).';
COMMENT ON COLUMN user_subscriptions.tier IS 'free | pro';
COMMENT ON COLUMN user_subscriptions.status IS 'active | past_due | cancelled — del lado de Rebill';
COMMENT ON COLUMN consignatarias.medios_pago IS 'Array JSONB de métodos de pago aceptados por la consignataria. Visible solo para usuarios PRO.';
