-- producer_leads: dos estados nuevos para el triage de la captura.
--
-- POR QUÉ
-- Al 21-ago-2026, cuatro de las doce filas de `producer_leads` no eran leads: dos
-- cargas del mismo proveedor de etiquetas para frigoríficos, una que decía sólo
-- "CONTACTO" sin provincia ni cabezas, y un duplicado exacto (mismo email, mismo
-- pedido, mismo día). Con el ruteo todavía manual eso era ruido; cuando el ruteo
-- salga solo, es la primera impresión que una consignataria tiene del producto.
--
-- `src/lib/leads/triage.ts` clasifica en la captura y necesita poder escribir
-- 'needs_review'. El CHECK anterior sólo permitía new/routed/contacted/won/lost, así
-- que el insert fallaba.
--
-- SEMÁNTICA
--   needs_review → lo puso el triage automático: no se puede rutear, o parece una
--                  oferta de proveedor. Ni el Ovejero ni el ruteo automático lo
--                  tocan. Una persona lo revisa y lo devuelve a 'new' o lo descarta.
--   discarded    → decisión HUMANA desde /admin/leads. El triage nunca descarta solo:
--                  tirar un lead bueno es peor que dejar pasar un spam.
--
-- El motivo va siempre en `notes`, para que la revisión no tenga que adivinar.

alter table public.producer_leads
  drop constraint if exists producer_leads_status_check;

alter table public.producer_leads
  add constraint producer_leads_status_check
  check (status = any (array[
    'new'::text,
    'needs_review'::text,
    'routed'::text,
    'contacted'::text,
    'won'::text,
    'lost'::text,
    'discarded'::text
  ]));
