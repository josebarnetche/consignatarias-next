-- alerta_novillo_usd — la alerta que casi nunca suena.
--
-- POR QUÉ NO HAY UMBRAL POR USUARIO
-- Ya existe en el sitio una feature de alertas de precio configurables: **0 de 48
-- usuarios creó una**. Acá el umbral lo fija el sistema (±12 % entre dos medias de 20
-- ruedas), se publica, y se le dice al suscriptor de antemano cuántas veces por año va a
-- sonar. Lo único que elige es si quiere recibirla.
--
-- BACKTEST sobre 2015-2026 (1.690 ruedas, verificado por SQL el 30-ago-2026): señal en
-- 59 meses distintos de 137, unas 5 veces por año.
--
-- Aplicada vía MCP el 2026-08-30.

create table if not exists public.alerta_novillo_usd_suscriptores (
  id           bigint generated always as identity primary key,
  email        text not null unique,
  user_id      uuid,
  created_at   timestamptz not null default now(),
  source       text,
  unsubscribed_at timestamptz
);

create index if not exists alerta_novillo_activos_idx
  on public.alerta_novillo_usd_suscriptores (created_at)
  where unsubscribed_at is null;

-- Cada disparo. Es TAMBIÉN el registro de cooldown: el cron mira el último para no
-- volver a sonar antes de 30 días. Tener las dos cosas en una sola tabla evita que el
-- historial y el control de silencio se desincronicen.
create table if not exists public.alerta_novillo_usd_disparos (
  id             bigint generated always as identity primary key,
  disparada_at   timestamptz not null default now(),
  fecha_corte    date not null,
  promedio_actual numeric not null,
  promedio_previo numeric not null,
  delta          numeric not null,
  destinatarios  integer not null default 0,
  enviados       integer not null default 0,
  meta           jsonb
);

create index if not exists alerta_novillo_disparos_idx
  on public.alerta_novillo_usd_disparos (disparada_at desc);

alter table public.alerta_novillo_usd_suscriptores enable row level security;
alter table public.alerta_novillo_usd_disparos enable row level security;

comment on table public.alerta_novillo_usd_suscriptores is
  'Quien recibe la alerta del novillo en dolares. No hay umbral por usuario a proposito: lo fija el sistema y se publica.';
comment on table public.alerta_novillo_usd_disparos is
  'Cada vez que la alerta sono. Es tambien el registro de cooldown: el cron mira el ultimo disparo para no volver a sonar antes de 30 dias.';
