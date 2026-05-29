-- Trial-expiry nudges for free-credits Enterprise invites.
-- We send two subtle, usage-aware emails before the 30-day free trial ends
-- (7 days and 3 days out) promoting the full API + the Growth plan.
-- No auto-pause: access continues; these columns only dedup the two sends.

alter table public.user_subscriptions
  add column if not exists trial_nudge_7d_at timestamptz,
  add column if not exists trial_nudge_3d_at timestamptz;

comment on column public.user_subscriptions.trial_nudge_7d_at is
  'When the 7-days-left trial nudge email was sent (free_credits invites). NULL = not yet sent.';
comment on column public.user_subscriptions.trial_nudge_3d_at is
  'When the 3-days-left trial nudge email was sent (free_credits invites). NULL = not yet sent.';
