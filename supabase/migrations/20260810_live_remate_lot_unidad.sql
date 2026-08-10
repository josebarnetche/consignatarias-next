-- Remates de cabaña/reproductores cantan por CABEZA (millones), no $/kg.
-- Sin esta columna el ticker rotula todo "/kg". Aditiva, default kg.
-- (Aplicada a prod vía MCP el 2026-08-10.)
alter table public.live_remate_lot
  add column if not exists unidad text not null default 'kg'
  check (unidad in ('kg', 'cabeza'));
