-- promotion_campaigns — distribución auditable por remate y por canal.
--
-- POR QUÉ
-- "Cargá tu remate y lo distribuimos" era una afirmación sin respaldo: no había
-- forma de contestar la única pregunta que una consignataria hace en la reunión de
-- venta, que es **"¿a cuántos les llegó mi remate?"**. El newsletter semanal salía,
-- priorizaba a las firmas PRO, y no dejaba ni un registro de quién había aparecido
-- ni ante cuánta gente.
--
-- Cada fila es "este remate de esta firma salió por este canal ante N destinatarios".
--
-- DISEÑO
--  · Append-only por convención: una campaña ya enviada no se edita. Los contadores
--    de `clics` y `leads` sí se actualizan después, porque miden lo que pasó DESPUÉS
--    del envío — el envío en sí es inmutable.
--  · `destinatarios` es el dato duro y el único que se llena hoy. `clics` y `leads`
--    quedan en cero hasta que exista tracking por link; **es preferible mostrar un
--    cero honesto que un número inventado**, y el panel los omite mientras no haya
--    con qué llenarlos.
--  · `ref` agrupa una corrida (la fecha del envío semanal), para poder contar
--    campañas sin contar destinatarios dos veces.
--  · RLS habilitada sin políticas → sólo service role, igual que producer_leads.
--
-- Aplicada vía MCP el 2026-08-22.

create table if not exists public.promotion_campaigns (
  id                 bigint generated always as identity primary key,
  created_at         timestamptz not null default now(),

  canal              text not null check (canal in (
    'newsletter', 'alerta_remate', 'outreach', 'calendario', 'widget', 'demanda'
  )),

  consignataria_slug text not null,

  -- Del remate promocionado. Nullable: hay canales que promocionan a la firma
  -- entera y no a un remate puntual.
  remate_id          integer,
  remate_title       text,
  remate_date        date,

  destinatarios      integer not null default 0,
  clics              integer not null default 0,
  leads              integer not null default 0,

  /** Identificador de la corrida — permite agrupar un envío semanal completo. */
  ref                text,
  meta               jsonb
);

create index if not exists promotion_campaigns_slug_idx    on public.promotion_campaigns (consignataria_slug, created_at desc);
create index if not exists promotion_campaigns_canal_idx   on public.promotion_campaigns (canal, created_at desc);
create index if not exists promotion_campaigns_ref_idx     on public.promotion_campaigns (ref);

alter table public.promotion_campaigns enable row level security;

comment on table public.promotion_campaigns is
  'Distribución auditable: qué remate de qué firma salió por qué canal y ante cuántos. Responde "¿a cuántos les llegó mi remate?". Service-role only.';
comment on column public.promotion_campaigns.destinatarios is
  'Cuántos lo recibieron de verdad (envíos exitosos), no cuántos estaban en la lista.';
comment on column public.promotion_campaigns.clics is
  'Cero hasta que haya tracking por link. Un cero honesto es mejor que un número inventado.';
