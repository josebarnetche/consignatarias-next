-- Seguimiento de consultas en el panel de la firma (18-10-2026).
--
-- El panel pasa a ser un CRM: cada consulta avanza por un pipeline
-- (new → contacted → converted | archived; los valores ya existían en `status`)
-- y la firma anota lo que habló. Hasta hoy el estado no se podía cambiar desde
-- ningún lado y todas las consultas quedaban en "new" para siempre.
--
-- notes        lo que la firma anotó (texto libre, lo escribe sólo el dueño).
-- updated_at   último cambio de estado o nota.
-- contacted_at la primera vez que pasó a "contactada": mide cuánto tarda en responder.
alter table public.consignataria_leads
  add column if not exists notes text,
  add column if not exists updated_at timestamptz,
  add column if not exists contacted_at timestamptz;
