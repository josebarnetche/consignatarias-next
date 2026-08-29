-- producto_subscriptions — suscripciones a productos de datos del catálogo
-- (`src/lib/productos-datos.ts`). El primero: el Parte semanal del mercado.
--
-- POR QUÉ UNA TABLA NUEVA
--  · `informe_purchases` es compra única por diseño: no vence, no se cancela, no se
--    renueva. Meterle un estado de suscripción rompería esa garantía, que es lo que le
--    prometemos al comprador de un informe.
--  · `subscriptions` es de ENTIDADES (una consignataria, un frigorífico): su llave es
--    entity_slug + entity_type, y acá el titular es una persona con su email.
--  · `user_subscriptions` es el tier de la cuenta (free/pro) y el tier del API. Un
--    producto suelto no es un tier: alguien puede tener el parte semanal y seguir siendo
--    free en todo lo demás.
--
-- LA REGLA DEL ACCESO, HEREDADA DEL RESTO DEL REPO
-- Cancelar NO corta el acceso: se honra hasta `current_period_end`, porque el período ya
-- está pagado. Por eso `status='cancelled'` con un período vigente sigue habilitando la
-- descarga, y el corte real lo decide la fecha, no el estado.
--
-- Aplicada vía MCP el 2026-08-29.

create table if not exists public.producto_subscriptions (
  id                 bigint generated always as identity primary key,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  producto_slug      text not null,

  -- Igual que en las compras: la llave es el EMAIL, porque el checkout es email-first y
  -- no exige cuenta. `user_id` se completa después, la primera vez que entra.
  email              text not null,
  user_id            uuid,

  status             text not null default 'active'
                     check (status in ('active','cancelled','past_due')),

  -- Hasta cuándo está pagado. **Es el que gobierna el acceso**, no `status`.
  current_period_end timestamptz,
  started_at         timestamptz not null default now(),
  cancelled_at       timestamptz,

  amount_ars         numeric,
  rebill_subscription_id text,
  rebill_customer_id     text,

  -- Última vez que se le mandó el entregable. Para un producto semanal es la diferencia
  -- entre "está suscripto" y "está recibiendo": si esto queda viejo, alguien está
  -- pagando y no le llega nada.
  last_delivered_at  timestamptz,
  delivery_count     integer not null default 0,

  factura_razon_social text,
  factura_cuit         text,
  factura_emitida_at   timestamptz,

  meta               jsonb
);

-- Un titular, un producto. Sostiene el ON CONFLICT del webhook: un reintento de Rebill o
-- una segunda alta del mismo email no duplican la suscripción.
create unique index if not exists producto_subscriptions_producto_email_uidx
  on public.producto_subscriptions (producto_slug, email);

-- "Qué tiene esta persona" — la consulta de /cuenta/informes.
create index if not exists producto_subscriptions_email_idx
  on public.producto_subscriptions (lower(email));

create index if not exists producto_subscriptions_user_idx
  on public.producto_subscriptions (user_id) where user_id is not null;

-- El webhook llega con el id de Rebill y tiene que encontrar la fila por ahí.
create index if not exists producto_subscriptions_rebill_idx
  on public.producto_subscriptions (rebill_subscription_id)
  where rebill_subscription_id is not null;

-- "A quiénes les toca el envío de esta semana": activas o canceladas con período vigente.
create index if not exists producto_subscriptions_entrega_idx
  on public.producto_subscriptions (producto_slug, current_period_end)
  where status in ('active','cancelled');

alter table public.producto_subscriptions enable row level security;

comment on table public.producto_subscriptions is
  'Suscripciones a productos de datos del catalogo (parte semanal, etc). El acceso lo gobierna current_period_end, no status: una cancelada con periodo vigente sigue habilitada. Service-role only.';
comment on column public.producto_subscriptions.current_period_end is
  'Hasta cuando esta pagado. ES el que decide el acceso. Cancelar no corta: el periodo ya se cobro.';
comment on column public.producto_subscriptions.last_delivered_at is
  'Ultimo envio del entregable. Viejo con suscripcion activa = esta pagando y no le llega nada.';
