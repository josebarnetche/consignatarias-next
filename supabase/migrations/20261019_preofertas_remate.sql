-- Pre-ofertas atadas a un remate (18-10-2026).
--
-- La firma ya no escribe de nuevo el nombre, la fecha y el lugar del remate: elige uno
-- de sus remates del panel y la pre-oferta se arma con esos datos. `remate_clave` es la
-- clave estable del remate, "AAAA-MM-DD|LOCALIDAD" (claveRemate en lib/dal/auctions):
-- los ids de remates.json se renumeran en cada scrape y no sirven para enlazar.
alter table public.preofertas_firma add column if not exists remate_clave text;
create index if not exists preofertas_firma_remate_idx on public.preofertas_firma (consignataria_slug, remate_clave);
