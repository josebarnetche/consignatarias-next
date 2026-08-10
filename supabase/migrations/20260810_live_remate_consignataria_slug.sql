-- Vincula la sesión de remate en vivo a la ficha de la consignataria.
-- Aditiva: permite que el ticker aparezca en /consignatarias/[slug] cuando
-- la sesión activa pertenece a esa firma. Ver docs/LIVE-REMATE.md.
-- (Aplicada a prod vía MCP el 2026-08-10.)
alter table public.live_remate_session
  add column if not exists consignataria_slug text;

create index if not exists idx_live_session_slug
  on public.live_remate_session (consignataria_slug)
  where status = 'live';
