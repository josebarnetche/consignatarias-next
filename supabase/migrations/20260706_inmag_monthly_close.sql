-- Cierres mensuales OFICIALES del INMAG (promedio ponderado del mes, bajado del
-- MAG haciinfo000011 rango mensual → fila "Totales"). Es el número con el que se
-- liquidan los arrendamientos; coincide exacto con el MAG (ej. jun-2026 = 4.164,558).
-- La página /mercado/arrendamiento lo muestra como "el número para tu factura".
create table if not exists inmag_monthly_close (
  year int not null,
  month int not null,
  inmag numeric not null,
  cabezas int,
  importe numeric,
  source text default 'mag_haciinfo000011',
  scraped_at timestamptz not null default now(),
  primary key (year, month)
);
alter table inmag_monthly_close enable row level security;
create policy "public_read_inmag_close" on inmag_monthly_close for select using (true);
