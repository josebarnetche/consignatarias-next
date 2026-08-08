-- INMOBILIARIA RURAL: campos ofrecidos en arrendamiento o venta.
-- Aplicada como campos_inmobiliaria_rural. Nace del hueco de 2026-08:
-- /mercado/arrendamiento es la pagina con mas trafico del sitio y generaba leads
-- de gente BUSCANDO campo, sin un solo campo para ofrecer.
-- El precio de arrendamiento se guarda en KG DE NOVILLO por ha por año (como se
-- pacta) y el sitio lo convierte a pesos y dolares con el indice del dia.
CREATE TABLE IF NOT EXISTS public.campos (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug text UNIQUE,
  operacion text NOT NULL CHECK (operacion IN ('arrendamiento','venta','ambos')),
  hectareas numeric NOT NULL CHECK (hectareas > 0 AND hectareas <= 1000000),
  provincia text NOT NULL,
  partido text,
  aptitud text CHECK (aptitud IN ('ganadera','agricola','mixta','forestal')),
  titulo text, descripcion text, mejoras text,
  precio_kg_ha_anio numeric CHECK (precio_kg_ha_anio IS NULL OR (precio_kg_ha_anio > 0 AND precio_kg_ha_anio <= 1000)),
  precio_usd_ha numeric CHECK (precio_usd_ha IS NULL OR precio_usd_ha > 0),
  capacidad_cabezas integer,
  contacto_nombre text, contacto_email text, contacto_telefono text,
  origen text NOT NULL DEFAULT 'web' CHECK (origen IN ('web','consignataria','admin')),
  consignataria_slug text,
  status text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente','publicado','pausado','cerrado')),
  destacado boolean NOT NULL DEFAULT false,
  vistas integer NOT NULL DEFAULT 0, consultas integer NOT NULL DEFAULT 0,
  origin_ip text, notas_internas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  CONSTRAINT campos_tiene_precio CHECK (precio_kg_ha_anio IS NOT NULL OR precio_usd_ha IS NOT NULL OR status = 'pendiente'),
  CONSTRAINT campos_tiene_contacto CHECK (contacto_email IS NOT NULL OR contacto_telefono IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_campos_publicados ON public.campos (provincia, operacion) WHERE status = 'publicado';
CREATE INDEX IF NOT EXISTS idx_campos_status ON public.campos (status, created_at DESC);
CREATE OR REPLACE FUNCTION public.update_campos_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS campos_updated_at ON public.campos;
CREATE TRIGGER campos_updated_at BEFORE UPDATE ON public.campos
  FOR EACH ROW EXECUTE FUNCTION public.update_campos_updated_at();
ALTER TABLE public.campos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.campos FROM anon, authenticated;
