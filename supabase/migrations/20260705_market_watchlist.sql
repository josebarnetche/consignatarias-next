-- Intel de mercado: watchlist de consignatarias que un usuario sigue para
-- comparar su actividad (cabezas operadas) en el MAG de referencia. Free = hasta
-- 3 firmas (gate en la API); PRO desbloquea más. RLS: cada uno ve/edita la suya.
create table if not exists market_watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  consignataria_slug text not null,
  created_at timestamptz not null default now(),
  unique (user_id, consignataria_slug)
);
alter table market_watchlist enable row level security;
create policy "own_watchlist_select" on market_watchlist for select using (auth.uid() = user_id);
create policy "own_watchlist_insert" on market_watchlist for insert with check (auth.uid() = user_id);
create policy "own_watchlist_delete" on market_watchlist for delete using (auth.uid() = user_id);
create index if not exists idx_market_watchlist_user on market_watchlist(user_id);
