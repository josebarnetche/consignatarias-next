-- Transcripción cruda del cantaleo, bloque a bloque, para mostrarla en vivo
-- como subtítulo en /remates/en-vivo y en la ficha. Mismo modelo de permisos
-- que live_remate_lot: lectura pública, escritura service_role.
-- (Aplicada a prod vía MCP el 2026-08-10.)
create table if not exists public.live_remate_transcript (
  id          bigserial primary key,
  session_id  text not null references public.live_remate_session(id) on delete cascade,
  audio_t     double precision,
  texto       text not null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_live_transcript_session_created
  on public.live_remate_transcript (session_id, created_at desc);

comment on table public.live_remate_transcript is
  'Bloques de transcripción automática del cantaleo (Whisper local). Rotular SIEMPRE como transcripción automática preliminar.';

alter table public.live_remate_transcript enable row level security;

drop policy if exists live_transcript_read on public.live_remate_transcript;
create policy live_transcript_read on public.live_remate_transcript for select using (true);
