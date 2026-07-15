-- Espejo del valor actual del libro de elrural por lote (observabilidad).
-- Una fila por remate; valores = { "<rp>": <monto_actual> }. Lo escribe el cron
-- scrape-preoferta-mirror (service-role). RLS sin políticas públicas.
create table if not exists public.preoferta_mirror (
  remate_slug text primary key,
  valores     jsonb not null default '{}'::jsonb,
  scraped_at  timestamptz not null default now()
);
alter table public.preoferta_mirror enable row level security;
