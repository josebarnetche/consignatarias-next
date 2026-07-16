-- Observabilidad de viewship de las pre-ofertas: una fila por vista de lote
-- (o de página, lote_rp NULL). Service-role only (sin policies → RLS bloquea
-- todo acceso anónimo/autenticado; las escrituras van por service client).
create table if not exists public.preoferta_views (
  id bigint generated always as identity primary key,
  remate_slug text not null,
  lote_rp text,
  visitor text,
  created_at timestamptz not null default now()
);

alter table public.preoferta_views enable row level security;

create index if not exists preoferta_views_remate_idx on public.preoferta_views (remate_slug);
create index if not exists preoferta_views_lote_idx on public.preoferta_views (remate_slug, lote_rp);
