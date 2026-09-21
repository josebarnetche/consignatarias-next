-- VR — serie histórica de la banda de precio observado.
--
-- `vr-bandas.json` guarda SOLO la banda vigente: se recalcula y se pisa en cada
-- corrida. Eso alcanza para responder "¿cuánto vale hoy?" y no alcanza para
-- "¿se está abriendo o cerrando la dispersión?", que es la pregunta que hace
-- quien modela riesgo o calcula una prima. Esta tabla es esa serie.
--
-- Clave primaria (date, category, metodologia): la versión de metodología forma
-- parte de la identidad de la fila, no es un atributo. Cuando VR v1.1 cambie el
-- cálculo, convive con la serie v1.0 en vez de pisarla — es lo que promete
-- /metodologia/vr §7 ("las valuaciones emitidas bajo una versión anterior
-- siguen siendo reproducibles").
create table if not exists public.vr_bandas_history (
  date           date        not null,
  category       text        not null,
  metodologia    text        not null default 'VR v1.0',
  p10            numeric     not null,
  mediana        numeric     not null,
  p90            numeric     not null,
  amplitud_pct   numeric     not null,
  lotes          integer     not null,
  cabezas        integer     not null,
  ventana_dias   integer     not null,
  computed_at    timestamptz not null default now(),
  primary key (date, category, metodologia),
  -- Invariantes del VR, en la base y no solo en el código: una banda desordenada
  -- o sin base sería un dato que la metodología dice que no puede existir.
  constraint vr_bandas_history_orden  check (p10 <= mediana and mediana <= p90),
  constraint vr_bandas_history_base   check (lotes >= 10 and cabezas >= 0),
  constraint vr_bandas_history_precio check (p10 > 0)
);

-- El acceso típico es "serie de una categoría en un rango".
create index if not exists vr_bandas_history_cat_date_idx
  on public.vr_bandas_history (category, date desc);

alter table public.vr_bandas_history enable row level security;

-- Lectura pública, igual que el resto de las series de mercado. El gate del
-- producto está en /api/precios (Enterprise), no en la fila.
drop policy if exists vr_bandas_history_public_read on public.vr_bandas_history;
create policy vr_bandas_history_public_read
  on public.vr_bandas_history
  for select
  using (true);

comment on table public.vr_bandas_history is
  'Serie histórica de la banda VR (P10/mediana/P90) por categoría y fecha, sobre ventana móvil de lotes del MAG. Escribe scripts/compute-vr-bandas.mjs.';
