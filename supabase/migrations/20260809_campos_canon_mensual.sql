-- El canon ganadero se pacta en KG DE NOVILLO POR HECTAREA POR MES, liquidado con
-- el promedio del mes anterior. Publicarlo "por año" era una traduccion nuestra que
-- no habla el idioma del negocio (corregido por Jose, 2026-08-09).
-- Aplicada como campos_canon_mensual.
ALTER TABLE public.campos ADD COLUMN IF NOT EXISTS precio_kg_ha_mes numeric
  CHECK (precio_kg_ha_mes IS NULL OR (precio_kg_ha_mes > 0 AND precio_kg_ha_mes <= 100));
UPDATE public.campos SET precio_kg_ha_mes = ROUND(precio_kg_ha_anio / 12.0, 2)
  WHERE precio_kg_ha_anio IS NOT NULL AND precio_kg_ha_mes IS NULL;
ALTER TABLE public.campos DROP CONSTRAINT IF EXISTS campos_tiene_precio;
ALTER TABLE public.campos ADD CONSTRAINT campos_tiene_precio
  CHECK (precio_kg_ha_mes IS NOT NULL OR precio_usd_ha IS NOT NULL OR status = 'pendiente');
