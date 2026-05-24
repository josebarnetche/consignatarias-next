-- Lease params saved by a subscriber from the arrendamiento calculator.
-- When both are present, the monthly-close email shows THEIR canon instead of
-- a generic example. NULL = no saved lease -> average only, no example.
ALTER TABLE public.newsletter_subscribers
  ADD COLUMN IF NOT EXISTS lease_kg_ha numeric,
  ADD COLUMN IF NOT EXISTS lease_hectareas numeric;
