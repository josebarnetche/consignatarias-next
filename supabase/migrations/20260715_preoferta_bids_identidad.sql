-- Identidad del ofertante (para vetting InfoExperto) + gestión del relay a elrural.
alter table public.preoferta_bids
  add column if not exists bidder_name  text,
  add column if not exists bidder_cuit  text,
  add column if not exists bidder_phone text,
  add column if not exists relayed_at   timestamptz,   -- cuando se cargó en elrural
  add column if not exists infoexperto  text;          -- nota/estado del report crediticio
