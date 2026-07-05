-- El worker de mag-lots (haciinfo000007) hace upsert con
-- onConflict='date,mag_consignataria_id,tipo,pesada,remitente,category',
-- pero no existía una constraint única que matcheara esa especificación →
-- TODO insert fallaba con "no unique or exclusion constraint matching the
-- ON CONFLICT specification" y la tabla quedaba vacía.
-- NULLS NOT DISTINCT para que las filas con pesada NULL también dedupliquen.
create unique index if not exists mag_lots_natural_key
  on mag_consignataria_sales_lots (date, mag_consignataria_id, tipo, pesada, remitente, category)
  nulls not distinct;
