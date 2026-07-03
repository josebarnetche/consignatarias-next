-- Reconciliación repo↔prod (Proyecto C): user_dtes nunca se aplicó a prod (drift).
-- El feature DT-e (17 refs) fallaba en silencio. Aplicada como reconcile_user_dtes_2026_07_03.
CREATE TABLE IF NOT EXISTS public.user_dtes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consignataria_id UUID REFERENCES public.consignatarias(id) ON DELETE SET NULL,
  numero_dte TEXT, fecha_emision DATE, fecha_movimiento DATE,
  renspa_origen TEXT, titular_origen TEXT, establecimiento_origen TEXT,
  renspa_destino TEXT, titular_destino TEXT, establecimiento_destino TEXT,
  especie TEXT DEFAULT 'bovino', cantidad_cabezas INTEGER, categorias JSONB DEFAULT '{}',
  peso_total_kg INTEGER, motivo TEXT, imagen_url TEXT, ocr_raw_text TEXT, ocr_confidence FLOAT,
  user_edited BOOLEAN DEFAULT false, notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_especie CHECK (especie IN ('bovino','ovino','porcino','equino','caprino')),
  CONSTRAINT valid_motivo CHECK (motivo IS NULL OR motivo IN ('remate','faena','invernada','cria','recria','engorde','exposicion'))
);
CREATE INDEX IF NOT EXISTS idx_user_dtes_user_id ON public.user_dtes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_dtes_fecha_movimiento ON public.user_dtes(fecha_movimiento DESC);
CREATE INDEX IF NOT EXISTS idx_user_dtes_consignataria ON public.user_dtes(consignataria_id);
CREATE INDEX IF NOT EXISTS idx_user_dtes_renspa_origen ON public.user_dtes(renspa_origen);
ALTER TABLE public.user_dtes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own DTEs" ON public.user_dtes;
DROP POLICY IF EXISTS "Users can insert own DTEs" ON public.user_dtes;
DROP POLICY IF EXISTS "Users can update own DTEs" ON public.user_dtes;
DROP POLICY IF EXISTS "Users can delete own DTEs" ON public.user_dtes;
CREATE POLICY "Users can view own DTEs"   ON public.user_dtes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own DTEs" ON public.user_dtes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own DTEs" ON public.user_dtes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own DTEs" ON public.user_dtes FOR DELETE USING (auth.uid() = user_id);
CREATE OR REPLACE FUNCTION public.update_user_dtes_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS user_dtes_updated_at ON public.user_dtes;
CREATE TRIGGER user_dtes_updated_at BEFORE UPDATE ON public.user_dtes
  FOR EACH ROW EXECUTE FUNCTION public.update_user_dtes_updated_at();
