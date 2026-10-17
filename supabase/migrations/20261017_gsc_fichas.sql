-- gsc_fichas — "Lo que buscan en Google sobre su firma" (17-10-2026).
--
-- Por cada ficha /consignatarias/<slug>: impresiones, clics y posición de Google Search
-- Console, y el top 25 de consultas que la mostraron, a 28 y a 90 días. Lo escribe el
-- cron semanal /api/cron/gsc-fichas (o scripts/gsc-fichas-local.mjs) con el service
-- role; lo leen el panel PRO, el reporte mensual y el PDF de la propuesta, también por
-- el servidor. Se guarda en vez de pedirlo en vivo porque Google tiene cuota y tarda.
--
-- RLS encendido y SIN políticas: anon y authenticated no leen nada. Las consultas de
-- una firma son parte de lo que se cobra en PRO (y dicen cómo la busca su clientela):
-- no pueden salir con la clave pública que va en el código del sitio.
create table if not exists public.gsc_fichas (
  slug          text        not null,
  periodo_dias  integer     not null check (periodo_dias > 0),
  desde         date        not null,
  hasta         date        not null,
  impresiones   integer     not null default 0,
  clics         integer     not null default 0,
  posicion      numeric(6,1),
  -- [{ "query": text, "impresiones": int, "clics": int, "posicion": numeric }], top 25
  consultas     jsonb       not null default '[]'::jsonb,
  actualizado   timestamptz not null default now(),
  primary key (slug, periodo_dias)
);

comment on table public.gsc_fichas is
  'GSC por ficha de consignataria (28 y 90 días). Escribe /api/cron/gsc-fichas con service role; sin políticas públicas.';

alter table public.gsc_fichas enable row level security;
revoke all on public.gsc_fichas from anon, authenticated;
