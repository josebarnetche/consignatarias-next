-- Live remate transcription tool: sesión de stream + lotes parseados en vivo.
-- El WORKER (off-Vercel: maquina/VPS) escribe via service_role; el sitio lee público.
-- Lectura: el ticker muestra "lectura automática preliminar", NO precio oficial.

create table if not exists public.live_remate_session (
  id            text primary key,                 -- remate id/slug del calendario
  youtube_url   text,
  consignataria text,
  location      text,
  model         text,                             -- ej. 'small' | 'medium'
  status        text not null default 'live',     -- live | ended
  started_at    timestamptz not null default now(),
  last_seen     timestamptz not null default now()
);

create table if not exists public.live_remate_lot (
  id          bigserial primary key,
  session_id  text not null references public.live_remate_session(id) on delete cascade,
  audio_t     double precision,                   -- offset en segundos dentro del stream
  categoria   text,
  precio      integer,                            -- $/kg de cierre (preliminar)
  cabezas     integer,
  created_at  timestamptz not null default now()
);

create index if not exists idx_live_lot_session_created
  on public.live_remate_lot (session_id, created_at desc);

comment on table public.live_remate_session is
  'Sesión de remate en vivo. La llena el WORKER off-Vercel (scripts/live-remate-worker.py). Lectura pública, escritura service_role. Ver docs/LIVE-REMATE.md.';
comment on table public.live_remate_lot is
  'Lote parseado en vivo del cantaleo: $/kg de CIERRE PRELIMINAR (transcripción automática, ~3% en categorías limpias), NO precio oficial. Lectura pública, escritura service_role.';

-- RLS: lectura pública (es dato que de todas formas se publica), escritura solo service_role.
alter table public.live_remate_session enable row level security;
alter table public.live_remate_lot     enable row level security;

drop policy if exists live_session_read on public.live_remate_session;
create policy live_session_read on public.live_remate_session for select using (true);

drop policy if exists live_lot_read on public.live_remate_lot;
create policy live_lot_read on public.live_remate_lot for select using (true);
-- (sin policy de insert/update: solo service_role, que bypassa RLS, escribe)
