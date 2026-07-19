-- producer_leads — top-of-funnel, ROUTEABLE producer lead (distinto de
-- consignataria_leads, que es una consulta atada a un perfil ya elegido).
-- Motor de lead-gen a performance: capturamos intención del productor en las
-- herramientas gratis, la ruteamos a una consignataria (que NO usa la web: se le
-- avisa por WhatsApp desde el backoffice) y cobramos 1% sobre la operación cerrada.
-- Aplicada vía MCP el 2026-07-18; este archivo la deja versionada (source of truth).
-- RLS: sin políticas → solo el service role (que bypassa RLS) lee/escribe.
create table if not exists public.producer_leads (
  id             bigint generated always as identity primary key,
  created_at     timestamptz not null default now(),
  intent         text not null check (intent in ('vender','comprar','arrendar','consignar','tasar')),
  category       text,
  head_count     integer,
  province       text,
  zona           text,
  name           text not null,
  phone          text,
  email          text,
  message        text,
  source         text,
  estimated_value_ars numeric,
  fee_pct        numeric not null default 1.0,
  fee_ars        numeric,
  status         text not null default 'new' check (status in ('new','routed','contacted','won','lost')),
  routed_to_slug text,
  routed_at      timestamptz,
  contacted_at   timestamptz,
  closed_at      timestamptz,
  notes          text,
  ip_hash        text
);

create index if not exists producer_leads_status_idx  on public.producer_leads (status);
create index if not exists producer_leads_created_idx  on public.producer_leads (created_at desc);
create index if not exists producer_leads_province_idx on public.producer_leads (province);
create index if not exists producer_leads_routed_idx   on public.producer_leads (routed_to_slug);

alter table public.producer_leads enable row level security;
comment on table public.producer_leads is 'Lead-gen a performance: intención de productor capturada en herramientas gratis, ruteada a consignataria, fee 1% al cierre. Service-role only.';
