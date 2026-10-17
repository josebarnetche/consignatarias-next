-- Pre-ofertas operadas por la FIRMA (17-10-2026).
--
-- Hasta hoy la pre-oferta era un registro estático (src/lib/data/preofertas.ts, El Tigre)
-- y la oferta le llegaba a Memola, no a la consignataria. Esto la vuelve una función PRO
-- que la firma carga y opera sola desde su panel: arma el remate, sube los lotes con video,
-- publica, cierra, y recibe las ofertas con el contacto del interesado.
--
-- Acceso: RLS encendido y SIN políticas públicas. Todo pasa por service-role desde el
-- servidor: las rutas del dueño validan sesión + claimed_by_email (o admin), y la lectura
-- pública la hace código de servidor que filtra estado='publicada'. Así un borrador nunca
-- sale por la API anónima de Supabase.

create table if not exists public.preofertas_firma (
  id                 uuid primary key default gen_random_uuid(),
  consignataria_slug text not null,                -- slug CANÓNICO (consignataria-slugs.ts)
  titulo             text not null,                -- título del remate
  fecha_remate       date not null,
  lugar              text,
  cierre             timestamptz not null,         -- hasta cuándo se reciben ofertas
  condiciones        text,                         -- texto libre: plazos, sanidad, flete
  estado             text not null default 'borrador'
                     check (estado in ('borrador', 'publicada', 'cerrada')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists preofertas_firma_slug_idx
  on public.preofertas_firma (consignataria_slug);
create index if not exists preofertas_firma_publicadas_idx
  on public.preofertas_firma (cierre) where estado = 'publicada';

alter table public.preofertas_firma enable row level security;

create table if not exists public.preofertas_firma_lotes (
  id           uuid primary key default gen_random_uuid(),
  preoferta_id uuid not null references public.preofertas_firma (id) on delete cascade,
  orden        int not null default 0,
  titulo       text not null,
  categoria    text,
  cabezas      int check (cabezas is null or cabezas > 0),
  peso_kg      int check (peso_kg is null or peso_kg > 0),
  video_url    text,                               -- https de YouTube / Vimeo / Drive (lo valida el API)
  descripcion  text,
  precio_base  numeric check (precio_base is null or precio_base > 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists preofertas_firma_lotes_preoferta_idx
  on public.preofertas_firma_lotes (preoferta_id, orden);

alter table public.preofertas_firma_lotes enable row level security;

-- Las ofertas sobre lotes de la firma viven en la MISMA tabla que las de El Tigre
-- (preoferta_bids), enlazadas por estas dos columnas. remate_slug/lote_rp siguen siendo
-- not null: para estas filas se completan con 'firma:<id>' y el id del lote, así las
-- consultas del registro estático (que filtran por su propio slug) no las ven.
--
-- ON DELETE RESTRICT a propósito: una oferta es el contacto de un interesado; si la firma
-- borra el lote o la pre-oferta, el lead se perdería en silencio. El API responde 409 y
-- le pide cerrarla en vez de borrarla; la FK es la red de seguridad.
alter table public.preoferta_bids
  add column if not exists preoferta_firma_id uuid
    references public.preofertas_firma (id) on delete restrict,
  add column if not exists lote_firma_id uuid
    references public.preofertas_firma_lotes (id) on delete restrict,
  add column if not exists mensaje text;

-- En la pre-oferta de la firma el monto es OPCIONAL (el interesado puede dejar solo su
-- contacto) y alcanza con teléfono O email, sin sesión. El check (amount > 0) sigue
-- valiendo para los montos que sí vienen. El Tigre sigue exigiendo ambos desde su API.
alter table public.preoferta_bids alter column amount drop not null;
alter table public.preoferta_bids alter column bidder_email drop not null;

create index if not exists preoferta_bids_firma_idx
  on public.preoferta_bids (preoferta_firma_id, created_at desc)
  where preoferta_firma_id is not null;
