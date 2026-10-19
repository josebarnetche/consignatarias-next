-- El agente que trabaja los leads de hacienda hasta el cierre (19-10-2026).
-- Ver src/lib/agente/. Solo el service role lee y escribe: RLS sin políticas.

-- Un caso por lead de hacienda que el agente tomó.
create table if not exists public.agente_casos (
  lead_id bigint primary key references public.producer_leads(id) on delete cascade,
  lado text not null check (lado in ('vende', 'compra')),
  estado text not null default 'nuevo' check (estado in (
    'nuevo', 'pidiendo_datos', 'ofreciendo', 'presentado', 'cerrado',
    'sin_contraparte', 'dormido', 'retirado', 'descartado', 'escalado'
  )),
  -- Lo que se sabe de la hacienda: cabezas, categoria, zona, provincia, peso_kg,
  -- disponible, precio_pedido_kg. Se completa con lo que el productor contesta.
  datos jsonb not null default '{}'::jsonb,
  motivo text,
  recordatorios int not null default 0,
  tandas int not null default 0,
  proximo_at timestamptz not null default now(),
  creado_at timestamptz not null default now(),
  actualizado_at timestamptz not null default now()
);
create index if not exists agente_casos_proximo on public.agente_casos (estado, proximo_at);

-- A quién se le ofreció cada caso, y en qué quedó.
create table if not exists public.agente_ofertas (
  id bigserial primary key,
  lead_id bigint not null references public.producer_leads(id) on delete cascade,
  tipo text not null check (tipo in ('frigorifico', 'firma', 'lead')),
  ref text not null,
  nombre text not null,
  email text not null,
  estado text not null default 'enviada' check (estado in (
    'enviada', 'acepto', 'rechazo', 'sin_respuesta', 'presentada', 'cerrada', 'caida'
  )),
  -- Texto con el que la contraparte aceptó la comisión: es la constancia.
  aceptacion text,
  cierre jsonb,
  seguimientos int not null default 0,
  enviada_at timestamptz not null default now(),
  respondida_at timestamptz,
  presentada_at timestamptz,
  proximo_at timestamptz,
  unique (lead_id, tipo, ref)
);
create index if not exists agente_ofertas_email on public.agente_ofertas (email);

-- Cada correo que sale o entra. message_id único = no se procesa dos veces.
create table if not exists public.agente_mensajes (
  id bigserial primary key,
  lead_id bigint references public.producer_leads(id) on delete set null,
  oferta_id bigint references public.agente_ofertas(id) on delete set null,
  dir text not null check (dir in ('in', 'out')),
  de text,
  para text,
  asunto text,
  cuerpo text,
  message_id text unique,
  in_reply_to text,
  clasificacion jsonb,
  creado_at timestamptz not null default now()
);
create index if not exists agente_mensajes_lead on public.agente_mensajes (lead_id, creado_at);

-- Quien pidió no recibir más: no se le escribe nunca más, por ningún caso.
create table if not exists public.agente_bajas (
  email text primary key,
  motivo text,
  creado_at timestamptz not null default now()
);

alter table public.agente_casos enable row level security;
alter table public.agente_ofertas enable row level security;
alter table public.agente_mensajes enable row level security;
alter table public.agente_bajas enable row level security;
