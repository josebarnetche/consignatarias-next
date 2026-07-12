-- Migration: Frigorífico PRO — vitrina de productos de carne + RFQ mayorista
-- Date: 2026-07-12
-- Reconstruye el perfil de frigorífico como superficie de venta de carne.
-- frigorifico_products = clon de consignataria_auctions (CRUD owner-scoped, RLS,
-- GET público con column-list explícita anti-leak). frigorifico_rfq = leads
-- mayoristas (clon del patrón de frigorifico_claims). Campos habilitacion_* para
-- el gate de confianza verificado (tránsito federal por constancia, NO por scraping).

-- ============================================================
--  TABLA: frigorifico_products (vitrina de la casa)
-- ============================================================
CREATE TABLE IF NOT EXISTS frigorifico_products (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  frigorifico_cuit    TEXT NOT NULL,
  sku                 TEXT,
  producto            TEXT NOT NULL,
  categoria           TEXT DEFAULT 'vacuno' CHECK (categoria IN ('vacuno','cerdo','cordero','embutidos','elaborados','combos')),
  estado              TEXT DEFAULT 'fresco' CHECK (estado IN ('fresco','curado','congelado','envasado_al_vacio')),
  presentacion        TEXT DEFAULT 'suelto' CHECK (presentacion IN ('caja','pack','suelto','media_res','entero')),
  unidad_venta        TEXT DEFAULT 'kg' CHECK (unidad_venta IN ('caja','kg','media_res','unidad','pack')),
  unidades_por_bulto  INTEGER,
  peso_unidad_g       INTEGER,
  pedido_minimo       INTEGER DEFAULT 1,
  incremento          INTEGER DEFAULT 1,
  precio_modo         TEXT DEFAULT 'consultar' CHECK (precio_modo IN ('consultar','desde','publico')),
  precio_desde        NUMERIC,
  precio_kg           NUMERIC,
  moneda              TEXT DEFAULT 'ARS',
  escala_volumen      JSONB,
  foto_url            TEXT,
  segmento            TEXT DEFAULT 'carnicerias' CHECK (segmento IN ('minorista','carnicerias','gastronomia','distribuidores')),
  disponibilidad      TEXT DEFAULT 'en_stock' CHECK (disponibilidad IN ('en_stock','bajo_pedido')),
  -- interprovincial: sólo settable si el frigorífico pasa el gate regulatorio.
  interprovincial     BOOLEAN NOT NULL DEFAULT false,
  status              TEXT DEFAULT 'active' CHECK (status IN ('active','paused')),
  created_by          TEXT NOT NULL,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_frigo_products_cuit ON frigorifico_products(frigorifico_cuit);
CREATE INDEX IF NOT EXISTS idx_frigo_products_segmento ON frigorifico_products(segmento);

ALTER TABLE frigorifico_products ENABLE ROW LEVEL SECURITY;
-- Lectura pública (la API expone column-list explícita, nunca created_by).
CREATE POLICY "Public read frigo products" ON frigorifico_products FOR SELECT USING (true);

CREATE TRIGGER trg_frigo_products_updated_at
  BEFORE UPDATE ON frigorifico_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
--  TABLA: frigorifico_rfq (leads mayoristas — pedidos de cotización)
-- ============================================================
CREATE TABLE IF NOT EXISTS frigorifico_rfq (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  frigorifico_cuit    TEXT NOT NULL,
  producto_snapshot   JSONB,
  provincia_entrega   TEXT NOT NULL,
  tipo_comprador      TEXT CHECK (tipo_comprador IN ('carniceria','distribuidor','gastronomia','mayorista')),
  nombre              TEXT,
  empresa             TEXT,
  cuit_comprador      TEXT,
  whatsapp            TEXT,
  email               TEXT NOT NULL,
  mensaje             TEXT,
  tier_al_momento     TEXT,
  estado              TEXT DEFAULT 'nuevo' CHECK (estado IN ('nuevo','cotizado','cerrado')),
  ip                  TEXT,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_frigo_rfq_cuit ON frigorifico_rfq(frigorifico_cuit);
CREATE INDEX IF NOT EXISTS idx_frigo_rfq_estado ON frigorifico_rfq(estado);

-- RLS activada, sin políticas anon (service_role only, como frigorifico_claims).
ALTER TABLE frigorifico_rfq ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_frigo_rfq_updated_at
  BEFORE UPDATE ON frigorifico_rfq
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
--  frigorifico_profiles += gate de habilitación (tránsito federal por constancia)
-- ============================================================
ALTER TABLE frigorifico_profiles ADD COLUMN IF NOT EXISTS habilitacion_nivel TEXT;          -- 'nacional' | 'provincial' | 'municipal' (declarado)
ALTER TABLE frigorifico_profiles ADD COLUMN IF NOT EXISTS habilitacion_verificada BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE frigorifico_profiles ADD COLUMN IF NOT EXISTS habilitacion_doc_url TEXT;
ALTER TABLE frigorifico_profiles ADD COLUMN IF NOT EXISTS habilitacion_nro TEXT;
ALTER TABLE frigorifico_profiles ADD COLUMN IF NOT EXISTS habilitacion_verificada_at TIMESTAMPTZ;
