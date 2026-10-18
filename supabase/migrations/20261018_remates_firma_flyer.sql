-- Remates de la firma: flyer y corrección de remates del calendario (18-10-2026).
--
-- Hasta hoy la firma podía cargar un remate nuevo, pero los que el sitio encuentra solo
-- (remates.json) le aparecían en el panel como "automáticos" y de sólo lectura: no podía
-- corregir la hora, sumar el catálogo ni subir el flyer del remate que ya figuraba.
--
-- flyer_url        imagen pública en el bucket consignataria-assets (flyers/<slug>/…).
-- reemplaza_clave  si la fila corrige un remate del calendario, la clave de ESE remate
--                  tal como estaba: "AAAA-MM-DD|LOCALIDAD" (fecha + localidad sin acentos,
--                  en mayúsculas). Los ids de remates.json se renumeran en cada scrape,
--                  así que no sirven para enlazar; la fecha y la localidad sí. Se guarda
--                  la clave ORIGINAL para que, si la firma cambia la fecha o el lugar, se
--                  siga sabiendo qué remate del calendario reemplaza.
alter table public.consignataria_auctions
  add column if not exists flyer_url text,
  add column if not exists reemplaza_clave text;
