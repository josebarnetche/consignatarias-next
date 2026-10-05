# Handoff — consignatarias.com.ar — 2026-10-04/05

> Sesión anterior (07-jul) más abajo, intacta.

## Estado actual

Sesión de **MCP: medición, de-gateo y distribución** + **lotes de hacienda de terceros** + dos arreglos puntuales. Versiones v1.223.0→ (registry MCP v1.5.0). Todo lo de abajo está deployado y verificado contra producción.

### 1. El MCP, medido en serio (el hallazgo que ordenó todo lo demás)
Sobre `ops_events` (07-jul → 03-oct, 89 días): **185.274 requests, de los cuales solo 11.231 (2,3 %) son llamadas a una tool**; el resto es handshake y catálogo. De esas llamadas, **98,2 % anónimas**, y los clientes identificables son escáneres de directorios (`agentstatus-probe`, `honestas-mcp-scanner`, `audit-probe`, `mcpbeat`, `glimind`, `brick.blue`). **Agentes reales: `claude-code` 7 y `claude-ai` 2 llamadas en tres meses.** Ingreso cobrado por MCP/API/x402: **cero**, con **cero intentos de pago x402** aunque la plomería está encendida y cotiza bien (402 con US$0,25 en USDC sobre Base, verificado).

⚠️ **Esto invierte la lectura de v1.200.0** ("3.240 llamadas reales que crecen"): con el campo `origen` (existe desde el 30-08) se ve que la mayoría de esas llamadas también son crawlers que hacen `tools/call`. La métrica que guió la hoja de ruta del MCP dos meses medía quién nos audita.

El 03-oct, día completo: 118 llamadas, **todas máquinas** (88 de un auditor que barre las 19 tools en orden, 16 de un script que repite el mismo paquete de 4 tools con `provincia: Misiones` cuatro veces al día, el resto probes).

### 2. De-gateo (v1.223.0, decisión de José)
Las 24 tools responden **gratis, sin cupo y sin techo de profundidad**. Lo que lo justificó: el techo del INMAG tocaba **22 llamadas de 11.231** (4 orígenes, todos escáneres), al de dispersión **nadie llegó nunca**, y el cupo de valuaciones rechazó 44 llamadas sin convertir ninguna en pago.
- `get_inmag_historico` sin techo (1.626 ruedas desde 2015 verificadas en vivo), `get_vr_historico` serie completa, valuaciones sin tope diario.
- **Lo que se cobra ahora es la descarga masiva** (`/api/x402/*`, exports Enterprise) **y la redistribución** (`/licencia-datos`): la frontera del sector (NYSE US$1.000/mes por redistribuir contra US$50 el asiento).
- Cupos de **escritura** intactos (`crear_alerta_precio`, `quiero_comprar`).
- `mcp-doctrina.test.ts` cambió de doctrina: 6 tests fijan que no haya techo ni cupo y que la frontera del bulk no desaparezca de la copia.

### 3. Distribución (era el cuello real, no el gateo)
- **El server mentía su versión**: `serverInfo` devolvía `1.0.0` con el registry en 1.4.0, así que todo lo construido desde julio era invisible para quien evalúa sin conectarse. Ahora los cuatro números son 1.5.0, con `title` legible ("Consignatarias — Mercado Ganadero Argentino") y `websiteUrl`. `server-card.json` pasó de 18 a las 24 tools reales.
- **Registry oficial**: v1.5.0 activa con descripción nueva ("Mercado ganadero argentino, gratis y sin cupo").
- **Smithery**: publicado — https://smithery.ai/servers/jose-barnetche19/consignatarias-cattle-market (24 tools detectadas). ⚠️ **Falta nombre y descripción**, y solo se editan en su web: su CLI no tiene comando.
- **`punkpeye/awesome-remote-mcp-servers`**: PR 1065 abierto, **CI en verde** (probó el endpoint contra el protocolo).
- **mcp.so**: alta por el canal gratuito (issue `chatmcp/mcpso#4663`). Tienen 3.806 issues abiertas; los US$39 publican al instante.
- **Glama**: ya listado y al día — 100 % uptime en 47 días, score A 4,1/5. Es el único proof point público de calidad y no se usa en la venta.
- **Cerrados o descartados**: PulseMCP (no acepta altas *ni cambios*, su descripción quedó en la v1.0.0 de julio y se corrige sola cuando reabran), `appcypher/awesome-mcp-servers` (**archivada** por GitHub), `modelcontextprotocol/servers` (retiró su listado), Cline Marketplace (su formulario exige declarar una prueba con Cline que no hicimos).
- **`/mcp` con instalación en un clic**: deeplink de Cursor y VS Code, comando de Claude Code, enlace a Glama.
- **Dato que ordena la prioridad**: en 34 días llegaron **185 visitantes desde asistentes** (ChatGPT 104, Copilot 60, Gemini 21, Claude 3) — **todos por cita web, ninguno por el MCP**, que ya sale con UTM en cada respuesta.

### 4. `/lotes` — lotes de hacienda de terceros (decisión de José)
Publica los lotes que **deCampoaCampo** expone en sus dos páginas públicas (⚠️ es competidor, no socio: ver `POSITIONING-THESIS.md`). Reglas en `CLAUDE.md`; el detalle y la objeción, en la memoria `consignatarias-lotes-dcac`.
- `scripts/scrapers/dcac-lotes.mjs`, enganchado al scraper diario de remates en try propio. Lee el **JSON-LD `Product`** de cada ficha; **no recorre el rango de sku** (sería su base entera); UA identificado y 1,2 s entre pedidos. Cada página muestra 6 y rotan → el catálogo **se acumula** con las 3 pasadas diarias (12 lotes al 05-10, arrancó en 11).
- La página muestra **datos + UNA referencia propia** (mediana del VR por categoría y peso) y **no nombra la fuente, no enlaza la ficha y no muestra la foto**: la imagen es lo único del aviso con dueño, así que sin atribución no va. Queda la línea *"no somos los vendedores"*.
- **Mapeo `A_CATEGORIA_VR`**: las subcategorías del aviso caen en lo que el VR mide (vaca preñada → VACA) declarando que la prima se pacta aparte. Pasó de 4 a **10 de 12 con referencia**. Terneros/terneras quedan sin referencia a propósito (el MAG no los opera por lote; MEJ es macho entero joven).
- **`OfertaLote`**: precio con botones − / + de $50 arrancando en la referencia, email, un botón, y "Nos comunicaremos y te hablamos". Entra como `lote:<sku>`, intent `comprar`. **Probado de punta a punta el 05-10**: la fila entró con categoría, provincia, cabezas y precio, el motor calculó la comisión (1 % = $1.283.855) y la fila de prueba se borró.
- `scripts/match-lotes-leads.mjs` cruza los leads de compra abiertos contra la vidriera → `lotes-matches.json` (sin datos personales), que es lo que el ARM de la PC puede consumir.

### 5. Arreglo de un suscriptor
`newsletter_subscribers`: `cirucarlita@hotmal.com.ar` → **`cirucarlita@hotmail.com.ar`**. El dominio mal escrito **no tiene MX**, así que todo lo que se le mandó desde el 28-sep rebotó. Se reenvió la bienvenida de su segmento (`arrendamiento-liquidacion`, 32 ha a 6,7 kg/ha): envío OK.

## Decisiones tomadas

- **El MCP no es línea de ingresos: es el canal de citas.** Los números no dejan lugar a duda y el propio changelog ya lo había escrito ("el puente vale más que el peaje"). El error fue seguir invirtiendo como si el peaje fuera a aparecer.
- **De-gatear la consulta y cobrar el bulk**: un techo que no defiende nada y sí nos saca de las citas, se saca.
- **La palanca es la distribución**, no más tools. El catálogo de "MCP v2" (snapshot, insights, feeds, embeds, badges, score propietario) queda **congelado hasta que haya uso**: sumar 17 tools hoy es trabajar para los escáneres. Las dos únicas que compran algo medible, cuando se retome: `citar_dato` (apalanca el canal que ya funciona) y una sola tool de "qué pasó hoy" (los agentes hoy hacen 4 llamadas para armar esa foto).
- **Lotes de terceros, sin atribución y sin foto** (José). Mi objeción quedó anotada: un lote publicado en dCaC **ya está consignado**, así que el mandato y la comisión son de quien lo publicó, y el riesgo es ser su lead-gen gratis. Se avanzó porque el lead que entra por un lote es información accionable que antes no existía.

## Pendientes / próximos pasos

- [ ] **José — trabajar los 22 leads sin tocar** de `producer_leads` (`new`/`needs_review`). Ahí está la comisión, no en más inventario. Prioridad: el de **1.500 cabezas** (Santiago del Estero, 15-sep, 19 días sin respuesta) y el match **60 novillitos pedidos en Entre Ríos ↔ lote de 65 novillitos en Corrientes**. Hay además un cruce durmiendo desde el 08-sep: alguien vende 70 terneros en Mendoza y alguien compra 50 en Mendoza, los dos con email.
- [ ] **José — Smithery**: poner nombre y descripción en la ficha (dos campos, solo desde su web).
- [ ] **José — mcpservers.org/submit**: formulario web (back-end de la lista de wong2, decenas de miles de estrellas). Los valores exactos están en el chat; la extensión de Chrome no está conectada, así que no se pudo automatizar.
- [ ] **José — decidir los US$39 de mcp.so** si se quiere que el alta entre seguro.
- [ ] **Claude — mapear más categorías del VR** si aparecen lotes de categorías nuevas (hoy queda afuera solo terneros/terneras, y es correcto).
- [ ] **Claude — revisar PulseMCP cada 4-6 semanas** hasta que reabran altas.
- [ ] **Antes de facturar la primera comisión**: comisionar venta de hacienda es actividad de comisionista y el **IVA de la comisión sigue sin cerrar**.
- [ ] Heredado y vigente: `/mcp` y `/planes` prometen "~11 tools de lectura" cuando son 24 — el pitch Enterprise subvende el producto a menos de la mitad.

## Archivos clave

- `/Users/josebarnetche/consignatarias/src/app/api/mcp/route.ts` — el server; `SERVER_INFO` y el de-gateo comentado en cada tool.
- `/Users/josebarnetche/consignatarias/src/app/api/mcp/mcp-doctrina.test.ts` — la doctrina nueva, con los números que la fundan.
- `/Users/josebarnetche/consignatarias/scripts/scrapers/dcac-lotes.mjs` · `/Users/josebarnetche/consignatarias/scripts/match-lotes-leads.mjs`
- `/Users/josebarnetche/consignatarias/src/app/(terminal)/lotes/page.tsx` (mapeo `A_CATEGORIA_VR`) · `/Users/josebarnetche/consignatarias/src/components/leads/OfertaLote.tsx`
- `/Users/josebarnetche/consignatarias/src/lib/data/lotes-dcac.json` · `lotes-matches.json`
- `/Users/josebarnetche/consignatarias/mcp-registry/PUBLISH-RUNBOOK.md` — publicar SIEMPRE desde `mcp-registry/`, nunca desde la raíz.

## Contexto para retomar

- **La única métrica que vale seguir del MCP**: llamadas de un cliente con nombre que no sea escáner (hoy, un dígito en tres meses). El cron `mcp-consumption-alert.yml` ya la manda a `agro@memola.com.ar`. Si en 90 días no se mueve, para el MCP se confirma la kill-hypothesis del plan de negocios: audiencia sin pagador.
- **Publicar en el registry**: `mcp-publisher login dns --domain consignatarias.com.ar` con la clave de `~/.mcp-keys/consignatarias-mcp.pem` (sin ella no se republica, pero el namespace está anclado al DNS). Subir `version` en los tres manifiestos + `serverInfo` y correr `node scripts/check-mcp-manifests.mjs`, que falla si CLAUDE.md quedó atrás.
- **Smithery**: `npx @smithery/cli@latest auth login` es OAuth y en modo no interactivo imprime la URL para autorizar; después `smithery mcp publish <url> -n <namespace>/<nombre>`. La sesión vence rápido: generar la URL y abrirla en el momento.
- **Gate pre-push**: `npx next lint` además de `tsc` (Vercel corre `next build`, que falla con errores de ESLint), más `pnpm run check` (513 tests, refs de DB, manifiestos MCP, hex sin token).
- **Push a `main` con carrera**: el cron de datos commitea seguido; `git pull --rebase` y reintentar.

---

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
