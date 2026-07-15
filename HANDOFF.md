# Handoff — consignatarias.com.ar — 2026-07-07

## Estado actual (lo que se hizo esta sesión)

Sesión centrada en **diagnóstico de analytics + observabilidad interna** (no se tocó marca ni contenido).

- **Diagnóstico de analytics profundo (07-jul)** sobre Supabase `nyqkgorazkwcufkzxmhd` (capa first-party `visitors` + `value_events` + RPC `visitor_stats()`):
  - **Arrendamiento es el PMF**: `/mercado/arrendamiento` = página más engaged (48 eventos de valor/7d, ~5x la siguiente), fuente de suscriptores que más crece (`alerta-arrendamiento`, 5 altas en 3 días) y **la más citada por IA** (ChatGPT la referencia 68 veces en `ai_referrals`).
  - **Monetización real flaca**: 1 usuario pro + 2 subs API (1 growth, 1 starter). Consignataria-paga-perfil (`subscriptions`) = 0. Embudo pro fuga (61 `pro_prompt_view` → 1 pro).
  - **NO marketplace** (tipo Muu): el tráfico es de índice/dato, sin intención transaccional. Confirmado por datos.
- **Cambio de código: unificación de captura de arrendamiento** (commit `7b6e7aa`, ya en origin/main y live). Se subió `ArrendamientoLiquidacionSignup` al slot de alta intención de `/mercado/arrendamiento` y se removió la alerta genérica. Un solo embudo que captura el contrato (kg/ha + ha).
- **Cambio de código: instrumentación del MCP** (commit `0f3b814`, live). `/api/mcp` ahora loguea cada request como `mcp_call` en `ops_events` (método, tool, args con api_key redactada, clientInfo, UA, IP, latencia). **Verificado en prod.**
- **Hallazgo MCP**: el server **ya lo descubren/indexan registries del ecosistema** (Siglume MCP Router, Glimind/SentinelOracle, agent-tools.cloud, MCPScoringEngine) — discovery activo, pero **0 tool calls reales de agentes todavía** (solo handshake).
- **Documentación**: agregado CHANGELOG **v1.132.0** + bump en CLAUDE.md (commit `e1c1886`, **pusheado a origin/main**). Los dos cambios de código habían entrado sin changelog.
- **Debug general**: git sincronizado 0/0, typecheck ok, eslint 0 errores, `check-db-refs` OK (drift de 6 objetos era falsa alarma — snapshot viejo; ya en allowlist v1.130).

## Decisiones tomadas

- **Doblar arrendamiento**, no perseguir marketplace — el dato lo confirma como PMF por tres vías (humanos, captura, IA).
- **El panel interno NO repite tráfico** — Jose ya tiene GA4. El panel debe ser de **AI queries**: quién consume API + qué cita la IA + qué se consulta por MCP.
- **Instrumentar el MCP primero** — sin logging no hay panel de AI queries que valga (faltaba la mitad del cuadro).
- **Monetización sobre arrendamiento**, no con pro-prompt genérico — la willingness-to-pay está donde está el engagement.
- **God-vision `/admin/overview` está roto de concepto** — lee la capa legacy `profile_views` (ciego a arrendamiento/índice), confunde "featured" con "PRO pago", 3 dashboards solapados, teatro en vivo a escala de ~300 visitas/día. Rehacer, no parchar.

## Pendientes / próximos pasos

- [ ] **(Jose/decisión)** Rehacer el panel admin como **God-vision v2**: 1 solo panel sobre `value_events`/`visitor_stats`, tres preguntas — ¿crece arrendamiento? ¿convierte el ingreso (API real, no featured)? ¿está sano el sistema? Colapsar `/admin/dashboard` + `/admin/overview` + `/admin/ops`.
- [ ] **(Claude)** Unificar las **dos capas de observabilidad de API**: `ops_events` (MCP+API, esta sesión) vs `api_request_log` + vista `consumers` (v1.121, otra sesión). Elegir una fuente antes de armar el panel de AI queries.
- [ ] **(Claude)** Limpiar **dead code** en `src/app/(terminal)/mercado/arrendamiento/page.tsx`: `monthlyAverages` (L58) y `formatMonth` (L182) huérfanos.
- [ ] **(Claude)** Fix UX captura arrendamiento: nadie completa `lease_kg_ha`/`lease_hectareas` → hacerlos opcionales/progresivos.
- [ ] **(Jose/producto)** Optimizar latencia de `/api/precios` (685ms prom, 1 solo consumidor real key `54a8db98` con ~1.234 calls) y decidir si subirle el plan.
- [ ] **(observar)** Esperar la **primera tool call real** de un agente en el MCP (hoy solo registries). Query: `select * from ops_events where event_type='mcp_call' and metadata->>'method'='tools/call'`.
- [ ] **(medir)** Baseline arrendamiento a batir: **7 subs/sem** (`alerta-arrendamiento`) vs nuevo `arrendamiento-liquidacion` post-unificación.

## Archivos clave

- `src/app/api/mcp/route.ts` — MCP instrumentado (helpers `logMcp`/`reqMeta`/`redactArgs`).
- `src/lib/ops.ts` — `logEvent()` + tipo `mcp_call` agregado.
- `src/app/(terminal)/mercado/arrendamiento/page.tsx` — captura unificada.
- `src/components/ArrendamientoLiquidacionSignup.tsx` — el form que ahora va arriba.
- `src/lib/admin/live.ts` — fuente legacy `profile_views` del god-vision (a migrar).
- `src/lib/ai-citations.ts` — agrega `ai_referrals` en "qué firmas cita la IA".
- `src/app/(terminal)/admin/overview/page.tsx` — god-vision a rehacer.
- `CHANGELOG.md` — v1.132.0.

## Contexto para retomar

- **DB**: Supabase proj `nyqkgorazkwcufkzxmhd` (via MCP Supabase). Tablas clave: `visitors`, `value_events`, `ops_events`, `ai_referrals`, `newsletter_subscribers`, `subscriptions`, `user_subscriptions`, `profile_views`. RPCs: `visitor_stats()`, `novillo_usd_series()`, `mag_monthly_consignatario_stats(y,m)`.
- **Deploy**: Vercel project `consignatarias-next` (NO el clone `consignatarias`). Push a `main` = deploy automático. Repo local: `~/consignatarias`.
- **Ojo sesiones paralelas**: otra sesión commitea el mismo repo en vivo (bumpeó v1.121→v1.131 esta tarde). Siempre `git fetch` + chequear ahead/behind antes de commitear/pushear.
- **Analytics interna vs GA4**: Jose ya tiene GA4 (G-6CZMZH9S6Y) para tráfico. El panel interno debe cubrir lo que GA4 no ve: AI queries (API/MCP/citas).
- **Memoria persistente relacionada**: `consignatarias-arrendamiento-pmf.md`, `consignatarias-mcp-observabilidad.md`, `consignatarias-mcp-monetizacion.md`, `mag-endpoints-catalogo.md`, `semen-com-ar-thesis.md` (NO marketplace).
- **Contexto Balanz (origen de la sesión)**: mail de Tomás Beswick (Balanz Institucionales) a JUA (cliente) ofreciendo e-cheq/FCI. Tesis: consignatarias.com como capa de agregación de demanda financiera del gremio; play canal, no referido. Data sistemática de condiciones financieras de remate = no existe aún (parado). El ángulo financiero vive hoy vía arrendamiento (tiene feed MAG 000013/14).
