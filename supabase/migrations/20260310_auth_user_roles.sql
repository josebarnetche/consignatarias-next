-- ============================================================
-- User Roles table for Supabase Auth integration
-- ============================================================

CREATE TABLE user_roles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('admin', 'owner')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Index for quick lookup by user_id
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);

-- ============================================================
-- RLS: user_roles
-- ============================================================
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Users can read their own role
CREATE POLICY "Users can read own role"
  ON user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Only service_role can insert/update/delete (admin API routes)
-- No insert/update/delete policies for anon/authenticated

-- ============================================================
-- RLS: consignatarias — allow owners to read their own
-- ============================================================
-- (Assumes consignatarias table already exists with RLS enabled)

-- Owners can view their own consignataria
CREATE POLICY "Owners can read own consignataria"
  ON consignatarias FOR SELECT
  USING (
    claimed_by_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- ============================================================
-- RLS: consignataria_claims — allow claimants to view own claims
-- ============================================================
CREATE POLICY "Claimants can read own claims"
  ON consignataria_claims FOR SELECT
  USING (
    claimant_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );
