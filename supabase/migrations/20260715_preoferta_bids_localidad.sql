-- Localidad del ofertante (Corrientes) — para rutear el lead al rep de Reggi por zona.
alter table public.preoferta_bids add column if not exists bidder_localidad text;
