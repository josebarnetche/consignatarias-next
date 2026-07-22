-- Negocio comisionista: capturamos hectáreas (arrendamiento, distinto de cabezas)
-- y el precio deseado (el spread contra el mercado es el negocio).
-- Aplicada vía MCP el 2026-07-22; este archivo la deja versionada.
alter table public.producer_leads add column if not exists hectareas integer;
alter table public.producer_leads add column if not exists desired_price_ars numeric;
comment on column public.producer_leads.hectareas is 'Superficie del campo (arrendamiento). Para venta de hacienda se usa head_count.';
comment on column public.producer_leads.desired_price_ars is 'Precio que pide el productor (venta: $/kg; arrendamiento: canon). Base del spread.';
