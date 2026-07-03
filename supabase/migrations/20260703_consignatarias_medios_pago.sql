-- Reconciliación: el feature "medios de pago" (api/consignatarias/medios-pago + DAL
-- getConsignatariaProfile + UI MediosPagoSummary) estaba construido pero la columna
-- nunca se agregó a prod (drift) → el endpoint fallaba. Aplicada como
-- consignatarias_medios_pago_2026_07_03.
ALTER TABLE public.consignatarias
  ADD COLUMN IF NOT EXISTS medios_pago jsonb NOT NULL DEFAULT '[]'::jsonb;
COMMENT ON COLUMN public.consignatarias.medios_pago IS
  'Array JSON de medios de pago aceptados: [{"metodo": "...", "plazo_dias": N}]';
