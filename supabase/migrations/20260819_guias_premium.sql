-- guia_purchases — compras de una sola vez de las guías premium (PDF pago).
-- Primera línea de ingreso NO recurrente del sitio: el comprador paga por Rebill
-- (payment-link isSingleUse) y el webhook (Branch 3, kind='guia_purchase') deja
-- acá la fila que habilita la descarga. La descarga se sirve por ruta gated
-- (/api/guias-premium/[slug]/download) estampando el email del comprador en cada
-- página, así que la fila ES el entitlement: sin fila no hay PDF.
--
-- El acceso se ancla al EMAIL, no al user_id: el checkout es email-first (no exige
-- cuenta), igual que PRO Consignataria. Si después el comprador se loguea con ese
-- mismo email, la fila se le atribuye (user_id) y la guía le aparece en /cuenta/guias.
-- RLS: sin políticas → solo el service role lee/escribe (las rutas usan service o
-- validan sesión server-side antes de consultar).
create table if not exists public.guia_purchases (
  id                 bigint generated always as identity primary key,
  created_at         timestamptz not null default now(),
  guia_slug          text not null,
  email              text not null,
  user_id            uuid,
  status             text not null default 'paid' check (status in ('paid','refunded')),
  amount_ars         numeric,
  rebill_payment_id  text,
  rebill_customer_id text,
  purchased_at       timestamptz not null default now(),
  download_count     integer not null default 0,
  last_downloaded_at timestamptz,
  refunded_at        timestamptz,
  meta               jsonb
);

-- Un comprador, una guía: si Rebill reintenta o el tipo vuelve a pagar, no se
-- duplica el entitlement (el upsert del webhook cae sobre esta clave). Índice
-- PLANO a propósito: el ON CONFLICT (guia_slug,email) del webhook exige un único
-- exacto sobre esas columnas — uno funcional sobre lower(email) no lo satisface.
-- El email se normaliza a minúsculas en todo el código antes de escribir.
create unique index if not exists guia_purchases_slug_email_uidx
  on public.guia_purchases (guia_slug, email);

create index if not exists guia_purchases_email_idx
  on public.guia_purchases (lower(email));
create index if not exists guia_purchases_user_idx
  on public.guia_purchases (user_id) where user_id is not null;
create index if not exists guia_purchases_created_idx
  on public.guia_purchases (created_at desc);

alter table public.guia_purchases enable row level security;

comment on table public.guia_purchases is
  'Compras one-time de guías premium (PDF pago). El entitlement se ancla al email del comprador; la descarga va por ruta gated con el PDF estampado. Service-role only.';
