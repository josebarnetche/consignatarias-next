-- Pre-oferta (PRUEBA interna) — ofertas sobre lotes de un remate.
-- Marcadas is_test=true: no vinculantes. El API valida (auth + monto + cierre)
-- y escribe con service-role; RLS sin políticas públicas (solo service role).
create table if not exists public.preoferta_bids (
  id           uuid primary key default gen_random_uuid(),
  remate_slug  text not null,
  lote_rp      text not null,
  amount       bigint not null check (amount > 0),
  bidder_email text not null,
  is_test      boolean not null default true,
  created_at   timestamptz not null default now()
);

create index if not exists preoferta_bids_lote_idx
  on public.preoferta_bids (remate_slug, lote_rp, amount desc);
create index if not exists preoferta_bids_bidder_idx
  on public.preoferta_bids (remate_slug, bidder_email);

alter table public.preoferta_bids enable row level security;
-- Sin políticas: el acceso es solo vía service-role desde el API (que valida sesión).
