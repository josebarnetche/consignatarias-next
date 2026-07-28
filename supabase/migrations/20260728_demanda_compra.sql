-- GROWTH ENGINE: demanda de compra de hacienda ("quiero comprar 300 terneros en
-- Corrientes"). Cada demanda: (1) devuelve matching inmediato contra los remates
-- programados, (2) queda viva y el cron demanda-matching avisa al comprador de
-- cada remate nuevo que matchee, (3) es un LEAD (comprador con intención + volumen
-- + contacto) que alimenta el motor comisionista / PRO. Entra por MCP (agentes)
-- o por la web (/quiero-comprar).
CREATE TABLE IF NOT EXISTS public.demanda_compra (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  categoria text NOT NULL,
  cabezas integer CHECK (cabezas IS NULL OR (cabezas > 0 AND cabezas <= 100000)),
  provincia text,
  email text,
  webhook_url text,
  origen text NOT NULL DEFAULT 'mcp' CHECK (origen IN ('mcp','web')),
  origin_ip text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','done')),
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT demanda_contacto CHECK (email IS NOT NULL OR webhook_url IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_demanda_compra_active ON public.demanda_compra (status) WHERE status = 'active';

-- Qué remate ya se le avisó a qué demanda (idempotencia del cron; los matches
-- devueltos en la creación se siembran acá para no re-avisar lo ya visto).
CREATE TABLE IF NOT EXISTS public.demanda_notificaciones (
  demanda_id bigint NOT NULL REFERENCES public.demanda_compra(id) ON DELETE CASCADE,
  remate_id integer NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (demanda_id, remate_id)
);

ALTER TABLE public.demanda_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demanda_notificaciones ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.demanda_compra FROM anon, authenticated;
REVOKE ALL ON public.demanda_notificaciones FROM anon, authenticated;
