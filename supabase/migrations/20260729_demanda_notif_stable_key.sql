-- Fix del spam de avisos: los IDs numéricos de remates.json cambian entre scrapes
-- (no son estables) → la idempotencia por (demanda_id, remate_id) re-avisaba remates
-- ya vistos. Nueva clave: el slug estable del remate (consignataria-tipo-provincia-fecha).
-- Aplicada como demanda_notificaciones_stable_key.
DELETE FROM public.demanda_notificaciones;
ALTER TABLE public.demanda_notificaciones ADD COLUMN IF NOT EXISTS remate_key text;
ALTER TABLE public.demanda_notificaciones ALTER COLUMN remate_key SET NOT NULL;
ALTER TABLE public.demanda_notificaciones DROP CONSTRAINT demanda_notificaciones_pkey;
ALTER TABLE public.demanda_notificaciones ADD PRIMARY KEY (demanda_id, remate_key);
ALTER TABLE public.demanda_notificaciones ALTER COLUMN remate_id DROP NOT NULL;
