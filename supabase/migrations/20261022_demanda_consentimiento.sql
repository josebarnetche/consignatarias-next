-- Consentimiento explícito para que el agente contacte al comprador y arme la operación
-- (José, 22-10-2026). Hasta acá quien dejaba un pedido en /quiero-comprar o en la tool
-- cattle_buying_request aceptaba solo AVISOS DE REMATES; el agente igual le escribía.
-- Sin este consentimiento la demanda sigue recibiendo avisos, pero no entra al agente.
alter table public.demanda_compra
  add column if not exists consiente_contacto boolean not null default false;

comment on column public.demanda_compra.consiente_contacto is
  'true = la persona aceptó que la contactemos para armar la operación (agente). false = solo avisos de remates.';
