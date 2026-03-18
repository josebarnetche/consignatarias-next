-- User DT-e Documents (Documento de Tránsito Electrónico)
-- Lock-in strategy: User-provided data they don't want to lose

CREATE TABLE IF NOT EXISTS user_dtes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consignataria_id UUID REFERENCES consignatarias(id) ON DELETE SET NULL,
  
  -- Document identification
  numero_dte TEXT,
  fecha_emision DATE,
  fecha_movimiento DATE,
  
  -- Origin
  renspa_origen TEXT,
  titular_origen TEXT,
  establecimiento_origen TEXT,
  
  -- Destination  
  renspa_destino TEXT,
  titular_destino TEXT,
  establecimiento_destino TEXT,
  
  -- Livestock details
  especie TEXT DEFAULT 'bovino',
  cantidad_cabezas INTEGER,
  categorias JSONB DEFAULT '{}',
  peso_total_kg INTEGER,
  motivo TEXT,
  
  -- OCR metadata
  imagen_url TEXT,
  ocr_raw_text TEXT,
  ocr_confidence FLOAT,
  user_edited BOOLEAN DEFAULT false,
  
  -- User notes (lock-in: personal context)
  notas TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_especie CHECK (especie IN ('bovino', 'ovino', 'porcino', 'equino', 'caprino')),
  CONSTRAINT valid_motivo CHECK (motivo IS NULL OR motivo IN ('remate', 'faena', 'invernada', 'cria', 'recria', 'engorde', 'exposicion'))
);

-- Indexes for common queries
CREATE INDEX idx_user_dtes_user_id ON user_dtes(user_id);
CREATE INDEX idx_user_dtes_fecha_movimiento ON user_dtes(fecha_movimiento DESC);
CREATE INDEX idx_user_dtes_consignataria ON user_dtes(consignataria_id);
CREATE INDEX idx_user_dtes_renspa_origen ON user_dtes(renspa_origen);

-- Row Level Security
ALTER TABLE user_dtes ENABLE ROW LEVEL SECURITY;

-- Users can only see their own DTEs
CREATE POLICY "Users can view own DTEs" ON user_dtes
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert their own DTEs
CREATE POLICY "Users can insert own DTEs" ON user_dtes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own DTEs
CREATE POLICY "Users can update own DTEs" ON user_dtes
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can only delete their own DTEs
CREATE POLICY "Users can delete own DTEs" ON user_dtes
  FOR DELETE USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_user_dtes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_dtes_updated_at
  BEFORE UPDATE ON user_dtes
  FOR EACH ROW
  EXECUTE FUNCTION update_user_dtes_updated_at();

-- Comments for documentation
COMMENT ON TABLE user_dtes IS 'User-uploaded DT-e documents for livestock transit tracking';
COMMENT ON COLUMN user_dtes.categorias IS 'JSON object: {"novillos": 50, "vaquillonas": 30, ...}';
COMMENT ON COLUMN user_dtes.notas IS 'User notes - personal context that creates lock-in';
