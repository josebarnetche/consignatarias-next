-- La escalera de pujas del bloque: cada precio cantado, en orden de locución.
-- El frontend la reproduce a ~1/s con flash verde (en un remate solo sube).
-- (Aplicada a prod vía MCP el 2026-08-10.)
alter table public.live_remate_transcript
  add column if not exists pujas jsonb not null default '[]'::jsonb;
