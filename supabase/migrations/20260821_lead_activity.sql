-- lead_activity — bitácora append-only de lo que se le hace a cada lead.
--
-- POR QUÉ
-- Hasta hoy un lead tenía UN estado y UN campo `notes` que se pisaba a sí mismo.
-- Con eso se puede saber dónde está un lead, pero no qué se hizo para llevarlo ahí:
-- si se llamó, cuándo, qué contestó el productor, a qué firma se le ofreció, si la
-- firma respondió. José está trabajando los negocios por teléfono y ese trabajo no
-- quedaba registrado en ningún lado — se perdía en su cabeza y en su historial de
-- llamadas.
--
-- Esta tabla es el CRM mínimo: una fila por cosa que pasó, nunca se edita ni se
-- borra. El estado del lead sigue viviendo en `producer_leads.status` (es la foto);
-- acá está la película.
--
-- DISEÑO
--  · Append-only por convención: no hay UPDATE en el código. Si algo se cargó mal,
--    se agrega una entrada que lo corrige. La bitácora de un negocio no se reescribe.
--  · `kind` distingue lo que pasó de verdad (llamada, whatsapp) de lo que registra
--    el sistema (estado, ruteo) — así se puede separar "trabajo humano" de "ruido
--    de sistema" al mirar el historial.
--  · `actor` guarda el email de quien lo hizo. Hoy siempre es José; el día que la
--    firma cargue actividad desde su panel, sirve para saber quién escribió qué.
--  · RLS habilitada sin políticas → solo el service role. Igual que producer_leads.
--
-- Aplicada vía MCP el 2026-08-21.

create table if not exists public.lead_activity (
  id         bigint generated always as identity primary key,
  lead_id    bigint not null references public.producer_leads(id) on delete cascade,
  created_at timestamptz not null default now(),

  -- Qué pasó. 'estado' y 'ruteo' los escribe el sistema en cada PATCH; el resto
  -- los carga una persona.
  kind       text not null check (kind in (
    'llamada', 'whatsapp', 'email', 'reunion', 'nota', 'estado', 'ruteo', 'sistema'
  )),

  -- Cómo salió. Nullable: una nota no tiene resultado.
  outcome    text check (outcome in (
    'sin_respuesta', 'contesto', 'interesado', 'no_interesa', 'pendiente', 'cerrado'
  )),

  body       text,
  actor      text,
  meta       jsonb
);

create index if not exists lead_activity_lead_idx    on public.lead_activity (lead_id, created_at desc);
create index if not exists lead_activity_created_idx on public.lead_activity (created_at desc);
create index if not exists lead_activity_kind_idx    on public.lead_activity (kind);

alter table public.lead_activity enable row level security;

comment on table public.lead_activity is
  'Bitácora append-only por lead: llamadas, mensajes, cambios de estado y ruteos. La película del negocio; la foto está en producer_leads.status. Service-role only.';
comment on column public.lead_activity.kind is
  'llamada/whatsapp/email/reunion/nota = trabajo humano · estado/ruteo/sistema = escrito por el backend en cada PATCH.';
comment on column public.lead_activity.actor is
  'Email de quien registró la actividad. Null = lo escribió el sistema.';
