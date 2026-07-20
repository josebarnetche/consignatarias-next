-- El único contexto de captura de leads es arrendamiento (los calculadores/remates
-- no piden contacto comercial). Arrendamiento tiene dos direcciones reales: ofrecer
-- un campo para arrendar vs. buscar uno. Agregamos ambos intents al CHECK.
-- Aplicada vía MCP el 2026-07-20; este archivo la deja versionada.
alter table public.producer_leads drop constraint producer_leads_intent_check;
alter table public.producer_leads add constraint producer_leads_intent_check
  check (intent in ('vender','comprar','arrendar','consignar','tasar','arrendar_ofrezco','arrendar_busco'));
