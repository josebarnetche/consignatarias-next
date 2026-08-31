-- price_alerts.source: agregar 'mcp'.
--
-- Hasta ahora el CHECK solo aceptaba 'web' | 'api', así que las alertas nacidas en el
-- server MCP se contaban como 'api' y quedaban indistinguibles de las de una API key.
-- El canal MCP es el que estamos tratando de hacer crecer: si no se puede separar en
-- una consulta, no se puede saber si convierte.
--
-- Aditivo: no toca filas existentes ni rompe escrituras previas.
alter table public.price_alerts drop constraint if exists price_alerts_source_check;
alter table public.price_alerts add constraint price_alerts_source_check
  check (source = any (array['web'::text, 'api'::text, 'mcp'::text]));
