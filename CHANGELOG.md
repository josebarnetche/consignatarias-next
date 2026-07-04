# Changelog

All notable changes to consignatarias.com.ar are documented in this file.

Format: [Semantic Versioning](https://semver.org/) with feature descriptions focused on platform evolution.
Versioning policy: [`docs/VERSIONING.md`](docs/VERSIONING.md). Releases are git-tagged from v1.29.0.

---

## [1.97.0] — 2026-07-04

### El overview se convierte en home de broker

Rediseño de `/overview` con recorrido visual de terminal financiera: estado del mercado → tu posición → la agenda → los instrumentos.

- **Mi Ganado como módulo de cartera** — nuevo widget (`MiGanadoWidget`, cliente) arriba a la izquierda: tu stock valuado al INMAG de hoy (ARS + USD + cabezas), variación 7 días y sparkline de la semana (la composición actual valuada al índice de cada día, misma lógica que /mi-ganado). Sin sesión o sin hacienda muestra el CTA compacto "Tu stock, a valor de hoy".
- **Remates hoy y esta semana** — panel único a dos columnas: HOY (borde ámbar, badge live) y ESTA SEMANA (próximos 7 días, "+N más"), con cabezas de la semana en el pie.
- **Precios como panel de instrumentos** — las categorías dejan la tabla y pasan a 6 tiles estilo watchlist con el glifo color GRANDE (chip 56px), precio mono y variación; cada tile linkea a /precios/[categoria].
- La tendencia INMAG acompaña a Mi Ganado en la fila "tu posición vs el índice".

**Verificación:** tsc 0 · QA visual en dev del recorrido completo (estado logged-out del widget incluido).

## [1.96.1] — 2026-07-04

### Comparador: frecuencia en vez de "salida antes"; cabezas fuera (review de Jose)

- **"Remata más seguido" reemplaza "Salida más rápida"** — quién remata antes depende del día que mires; la cadencia es la señal robusta. Nuevo panel: consignataria con más remates *realizados* en los últimos 6 meses (+ programados). La fila "Próximo remate" (fecha + plaza) se mantiene como dato.
- **Cabezas eliminadas del comparador** — dato no verificado: "definitivamente no es 0, pero tampoco podemos asegurarlo". Sale la fila "Cabezas (est.)" y el componente Volumen del score.
- **Score con 2 señales disjuntas** — actividad (programados, 0.6) + frecuencia (realizados 6 meses, 0.4). Se elimina "trayectoria": el índice solo retiene ~6 meses hacia atrás (mín. 09-ene-2026), así que total ≡ ventana y la señal estaba duplicada. Sale también la fila redundante "Total remates".

## [1.96.0] — 2026-07-04

### El comparador se libera y cambia de premisa: de "quién te paga antes" a "quién te da salida antes"

La capa PRO de `/comparar` prometía medios de pago y días de cobro por consignataria — un dato que
no existe (0 de 86 en la base) y que las consignatarias no van a publicar: es información negociada
y competitivamente sensible. Se elimina la promesa y se reemplaza por el dato real equivalente que
sí poseemos: el calendario.

- **`/comparar` 100% gratis** — se quita el bloque PRO "Condiciones comerciales" (blur + gate sobre datos vacíos) y el fetch a `/api/consignatarias/medios-pago` (endpoint eliminado; 33→32 endpoints).
- **"Salida más rápida"** — nuevo panel de decisión: entre las seleccionadas, quién tiene el próximo remate más cercano en fecha, con plaza ("Tu hacienda sale antes con X — remata el 8 jul · Río Cuarto, Córdoba"). Nueva fila "Próximo remate" (fecha + lugar) en la tabla comparativa.
- **Medios de pago en perfiles sin paywall** — `MediosPagoSection` deja de mostrar PaywallCard/placeholder: solo se renderiza si la titular del perfil cargó datos (regla "datos reales"; hoy ninguna → no aparece).
- **Copy PRO saneado** — se quita "medios de pago" como beneficio en /cuenta, Paywall genérico, guía cómo-elegir y hint del nav (ahora "Quién te da salida antes · gratis").
- **Fix hydration** — `DatasetSchema` usaba `new Date().toISOString()` con milisegundos como `dateModified` default → mismatch server/cliente en todas las páginas; ahora precisión de día (como ya hacía el otro schema).

**Verificación:** tsc 0 · QA interactivo en dev de /comparar (selección de 3, panel salida, fila próximo remate) y perfil consignataria (sin paywall, sin issues de hydration).

## [1.95.0] — 2026-07-04

### Íconos color + terminal bajo el manual de marca

- **Tintas color en chips hueso** — los pictogramas y glifos del sitio pasan de la tinta blanco (plana sobre carbón) a la versión COLOR (carbón + acento cielo) dentro de chips `bg-zinc-100` redondeados, el patrón que mejor lee sobre carbón: cards de `/mcp` (chip 40px), 404 (chip 80px), tabla de `/mercado` y hero de `/precios/[categoria]`. Nuevos assets `public/marca/iconos-color/` y `glifos-color/` (`deploy_assets_web.py`, total 752 KB).
- **Overview con marca** — los tres paneles de `/overview` (Mercado hoy, Remates próximos, Categorías $/kg vivo) llevan chip de ícono color en el header (`IconChip`), y cada fila de categorías muestra su glifo color en chip hueso (≥sm).
- **Footer compacto en /overview** — el SystemFooter oculta el sitemap de 4 columnas en la pantalla-terminal y deja solo la línea de marca; en el resto de las sub-páginas queda completo.

**Verificación:** tsc 0 · QA visual en dev de /overview, /mcp y /precios/toro.

## [1.94.1] — 2026-07-04

### Fixes de la tanda universo (review de Jose)

- **El martillazo rediseñado** — la maza ahora es inconfundible (cabeza con tapas, tapa cielo, mango a la mano) y el golpe es una caída vertical con rebote sobre el taco (la rotación rígida anterior hundía la cabeza bajo el piso: en SVG y-abajo, levantar es rotación positiva). Onda/polvo/dato emanan del taco.
- **Banner "¿Vendo ahora?" de la landing** — copy acortado a una línea y media (se apilaba en 3-4 líneas entre el badge y el CTA).
- **Footer con marca en terminal y landing** — el SystemFooter (todas las sub-páginas de la terminal) y el footer de la landing llevan el isotipo vectorial + wordmark con puntos cielo + © Memola Medios S.A.S. (la landing usaba el raster viejo).

## [1.94.0] — 2026-07-04

### El universo gráfico entra a las páginas (antes: solo en share cards)

Primera tanda de la marca v2.0 DENTRO del sitio (assets en `public/marca/`, ~456 KB, `marca/deploy_assets_web.py`):

- **Glifos de hacienda** — la silueta de cada categoría en el hero de `/precios/[categoria]` y en la tabla PRECIOS POR CATEGORIA de `/mercado` (link con glifo 20px). El precio del H1 de precios pasa de ámbar inline a cielo (rezago del barrido).
- **Pictogramas** — cards de tools de `/mcp` (ícono por tool: índice, báscula, calendario, casa-remates, frigorífico, arrendamiento, alerta…) y el 404 (buscador-lupa).
- **Foto de marca en la landing** — `hero-pampa.jpg` (panorámica del amanecer) como fondo del hero con degradés de legibilidad.
- **El martillazo animado** — el motivo de marca (golpe → polvo → onda → dato → sonda, SVG+CSS, respeta reduced-motion) como firma al pie del hero de la landing (desktop).

**Verificación:** tsc 0 · QA visual en dev de landing, /mercado, /precios/novillos, /mcp y 404.

## [1.93.0] — 2026-07-04

### Pivot a API-first + productor gratis, onboarding no-técnico y pago de punta a punta

Rediseño del modelo de negocio y el pricing, cierre del flujo de pago, sistema de valor del usuario free (karma + marcar remates) y alineación de marca. Consolida los bumps 1.89.0→1.92.0 (hechos sin changelog) + el trabajo posterior.

- **Monetización / pricing (API-first, todo USD).** `/planes` reescrito: **productor GRATIS primero** (banner + "crear cuenta con Google"), después la caja real — **API/MCP** (Starter USD 49, Growth 299, Scale a medida) — y consignataria (alcance, prueba). PRO Usuario (ARS 7.900, 0 subs reales) retirado. Starter con copy **MCP-first** para el operador no-técnico (arquetipo: Apesteguía, consignataria con pull diario, ~7% de su quota). Consistencia: `/enterprise` (99/500/700→49/299/a-medida + calculadora de volumen que ya no contradice Growth), `/upgrade` y `/pro` (tour muerto) → redirect a `/planes`, `llms.txt` y api-docs actualizados.
- **De-gate de las herramientas del productor (presentadas como NUEVO).** PRO Usuario retirado dejaba las herramientas bloqueadas sin puerta de compra. De-gate en `ProReveal`, `RequirePro`, `useSessionTier`, `ProChartGate`, `HistoryDownloadPro` (passthrough) + las APIs (`vender-ahora`, `inmag-export`, `reportes/download`). Calculadora, ¿vendo ahora?, comparador, histórico, estacionalidad y exports ahora **gratis** para todos; tag "NUEVO" en el nav; se sacaron los labels/badges "PRO" estáticos que quedaban.
- **Pago de punta a punta (auditoría E2E).** El webhook de Rebill exigía mapear `plan_id→api_tier` vía env, pero los payment-links se crean por-checkout (para llevar el `userId`) con precio inline → `plan_id` dinámico, inmapeable. Fix: el webhook otorga por **`metadata.api_tier`** (seguro: links 100% server-side con la secret key, firma verificada, checkout self-serve solo emite Starter). Montos Enterprise de la lib 99/500→49/299. Post-pago: `/cuenta/api-keys` con **welcome "✓ Tu plan X está activo"** + panel de uso (X/10.000 req · %) + al generar la key, el **connector MCP listo para pegar, con la key adentro** (Claude/Cursor) — onboarding para el cliente no-técnico.
- **Valor del usuario free — karma + marcar remates.** Tabla `remate_marks` (RLS) + API toggle + motor `karma.ts` (Novato→Referente = hacienda cargada + marcas + antigüedad, con tests). Botón **"Estuve / Fui ✓"** en la lista de remates (desktop + mobile) con **social proof** ("X productores fueron a este remate", contador compartido vía contexto). Badge de karma en `/cuenta`. Tracker de hacienda cargada + karma por usuario en Observabilidad (`/admin/ops`).
- **Nav + marca.** Header rediseñado: nav del productor limpio (4 dropdowns, sin TERMINAL, logo = wordmark `consignatarias·com` con el punto en accent, sonda azul parpadeante), MCP/API al footer, PLANES como link sutil; activity bar y reloj-con-fecha eliminados. El ★ PRO de consignataria/featured (badge + glow + fila de remate) pasó de amber → **cielo**, cerrando la doctrina "cielo = único acento" (se preservó `live-badge-amber`).
- **MCP.** Servidor a 10 tools (+ `get_inmag_historico`, `get_precios_detallados`, `get_contexto_macro`, `buscar_frigorifico`), consistencia INMAG vs categorías (métrica etiquetada, variación robusta con flag de rueda de bajo volumen), onboarding de API key descubrible (param `api_key` + errores específicos), y anuncio en `/llms.txt`.

**Verificación:** tsc 0 · check-db-refs OK 65/65 · 40 tests · pricing/pago/de-gate verificados en prod · 13 screenshots del journey público capturados con Playwright.

## [1.88.0] — 2026-07-04

### Identidad v2.0 aplicada a todo el sitio — "El campo, medido"

Se aplicó el sistema de marca v2.0 (manual en `marca/`, gitignorado por peso; reproducible por script) a todas las superficies del sitio. La regla madre: **cielo (sky-400) es el único acento de marca**; pastura/emerald queda reservado a lo semántico (variación positiva, en vivo, éxito), ámbar a callouts/PRO/karma, rojo a lo negativo.

- **Favicons + OG global** — isotipo "la C y el dato" formalizado (vector) en `favicon.ico` 16/32/48 + `icon-*` + `apple-icon`; `og-image.png` nuevo (campo-noche + lockup + KPIs). Se detectó y reemplazó `src/app/opengraph-image.png` (convención de archivo) que pisaba al metadata con un diseño de mayo.
- **OGs por sección** — `/remates`, `/mercado`, `/frigorificos` con tarjeta propia (imágenes del sistema) cableada en metadata.
- **OGs dinámicos rebrandeados** — helper compartido **`src/lib/og/brand.tsx`** (colores, isotipo, JetBrains Mono TTF en `src/fonts/`, BrandChrome, Halo). Rediseñados: INMAG (precio vivo), `consignatarias/[slug]` (+ badge PRO ámbar), `remates/[slug]` (fecha-panel, tipo, cabezas es-AR) y fallbacks. `twitter-image` y `go/[slug]` pasan a re-exports de la misma tarjeta (una sola fuente de verdad).
- **Consolidación de acentos (~480 conversiones en ~100 archivos)** — emerald/amber usados como acento de sección → cielo (hero de landing, mapa de cobertura, INMAG, arrendamiento, spread, DTE/Mis Guías, enterprise, mcp, planes); charts INMAG/arrendamiento a `SEMANTIC_HEX.accent`. Unificación de familias rezagadas: green→emerald semántico, blue/cyan→sky, yellow→amber, rose→red. Se PRESERVARON: fila destacada PRO de remates, callouts de honestidad metodológica, karma/logros, éxitos, EN VIVO, WhatsApp (identidad), paletas categóricas (typeColors, DTE charts, STAGE_COLORS, calendarios Google/Outlook/Apple) y chips GET/POST (convención HTTP). Violeta de pricing enterprise → jerarquía zinc→cielo→sky-300.
- **QA visual** — 12 páginas clave antes/después (prod vs dev) + barrido de 12 páginas adicionales; tarjetas OG verificadas con render real en dev (perfil, remate, fallback, twitter, go).
- **El Corredor manifest-driven** — la landing `/el-corredor` hardcodeaba "Mayo 2026 · 05/26": ahora lee `public/el-corredor/manifest.json` (edición, cover, OG, short) y deriva "próxima edición" del `ym` — no vuelve a quedar vieja. Se quitó el KPI interanual hardcodeado de mayo (dato de edición vieja; el INMAG vivo queda).
- **Fix drift falso `remate_marks`** — la tabla existía en prod; el snapshot `database.types.ts` estaba viejo. Regenerado desde prod (Supabase MCP): `check-db-refs` 65/65 sin drift.

Alineación de facto con `src/lib/ui/tokens.ts` ("Estado ≠ marca"), que ya documentaba esta doctrina. Assets fuente y manual navegable: `marca/manual/index.html`.

**Verificación:** tsc 0 · check-db-refs OK 65/65 · QA visual 24 páginas · OGs 200 en dev y prod.

> **Nota (backfill 2026-07-04):** las entradas 1.76.0→1.87.0 se reconstruyeron desde git — esos bumps se hicieron en `package.json` sin escribir el changelog. Detalle completo en los cuerpos de commit referenciados.

## [1.87.0] — 2026-07-04

### Karma del productor — valor a cambio de free (`07d23e9`)

Sistema de señal a cambio de gratuidad: tabla `remate_marks` ("estuve en este remate" / "sigo a esta consignataria", RLS por usuario), `POST /api/remates/mark` (toggle idempotente con sesión Google), motor de karma (`src/lib/karma.ts`, función pura + tests) y vista en admin. El usuario free aporta asistencia + confianza, no dinero.

## [1.86.0] — 2026-07-04

### Herramientas del productor de-gateadas (`cf07bbf`)

PRO Usuario fue retirado; sus herramientas quedaban bloqueadas sin puerta de compra. ProReveal/RequirePro → passthrough con tracking `tool_view` por herramienta; `useSessionTier` → 'pro' para todos. Comparar, histórico, estacionalidad, exports y reporte semanal quedan gratis, comunicados como NUEVOS.

## [1.85.0] — 2026-07-04

### Tracker Mi Ganado en Observabilidad + productor-free primero (`6090240`)

## [1.84.0] — 2026-07-04

### Pricing API-first — la caja es la API/MCP (`7f9d93f`)

Rediseño de `/planes` con research + costos reales: 3 tiers de API en USD (Starter 49 / Growth 299 / Scale a medida) para instituciones; **el productor va GRATIS** (moat + autoridad — el directorio pago v1 lo probó con 0 subs). PRO Usuario eliminado del pricing.

## [1.83.0] — 2026-07-04

### Header compacto (`9922b45`)

Fuera activity bar, "TERMINAL" y fecha; entra el logo de marca. Continúa el rediseño de `740768a`.

## [1.82.0] — 2026-07-04

### Rediseño del header — sacar la sobrecarga de la top bar (`740768a`)

## [1.81.0] — 2026-07-04

### Área Desarrolladores + Planes visible en nav (`8cb2abe`)

Reframe por segmento (productor / consignataria / empresa·IA).

## [1.80.0–1.80.2] — 2026-07-04

### Página /mcp (AI-ready) + fixes del MCP (`893069c`, `cb3d3ca`, `fc0609d`)

- `/mcp`: presentación del servidor con las 10 tools, config de conexión y CTA a planes; grupo de nav "API / IA"; sección "Hecho para que las IAs lo usen" en la landing.
- Fixes: consistencia INMAG vs categorías, onboarding de API key, dedup de provincia en `list_remates`, descripción del registry con términos en español.

## [1.78.0–1.79.1] — 2026-07-04

### Servidor MCP — Consignatarias como servicio para agentes IA (`903c5d5` → `2deba16`)

Las IAs ya son la audiencia #1 (325 referrals/mes). Salto de "web que las IAs scrapean" a "tool que las IAs llaman": servidor MCP remoto propio (JSON-RPC 2.0 Streamable HTTP, sin deps) en `/api/mcp`, listado en el registry oficial como `ar.com.consignatarias/cattle-market` y anunciado en `llms.txt`. Creció de 4 a **10 tools**: índice, histórico, precios (base + detallados), contexto macro, remates, consignatarias, frigoríficos, arrendamiento y alerta de precio (API key).

## [1.76.0–1.77.1] — 2026-07-03

### Motor de alertas de precio por umbral + retención (`e3fe87b` → `4fec698`)

- **Alertas por umbral** ("avisame cuando el novillo cruce $X"): tabla `price_alerts` (email/user/webhook, categoría, umbral, dirección), captura en `/api/alertas/precio`, cron diario de evaluación. La retención más pegajosa: conecta el tráfico IA con un loop de email, y la puerta AI/API permite que el agente que trae el tráfico cree la alerta.
- Captura de alta intención arriba en `/mercado/arrendamiento`; botón "Actualizar" en `/admin/ops`.

## [1.75.4] — 2026-07-03

### Correcciones a v1.75.3 — el cambio de `alertas/*` era un cambio de CONTRATO, no solo limpieza

Un review señaló, con razón, que v1.75.3 se presentó como "cierre de deuda" cuando en realidad **cambió una superficie pública** (auth, header, ownership, plan, columna) y estaba **sobrevendido**. Correcciones concretas:

- **Bug real corregido — límite por plan.** `getAlertLimit` mapeaba `free/pro/enterprise`, pero `authenticate()` devuelve `plan ∈ {starter, growth, scale}` → `plan in PLAN_LIMITS` era **siempre false** y **todos quedaban capados en 3 alertas** (el fallback). Ahora el límite está tipado contra el `Plan` real (`Record<Plan, number>`: starter 25 / growth 100 / scale 500), así un desalineo futuro es **error de compilación**, no un cap silencioso.
- **Doc inline corregida.** El comentario de la route seguía enseñando el contrato viejo (`Headers: api_key: sk_live_xxxxx`) mientras el código exige `Authorization: Bearer`. Corregido. También se corrigió "plan Enterprise" (no existe ese plan) → el auth requiere **un plan API activo** (starter/growth/scale).
- **Migración ya no es un drop a ciegas.** `20260703_alertas_drop_plaintext_api_key.sql` ahora **guarda**: solo dropea `api_key` si la columna existe **y no tiene datos**; si un entorno divergente tuviera filas con valor, **falla con un mensaje** en vez de destruir irreversiblemente. ("Tabla vacía" era un estado de prod —0 filas verificadas—, no una garantía universal.)
- **Tests de contrato (antes: cero).** +10 tests para `alertas/*`: auth requerido (401 sin key), límite por plan real (starter crea con 3 pero corta en 25; scale permite 100), body inválido (400), y **ownership** en `[alerta_id]` (alerta ajena/inexistente → 404 sin filtrar, propia → 200). `pnpm check` prueba compilación + scanner; estos prueban el contrato.
- **`error` vs 404 distinguido.** En `[alerta_id]` GET, un `PGRST116` (0 filas) es 404 normal; cualquier **otro** error de DB ahora se **loguea** (fallo operativo visible), sin filtrar ownership.

**Reencuadre honesto del "breaking change":** el header y el auth cambiaron, pero el endpoint viejo estaba **100% roto en prod** — buscaba `public.users` (tabla inexistente) → **siempre devolvía 401**. No hay consumidor funcional que romper; es el reemplazo de un endpoint muerto, no la ruptura de una API viva. Aun así, lo que **falta** para llamarlo cierre de contrato (documentado, no hecho): actualizar la **doc pública/externa** del API, definir política de **deprecación/versionado** para cambios futuros, y una **verificación E2E** con una API key real de un plan. La afirmación "cero deuda real de acceso sin tipar" de v1.75.3 aplica al *checker* (0 `.from('users')`), pero quedan pendientes reales rastreados (baseline incompleto, 2 flujos auth-gated sin verificar en prod) — no es cierre operativo total.

**Verificación:** `pnpm check` verde (tsc 0, eslint 0, db-refs 331, **27/27 tests**).

## [1.75.3] — 2026-07-03

### `alertas/*` a `api_keys` hasheadas — deuda `users` cerrada, ALLOWLIST vaciada

Último y más sensible ítem del burndown: el API de `alertas/*` (crear/listar/editar/borrar alertas de remates) autenticaba con un helper local que buscaba `users.api_key` en **texto plano** contra una tabla `public.users` **inexistente en prod** — roto **e** inseguro. Ahora:

- **Auth canónico `authenticate()`** (`lib/api-auth.ts`): API keys **hasheadas**, con cupo mensual, IP allowlist y verificación de plan Enterprise. Header `Authorization: Bearer sk_...` (antes `api_key:` en texto plano).
- **Ownership por `user_id`**, no por la key: si el usuario regenera su key, conserva sus alertas. Consistente con los crons de entrega (que ya leen `alertas` por `user_id`).
- **Se eliminó la columna `alertas.api_key`** — guardaba la key en texto plano (liability). Tabla vacía → drop seguro; ningún cron la lee.
- Se borró el `validateApiKey` local duplicado de ambas rutas (`route.ts` + `[alerta_id]/route.ts`).

**Resultado — deuda de esquema cerrada.** Con esto hay **cero `.from('users')`** en todo el codebase. Se eliminaron los escape-hatches transitorios `fromUnsafe` y `requireServiceClientLegacy` (ya sin uso) y salió **`users` de la ALLOWLIST**. La ALLOWLIST del checker queda solo con `increment_api_usage` (falso positivo: la función existe en prod pero el generador de tipos no la lista). **Cero deuda real de acceso sin tipar.**

**Verificación:** `pnpm check` verde (tsc 0, eslint 0, db-refs 331, 17/17 tests). Migración versionada (`20260703_alertas_drop_plaintext_api_key.sql`).

## [1.75.2] — 2026-07-03

### `onboarding-emails` migrado a `auth.users` — drip de activación reactivado

El cron de emails de onboarding (recordatorio DT-e, éxito primer DT-e, retención) consultaba `public.users` (inexistente) para la lista/emails de usuarios, y trackeaba sus envíos en `outreach_log` (tabla de outreach a consignatarias, exige `consignataria_slug NOT NULL`, sin `user_id`) → **fallaba de punta a punta**. Ahora:

- **Usuarios desde `auth.users`** vía 2 RPCs nuevos (`SECURITY DEFINER`, `service_role`): `get_recent_user_infos(from, to)` (ventana de alta) y `get_user_infos(uuid[])` (por ids). `display_name` = `name`/`full_name` de la metadata (usuarios OAuth Google).
- **Dedup en tabla propia** `onboarding_email_log(user_id, email_type)` en vez de `outreach_log`.
- **Bug de columna** corregido: `user_dtes.cabezas` → `cantidad_cabezas` (el conteo de retención estaba roto).
- Pasa al **client tipado** (`requireServiceClient`), saliendo del client legacy.

Con esto, de los 2 consumidores del `users` inexistente queda **solo `alertas/*`** (el API-key legacy en texto plano) — próximo y último ítem de la ALLOWLIST, a migrar a `api_keys` hasheadas.

**Verificación:** `pnpm check` verde (tsc 0, eslint 0, db-refs 333, 17/17 tests). Migraciones versionadas (`20260703_get_user_infos_rpcs.sql`, `20260703_onboarding_email_log.sql`).

## [1.75.1] — 2026-07-03

### Burndown de deuda visible — 2 crons rotos reactivados + medios de pago + limpieza

Continuación de v1.75.0: se resolvieron **los 5 `TODO(canon)`** que habían quedado quarantined (features que el tipado destapó como rotas en prod). Ahora quedan **cero**.

**RPC canónico `get_user_emails(uuid[])` (SECURITY DEFINER, solo `service_role`).** La causa de fondo de varios cron rotos: `user_favorites` y `alertas` tienen FK a `auth.users`, no a `public.users`, así que el embed PostgREST `users(email)` no existe y los `.select('... users(email)')` fallaban. El RPC resuelve emails desde `auth.users` para un set de ids. Reusable por los dos crons.

**`cron/remate-reminders` — reactivado.** Los dos caminos (recordatorios a watchers de una firma; Mail-3 de resultados a productores con alerta) resolvían el email con el embed roto → **0 mails**. Ahora leen `user_id` y resuelven vía el RPC. `cron_state` no participaba (se `void`eaba).

**`cron/new-remate-alerts` — reescrito.** Estaba **triple-roto**: leía `cron_state` (tabla inexistente, y su resultado se descartaba con `void`), consultaba `alertas` por columnas inexistentes (`alerta_id`→`id`, `.eq('activa')`→`status`) y usaba el embed `users(email)`. Se eliminó `cron_state` por completo, se corrigieron las columnas y se resuelven emails con el RPC. **`cron_state` salió de la ALLOWLIST del checker.**

**`consignatarias.medios_pago` — reconciliado.** El feature "medios de pago" (endpoint + DAL + UI `MediosPagoSummary`) estaba construido pero la columna nunca se agregó a prod → el endpoint fallaba. Se agregó `medios_pago jsonb` (default `[]`) y el código volvió al client tipado.

**`webhooks/auth` — insert muerto eliminado.** Logueaba el welcome-email en `outreach_log`, que es la tabla de outreach a consignatarias (exige `consignataria_slug NOT NULL`, no tiene `user_id`) → el insert **siempre fallaba**. Se quitó; la entrega ya se rastrea vía Resend en `email_events`.

**Verificación:** `pnpm check` verde (tsc 0, eslint 0, db-refs 332, 17/17 tests). RPC probado contra prod. Migraciones versionadas (`20260703_get_user_emails_rpc.sql`, `20260703_consignatarias_medios_pago.sql`). Deuda restante en la ALLOWLIST: solo `users` (el API-key legacy de `alertas/*` + onboarding, que sigue en el client legacy sin tipar) — próximo chunk: migrar a `api_keys` hasheadas.

## [1.75.0] — 2026-07-03

### Canon Fase 2 — cerrar de verdad la clase de bug (no solo contenerla)

La Fase 1 (v1.74.0-1.74.1) fue contención: snapshot de esquema, scanner, pre-commit, fix puntual. Un review interno marcó, con razón, que eso NO alcanza para afirmar que la clase de bug "quedó cerrada": faltaba conectar los tipos, mover el enforcement a CI, no reintroducir silencios, y tener tests. Esta versión ataca cada punto.

**1. Tipos CONECTADOS al type system (antes: solo un regex checker).** Los tres clients Supabase ahora se instancian con `<Database>` (`createClient<Database>()` en `supabase.ts`, `supabase-server.ts`, `supabase-browser.ts`). Un `.from('alerts')` ahora es **error de compilación**, no solo un warning del scanner. Eso destapó **38 errores de tipo reales** — varios eran **bugs latentes de prod** que el scanner no podía ver: `videos/route.ts` comparaba `claimed_by` (columna inexistente) como si fuera un user id → **bug de autorización**, corregido a `claimed_by_email` vs `user.email`; `user_dtes.cabezas`→`cantidad_cabezas`; `alertas.alerta_id`→`id`; selects de `consignatarias` a `nombre`/`medios_pago` inexistentes. Los 38 se resolvieron: renombres verificados contra prod, coerción honesta de nullables en el borde (no defaults que cambien semántica), y quarantine explícito (`fromUnsafe` + `TODO(canon)`) para 5 features genuinamente rotas en prod (medios_pago, embeds `users(...)` sin relación, `outreach_log.user_id`).

**2. NO se reintrodujo un silencio (la crítica más dura).** El endpoint nuevo ya no puede convertir un fallo de datos en un `false` que parezca válido. La lógica se movió a un **DAL canónico** (`src/lib/dal/activation.ts`, no ad-hoc en la route): `getActivationStatus` **inspecciona `error` y LANZA** si la query falla; la route traduce eso a un **500 explícito**; y el componente `ActivationChecklist`, ante un 500, **no marca pasos como incompletos** (oculta el checklist en vez de mostrar estado falso). Además se alineó producto↔dato (otra observación): "Guardá un remate" ahora se mide contra `remate_favorites` (guardar un remate), no contra `user_favorites` (seguir una consignataria).

**3. Un solo service client.** `createAdminClient` (que era una 2da implementación divergente con `!` que tiraba en preview) ahora **delega** en `requireServiceClient` — hay UN service client canónico, tipado.

**4. Enforcement REAL en CI (el pre-commit no alcanza).** Nuevo workflow `.github/workflows/ci-check.yml` corre `pnpm check` (tsc + eslint + db-refs + tests) en cada push a main y cada PR. El pre-commit se saltea con `--no-verify` y depende de tener el hook instalado; la CI no. Ahora lo que entra por GitHub también se valida.

**5. El scanner deja de venderse de más.** `check-db-refs` documenta EXPLÍCITAMENTE su alcance: valida `.from('literal')`/`.rpc('literal')` en `.ts/.tsx/.js/.mjs` bajo `src/` y `scripts/` (antes solo `.ts/.tsx` de `src/`), ignora comentarios y `scripts/archive/`. Lo que NO puede validar (refs dinámicas `.from(variable)`) lo dice claro y lo delega al **tipado de los clients** (que ahora sí existe) — no finge cubrir "todos". Nuevo **modo estricto** (`--strict`) que hace que el DRIFT bloquee, para política por entorno.

**6. Tests (antes: cero).** Se agregó **vitest** + 17 tests: el parser del scanner (`parseTypes`/`parseSql`/`extractRefs` — incl. que ignora comentarios y buckets con guion), el DAL de activación (sin datos → false; con datos → true; **error de Supabase → LANZA**, no false), y el **contrato del endpoint** (no autenticado → 401; ok → 200; **DAL lanza → 500**, nunca un false silencioso).

**7. ALLOWLIST con gobernanza.** Cada entrada de deuda (`users`, `cron_state`, `increment_api_usage`) ahora lleva **dueño, fecha, severidad y criterio de vencimiento** — deja de ser un cementerio anónimo.

**8. Baseline del esquema.** `supabase/migrations/00000000_baseline_from_prod.sql` — snapshot column-level de las 55 tablas base de prod (autogenerado). Es de referencia/`db diff`; el baseline 100% fiel (enums, secuencias, índices, RLS) requiere `supabase db pull` con credenciales de DB (documentado, ROADMAP §P0.1).

**Verificación:** `pnpm check` en verde (tsc 0 errores — arrancó en 103 al tipar; eslint 0; db-refs 329 refs validadas; 17/17 tests). E2E data-layer de las tablas reconciliadas (`sell_zone_alerts`, `webhooks`, `remate_favorites` + RPC `get_remate_watchers`): insert→read→cleanup OK. Los 2 flujos auth-gated (`user_dtes`, `user_favorites`) quedan para verificación con sesión logueada (ROADMAP).

**Honestidad de alcance:** esto sí cierra la clase de bug para código nuevo (tipos + CI + tests + no-silencio). Lo que queda es burndown de la deuda ya visible (los `TODO(canon)`, la ALLOWLIST, los 2 flujos UI) — rastreado, no oculto.

## [1.74.1] — 2026-07-03

### Reconciliación del estado de Supabase — se destraban 5 features rotas en silencio

Continuación directa de v1.74.0: el `check-db-refs` había detectado **6 objetos que las migraciones del repo crean pero prod nunca aplicó** — features enteras que consultaban tablas inexistentes y **fallaban en silencio** en producción (por los `catch {}` vacíos). Este release **aplica esas migraciones faltantes a prod**, con el RLS correcto (no se reintrodujo ningún `USING(true)`).

**Aplicado a prod (migraciones ahora versionadas en `supabase/migrations/20260703_reconcile_*.sql`):**
- **`user_dtes`** (17 refs — todo el feature DT-e: upload con OCR, historial, stats, onboarding). RLS own-row para SELECT/INSERT/UPDATE/DELETE.
- **`sell_zone_alerts`** (alertas de zona de venta + su cron). RLS service-role-only.
- **`webhooks`** (registro de webhooks de la API). RLS on, service-role-only.
- **`remate_favorites`** (watch/guardar remates). Aplicada **HARDENED**: en vez del `USING(true)` de la migración original (que filtraba los `user_id` de todos), SELECT scopeado (`auth.uid() = user_id OR user_id IS NULL`) + insert/delete own-row. Incluye `get_remate_watchers`.
- **`consignataria_followers`** (view de conteo) con `security_invoker = on`.
- **Fix de `user_favorites`:** existía en prod pero con **RLS habilitada y 0 políticas** → nadie podía leer/escribir sus favoritos (la feature de "seguir consignataria" estaba rota). Se agregaron las 4 políticas own-row.

**Por qué ahora y no en v1.74.0:** en v1.74.0 se dejó como decisión pendiente por el riesgo de aplicar migraciones viejas a ciegas. Se aplicó controladamente: una por una, verificando existencia + RLS tras cada una, y corriendo el **security advisor** de Supabase al final (**limpio**: las tablas nuevas no aparecen en "RLS sin política"; `remate_favorites` no aparece en la lista de `USING(true)`; la view no es SECURITY DEFINER).

**Resultado:** drift del checker **6 → 0**; se regeneró `src/lib/database.types.ts` (57 → 62 tablas/vistas). Deuda documentada (ALLOWLIST): `users` (API-key legacy en texto plano) y `cron_state`.

**Pendiente (ver ROADMAP):** verificar los 5 flujos end-to-end en prod; baseline del esquema desde prod para versionar las ~16 tablas prod-only; tipar los clients con `<Database>`; `pnpm check` en CI.

## [1.74.0] — 2026-07-03

### Canon Agent — Fuente de verdad del esquema + fix de bug silencioso en prod

Este release ataca el hallazgo **crítico** del review general (2026-07-03): *no había fuente de verdad del esquema de base de datos*, y eso ya estaba produciendo bugs reales que fallaban en silencio. No es un cambio cosmético — es infraestructura de gobierno para que una clase entera de bug deje de ser posible. Documento completo: [`docs/PROYECTO-C-fuente-de-verdad-esquema.md`](docs/PROYECTO-C-fuente-de-verdad-esquema.md).

#### El problema, y por qué importa

El código habla con Postgres con strings sin tipar (`.from('tabla')`, `.rpc('fn')`). Como los clients Supabase se instancian **sin tipos** (`createClient()` en vez de `createClient<Database>()`), un `.from('alerts')` hacia una tabla que **no existe** compila igual y falla recién en runtime — y como casi todas esas queries están envueltas en `try {} catch {}` vacíos, **falla en silencio**. Nadie se entera. Verificando el esquema **real de producción** (proyecto `nyqkgorazkwcufkzxmhd`) contra el código, apareció un drift bidireccional serio:

- **Bug raíz (`src/components/dte/ActivationChecklist.tsx`):** consultaba `.from('alerts')` y `.from('saved_remates')`. **Ninguna de las dos tablas existe** — son typos de `alertas`/`remate_favorites`. Peor: usaba el client **anon del browser**, y aunque los nombres fueran correctos, RLS bloquea la lectura (`alertas` quedó `service_role`-only tras el hardening de seguridad; `user_favorites` tiene RLS on sin policy). O sea **dos bugs superpuestos**: nombre inexistente + arquitectura equivocada. Consecuencia: los pasos "Creá una alerta" y "Guardá un remate" del checklist de activación **nunca se marcaban**, sin importar lo que hiciera el usuario.
- **Drift "prod le falta lo que el repo tiene":** el nuevo escáner encontró **6 objetos** que las migraciones del repo crean pero **prod no tiene**, con el código usándolos igual — es decir, **features enteras rotas en silencio en producción**: `user_dtes` (17 referencias — todo el feature DT-e), `remate_favorites` (watch/guardar remates), `sell_zone_alerts` (alertas de zona de venta + su cron), `consignataria_followers` (top-followed), `webhooks` (registro de webhooks). Sus migraciones (`20260318_user_dtes.sql`, `20260625_sell_zone_alerts.sql`, etc.) **nunca se aplicaron a prod**.
- **Deuda sin migración en ningún lado:** `users` (el API-key legacy de `alertas/*` asume `public.users` con la key en texto plano — no existe) y `cron_state` (`cron/new-remate-alerts`).

#### Qué cambié y por qué

**Added — `src/lib/database.types.ts` (fuente de verdad del esquema).** Tipos autogenerados desde el esquema **real de producción**. Antes, "qué tablas existen" era conocimiento tácito en la cabeza de quien escribía cada `.from()`; ahora es un artefacto versionado y regenerable. Es la base para, más adelante, tipar los clients y que `.from('alerts')` sea error de compilación.

**Added — `scripts/check-db-refs.mjs` + `pnpm check:db-refs` (enforcement).** Un escáner que valida **todos** los `.from()`/`.rpc()` del código contra el esquema intendido = (prod, desde los tipos) ∪ (objetos que crean las migraciones del repo). Clasifica cada referencia en OK / **DRIFT** (la crea una migración pero prod no la tiene → warning, no bloquea) / **ERROR** (no existe en ningún lado → bloquea) / **ALLOWLIST** (deuda documentada con motivo). Por qué así: distinguir un **typo real** (`alerts`) de un **drift de migración** (`user_dtes`, que sí tiene migración pero prod no la aplicó) — tratar todo como error haría el checker inservible; ignorarlo escondería features rotas. Ignora referencias dentro de comentarios (enmascara `//` y `/* */` preservando líneas) para no auto-marcarse. Habría cazado el bug de `ActivationChecklist` en el commit que lo introdujo.

**Enforcement — `.githooks/pre-commit`.** El checker corre en cada commit (mismo mecanismo que ya se usa para el escáner de secretos). Bloquea el commit ante una referencia a una tabla/función inexistente. `--no-verify` para saltear un falso positivo real. Motivo: convertir la regla en algo que el sistema aplica solo, no que alguien tiene que recordar.

**Fixed — el bug de `ActivationChecklist`.** Se creó el endpoint **`GET /api/me/activation`** (`requireAuth` + `service_role`, `dynamic = 'force-dynamic'`) que computa `hasSavedRemates`/`hasAlerts` desde la tabla que **sí existe** (`user_favorites`), server-side y con el acceso correcto (bypassa RLS legítimamente). El componente ahora consume ese endpoint en vez de consultar tablas rotas con el client anon. Por qué endpoint y no solo renombrar: renombrar no alcanzaba — el client del browser no puede leer ninguna de esas tablas por RLS; el fix correcto es mover el cómputo al server.

**Deprecado.** `.from()`/`.rpc()` sin validar contra `database.types.ts`, y consultar tablas con RLS desde el client anon esperando leer filas de otro scope. Reemplazo: referencias validadas por `check-db-refs` + endpoints `service_role` para datos con RLS (patrón `/api/me/activation`).

#### Lo que NO hice (a propósito) — decisión pendiente del dueño

**No apliqué a ciegas las 6 migraciones faltantes a producción.** Crear esas tablas activaría features hoy rotas (DT-e, alertas de zona, etc.), pero son migraciones viejas nunca aplicadas y pueden tener conflictos (ej. la doble definición incompatible de `whatsapp_clicks` ya detectada). El plan de reconciliación seguro (baseline desde prod + aplicar una por una y verificando + resolver la deuda `users`/`cron_state` + tipar los clients + CI) está en el Proyecto C como **decisión pendiente**, no como algo a ejecutar sin aval.

#### Impacto

- El checklist de activación de DT-e vuelve a funcionar (para la señal que hoy es medible con `user_favorites`).
- Cualquier `.from('tabla_inexistente')` futuro se bloquea en el commit.
- Queda documentado, con evidencia, que **5 features están rotas en prod** por migraciones sin aplicar — algo que estaba oculto por los `catch {}` vacíos.

## Review general de la base de código — 2026-07-03

Auditoría estructural en 3 ejes (backend / frontend / datos) + review de los cambios de la sesión. Documento completo: [`docs/REVIEW-GENERAL-2026-07-03.md`](docs/REVIEW-GENERAL-2026-07-03.md).

**Veredicto:** islas de excelencia (webhook Rebill, api-auth, cron-auth, contrato `value-events`, `security_hardening.sql`) rodeadas de código que las reimplementa peor. El riesgo dominante no es un bug puntual sino **entropía de patrón** + **falta de fuentes de verdad únicas**. Mayor ROI = convergencia, no features.

**Hallazgo crítico — no hay fuente de verdad del esquema:** sin tipos generados; 16 tablas usadas en código sin migración en el repo (viven solo en prod, incl. `market_price_snapshots`); el hardening de seguridad vive en una migración tardía (si no se aplica a un entorno nuevo, vuelven las vulnerabilidades). **Bug real detectado:** `dte/ActivationChecklist.tsx` consulta `.from('alerts')`/`.from('saved_remates')` — tablas inexistentes (son `alertas`/`remate_favorites`) → falla en silencio.

**Concerns por eje (resumen):**
- **Backend:** esquema de API-key paralelo con keys en texto plano (`alertas/*`); 5 crons reintroducen el canal `?secret=` (no usan `authorizeCron`); DAL usado por 4/110 rutas (73 hacen `.from()` ad-hoc); dos service clients; zod inconsistente; sin error handler central.
- **Frontend:** god-components (`DashboardClient` 1535 líneas, `ConsignatariaProfileClient` 1344); trackers huérfanos (`TrackOnMount` dead code); sprawl de WhatsApp (6 componentes, `wa.me` en 16 archivos); faltan primitivos `<Button>`/`<Input>`. **La consolidación de analytics de la sesión SÍ cumplió su objetivo.**
- **Datos:** migraciones no idempotentes; `whatsapp_clicks` duplicada e incompatible; `remates.json` (450 KB) en el bundle del cliente; scraper sin validación de esquema.

**Roadmap (convergencia > features):** (1) fuente de verdad del esquema (baseline desde prod + tipos generados + CI `db diff`); (2) fix `ActivationChecklist`; (3) 5 crons → `authorizeCron`; (4) deprecar API-key en texto plano; (5) un service client + DAL como choke point; (6) partir god-components; (7) primitivos UI + borrar huérfanos; (8) sacar JSON del bundle cliente.

## [1.73.0] — 2026-07-03

### Analytics F2 (dedup/unificación) + retención F1 + bandeja de leads

- **Integridad de analytics — Fase 2:** `pro_prompt_view` deduplicado a UNA impresión por página (lo emitían 6 componentes → denominador del funnel inflado) y unificado a GA + ledger (`ProPromptView` reemplaza el `TrackOnMount` del Paywall); helper único `trackWhatsAppClick()` — las 3 superficies (perfil/SmartCTA/FAB) ahora emiten señales coherentes; `subscription_paid` deduplicado por `subscription_id` (no cuenta renovaciones).
- **Retención — Fase 1:** `HerramientasCTA` ("cosas para hacer": calculadora, mi-ganado, ¿vendo ahora?) surfaceada en `/precios` y `/mercado/arrendamiento` (entrada #1, 57% bounce).
- **Hook de pago — bandeja de leads:** tab "Leads (N)" en el dashboard del dueño verificado con la lista real (nombre, tel/email, mensaje, fecha, fuente) + botones WhatsApp/Email. La captura ya existía (`consignataria_leads`); faltaba la gestión.

## [1.72.0] — 2026-07-03

### Integridad de analytics — Fase 1 (fix pageview + higiene de eventos) + proyectos A/B

- **Fix de inflación de pageviews:** `PageViewTracker` dispara por cambio de `pathname`, no de `searchParams` (cada filtro/paginación era un `page_view` → inflaba pág/sesión, bounce, engagement en `/frigorificos/*`, `/mercado/arrendamiento`). Detectado cruzando GA4 (208 sesiones / 993 pv el 29-jun) con la data first-party.
- **Higiene de eventos:** guard de sesión en `SinceLastVisit` (disparaba ~3× por usuario en 4 páginas); wire al ledger de eventos que nunca llegaban (`alert_create`, `newsletter_subscribe`, `signup`) → los grupos recurrencia/lead del value-index dejan de estar vacíos.
- **Nav fix:** los links "Remates/Frigoríficos/Mercado" de la home eran anclas muertas (`#remates`…) → ahora van a las páginas reales. **Buscador** por nombre en la home. **Burbuja WhatsApp** movida al root layout (aparece también en la home de la raíz).
- **Docs:** `docs/PROYECTO-A-integridad-analytics.md` (root cause + auditoría + roadmap) y `docs/PROYECTO-B-motivos-para-quedarse.md` (retención por audiencia: productor vs consignataria, JTBD, cosas para hacer).

## [1.71.0] — 2026-07-02

### Captura de lead para consignatarias sin contacto público

Las firmas sin whatsapp/tel/email/web eran un **dead-end** ("Sin datos de contacto públicos todavía") — el lander frío (mayormente de IA) no tenía ningún camino. Nuevo `ContactlessLeadForm` en la Card C del perfil: botón "Pedí que te contacten" → form (nombre + tel/email) → `POST /api/leads`.

- **Tabla `consignataria_leads`** (migración `20260702_consignataria_leads.sql`, **aplicada en prod**): no existía, así que el endpoint tiraba 500 en cada envío. RLS on, sin acceso anon (contiene PII: name/phone/email/message), inserts vía `service_role`. El endpoint ya trae validación (zod) + rate-limit propio (3/IP/firma/día por `ip_hash`).
- **Value-event `lead_form`** (peso 10, grupo lead) para medir el lead capturado en `value_events`.
- Verificado en vivo: `/api/leads` → 200 + fila insertada (y borrada la de prueba); el form renderiza en `j-s-russo` reemplazando el dead-end.

## [1.70.0] — 2026-07-02

### Fix del nav de la home + instrumentación del funnel + buscador por nombre

- **Fix nav (reporte del dueño):** en la home, los links "Remates / Frigoríficos / Mercado" del top nav eran **anclas muertas** (`#remates`/`#frigorificos`/`#mercado` apuntaban a secciones inexistentes → no llevaban a ningún lado). Ahora van a las páginas reales `/remates`, `/frigorificos`, `/mercado`.
- **Funnel al ledger `value_events`** (antes solo emitía a GA4 → el ledger interno estaba vacío para el embudo): nuevo `emitValueBeacon()` (beacon sin duplicar el evento de GA4); `planes_view` + `checkout_start` desde sus helpers de analytics; `pro_prompt_view` (`TrackOnMount`) + `pro_prompt_click` (`ValueLink`) en el muro PRO; `subscription_paid` **server-side** desde el webhook de Rebill (peso 100 = la conversión).
- **Buscador** por nombre de consignataria en la home (typeahead client-side sobre las ~100 firmas → link directo al perfil): el caso típico de la IA es que el usuario ya sabe el nombre y no tenía dónde tipearlo.
- **Burbuja WhatsApp** movida del layout terminal al **root layout** para que aparezca también en la home de la raíz (que no usa el layout terminal).

## [1.69.0] — 2026-07-02

### Legibilidad + burbuja WhatsApp "sumá tu consignataria" (lead B2B medido)

Del reporte de tráfico/UX: la IA (Copilot + ChatGPT) es el canal de descubrimiento dominante y el sitio perdía esa demanda por legibilidad y falta de captura.

- **Legibilidad:** subidos los tokens mínimos que usan contacto/precios/CTAs — `text-xxs` 11→12px, `text-data` 13→14px, `label` 14→15px. Audiencia mayor, mobile-first.
- **Burbuja global de WhatsApp** → `wa.me/5493773418130` con mensaje "quiero sumar mi consignataria"; el clic se mide como value-event **`whatsapp_lead`** (peso 12, b2b). Se oculta en el detalle de una firma y en `/admin`.
- **Tabla `whatsapp_clicks`** (migración `20260702_whatsapp_clicks.sql`, **aplicada en prod**): el código (`/api/track/whatsapp`, CTAs) ya insertaba ahí vía `service_role` pero la tabla no existía → cada clic-lead se perdía en silencio. RLS on, sin anon.
- **CTA de conversión** en `/precios` → `/consignatarias` ("¿Querés vender a estos precios? Encontrá tu consignataria"): era un dead-end y es un top-landing de IA.
- **Perfil:** el contacto WhatsApp pasa de link `text-xxs` a **botón primario** verde legible.

## [1.68.0] — 2026-07-02

### Auditoría de seguridad + remediación (código + DB) — "building in the open"

Auditoría 0-day del repo público. Remediación desplegada en código y aplicada en la DB de producción.

- **Webhooks fail-closed:** `rebill` + `auth` ahora exigen el secreto y verifican la firma **incondicionalmente** — antes estaban gateados con `if (secret && !verify)`, así que un secreto sin setear (env nuevo, preview, rotación) saltaba la verificación entera → cualquiera podía forjar una suscripción y auto-otorgarse un tier pago. `rebill` deja de caer al `metadata.api_tier` del cliente; `resend` suma ventana anti-replay (svix timestamp).
- **Cron auth:** `post-remate-outreach` + 3 crons env-gated → `authorizeCron()` (fail-closed en todo entorno; antes bypassables off-prod o con el secreto sin setear, y `post-remate-outreach` era GET-triggerable → blast de email). `authorizeCron` deja de aceptar el secreto por query-string y compara en tiempo constante; `internal/cron-hook` idem.
- **DB (Supabase, aplicado en prod — migraciones `20260629_security_hardening*.sql`):** se sacaron las políticas `USING(true)` de `alertas`/`alerta_logs` (leakeaban a anon el `api_key` en texto plano) y `subscriptions`; `get_user_report_stats` (IDOR) e `increment_api_usage` (DoS de cupo) revocadas de anon/authenticated → `service_role`; `email_tracking` anon `FOR ALL` (leakeaba email + IP de cada destinatario) → INSERT-only; vistas `value_events_*` SECURITY DEFINER → invoker; funciones-trigger sacadas del RPC público.
- **App:** se enforcea el allowlist `allowed_ips` de las API keys (estaba guardado pero nunca chequeado); rate-limiter **durable en Postgres** para endpoints de email/escritura anónimos (el in-memory era per-instancia, inútil en serverless); SSRF en `webhooks/register` (resuelve DNS y rechaza IPs privadas); fuga del email del dueño en `auctions` GET (`select *` → lista explícita de columnas); validación en `track/whatsapp`; sanitización del `ilike` en `lots`; el checkout público deja de pre-confirmar cuentas (account squatting); **HSTS + CSP** (frame-ancestors/base-uri/object-src).

Verificado en vivo: headers presentes, `POST /api/webhooks/rebill` sin firma → 401, y políticas/grants confirmados en la DB. Diferido (decisión de producto): `fpt_approvals` anon ALL, `increment_aperturas` anon, listado del bucket, leaked-password protection de Auth.

## [1.67.3] — 2026-06-29

### Fix: Canal Rural ya no duplica O'Farrell/Mondino (alias de slug)

Verificando en vivo aparecieron 2 duplicados: Canal Rural slugifica algunos nombres distinto al canónico ("O'Farrell"→`o-farrell` vs `ofarrell`; "Alfredo S. Mondino"→`alfredo-s-mondino` vs `alfredo-sebastian-mondino`), dejando la firma 2 veces (su entrada propia + la de Canal Rural). Agregados los alias a `SLUG_DEDUP_MAP` → ahora colapsan en la entrada propia (con location) y la **enriquecen** con el deep-link de elrural. Verificado: O'Farrell y Mondino 30/06 quedan en 1 entrada cada uno, con el link de Canal Rural. Nota: futuras firmas de Canal Rural con slug divergente pueden requerir un alias nuevo (lo detecta `audit-data-integrity.mjs`).

## [1.67.2] — 2026-06-29

### Fix dedup: remates sin location (Canal Rural) ya no duplican

Los remates de Canal Rural no traen localidad (`location=""`), lo que rompía la clave del dedup (`date|slug|location`) y generaba **duplicados** (la firma aparecía 2 veces: una con provincia, otra sin). `deduplicateAuctions` ahora es de **dos pasadas, order-independent**: indexa primero las entradas "con location" por firma+fecha, y colapsa las sin-location en esa ancla (enriqueciéndola con el deep-link de elrural en vez de duplicar). Verificado: los 3 duplicados de Canal Rural se colapsan; el único residual es un caso pre-existente de ClicRural-vs-sitio-propio con strings de ubicación distintos (matching difuso, fuera de alcance).

## [1.67.1] — 2026-06-29

### Canal Rural sumado al fetch local (elrural.com/remates) — 3er agregador

`scrapeCanalRural()` (en `scrapers/nea.mjs`) parsea la agenda de remates televisados de `elrural.com/remates/` — server-rendered, bloqueada para datacenter (403) pero 200 desde IP residencial AR, así que entra por el fetch local (`local-nea-fetch.mjs`) junto a Entre Surcos + Rosgan. 1ra corrida: **20 remates** (total local 113). Source `tv`, con deep-link a `remates.elrural.com` por remate.

El dedup es seguro: keepea el primer ocurrencia (los existentes con provincia van antes que el localNEA) y a los duplicados solo les **suma** campos faltantes (catalogUrl/time) sin pisar — así que Canal Rural no degrada nada y enriquece remates ya conocidos con el link de elrural. Limitación honesta: ~18/20 entran sin provincia (los títulos no la traen); afecta solo a los Canal-Rural-exclusivos, que igual aparecen en perfil/listados aunque no en páginas por provincia.

## [1.67.0] — 2026-06-29

### Instrumentación del canal email — webhook de Resend (dejamos de volar a ciegas)

Evaluación del canal email reveló que **no medíamos nada**: 0 webhooks de Resend → sin tasa de apertura, click, bounce ni quejas. En 3 meses salieron ~115 mails (51 newsletters/cierre/digest a ~38 suscriptores + 64 de outreach a consignatarias), y la única señal medible que teníamos (los 64 pedidos de cargar resultados → `auction_results`) dio **0**. No se puede optimizar lo que no se mide, y el email es EL canal de la estrategia (alertas, liquidación, cierre).

- **Tabla `email_events`** (migración `20260629_email_events.sql`, **aplicada en prod**): recibe sent/delivered/opened/clicked/bounced/complained.
- **`POST /api/webhooks/resend`**: verificación de firma Svix (HMAC-SHA256 sobre `id.ts.body` con `RESEND_WEBHOOK_SECRET`, sin dependencia externa), dedupe de reintentos vía `processed_webhook_events` (source='resend'), insert normalizado (email_id, type, recipient, subject, campaign de tags, link, bounce_type).
- **`EmailHealthCard`** en `/admin/overview`: tasa de apertura / click / bounce / quejas sobre 30d (únicos por email_id), con estado vacío que explica el setup pendiente.

**Setup del dueño (una vez):** (1) Vercel env `RESEND_WEBHOOK_SECRET` = el Signing Secret del webhook; (2) Resend → Webhooks → Add Endpoint `https://www.consignatarias.com.ar/api/webhooks/resend` + seleccionar los eventos; (3) Resend → Domain → activar Open + Click tracking. Recién con eso el card se puebla.

## [1.66.3] — 2026-06-29

### Fetch local de Entre Surcos/Rosgan desde IP residencial AR (sin proxy)

Las 2 fuentes bloqueadas para la IP del runner (Entre Surcos fetch-failed, Rosgan 403) ahora se fetchean **desde la máquina del owner en Corrientes** (IP residencial AR → 200), sin pagar proxy. Nuevo `scripts/local-nea-fetch.mjs`: reusa las funciones canónicas `scrapeEntreSurcos()` + `scrapeRosgan()` (ahora exportadas; `main()` de scrape-auctions quedó guardado tras `import.meta.url === entrypoint` para permitir el import sin ejecutar todo), escribe `src/lib/data/remates-local-nea.json` y commitea solo ese archivo (rebase autostash). El scraper de la nube lo lee y mergea (dedup) — esas fuentes tienen slug fuera de `scrapableSlugs`, así que sobreviven como curated.

**Rinde:** primera corrida trajo **92 remates** (Entre Surcos 82 + Rosgan 10) que la nube perdía por completo. Agendable con `scripts/local-nea-fetch.bat` + Task Scheduler (2×/día). Best-effort por diseño: si la PC está apagada, la nube conserva el último archivo bueno como curated. Cero dependencia de terceros.

## [1.66.2] — 2026-06-29

### Revert del "fix" de scrapers v1.66.1 — el problema es la IP del runner, no los headers

La corrida de verificación mostró que v1.66.1 fue **net-negativo**: el UA de navegador NO resolvió Rosgan (sigue 403) ni Entre Surcos (sigue fetch-failed) — son **bloqueo a nivel IP del runner de GitHub Actions** (datacenter), no de headers (ambos endpoints responden 200 desde una IP residencial, con o sin UA) — y encima **regresó CACG y O'Farrell** (HTTP 415 desde el runner; con el código original daban 200), bajando el scrape de 255→119. Restaurados los helpers de fetch a su estado original conocido-bueno (verificado: diff exacto vs pre-fix).

**Conclusión honesta:** Rosgan y Entre Surcos no se arreglan por código — el runner de GitHub (IP de datacenter) está bloqueado por esos sitios. Resolverlo requiere infraestructura (proxy / IP residencial / runner self-hosted en AR), fuera de alcance de un cambio de scraper. Los demás scrapers vuelven a andar normal.

## [1.66.1] — 2026-06-29

### Scrapers más robustos: UA de navegador + retry (fix Rosgan 403 / Entre Surcos fetch-failed)

El log del scraper mostraba **Rosgan HTTP 403** y la cartelera de **Entre Surcos "fetch failed"** desde el runner de GitHub Actions (ambos endpoints responden 200 desde una IP normal → el fallo es IP/UA-específico del datacenter). Fix de robustez en los helpers de fetch (`scrape-auctions.mjs` + `scrapers/nea.mjs`):
- **UA de navegador real** en vez de sin-UA (scrape-auctions, que no mandaba ninguno) y del UA de bot "ConsignatariasBot" (nea) — varias APIs rechazan ambos.
- **Retry con backoff (3 intentos)** ante fallos transitorios (fetch failed, timeouts, 403/5xx intermitentes).
- **Referer/Origin** en la llamada a la API de Rosgan (filtra por origen).

Verificado local: con UA navegador + Referer, Rosgan devuelve 200 (5 rows) y Entre Surcos 200 (101k chars). Honesto: si el 403 de Rosgan fuera puro bloqueo de IP de datacenter, esto no lo resuelve — la prueba es la próxima corrida en el runner.

## [1.66.0] — 2026-06-29

### Matcher de streams de agregadores — surfacea remates de consignatarias sin canal propio

~47 consignatarias con remates próximos no tienen canal de YouTube propio: las transmiten **AGREGADORES** (Canal Rural, Rosgan, Entre Surcos y Corrales). El matcher de canal propio no las cubría → no figuraban en vivo. Nuevo `scripts/match-aggregator-streams.ts` (2da pasada en `scrape-auctions.yml`, tras el matcher de canal propio): para cada remate de hoy SIN `youtubeUrl`, busca en los canales con flag `isAggregator` un stream EN VIVO/UPCOMING cuyo título matchee la consignataria, y se lo attachea → aparece en su página vía el render de `youtubeUrl` existente.

Precisión validada sobre streams reales de Canal Rural + Entre Surcos:
- Exige keyword **"remate|feria|subasta" + needle estricta** (multi-palabra, sin sufijos societarios/genéricos) → elimina falsos positivos de topónimos (ej. "Hasenkamp" el pueblo) y palabras genéricas. Mapear a ciegas el top-de-búsqueda metía links errados; esto no.
- En la prueba encontró en vivo a consignatarias sin canal propio (Esteban Abelenda, Gananor Pujol) transmitidas por Canal Rural.

**Por qué:** el modelo consignataria→canal-propio deja afuera a las que se transmiten por broadcaster; el matching en tiempo de stream (no mapeo estático) las cubre confiable. Honesto: **precisión > cobertura** — solo attachea con match fuerte, no infla el número con mapeos dudosos.

## [1.65.1] — 2026-06-29

### "EN VIVO" en la página de cada consignataria (no solo con URL directa)

Bug: el perfil de la consignataria mostraba el botón "En vivo" / link de transmisión **solo** cuando el remate tenía un `youtubeUrl` directo (que el scraper adjunta recién DESPUÉS de transmitir). Las consignatarias con **canal de YouTube mapeado** (~53%, en `youtube-channels.json`) no figuraban en vivo el día del remate — ej. Pedro Noel Irey (canal mapeado, remate hoy) no mostraba nada.

Fix — reusa `resolveYoutubeUrl` (que ya cae al `/streams` del canal), sin data nueva:
- **Hero "próximo remate":** muestra "▶ En vivo ahora" cuando el próximo remate está en vivo (`getEffectiveStatus === 'live'`) y la consignataria tiene canal, linkeando al `/streams`. Con URL directa sigue igual.
- **Filas del cronograma:** mismo indicador "● EN VIVO" para remates en vivo ahora sin URL directa (cubre el caso de varios remates el mismo día — ej. 11hs y 14hs).

**Por qué:** el dato (calendario + mapeo de canal) ya existía; solo el perfil lo ignoraba. Honesto: el indicador sale solo durante la ventana en vivo (no antes), y solo para remates que figuran en el calendario — los que el scraper no captura (ej. broadcasts de Canal Rural a consignatarias sin canal mapeado) siguen sin aparecer: ese es un gap de DATOS, no de UI.

## [1.65.0] — 2026-06-29

### Remate en vivo: transcripción automática del cantaleo → ticker de precios preliminar

Nueva herramienta que lee el audio de un remate en vivo (YouTube) y publica un ticker de precios por categoría en `/remates/en-vivo` (~30-60s de latencia). Valida que el cantaleo es máquina-extraíble: contra el promedio oficial publicado por **JUA (Mercedes, Ctes — 22/05/25)**, el precio reconstruido del video da **~3% de error en las categorías limpias** (terneras −1,4%, vacas gordas −2,2%, invernadas +0,6%, toros −5%; novillos sigue flojo por la ambigüedad gordo/invernada). El número se muestra SIEMPRE como **"lectura automática · preliminar"**, nunca como precio oficial — el promedio real lo publica la consignataria al cierre (regla de confianza + posicionamiento neutral).

Arquitectura en dos piezas (el worker **NO** corre en Vercel — serverless no sostiene captura de audio en tiempo real):
- **Worker off-Vercel** (`scripts/live-remate-worker.py`): yt-dlp (stream) → ffmpeg chunks 30s → faster-whisper local → parser de la gramática del cantaleo (encuadre + chant base/incrementos + cierre "va una/va dos/vendí", precio = máximo del chant) → escribe a Supabase vía service_role. Corre a ~0,58x tiempo real (mantiene el vivo). **Bandas de plausibilidad dinámicas** ancladas al INMAG del día (`--inmag`) → generaliza a cualquier firma/fecha/inflación. Dedup de cierres que spannean segmentos; clasificación gordo/invernada por peso.
- **Sitio** (Vercel): migración `live_remate_session` + `live_remate_lot` (RLS lectura pública, escritura service_role), `lib/live-remate.ts` (sesión activa + promedios corrientes, soft-fail, descarta worker caído >3min), `/api/live-remate` (polling no-store), `<LiveRemateTicker>` en `/remates/en-vivo` (se auto-oculta sin sesión activa). Runbook: `docs/LIVE-REMATE.md`.

**Por qué:** abre el camino de datos por captura del stream público (alternativa a la ingesta consentida por IMAP) y materializa el viewer de mercado en vivo — no un marketplace de pre-oferta, sino dato read-only que no desintermedia a la consignataria. Pendiente: correr el worker contra un stream real; detección de segmentos de venta (el muestreo ciego cae en silencio/música); fine-tune del ASR sobre el corpus etiquetado que el pipeline genera.

## [1.64.0] — 2026-06-28

### Pivote al cluster que explota: captura de arrendamiento liderada por la liquidación

Profiling con datos (GA4 + GSC + newsletter_subscribers): TODO el crecimiento del sitio es UN cluster — "índice novillo arrendamiento" (`/mercado/arrendamiento` **+110% impresiones WoW**, superficie de queries ensanchándose ~1.100 impr nuevas/semana: "…semanal", "…cañuelas", "…el rural"). Pero NO es el que vende hacienda: es el **arrendador/arrendatario/contador que liquida un canon cada mes** (~85% nuevos, one-shot, no tocan /remates ni /consignatarias). Y estaba **casi sin convertir**: 2 emails en toda la historia del sitio contra el tráfico #2. Causa: le dábamos "un mail por mes / novedades" cuando el job es **liquidar** y la cadencia pedida es semanal/hoy.

Fix (quick win, código puro):
- **`ArrendamientoLiquidacionSignup`** reemplaza las dos capturas genéricas (`PriceAlertSignup` + `CierreMensualSubscribe`) en `/mercado/arrendamiento`. Lidera con la liquidación, no con novedades: inputs del contrato (kg/ha + ha) **inline** (no depende de haber usado el calculador antes), **canon en vivo** como ancla de valor, y promesa **cumplible** — el cierre mensual con TU canon ya calculado. Sin sobre-prometer "semanal" ni "constancia PDF" que aún no existen (regla de confianza). Sincroniza el contrato con el calculador (mismo localStorage).
- **Segmentación:** `arrendamiento-liquidacion` agregado a `SEGMENT_SOURCES.monthlyClose` → el cron `monthly-close` (activo) le manda su canon vía `lease_kg_ha`/`lease_hectareas`. Cerrado el gap que habría dejado al suscriptor sin recibir nada.

**Por qué:** alinea con la bibliografía verificada ([[posicionamiento_pro_consignatarias]]): se paga por la DECISIÓN/operación (liquidar), no por el número suelto. Es el test H1 directo sobre el tráfico que ya está explotando. Lo que sigue (diseño completo): constancia PDF citable + cadencia semanal + producto de liquidación PRO.

## [1.63.0] — 2026-06-26

### Modelo de venta TRUST-FIRST — describe, no ordena; alerta validada con backtest

Backtest del modelo de "¿cuándo vender?" sobre el INMAG en USD reales 2015-2026 (percentiles trailing, sin lookahead). Hallazgos: el orden `aguantar > neutro > vender` en retorno forward se sostiene en ambas mitades del período (la señal lleva información direccional real, no es humo). **PERO** en un bull estructural (2021-26) el percentil solo gatilla "vendé" casi todos los días (446 días) mientras el precio igual sube (+1,5% a 60d) — exactamente lo que erosiona la confianza: el productor vende y ve el mercado seguir subiendo.

Fix validado con backtest: la alerta ya **no** dispara por percentil solo, sino por la **conjunción "zona alta del año Y girando"** (precio en franja alta pero ≤ su media móvil de 90d, i.e. sin hacer nuevos máximos). Eso recorta ~84% de los falsos avisos del bull (446→72) y los 72 restantes precedieron **caídas** (-3,1% a 60d). No es un oráculo universal (en el régimen lateral 2015-20 el filtro se invierte), por eso el cambio de fondo es de **framing**: dejamos de dar la orden y pasamos a describir.

- **`computeSellZone`** ahora devuelve `zone` (alta/media/baja, descriptivo, ex-"verdict") + `trend` (subiendo/estable/bajando vs MM90) + `ma90` + `alertWorthy` (el gatillo trust-safe de la conjunción).
- **`SellZoneBadge`** muestra zona + tendencia + nota honesta ("en zona alta pero todavía subiendo — no necesariamente el techo") y un explícito "No es una recomendación".
- **Alerta (cron + emails)** dispara solo en `alertWorthy`; copy reescrito de imperativo ("Vendé hoy") a descriptivo ("está caro vs el año y empezó a girar — la decisión es tuya"). El mail de confirmación promete exactamente eso, sin sobre-prometer.
- **`/api/sell-zone`** expone la nueva forma (zone/trend/ma90/alertWorthy).

**Por qué:** "todo lo que erosione la confianza no nos gusta". Un modelo que ordena se puede falsar; uno que describe el percentil + la tendencia es siempre cierto y deja la decisión —y el riesgo— del lado del productor.

## [1.62.1] — 2026-06-26

### El valor PRO Usuario llega a la puerta de entrada (home)

Hasta ahora el home solo tenía conversión B2B ("¿querés estar acá?" para consignatarias) + el ValuationWidget. El productor — el grueso del tráfico SEO de precio (~5000 vistas/día) — no encontraba ningún hook de su valor (PRO Usuario) en la portada. Esta release pone el **par decisión** junto al ValuationWidget: el semáforo de venta (¿conviene vender hoy?) + CTA directo a `/mercado/vender-ahora`. **Por qué:** "sabés cuánto vale → ¿conviene venderla?" es la secuencia natural, y la mueve desde el front door donde entra la mayoría, no solo en las páginas de mercado internas. Home sigue ISR; el badge se hidrata client-side (sin impacto en SSG/SEO).

## [1.62.0] — 2026-06-26

### Semáforo de venta on-site — la señal "¿conviene vender hoy?" gratis y diaria

La mecánica de retención #1 en productos de precio agro (Bushel/DTN) es la señal "is now a good time to sell". v1.61 la entrega por mail (cuando entra en zona de venta); esta release entrega la versión **on-site, gratis y para todos**: un semáforo que muestra de un vistazo si el mercado está en **zona de venta / aguante / neutra** (INMAG en USD reales, percentil del año y del mes).

**Por qué importa para la conversión:** (1) da un motivo de volver TODOS los días, no solo cuando hay remate — ataca la baja stickiness (DAU/MAU ~5%); (2) hace la alerta más deseable — el usuario ve el estado y quiere que le avisen cuando cambie, así que el semáforo y la captura de alerta van apareados; (3) es valor-primero: damos la señal gratis y la decisión completa (lectura + brecha estacional + neto) queda en PRO.

- **`GET /api/sell-zone`**: señal pública (computeSellZone), cacheada 1h en el edge (`s-maxage=3600`). Cambia solo con el cierre diario.
- **`SellZoneBadge`**: el semáforo. Colores por veredicto (verde/ámbar/zinc), percentil 365 + 30, honestidad de precisión (preciso para novillo, dirección del mercado para el resto). Skeleton sin números falsos mientras carga.
- Montado en `/mercado/vender-ahora` (antes de calcular), `/mercado/inmag`, y las 6 páginas de categoría (apareado con la captura de alerta de esa categoría). Render client + endpoint cacheado → no afecta el SSG/SEO de esas páginas.

## [1.61.1] — 2026-06-26

### Captura de zona de venta en las 6 páginas de categoría

Extiende la captura de la alerta (v1.61.0) a `/mercado/[categoria]` — las 6 páginas de precio por categoría (novillo, ternero, vaca, etc.), justo debajo del precio (pico de intención). Cada página captura la alerta de SU categoría con el slug pre-seteado: quien mira "precio de la vaca" se anota a "avisame cuando la vaca entre en zona de venta". **Por qué:** multiplica las superficies de funnel-top con contexto exacto y cero infra nueva — estas páginas viven de SEO de precio ("cuánto vale un novillo"), la misma intención que la alerta resuelve. Render estático (sin tocar la DB en SSG).

## [1.61.0] — 2026-06-25

### Motor de alertas de "zona de venta" (FASE 1) — la primera pata del plan de conversión

Contexto: el sitio tiene tráfico fuerte (~150k vistas/mes, mayormente SEO de precio) pero conversión ≈0%. La research (3 streams: auditoría del producto PRO, datos GA4 del embudo, y playbooks de productos de datos/agro) cruzó en un diagnóstico: el problema no es el precio (USD ~6 contra una decisión de USD 16-20k/jaula), es **mecanismo + canal + un muro que pide pagar antes de dar valor**. El embudo medido: 814 usuarios ven el muro PRO → 16 clickean (~2%) → 3 envían el form → 0 pagan. La palanca #1 validada es capturar el contacto en el momento de máxima intención (los registrados convierten 10x) con un beneficio **sticky real**, no un paywall.

Esta release entrega ese beneficio: la alerta personalizada de zona de venta — el patrón Bushel/DTN ("avisar sobre TU posición, no publicar un feed genérico"), inexistente en el mercado argentino (Agrofy/Rosgan/Infocampo publican precios a todos; nadie te avisa a vos).

**Qué hace**
- El productor deja su email + categoría en `/mercado/vender-ahora` (después de ver el veredicto) o en `/mercado/inmag`, y recibe **un solo mail cuando su categoría entra en zona de venta** (percentil alto del INMAG en dólares reales), no por cada tick. Sin login, sin tarjeta, single opt-in.

**Piezas**
- **`sell_zone_alerts`** (migración `20260625_sell_zone_alerts.sql`): tabla con dedup en la propia fila (`last_sent_zone` + `last_sent_at`), RLS service-role. *(Pendiente: aplicar a prod — el classifier bloqueó la migración automática; SQL en el archivo.)*
- **`src/lib/market/sell-zone.ts`**: `computeSellZone()` — extrae la lógica de percentiles de `/api/vender-ahora` a un helper compartido para que el mail y el sitio nunca discrepen (mismo INMAG-USD, mismos umbrales). **Por qué:** evitar drift entre lo que el sitio dice y lo que el mail dice.
- **`POST /api/alertas/venta`**: alta idempotente (upsert email+categoria) + espejo del contacto en `newsletter_subscribers` sin pisar suscripciones previas + mail de confirmación con el percentil de hoy.
- **`GET /api/cron/sell-zone-alerts`**: el motor. 1×/día calcula la señal; si está en zona de venta avisa a los no-avisados de este episodio; si no, re-arma el latch. `authorizeCron` + `?test=email` para preview. Dedup re-afirma cada 14 días. **Por qué diario es seguro:** la mayoría de los días no manda nada.
- **`sendSellZoneAlert` + `sendSellZoneAlertConfirm`** (email.ts): plantillas terminal-dark con List-Unsubscribe (RFC 8058).
- **`SellZoneAlertSignup`**: captura category-aware; reemplaza en `/mercado/inmag` al `PriceAlertSignup` de cierre mensual (promesa vaga, sin motor) por esta (promesa cumplible, con motor). Dispara `alert_subscribe` para medir el embudo.
- **`.github/workflows/disabled/sell-zone-alerts.yml`**: cron armable (18:30 ART lun-vie). **NO activado** — se arma moviéndolo a `.github/workflows/`.

**Por qué es a la vez el "aha" y el sticky:** el productor ve el veredicto sobre su lote (aha), y se lleva el aviso para la próxima sin tener que volver a entrar (hábito/retención) — capturando el email que faltaba en el embudo. Es el riel para WhatsApp después (decisión: email primero).

## [1.60.1] — 2026-06-25

### Hotfix: `remates.json` con marcadores de conflicto

El commit de v1.60.0 incluyó `remates.json` con marcadores de conflicto de git (un `git stash pop` chocó entre la higiene C12 y un scrape remoto durante el rebase) → JSON inválido. Producción no se rompió (el build de Vercel falla y mantiene el deploy anterior). Resuelto tomando el lado upstream (scrape más reciente, 622 remates) + re-aplicando la higiene C12. JSON válido, build verde.

## [1.60.0] — 2026-06-25

### Wave 2 + 3 del plan de auditoría — SEO, conversión, datos y design system

Segunda y tercera ola del plan verificado (`docs/strategy/MODIFICATION-PLAN-2026-06-25.md`).

**SEO / distribución**
- **C6 — `/go/[slug]` a `noindex,follow`**: es superficie de share (QR/WhatsApp/.ics), no SEO; duplicaba indexablemente a `/consignatarias/[slug]`. **Objetivo:** cortar la canibalización (su gemelo SEO ya tiene self-canonical).
- **C7 — OG dinámica para `/go/[slug]`**: la metadata apuntaba a `/og-consignataria.png` (404) → previews sin imagen al compartir. Nuevo `opengraph-image.tsx` (ImageResponse, espeja el de la ficha, con badge PRO). **Objetivo:** subir el CTR del canal de distribución.
- **C11 — Entidad INMAG unificada a "Mercado Agroganadero de Cañuelas"** en el JSON-LD (Dataset de `/mercado/inmag` + `/mercado/[categoria]` + arrendamiento) + `sameAs`. Borrado el `aggregateRating` muerto de `SaaSPricingSchema`. **Objetivo:** una sola asociación marca↔INMAG para los motores de IA.

**Conversión**
- **C9 — Desambiguados los dos "PRO" en la ficha**: el gate de Medios de Pago ahora dice **"PRO USUARIO"** (productor, $7.900) y el bloque de activación **"PRO CONSIGNATARIA"** (firma, $45.000), con a-quién-sirve cada uno. **Objetivo:** que el usuario entienda qué compra en la pantalla de decisión.
- **C10 — CTA B2B en la vista provincial de frigoríficos** (`FrigorificoProvinceView`): la landing orgánica de mayor profundidad (hasta 10 min) no tenía ningún CTA. Sumado "Reclamar perfil" + "Datos para empresas". **Objetivo:** activar la línea B2B en el flujo de mayor profundidad.

**Datos**
- **C8 — `/remates/ciudad` usa el campo `province` real** en vez de parsear `location` (que tenía la provincia mal en 76 casos: Vicuña Mackenna→Neuquén, etc.). **Objetivo:** geografía correcta en un producto que vende precisión.
- **C12 — Higiene de datos**: 50 títulos con `\r\n` saneados (+ `cleanTitle` en el scraper para que no recurra), typo `alopnso→alonso`, fusión de la entidad duplicada Lehmann (104→103 perfiles), y borrado de `public/robots.txt` obsoleto (precede `robots.ts`).

**Design system (Wave 3)**
- **C13 — `/mercado/arrendamiento` migrado al tema terminal** + nuevo `MarketHero` compartido (número-hero con DeltaFlash + AnimatedPrice + quick-stats). Antes era 100% SaaS crudo. **Objetivo:** una sola estética en arrendamiento→inmag→ficha.

_Nota: C8 y C9 los disparó un rate-limit del servidor a mitad del swarm; C8 ya estaba aplicado y C9 + la consistencia de C11 en `/mercado/[categoria]` se completaron a mano._

## [1.59.0] — 2026-06-25

### Wave 1 del plan de auditoría verificada — 5 quick-wins (conversión + SEO + a11y)

Primera ola del plan (`docs/strategy/MODIFICATION-PLAN-2026-06-25.md`), cada cambio verificado con evidencia dura antes de ejecutar. Falsos positivos del audit (overflow mobile, "INMAG $0", 108-vs-104) descartados, no tocados.

- **C1 (crítico, SEO) — Borrado el `AggregateRating` FABRICADO** (`JsonLd.tsx`, `ConsignatariaProfileSchema`): inyectaba `ratingValue` literal + `reviewCount` = nº de remates (no reseñas) en las 104 landings `/go/[slug]`. **Objetivo:** eliminar el riesgo de penalización manual de Google sobre el dominio — el activo de citabilidad que todo el sitio protege. Cero structured-data de reseñas sin reseñas reales.
- **C2 (crítico, conversión) — PRO-prompt → `/upgrade`** (era `/planes`, `ProUpgradePrompt.tsx`): el prompt de máxima intención (sobre inmag #2 y arrendamiento #3) mandaba al catálogo de 3 audiencias (3 clics) en vez del checkout email-first de 1 paso. **Objetivo:** destrabar la fuga medida `pro_prompt_view 420 → click 16` (CTR 0,5% → meta >2%).
- **C3 (alto, conversión) — Sacado el muro de login del CTA sticky mobile** (`MobileStickyCTA.tsx`, rama productor → `/upgrade` en vez de `/login`): mobile es ~48% del tráfico. El login wall ya había costado $0; el sticky lo reintroducía. **Objetivo:** menos fricción en el CTA primario mobile (el POST autenticado se mantiene solo con sesión; el login B2B $45.000 se dejó intacto, es necesario).
- **C4 (alto, conversión) — Quitado el gancho verde "probá gratis"** de `/upgrade` (`upgrade/page.tsx`): el elemento más llamativo de la página que cobra era un link de SALIDA a la versión gratis, antes del precio. **Objetivo:** una sola acción primaria → subir form_start→submit.
- **C5 (medio, a11y) — `AnimatedPrice` respeta `prefers-reduced-motion`**: usuarios con reduced-motion ven el valor final directo, sin el count-up. (El valor SSR ya era correcto — el "$0" del audit era un frame de animación, refutado.)

## [1.58.0] — 2026-06-25

### God commands en `/admin/overview` + fix del nombre "Colombo Y Maliagno2"

El god-panel pasa de read-only a **accionable**, y se corrige el dato sucio que lo motivó.

**God commands (panel accionable):**
- **Deep-link al editor** — `/admin/consignatarias` (que YA tenía formulario + PATCH) ahora abre el editor de una firma directo con `?slug=<canonical>` (auto-selecciona + scroll, soft-aviso si no existe; `useSearchParams` envuelto en `<Suspense>`).
- **Feed accionable** — en `LiveActivityFeed`, cada fila de consignataria suma un mini-link **"✎ editar"** → `/admin/consignatarias?slug=…`. Desde el panel: ves quién está activo → click → editás el nombre.
- **Launchpad `GodCommandsCard`** — card nuevo en el overview con accesos directos a todas las herramientas de gestión (editar consignatarias, claims, frigorífico-claims, reseñas, suscriptores, ops).

**Fix de dato "Colombo Y Maliagno2" (era el ejemplo del owner):**
- Era un **alias mal scrapeado** en `remates.json` (no un registro de la DB — la tabla ya tenía "Colombo y Magliano SA" bien, y el registro de slugs ya mapeaba la variante). Solo el `consignatariaName` crudo de los remates mostraba el typo.
- **Corregido el dato actual:** 13 remates en `remates.json` (`consignatariaName` + `consignatariaSlug`) → canónico "Colombo y Magliano SA" / `colombo-y-magliano` (mergean con la firma real).
- **Fix durable:** `scrape-auctions.mjs` suma un `CONSIG_SLUG_FIX` que normaliza ese alias al canónico antes de escribir, así no reaparece en el próximo scrape.

## [1.57.0] — 2026-06-24

### `/admin/overview` modo dios: 6 cards en vivo para administrar todo el sitio + widget de tráfico semanal

Ampliado el panel admin a un dashboard maestro: el feed en vivo arriba, y debajo un grid de 6 cards que cubren todo el sitio. Auto-refresh cada 45s (`AutoRefresh`, `router.refresh()`). Todo first-party/Supabase (en vivo sin depender de nadie), soft-fail por sección, read-only, mobile-friendly.

- **Tráfico semanal** (`WeeklyTrafficCard` + `src/lib/admin/ga4.ts`): el widget pedido. Listo para **GA4 real** vía service-account server-side (`getGa4Weekly()` lee `GA4_SA_KEY` + `GA4_PROPERTY_ID`; soft-fail a null sin credenciales, sin hardcodear nada). Mientras GA4 no esté conectado, muestra un aviso honesto + un **proxy first-party en vivo**: vistas de perfil 7d vs 7d previos + por día.
- **Conversión/Revenue** (`ConversionRevenueCard`): suscriptores activos (total + nuevos 7d + por source), firmas PRO (manual vs subscription), pitches de conversión (`outreach_log` 7d/30d + último), señal de pagos (`processed_webhook_events`).
- **Salud del dato** (`DataHealthCard`): frescura de `market-prices.json` (rojo si >36h), INMAG, remates (próximos/hoy/en-vivo/total), frigoríficos, última corrida del scraper.
- **Cola de moderación** (`ModerationQueueCard`): claims de consignataria/frigorífico pendientes, reviews por aprobar, arrepentimiento — con count + link directo ("al día ✓" en gris si 0).
- **Actividad de email** (`OutreachActivityCard`): últimos envíos (`outreach_log`), resumen por tipo 7d, bajas, y **estado on/off de los motores** warm/recordatorios (leyendo si su `.yml` está activo o en `disabled/`).
- **Salud del sistema** (`SystemHealthCard`): errores ops 24h, latencia media, estado de todos los crons (rojo si fallaron/atrasados), link a `/admin/ops`.

**Para encender el tráfico GA4 real:** setear en Vercel `GA4_SA_KEY` (JSON del service account con permiso Viewer en la propiedad + Analytics Data API habilitada) y `GA4_PROPERTY_ID` (el numeric, no el `G-…`). Sin eso, el card usa el proxy first-party.

## [1.56.0] — 2026-06-24

### Panel admin `/admin/overview`: overview de todo + comportamiento EN VIVO

Panel admin nuevo (gateado, read-only) con un overview del producto y, sobre todo, el **comportamiento en vivo de los usuarios** — sobre datos first-party, porque GA4 no es accesible desde el server (no hay credenciales en el env de prod).

- **Feed EN VIVO** (`LiveActivityFeed`, client): pollea `/api/admin/live` cada 10s sobre `profile_views` (cada fila = un usuario viendo un perfil ahora). Muestra las últimas ~30 vistas con "hace Xs/min", tipo, nombre/slug linkeado a la ficha, **host del referrer** (de dónde vino) y **dispositivo** (Mobile/Desktop del user-agent). Header con dot pulsante + "N activos · últimos 5 min"; filas nuevas flashean; soft-fail mantiene lo último. **Por qué:** es lo más cercano a "quién está navegando ahora" con dato propio y confiable.
- **KPIs** (`Stat`/`Delta`): vistas 5min/1h/24h, suscriptores newsletter (total + nuevos 7d + desglose por source), firmas PRO (`getFeaturedSlugs`), remates próximos, frigoríficos, errores ops 24h, última corrida de cada cron.
- **Comportamiento 24h:** top perfiles más vistos (linkeados), split consignataria vs frigorífico, y sparkline de vistas por hora.
- Endpoint `/api/admin/live` admin-gated (mismo patrón que `/api/admin/dashboard`), `no-store`, `force-dynamic`. Lógica compartida en `src/lib/admin/live.ts`. Tab "EN VIVO" primero en `AdminNav`.

## [1.55.0] — 2026-06-24

### Motores de email LISTOS Y ARMABLES: warm de conversión PRO + recordatorios (con dedup)

Los dos motores quedaron construidos, testeados (test-send al inbox del owner), dry-run'd y con dedup — **pero NO auto-armados**: el sistema de seguridad (correctamente) requiere que el humano dé el push final que activa envío saliente automático a consignatarias externas que no optaron-in. La config buena vive en `disabled/`, lista para mover y prender.

**Dedup en recordatorios — `remate-reminders/route.ts` (prerrequisito real)**
- El loop de envío **no tenía dedup**: con cron horario, un remate vive ~2h en la ventana T-24h → habría mandado **mails duplicados** al productor. Agregado dedup persistente sobre `outreach_log`: clave `remate_reminder:<id>:<timing>` + email, ventana 7 días (`loadSentReminderKeys` + `sendDeduped`). Ahora es seguro correr cada hora.

**Config armable (en `disabled/`, lista):**
- **`pro-consignataria-outreach.yml`** (warm): schedule **Lun-Vie 10:00 ART**, `min=10`, `dry=0`; el route capea a **1 envío/corrida**. Dry-run: 15 consignatarias elegibles (≥10 vistas/30d, no-PRO, no-baja); arrancaría por la de más tracción (Coop. Lehmann, 34 vistas). 1:1 `FROM_PERSONAL`, List-Unsubscribe + footer legal Memola Medios SAS, suppress, `outreach_log` (1/slug + cooldown 30d).
- **`remate-reminders.yml`** (productor opt-in): schedule **cada hora** (ventana T-1h; el dedup evita repetir). T-24h / T-1h ("en vivo" sólo con YouTube) a watchers + segmento subasta-por-firma.

**Para armar (lo hace el owner):** mover cada `.yml` de `.github/workflows/disabled/` a `.github/workflows/` y pushear — o agregar una regla de permiso. Para frenar: moverlo de vuelta a `disabled/`.

**Pendiente:** limpieza del flag `featured` (3 eventos) — write a prod bloqueado por el clasificador; el owner corre el SQL.

## [1.54.0] — 2026-06-24

### Overview mobile impecable + motores de email (warm PRO + recordatorios) listos y gated

Mobile del `/overview` rehecho + los dos motores de envío construidos con todas las salvaguardas, **sin prender ningún cron** (test-send + activación = decisión humana).

**`/overview` mobile (390px) — `OverviewClient.tsx` + `SinceLastVisit.tsx`** (desktop intacto vía `sm:`/`lg:`)
- "Mercado hoy" pasaba a `flex-wrap` apretado → en mobile ahora `grid grid-cols-2` con INMAG full-width como héroe (`text-4xl`) y Maíz/USD/Remates en 2 columnas. Jerarquía clara: el INMAG es lo primero.
- Padding exterior `px-2`→`px-3`. Filas de remates con touch target real (`min-h-[44px]`, antes ~22px) + feedback `active:`. Links de footer con hit-area extendida.
- Nombre de categoría era `text-xxs` (dato clave) → `text-data`; la tabla de categorías scrollea dentro de su `overflow-x-auto` en vez de romper los 390px.
- Spacing entre paneles `gap-px` (hairline) → `gap-2` en mobile. La barra `SinceLastVisit` ya no desborda: label corto ("Última visita") + `truncate` + `flex-shrink-0`.

**Fundación email — `src/lib/email.ts`**
- Helpers reusables: `listUnsubHeaders()` (RFC 8058 de dos URLs: one-click + fallback) y `legalIdentificationHtml()` (razón social **Memola Medios SAS**, "obtuvimos su email del registro público del MAG", opt-out destacado) — el requisito legal para outreach sin infringir.
- `sendConsignatariaViewsOutreach` (warm) ahora trae `List-Unsubscribe` + el bloque legal. `sendRemateReminder` ahora trae `List-Unsubscribe`. `sendRemateResultsToProducer` ya lo tenía.

**Motor WARM de conversión PRO — `pro-consignataria-outreach/route.ts`** (gated, cron en `disabled/`)
- Reescrito al patrón seguro: `authorizeCron` + `?test=<email>` + `?dry=1`. Selección: consignatarias con **≥10 vistas/30d** (`profile_views`), email no-null, que **NO** sean ya PRO (`getFeaturedSlugs`), que **NO** se hayan dado de baja (suppress vía `newsletter_subscribers status='unsubscribed'`), respetando `outreach_log` (1 vez por slug + cooldown 30d). **Goteo: cap duro 1/día.** Sin migraciones.

**Recordatorios de remate al productor — `remate-reminders/route.ts`** (gated, cron en `disabled/`)
- Secuencia T-24h / T-1h ("en vivo" SOLO si hay `youtubeUrl`, si no degrada a catálogo) / resultados (solo con promedios). 1 CTA + UTM + List-Unsubscribe por mail. `watchlist-notify` re-mapeado en `newsletter-segments.ts` a un segmento de subasta-por-firma (ahora que hay motor).

**Nota:** ningún cron prendido. El test-send (a tu inbox) y la activación los hacés vos. El flag `featured` (limpiar eventos) quedó pendiente de tu autorización del write a prod (el clasificador lo bloqueó).

## [1.53.0] — 2026-06-24

### Flujo "Consignataria PRO": ahora una firma que paga aparece destacada donde el productor busca

El email de bienvenida PRO promete *"aparecés con prioridad (destacado)"*, pero las 3 superficies de descubrimiento de mayor tráfico **ignoraban o tenían desactivada** la señal PRO — una firma de $45.000/mes no aparecía destacada en ningún lado salvo su propia ficha. Cerrar este gap es prerrequisito de cualquier venta. Cero email, cero cron, cero riesgo (estrategia completa en `docs/strategy/RESEND-STRATEGY-2026-06-24.md`, gitignored).

**Fuente unificada — `src/lib/featured.ts` (nuevo)**
- `getFeaturedSlugs(): Promise<Set<string>>` — devuelve los slugs PRO (`consignatarias.featured=true` **O** subscription activa), soft-fail a `Set` vacío. `/api/featured-slugs/route.ts` refactorizado para usarlo (mismo contrato `{slugs:[]}`). **Por qué:** una sola fuente de verdad para todas las superficies, en vez de reimplementar la lógica en cada una.

**Superficies reconectadas a la señal PRO:**
- **`/remates`** (`RematesClient.tsx`): el render dorado de fila PRO (ProBadge + barra ámbar + glow) ya existía pero estaba **muerto** — `useState(new Set())` sin setter y el fetch comentado *"DISABLED: no PRO subscribers yet"*. Re-habilitado el fetch + setter → la fila dorada se dispara para firmas PRO. **Por qué:** `/remates` es la página de mayor intención y la fila premium estaba apagada por una optimización de costo que ya no aplica.
- **`/consignatarias`** (`page.tsx` + `ConsignatariasDirectoryClient.tsx`): el directorio ahora ordena **PRO primero** (server + en todos los modos de sort del client) y renderiza `ProBadge` junto al nombre; el `ItemList` JSON-LD lista las PRO primero. **Por qué:** es la página que el welcome menciona literalmente ("buscar consignataria") — incumplir ahí era el mayor riesgo de churn/credibilidad. *(Se omitió `VerifiedBadge` en el directorio: las entries no traen el campo `verified`, solo la ficha — no afirmamos un dato que no tenemos.)*
- **Home wall** (`page.tsx` + `ConsignatariasShowcase.tsx`): reemplazado el hardcode `WALL_FEATURED=['hk-agro']` por `getFeaturedSlugs()` — las PRO se fuerzan al wall, se ordenan primero y muestran `ProBadge` en el tile. **Por qué:** una PRO nueva sin remates recientes no entraba al muro.
- **OG image** (`opengraph-image.tsx`): píldora dorada **PRO** en la preview que se ve al compartir el perfil por WhatsApp (canal natal del rubro). **Por qué:** superficie de prestigio desperdiciada — la preview no comunicaba el upgrade pagado.

**Nota:** esto es solo el carril *ship-now-safe* de la estrategia. El motor de conversión warm (N-vistas → PRO), los recordatorios de remate y el cold legal quedan **gated** para decisión del owner (ver doc). Cero envíos nuevos en esta tanda.

## [1.52.0] — 2026-06-23

### Estrategia de email: fix de segmentos, CTAs de captura, deliverability + digest más grande

Auditoría y mejora del sistema de email (captura, segmentos, templates, secuencias). Se commitea el **subset seguro**; los envíos nuevos quedaron diseñados pero **frenados** (ver "Frenado a propósito"). Detalle y porqué.

**Fix de segmentación — `src/lib/newsletter-segments.ts`**
- `alerta-inmag` y `alerta-arrendamiento` → mapeados a `monthlyClose`. **Por qué:** caían al weekly de remates por el fail-safe (peor destino: remates casi no tiene demanda GSC), cuando lo que prometen es el precio del novillo/INMAG — exactamente el contenido del cierre mensual. Arrendamiento es la demanda GSC #1 (4.718 impresiones).
- `watchlist-notify` → mapeado **explícito** a `weekly` (no por fail-safe silencioso). **Por qué:** los crons de aviso-por-firma siguen desactivados; hasta prenderlos, el weekly es lo único que cumple. Se re-mapeará a un segmento de subasta-por-firma cuando se activen.

**Mejoras de captura (CTAs/copy con intención GSC real)**
- `ValuationWidget.tsx`: el botón "🔔 Alertas de precio" prometía algo sin motor → ahora "Recibí el cierre mensual" + confirmación alineada a lo que realmente llega, y link de resultado a `/mercado/arrendamiento` (la landing que rankea para la demanda #1). *(Se corrigió además un `<a>` interno → `<Link>` que rompía el build.)*
- `NewsletterSignup.tsx`: default source `homepage`→`cierre-mensual` (homepage caía al weekly remates), copy declara la promesa ("El número del novillo para tu arrendamiento, cada mes"), y se arregló un `mt-14 absolute` que se solapaba en mobile.
- `CierreMensualSubscribe.tsx`: H3 ahora captura la query literal top de GSC ("Precio del novillo para arrendamiento — cada mes a tu mail").
- `PriceAlertSignup.tsx`: copy bajado a la promesa cumplible hoy (cierre mensual), con "arrendamiento/canon" explícito para esa variante.
- `WatchlistNotifyOptin.tsx`: copy suavizado a lo que el weekly cumple, manteniendo el argumento anti-ITP ("así no perdés lo guardado").

**Deliverability + atribución — `src/lib/email.ts`**
- Headers **List-Unsubscribe + List-Unsubscribe-Post (RFC 8058)** agregados a los emails de marketing/lifecycle de mayor volumen (antes solo el digest los tenía). **Por qué:** requisito 2024 de Gmail/Yahoo para bulk senders; sin esto los mails de más volumen caen a spam y arrastran la reputación del único dominio verificado (que también manda los transaccionales de pago).
- **UTM** en los links de los templates de alto volumen (`utm_source=email&utm_campaign=…`). **Por qué:** hoy GA4 no atribuye ninguna conversión a email salvo el digest — el cuello comercial es medir qué funciona.

**Digest más grande (tu feedback "está chico") — `digest-template.ts`**
- Ancho 520→**600px** (estándar de email), fuentes del cuerpo +30-40% (cuerpo 11-13px→14-16px), INMAG protagonista a **42px**, más padding/aire, CTA más grande. Misma lógica (UTM, headers, pixel) intacta.

**Ruta gated lista (dormida) — `remate-reminders/route.ts`**
- Mejorada con modo `?test=` y los mails de subasta al productor (opt-in real), pero **sigue en `disabled/`** — no se programó cron. Testeable, no auto-envía.

**Frenado a propósito (el swarm se pasó de las reglas; lo revertí):**
- **Outreach en frío a consignatarias** (confirmación de horario/YouTube): revertí el cambio en `post-remate-outreach` (cron horario **activo**, +263 líneas). Es cold outreach a emails institucionales → riesgo existencial con la AUP de Resend (una suspensión corta TODO el transaccional de pago). El copy quedó diseñado; se construye aparte, en goteo 1:1, con revisión explícita.
- **Migración de esquema** (`capture_context`) y su uso en `el-corredor`: revertidos (regla: sin migraciones; además rompería los inserts en prod).
- **2 `.yml` de cron** (`weekly-digest`, `onboarding-emails`): no se commitean — la programación de cualquier envío es decisión humana.

## [1.51.0] — 2026-06-23

### Digest sendable (3 endpoints) + arreglo de datos + página de baja que faltaba

Cierre de la infra del digest "qué cambió" para que pueda enviarse de forma responsable, fix del dato sucio detectado en el preview, y un bug de compliance pre-existente que apareció en el camino. Detalle por archivo y por qué.

**Envío del digest — como pipeline SEPARADO (no pisa el newsletter PRO)**
- `src/app/api/cron/weekly-digest/route.ts` (**nuevo**): `POST` gateado por `authorizeCron`. Construye el digest por destinatario (`buildDigestModel` + `buildDigestEmail`) y envía con `sendDigestEmail`. Reusa **exactamente** la lógica de destinatarios del cron PRO (`newsletter_subscribers status='active'` → `isWeeklyRecipient` → `capForFreePlan`). Modo TEST seguro: `?test=<email>` envía solo a ese email. **Por qué separado:** el cron del lunes (`/api/cron/weekly-newsletter`) envía los **remates destacados de consignatarias PRO** (monetización) — reemplazarlo lo habría borrado. El digest es retención, va por su cuenta; la programación del envío queda como decisión humana (no se agregó ningún `.yml` nuevo).
- `src/lib/email.ts`: nuevo `sendDigestEmail(email, {subject, html, headers})` — mismo FROM verificado y `getResend()` que el resto, reenvía los headers `List-Unsubscribe`/`List-Unsubscribe-Post` (RFC 8058). No se tocó `sendWeeklyNewsletter`.
- `src/lib/ops.ts`: `'weekly-digest': 168` en `EXPECTED_CRONS` para visibilidad en `/admin/ops`.

**Pixel de apertura + baja one-click**
- `src/app/api/newsletter/digest/open/route.ts` (**nuevo**): `GET` que devuelve un PNG 1×1 (`no-store`) y registra `digest_open` con `logEvent` fire-and-forget. **Por qué:** el `<img>` del template lo necesitaba; nunca debe fallar la imagen aunque falle el log.
- `src/app/api/newsletter/unsubscribe/route.ts` (**nuevo**): `POST` (one-click RFC 8058, lo dispara el cliente de correo) y `GET` (fallback). Marca `newsletter_subscribers.status='unsubscribed'` + `unsubscribed_at`. Idempotente, sin auth (es one-click), valida formato de email. **Por qué:** el header `List-Unsubscribe-Post` lo anunciaba pero el endpoint no existía → algunos clientes mostraban el botón nativo y fallaba el POST, ensuciando reputación del remitente.

**Página de baja `/unsubscribe` — bug de compliance pre-existente**
- `src/app/unsubscribe/page.tsx` + `UnsubscribeConfirm.tsx` (**nuevos**): la página a la que apuntan **todos** los emails (footer "Desuscribirme", líneas 387/481/732/873 de `email.ts`) y el redirect del one-click **no existía** → daba **404 en todos los envíos vivos**, no solo el digest. Creada y hecha **prefetch-safe**: NO da de baja en el GET (los escáneres de Gmail/Outlook prefetchean y desuscribirían a quien no clickeó); muestra un botón de confirmación que hace el POST. `noindex`. **Por qué:** un link de baja roto es un problema de CAN-SPAM/deliverability que afectaba a toda la base, no solo a esta feature.

**Arreglo de dato sucio (detectado en el preview del digest)**
- `scripts/scrape-auctions.mjs`: agregadas `"BAHIA BLANCA"` y `"BAHÍA BLANCA"` → `"BUENOS AIRES"` al *city-to-province correction map* para que el scraper no vuelva a etiquetar mal.
- `src/lib/data/remates.json`: corregido el patrón completo — **13 valores de `location`** que terminaban en `, CORRIENTES` siendo su `province` real `BUENOS AIRES` (Bahía Blanca, Ranchos, Bolívar ×2, Carmen de Areco, Tres Arroyos, Ituzaingó, General Lavalle, Junín ×2, Lobos, Navarro). **Por qué:** en un mail real "Bahía Blanca, Corrientes" quedaba pésimo; la corrección es auto-consistente (se alineó el token de `location` al `province` que la propia fila ya traía bien). Las 6 filas legítimas de Corrientes (Mercedes, Goya, etc.) no se tocaron.

**Pendiente (decisión humana):** elegir cuándo/cómo se difunde el digest (día, y si coexiste con el newsletter PRO o se alterna) — el envío está listo y testeable, pero no se programó un cron automático.

## [1.50.0] — 2026-06-23

### Wave 2 (desmuro del watchlist) + Wave 3 (vida en landings + digest "qué cambió" en preview)

Segunda y tercera ola del plan de retención validado. Detalle por archivo y el porqué de cada cambio.

**Gate de medición — `src/lib/analytics.ts`**
- Agregados 6 wrappers tipados (mismo patrón objeto-único + guard `PROD_HOSTS`): `trackWatchlistSave({item_type, auth_state})`, `trackWatchlistReturn({count})`, `trackWatchlistNotifyOptin({item_type})`, `trackWatchlistMerge({merged})`, `trackDigestOpen({campaign})`, `trackDigestClick({campaign, target})`. **Por qué:** cerrar el loop save→return→notify→merge y open/click del digest con eventos propios — el plan prohíbe iterar sin baseline, y no se puede confiar en `newVsReturning` de GA4 (Safari/ITP borra la cookie).

**Wave 2 — desmuro del watchlist/favoritos** *(W2 del plan, GO/med)*
- `src/hooks/useFavorites.ts`: nueva capa **localStorage** para anónimos (clave `cnsg_favorites`, helpers `readLocalFavorites`/`writeLocalFavorites` con soft-fail). `add/remove/isFavorite` operan contra localStorage si anónimo, contra Supabase si logueado. **Por qué:** el 99,5% del tráfico es anónimo y no podía guardar nada — el muro de login mataba el único hook de recurrencia ya construido.
- `useFavorites.ts` — **merge al loguear (client-side):** en `fetchFavorites`, si hay `user` + favoritos en localStorage, se insertan en `user_favorites` (dedup por el `23505` unique ya manejado), se limpia localStorage y se dispara `trackWatchlistMerge`. **Por qué:** que el productor no pierda lo guardado anónimo al crear cuenta; se hace sobre el listener `onAuthStateChange` existente para **no tocar** `auth/callback`.
- `useFavorites.ts` — `trackWatchlistReturn({count})` una vez por mount si hay favoritos y es visita recurrente (detectada por la clave `cnsg_last_visit` que ya escribe `SinceLastVisit`). **Por qué:** medir si guardar sube el retorno (la hipótesis del win).
- `src/components/ui/FollowButton.tsx`: **eliminado el redirect a `/login`** (antes L42-43). Guardar es instantáneo; dispara `trackWatchlistSave({item_type, auth_state})`. El dropdown ahora bifurca: anónimo ve el opt-in de email; logueado mantiene los toggles Supabase por favorito. **Por qué:** value-first — primero el valor (guardar), después el pedido de email.
- `src/components/ui/WatchlistNotifyOptin.tsx` (**nuevo**): opt-in de email compacto, **segundo paso** (no en el primer save). Postea a `/api/newsletter` con `source='watchlist-notify'` (misma infra que `PriceAlertSignup`), dispara `trackWatchlistNotifyOptin`. Copy ataca el pitfall ITP: el email es a la vez el canal de aviso y la forma de no perder lo guardado ("Así no perdés lo guardado", porque Safari borra localStorage a los 7 días de inactividad). **Por qué:** el kill-list prohíbe pedir email al primer save (reintroduce el muro) y prohíbe prometer "guardado permanente" sin email.

**Wave 3 (on-site) — vida en las landings de mayor tráfico**
- `SinceLastVisit` (ya instrumentado en v1.49.0) montado en **`/frigorificos`, `/mercado/inmag` y `/mercado/arrendamiento`** (antes solo en `/overview`). Cada server page arma su snapshot (`inmagDate`/`value`/`change` de market-prices, `rematesUpcoming` de remates.json), copiando el patrón de `/overview`. **Por qué:** el tráfico aterriza en esas landings, no en `/overview`; ahí es donde el recurrente debe ver "qué cambió desde tu última visita".
- `src/components/landing/FreshnessStamp.tsx` (**nuevo**): "Actualizado recién / hace X h / hace X días" (client, computa contra `Date.now()`, soft-hide si la fecha falta/es inválida/futura). Montado discreto en `/frigorificos` (banner SENASA) y `/mercado/inmag` (reemplaza el texto estático "Actualizado hoy" por la fecha real del dato). **Por qué:** señal de **confianza** (recency), explícitamente **no** vendida como palanca de retención — la evidencia (NN/g) dice que el lever de retorno es el email-digest, no el badge on-site.

**Wave 3 (digest) — "qué cambió esta semana", en modo PREVIEW, sin envío automático** *(W4 del plan, MAYBE/med)*
- `src/lib/newsletter/digest-content.ts` (**nuevo**): generador de deltas semanales — INMAG Δ%, categoría que más se movió, remates de los próximos 7 días — con **soft-fail por sección** (si una sección no tiene dato, se omite). **Por qué:** el contenido del digest tiene que ser real y degradar con gracia, no romper el mail.
- `src/lib/newsletter/digest-template.ts` (**nuevo**): plantilla HTML on-brand terminal, con links **UTM** (`utm_source=digest&utm_campaign=que-cambio`) para medir `digest_click`, pixel de apertura y headers **RFC 8058** (`List-Unsubscribe` one-click). **Por qué:** deliverability y medición desde el diseño (el kill-list exige one-click unsubscribe + UTM o el mail cae en spam y daña la reputación del dominio que manda los transaccionales de pago).
- `src/app/api/cron/weekly-newsletter/preview/route.ts` (**nuevo**): route **GET de preview/dry-run** protegido por `authorizeCron`. Renderiza el HTML del digest sin enviar (`?secret=…` → HTML; `&format=json` → modelo + headers; `&email=…` → destinatario de prueba). **Por qué:** el envío es **outward-facing** (mails reales a suscriptores) — se construye listo y revisable, pero **no** se repunta el cron del lunes ni se modifica el envío vivo (`../route.ts`) ni el `.yml`. Activarlo es una decisión humana tras revisar el preview.
- **Pendiente deliberado para activar el envío** (NO hecho, por seguridad): (a) handler de envío que consuma `buildDigestEmail`; (b) `GET /api/newsletter/digest/open` (pixel `digest_open`); (c) `POST /api/newsletter/unsubscribe` (one-click RFC 8058). Hasta crearlos, pixel y botón nativo de baja caen en soft-fail; el link `GET /unsubscribe` ya funciona como fallback.

## [1.49.0] — 2026-06-23

### Gate de medición + Wave 1 de retención (validado contra GA4 + GSC)

Tras testear las conclusiones del audit contra datos reales, el cuello resultó ser **conversión + retorno**, no surfacing ni freshness. Esta tanda construye el gate de medición y la primera ola accionable (plan en `docs/strategy/`, gitignored).

**Gate de medición** — `src/lib/analytics.ts` suma 4 eventos tipados (`since_last_visit_shown/click`, `alert_subscribe`, `internal_nav_click`) y el embudo PRO (`checkout_start`/`checkout_redirect`/`cta_click`) ahora acepta `context`+`variant`. Nada se itera sin baseline.

- **Embudo PRO instrumentado:** cada paso (paywall → CTA → checkout) ahora es segmentable por superficie y variante (logged-in vs email-first) en `/upgrade`, `/planes` y el sticky mobile. Es el cuello de los $0 (1.678 → 18 → 1) y por fin se puede ver dónde se pierde.
- **Alerta de precio email-first (Fase 0)** en `/mercado/inmag` y `/mercado/arrendamiento`: un input de email sin login (reusa Resend), con copy según la intención real de búsqueda (GSC: "precio novillo arrendamiento hoy/mensual", "inmag hoy"). Valida demanda antes de construir el motor de umbral.
- **`SinceLastVisit` instrumentado** (disparaba cero eventos) + ahora clickeable a `/overview`.
- **Surfacing provincial:** los hubs `/frigorificos` y `/consignatarias` ahora emiten una grilla de **`<a href>` SSG reales** a las páginas provinciales (antes solo filtro client, cero link crawleable), priorizadas por demanda GSC, con `internal_nav_click`.

## [1.48.0] — 2026-06-23

### Audit de retención (GA4 desde marzo) + primera ola de "vida" dinámica

Audit integral con tráfico real de GA4 (5.492 sesiones desde el 1-mar). Diagnóstico central: **retención casi nula — 87% del tráfico es 100% nuevo (4.046 nuevos vs 525 recurrentes), pero los recurrentes rinden 2× (367s vs 171s/sesión, 3,5 vs 2,2 páginas)**. La causa: dato congelado en build, contenido top mal surfaceado y cero "razón para volver". Primera ola de fixes:

- **USD blue en vivo** (`src/lib/markets/usd.ts`, dolarapi.com, server-side soft-fail) descongela la cinta del home, que pasa a **ISR (15 min)** para refrescar entre rebuilds. El delta del DeltaFlash ahora es real, no `change:0`.
- **"Desde tu última visita"** (`SinceLastVisit`, localStorage sin backend) en `/overview`: le muestra al recurrente qué cambió (INMAG + remates nuevos) desde que entró por última vez — el segmento que rinde 2×.
- **Countdown "Próximo remate en Xh Ym"** (`NextRemateCountdown`, client + `Date.now()`) en `/remates` (la página más pegajosa, bounce 5,8%).
- **Descongelado de páginas temporales**: `/remates` y derivados (`hoy`, `mañana`, `semana`, `en-vivo`, `fin-de-semana`) + `/overview` pasan de `revalidate=false` a ISR `3600` — su nombre prometía tiempo real y servían la fecha del build.
- **Surfacing del contenido top**: en el nav, **Frigoríficos** (página #1 con 1.447 pv) sube al primer lugar de DIRECTORIO; **Arrendamiento** (mayor tiempo/pv y demanda mal capturada) sube en MERCADO; se suma **Internacional** (Chicago) al dropdown.

## [1.47.1] — 2026-06-22

### Panel Chicago: decimales en formato es-AR

El panel de Chicago formateaba con punto (`5.46`) mientras el resto del sitio y la comparación local usan coma es-AR (`5,46`) — el mismo número aparecía en dos formatos en la misma página. Unificado a coma.

## [1.47.0] — 2026-06-22

### Comparable interanual en USD + subpágina de referencia internacional

**"Comparable mes a mes — últimos años" ahora en USD.** Graficaba INMAG en ARS/kg, donde la inflación hace que cada año "explote" hacia arriba y no se compara nada. Pasado a **USD/kg (INMAG ÷ dólar blue)**: medido en dólares la inflación se neutraliza, los años se superponen y recién ahí se lee la estacionalidad y el cambio real interanual.

**Nueva subpágina `/mercado/internacional`.** La referencia de Chicago (CME) ahora tiene su propia página: el panel en vivo (Live Cattle + Feeder Cattle en USD/kg), un bloque **"Novillo argentino vs. Chicago"** que muestra a qué % del valor del novillo de Chicago cotiza el gordo local (INMAG USD vs Live Cattle), y contenido explicativo de qué mide cada contrato + metodología/alcance. Enlazada desde el panel de `/mercado` y sumada al sitemap.

## [1.46.0] — 2026-06-22

### /mercado: referencia internacional — futuros de Chicago (CME)

Nuevo factor de mercado financiero en `/mercado`: panel **"Referencia internacional · Chicago (CME)"** con el **novillo gordo (Live Cattle, LE=F)** y la **invernada (Feeder Cattle, GF=F)**, convertidos de ¢/lb a **USD/kg vivo** — el benchmark global del mismo producto que cotiza el sitio, para leer el precio local contra el mundo.

Fuente: endpoint público de Yahoo Finance (sin API key), fetch server-side cacheado (`revalidate` 6 h), conversión `¢/lb ÷ 100 × 2,2046`. Falla suave: si el feed no responde, el panel no renderiza y `/mercado` no se rompe. Etiquetado como cotización diferida y referencia internacional (no precio local). Lib en `src/lib/markets/chicago.ts`, componente `ChicagoReference`.

## [1.45.1] — 2026-06-22

### Ficha de frigorífico: misma cabecera de identidad

Replicada la identidad-primero de las consignatarias en las fichas de frigorífico. La cabecera chiquita ("FICHA DEL ESTABLECIMIENTO" + nombre en `text-lg`) pasa a una cabecera de identidad: marca (monograma con el color de la etapa, ya que los frigoríficos no tienen logo) + **nombre en grande** + epígrafe ("Frigorífico · tipo") + fila de metadata con localidad/provincia, matrícula SENASA y estado de habilitación (vigente / sin registro). El resto de la ficha (datos registrales, habilitación SENASA, ciclo, relacionados) ya era panel-based y queda igual.

## [1.45.0] — 2026-06-22

### Ficha de consignataria: identidad primero (estilo ALYC / gestora)

Al entrar a una ficha (ej. Bressan) lo primero que aparecía era un bloque de prosa SEO — la identidad de la firma quedaba relegada más abajo. Reordenado: ahora **encabeza la ficha interactiva**, con una cabecera de identidad rediseñada —logo grande (80px) + nombre en grande (no en mayúsculas comprimidas) + epígrafe "Consignataria de hacienda" + provincias, total de remates y próximos— como un perfil de ALYC o de gestora de fondos. Debajo siguen las 3 tarjetas (próximo remate / precios / contacto) y el resto.

El resumen citable, las existencias bovinas (SENASA) y la lista de próximos remates se reagruparon en un panel **PERFIL** al pie, server-rendered para SEO, con el mismo lenguaje visual del resto (terminal-panel, tokens) en vez de prosa suelta en gris.

## [1.44.3] — 2026-06-22

### Ficha de consignataria: "Próximos remates" ahora se lee como título

En la ficha, el resumen, la línea de existencias bovinas y la lista de próximos remates fluían como un único bloque de prosa, así que "Próximos remates de …" no se distinguía como encabezado. Agregado un separador (línea superior + aire) y un guion de acento delante del título para marcarlo claramente como sección, antes del cronograma y el directorio.

## [1.44.2] — 2026-06-22

### INMAG en dólares: gráficos interactivos + carga como el resto de los mercados

La página `/mercado/inmag-dolares` usaba SVGs estáticos (sin interacción). Migrada a `PriceLineChart` —el mismo primitivo del sistema de diseño que el resto de los mercados— en sus tres vistas (reciente, 5 años, década completa PRO): al pasar el mouse sobre la curva ahora muestra **precio + fecha** en tooltip, con eje Y a escala completa. `ProChartGate` aprende a recibir un chart interactivo (`children`) además del SVG legacy, así el histórico PRO también es navegable.

**Frescura del dato:** verificado contra Supabase —serie INMAG y dólar blue al 2026-06-19 (último día de remate MAG; el INMAG se publica por jornada de remate, no a diario). La página es SSG con rebuild diario.

## [1.44.1] — 2026-06-22

### Nav: fuera el tag "SEO" de Arrendamiento

"SEO" era jerga interna (la razón por la que rescatamos esa página, no algo que le importe a un ganadero) filtrada a la UI. Eliminado el tag de Arrendamiento (desktop + mobile) y quitado del sistema de tags del nav. Quedan solo tags con sentido para el usuario: LIVE (dato en vivo) y PRO (función de pago).

## [1.44.0] — 2026-06-22

### Sistema de diseño — Fase 2 (datos) + Fase 3 (fluidez) + rediseño por página

Segunda ola sobre la fundación de v1.43.0. Tres fases en secuencia (spec `docs/strategy/DESIGN-SYSTEM.md`).

**Fase 2 — Lenguaje de datos:** nuevas primitivas en `src/components/ui/` — `DataTable` (tabla terminal con número consistente, tint por signo, fila navegable SEO-safe, skeleton de carga), `PriceCell` (valor + `Delta`, "—" para null) y `ChartCard`/`Series` (wrapper de `PriceLineChart` que recibe `tone` semántico y resuelve el color por token, rompiendo el acoplamiento al hex). Migradas las superficies de **mercado** (`/mercado`, `/mercado/inmag`, `/mercado/[categoria]`): tablas, stats y variaciones ad-hoc → primitivas + tokens.

**Fase 3 — Fluidez:** `PageTransition` (cross-fade en navegación client, SSR-safe, en el layout), `Skeleton` + variantes (texto/stat/tabla/card, CLS cero), y `DeltaFlash` (wash de color sutil cuando el dato vivo cambia, sin que el número salte). Todo con tokens de motion y `prefers-reduced-motion` respetado.

**Rediseño por página:** `/overview`, ficha de consignataria y `/remates` migrados a las primitivas (DataTable/PriceCell/Stat/Delta/Badge/ChartCard) — pasada de consistencia, manteniendo estructura y funcionalidad. Menos color crudo, un solo lenguaje de dato.

## [1.43.0] — 2026-06-22

### Sistema de diseño integrado — Fase 0 (fundación) + Fase 1 (discoverability)

Un swarm de 10 agentes analizó tráfico + discoverability y auditó el design system. Hallazgo central: **el sistema existía pero no se obedecía** (636 colores crudos, dos `tone-maps` en conflicto, sin tokens de motion, primitivas solo-CSS) y **la navegación no exponía el valor** — `/mercado/inmag`, el activo #1 por tráfico y tiempo, ni estaba en el nav. Spec completo en `docs/strategy/DESIGN-SYSTEM.md`.

**Fase 0 — Fundación:**
- **Color semántico con una sola fuente de verdad** (`src/lib/ui/tokens.ts`): resuelto el conflicto donde "neutral" valía `#f4f4f5` en un componente y `#a1a1aa` en otro para el mismo tono. `HeroNumber` y `StatPill` ahora importan el mapa canónico.
- **Tokens de motion** (duraciones fast/base/slow + easings) en `tailwind.config` + utilidades en `globals.css`.
- **Primitivas React tipadas** en `src/components/ui/`: `Delta` (variación de precio, color por token, nunca "0% verde"), `Stat`, `PageHeader`, `Badge`.

**Fase 1 — Discoverability / navegación:**
- **Nav reorganizado por modelo mental** (grupos desplegables accesibles, teclado + Escape + click-outside): MERCADO sube **INMAG hoy** y rescata **Arrendamiento**; HERRAMIENTAS saca la **Calculadora** del footer; DIRECTORIO une consignatarias + frigoríficos; REMATES con sus vistas temporales. El activo #1 deja de ser un callejón SEO.
- **Breadcrumb unificado** (visual + JSON-LD desde un solo array) en `/mercado/inmag`, `/frigorificos/[provincia]` y `/mercado/[categoria]`.
- **Footer** de ~28 links planos → sitemap de 4 columnas con jerarquía (Datos · Producto · Empresa · Legal), despriorizando las páginas trust frente a INMAG/Calculadora.

Las fases 2-3 (primitivas de dato, fluidez) y los rediseños por página (overview/consignatarias/remates) se construyen sobre esta base.

## [1.42.3] — 2026-06-21

### /overview: cero duplicación de categorías

La fila "Mercado hoy" mostraba Novillo/Ternero/Vaca y la tabla de categorías también (2×). Ahora la fila es solo macro (INMAG + maíz + USD + remates hoy) y las categorías viven una sola vez, en su tabla.

## [1.42.2] — 2026-06-21

### /overview rehecho de verdad + fix del gráfico

El rediseño anterior seguía siendo caótico. Reescrito desde cero:
- **Sin ticker**: duplicaba el snapshot (INMAG/novillo/maíz aparecían 2×). Ahora una sola fila "Mercado hoy" como fuente única.
- **Remates arriba y a la izquierda** (lo accionable), no enterrados; layout denso de 2 columnas centrado (`max-w`) en vez de paneles full-width desparramados.
- **Sección "Accesos" eliminada** (duplicaba el navbar → menos footers/links confusos).
- **Gráfico arreglado**: el punto de precio era un óvalo estirado (un `<circle>` SVG deformado por `preserveAspectRatio="none"`) → ahora es un punto HTML redondo; las labels del eje Y dejaron de pisar la línea y las fechas. Aplica a todos los gráficos (`PriceLineChart`).

## [1.42.1] — 2026-06-21

### Logo de Farming Salentein en el remate especial

Se cableó el logo real del expositor (`/logos/salentein-farms.svg`) en el destaque y en el badge de la card. Como el logo es de texto oscuro, los chips pasaron a fondo claro para que se lea sobre el tema oscuro.

## [1.42.0] — 2026-06-21

### Remates especiales (sistema reusable, sembrado con Farming Salentein)

Algunas consignatarias operan remates especiales de cabañas/expositores premium (reproductores, razas destacadas, streaming, pre-oferta). Nuevo sistema config-driven para destacarlos de forma sutil.

- **Data + helpers** (`remates-especiales.json` / `.ts`): una entrada por remate especial (consignataria operadora, expositor, razas, fecha, lugar, lotes, modalidad, pre-oferta, `brandLogo` opcional). Lookup por `consignatariaSlug + date`.
- **Componente `RemateEspecialDestaque`**: card premium y sutil (tag "REMATE ESPECIAL", badge del expositor, razas como chips, fecha/lugar/lotes, badge de streaming, pre-oferta como gancho).
- **Integración**: destaque debajo del hero en el perfil de la consignataria operadora + badge del expositor en la fila del remate en el cronograma.
- **Sembrado**: Farming Salentein → Etchevehere Rural · Braford & Angus Colorado · 20-ago-2026 · S. Rural Curuzú Cuatiá · ~60 toros + ~300 vientres · streaming · 5% OFF en pre-oferta. El remate ya existía en los datos (id 543); el sistema lo enriquece sin tocar el scraper.
- Reusable: sumar otro (ej. Reggi + Cabaña El Tigre) es una línea en el JSON. El logo del expositor se cablea solo al dejar el archivo en `/public/logos/` y setear `brandLogo`.

## [1.41.3] — 2026-06-21

### Mapa de cobertura: SVG completo de las 24 provincias

Corrige el recorte de v1.41.2 (se había perdido Jujuy y simplificado contornos). Se integró el SVG **autoritativo y completo** (24 jurisdicciones, contornos a precisión total). Las 13 nombradas + 11 de contexto se renderizan, ninguna se descarta: Jujuy y todo el país vuelven a verse. Heat por conteo real en las 10 cubiertas; hover (nombre + remates) y click → `/remates/[slug]` intactos.

## [1.41.2] — 2026-06-21

### Mapa de cobertura de la landing con trazados precisos de provincias

- Reemplazado el mapa esquemático (círculos sobre una silueta low-poly) por uno con **contornos reales de provincias** (SVG depurado del auto-trazado provisto: se descartaron los micro-paths de puntos repetidos que no dibujaban nada).
- **Heat data-driven**: cada provincia cubierta se pinta con intensidad ámbar **escalada por su conteo real de remates** (`sqrt(count)`), de Buenos Aires (242) a Santiago del Estero (1). Las no cubiertas quedan tenues como contexto.
- **Hover** muestra nombre + N remates; **click** en una cubierta navega a `/remates/[slug]`. Interfaz del componente intacta (la landing no cambió).
- Limitación conocida: San Luis (25 remates) no viene como path nombrado en el SVG de origen, así que por ahora no se pinta — su geometría no está individualizada.

## [1.41.1] — 2026-06-21

### /overview reorganizado + gráficos de mercado interactivos

- **Gráfico INMAG arreglado** (no mostraba nada): el "Tendencia 8 Semanas" renderizaba **356 puntos diarios como 356 barras `flex` sub-pixel** → una mancha verde sin forma (y el título "8 semanas" era falso). Reemplazado por un gráfico de línea interactivo con la serie completa.
- **/overview reorganizado**: del grid denso de 2-3 columnas a **4 secciones verticales con jerarquía clara** (snapshot de mercado · tendencia INMAG · remates · accesos). Mismo dato, sin caos, sin emojis.
- **Gráficos de mercado interactivos**: nuevo `PriceLineChart` reusable (SVG, sin dependencias de red) con **escala Y completa** y **tooltip al hover (precio + fecha)**. Aplicado a overview, `/mercado`, `/mercado/[categoria]` y el LongTermChart; `/mercado/inmag` y `/mercado/arrendamiento` ya eran interactivos.

## [1.41.0] — 2026-06-21

### Sistema interno de conteo de eventos de valor

Atribución propia, unificada y queryable de las acciones con **valor atribuible** del journey — lo que GA4 fragmenta y no expone por engine/entidad. Convierte la medición en un sistema.

- **Taxonomía con pesos** (`src/lib/value-events.ts`, fuente de verdad): 17 eventos en 7 grupos (recurrencia, lead, engagement, funnel, conversión, descubrimiento AI, B2B), cada uno con un peso = proximidad a la plata (ej. `subscription_paid` 100, `checkout_start` 30, `calendar_subscribe` 12, `contact_whatsapp` 10, `pro_prompt_view` 1).
- **Tabla `value_events`** + beacon `/api/track/event` (valida contra el registro y **deriva el peso server-side**, no confía en el cliente) + vistas de agregación ponderada (`value_events_daily`, `value_events_by_entity`).
- **`trackValueEvent`** (cliente): espeja a GA4 y manda el beacon con **atribución de fuente/engine/entidad** (deriva ai/organic/direct/referral del referrer + el engine que dejó el AiReferralTracker).
- **Instrumentado** en los eventos clave: `calendar_subscribe` (recurrencia), `contact_whatsapp`/`catalog_click`/`live_click` (lead+engagement), `claim_cta_click` (B2B).
- **Índice de valor** = Σ (eventos × peso), desglosable por grupo, evento, fuente, engine AI y entidad → mide qué canal y qué consignataria generan valor real, no solo pageviews.

## [1.40.3] — 2026-06-21

### Suscripción al calendario arreglada (era el bloqueante de la recurrencia)

El "agregar a Google" fallaba y el ICS pedía "Activá Enterprise" — para un usuario anónimo era imposible suscribirse, y sin eso no hay recurrencia (la palanca de monetización #1 según los datos).

- **Los feeds ICS (`/api/calendario/*`) salen del rate-limiter**: estaban capados a 1 req/min anónimo y devolvían el mensaje de Enterprise; un feed que las apps de calendario poletean no puede tener ese límite. Son públicos, livianos y cacheados 1h.
- **Los botones ahora suscriben con `webcal://` (host www canónico)**, no descargan un `.ics` estático. `webcal://` sincroniza y se actualiza solo = recurrencia real; el https no-www pegaba contra un 307 que rompía a Google.

### Ficha de consignataria: claim más chico + gráfico de precios por categoría

- **"Reclamá tu perfil" reducido a una línea** al pie (solo ~0,1% de los visitantes son la propia firma; la barra de completitud + el panel de beneficios se movieron al flujo de `/verificar`).
- **Módulo visual de historial de precio por categoría** en `/mercado/[categoria]`: línea $/kg vivo con selector de rango (3M/6M/12M/todo), último valor + variación. Ancla el último punto al precio real observado de la categoría (antes el gráfico dibujaba valores crudos de INMAG en todas) y declara la fuente con honestidad.

## [1.40.2] — 2026-06-21

### Página de remates reorganizada (feedback: "demasiados filtros, intro larga, por ciudad un caos")

El tope de `/remates` tenía una intro larga + **4 filas de chips** (tiempo, provincia, tipo, ciudad) que duplicaban la barra de filtros interactiva de abajo.

- **Intro recortada a una línea**: N remates de N consignatarias en N provincias, actualizado a diario.
- **Eliminada la fila "Por ciudad"** (5 ciudades arbitrarias = ruido) y la **fila de filtros de tiempo** (Hoy/Mañana/Esta semana), que duplicaba las pestañas de período de la barra.
- Quedan los links de exploración por **provincia** y **tipo** (páginas SEO dedicadas); el filtrado interactivo (período, provincia, tipo, en vivo, búsqueda) vive en la barra unificada, una sola.
- Sin emojis.

## [1.40.1] — 2026-06-21

### Ajustes UX en la ficha de consignataria (iteración sobre feedback)

- **Lista server de "Próximos remates" recortada de 10 a 3** (+ "N remates más en el calendario"): el bloque de arriba dejaba de competir con el hero por la atención.
- **Cronograma: los remates anteriores se colapsan** en un desplegable "Ver N remates anteriores"; por defecto solo se ven los próximos.
- **"También en la zona" muestra logos de marca** (vía `logo-map`) cuando la firma relacionada no subió el suyo, sobre su color.

## [1.40.0] — 2026-06-21

### Rediseño de la página de consignataria (UX: "mucha info, no sé dónde mirar")

Feedback de un productor real: la ficha apilaba 22 secciones sin jerarquía. Rediseño guiado por un swarm UX + design-engineering, en dos olas.

- **Hero "above the fold" (Wave 1):** 3 tarjetas que responden las preguntas del productor en segundos — **Próximo remate** (con **cuenta regresiva en vivo** días/horas/min, badge EN VIVO, botones Catálogo / En vivo / **Canal YouTube**), **Últimos precios** ($/kg por categoría del último remate), y **Seguir / contactar** (WhatsApp/tel/email/web + suscribir + compartir). Reemplaza el header + la stats-bar de 5 métricas.
- **Cuerpo colapsado (Wave 2):** las 22 secciones se reducen a hero + reseñas + **acordeones colapsables** (Quién opera, Historial, Calendario+tipos, Resultados, Red MAG, Último video, Galería, Recursos). Las 4 vistas dispersas de remates y las 2 de precios dejan de competir por la atención.
- **Logos de marca:** las consignatarias más importantes muestran su logo (vía `logo-map`) sobre su color de marca en el hero.
- **Barra sticky mobile:** próximo remate + WhatsApp siempre a mano; absorbe el FAB flotante que tapaba el cronograma.
- **Look minimal:** jerarquía por espacio y tipografía, monocromo + color solo para estado, sin emojis ni divisores redundantes.
- **SEO intacto:** el bloque server (resumen, próximos remates, precios observados, 6 schemas) y el único `<h1>` no se tocaron; acordeones nativos `<details>` mantienen el markup crawleable; `rel=nofollow` en los CTA de claim/PRO.

### Pasada de CTR sobre las plantillas de mayor tráfico

El tráfico crece por impresiones, no por CTR (CTR ponderado bajó 2,37%→1,84% con impresiones +186%). Optimización de títulos/meta anclada en el query-mix real de Search Console, en 8 familias de páginas: `/mercado/arrendamiento`, `/mercado/inmag`, `/mercado/[categoria]` (formato pregunta), `/mercado`, `/frigorificos`, `/frigorificos/[cuit]`, `/consignatarias/[slug]` y el home. Sistema de medición commit-por-commit (`ctr-snapshot.js` + `ctr-diff.js` + registro de cambios) para verificar qué copy funcionó.

### Instrumentación de atribución de tráfico AI

El tráfico desde motores de IA (ChatGPT #1, 6,7 pág/sesión) era ciego: GA4 lo fragmenta y no lo expone por engine. Nuevo beacon propio (`/api/track/ai-referral` → tabla `ai_referrals`), tracker ampliado de 6 a 13 engines + detección por `utm_source` + persistencia por sesión.

## [1.39.0] — 2026-06-20

### Landing minimalista + mapa de cobertura interactivo

Rediseño de la home a pedido (feedback de usuarios: sobredosis de información). La landing pasó de
~18 secciones a ~8, y el filtro por provincias + la cobertura se unificaron en un solo visual.

- **Mapa de cobertura interactivo ([`CoverageMap`](src/components/landing/CoverageMap.tsx)):** Argentina
  estilizada/esquemática; las 11 provincias con remates (las que tienen página `/remates/[provincia]`)
  brillan en ámbar, dimensionadas por actividad, y al click llevan a los remates de esa provincia — es
  el nuevo filtro por provincia. El resto del país queda como contexto tenue. Reemplaza la grilla de
  texto "consignatarios por región".
- **Recorte fuerte de la landing (~18 → ~8 secciones; 1507 → 591 líneas):** se mantuvo lo de mayor valor
  (hero+mapa, valuation widget, cómo funciona, showcase de consignatarias, El Corredor lead-magnet, FAQ,
  CTA, newsletter) y se quitaron las secciones redundantes/pesadas (quick-nav, "el problema", 3 features
  duplicados, watchlist, comparación, destacadas, herramientas, wall de PRO) + todo su dead code.
- **Bundled (cierre del debug del journey):** `PriceCTA` ahora en las 6 plantillas de precio (se sumaron
  comparar/calidad/origen); y guard en el scraper — un INMAG inválido/0 ya no sobreescribe el último
  valor bueno (evita commitear "$0" en una corrida fallida).

`tsc` 0, `pnpm build` limpio.

---

## [1.38.0] — 2026-06-20

### Correcciones de integridad del journey (P1s del debug): activación, billing y conversión

Tercera tanda del debug del customer journey — los P1 de integridad de datos y conversión.

- **DT-e: éxito honesto.** El uploader mostraba "¡Guía guardada!" aunque el insert fallara
  (era fire-and-forget). Ahora espera el resultado y solo muestra éxito si persistió.
- **DT-e: milestone correcto.** El "primer DT-e" se calculaba con un conteo de cliente que podía
  estar en `null`/desfasado (off-by-one). Ahora se re-lee el conteo autoritativo de la DB tras el
  insert, así `activation_first_dte`/milestones no se mis-disparan.
- **Billing: cancelar respeta el período pagado.** Al cancelar, el webhook ponía `tier='free'` al
  instante y `getCurrentSession` exigía `status='active'` → se perdía PRO en el acto pese a haber
  pagado el mes. Ahora se mantiene `tier='pro'` al cancelar y el acceso se honra hasta
  `current_period_end`.
- **Outreach post-remate en hora ART.** El cron usaba `getHours()` (UTC) contra horarios ART
  (UTC-3) → salía ~3 h corrido. Ahora deriva fecha y hora en `America/Argentina/Buenos_Aires`.
- **CTA de conversión en páginas SEO.** Las páginas de precio (`/precios/[categoria]`,
  `/precios/[categoria]/[provincia]`, `/mercado/[categoria]`) eran solo-datos y rebotaban al
  visitante; nuevo `PriceCTA` ("¿Vas a vender? → Calcular neto / Ver consignatarias").
- **`/precios/comparar` des-huérfano.** Bloque de comparaciones en `/precios/[categoria]` que enlaza
  a los pares de comparación (inbound links + drill-down).
- **Guard en comparador.** `/precios/comparar/[par]` ya no crashea si el scraper renombra/borra una
  categoría (notFound en vez de excepción en build).

`tsc` 0, `pnpm build` limpio. NOTA: el webhook de Rebill (P0-2) sigue siendo el desbloqueo de
ingresos pendiente — acción de ops.

---

## [1.37.0] — 2026-06-20

### Fix de activación + B2B: destrabar el wedge DT-e y el reclamo de perfil (Wave B del debug del journey)

Segunda tanda del debug del customer journey: los caminos por donde un usuario nuevo se activa
y una consignataria reclama su perfil tenían dead-ends duros.

- **CTA de DT-e arreglado:** el botón "Subir mis DT-e" en `/dte` (landing SEO de activación) iba a
  `/auth` (404). Ahora va a `/login?next=/mi-cuenta/guias`.
- **Guard de auth en `/mi-cuenta/guias`:** esa ruta vivía fuera del grupo `(terminal)` y no tenía
  protección — un anónimo hacía todo el OCR y recién al guardar chocaba con un alert. Ahora se
  redirige a login antes de empezar.
- **Reclamo de perfiles huérfanos:** ~18 perfiles canónicos no tienen fila en DB; el form de reclamo
  devolvía 404 "Consignataria no encontrada" para ellos. Ahora se siembra una fila mínima desde el
  registro estático (canonical_slug + display_name; el resto tiene defaults) y el reclamo procede.
- **Links de remate en páginas de precio provincial:** usaban el `id` numérico (`/remates/1`) contra
  una ruta con `dynamicParams=false` → 404 duro. Ahora usan el slug compuesto correcto.
- **Evento de signup:** `trackSignup` emite `sign_up` (el key event de GA4) en vez de `signup`, que
  dejaba ciego el primer paso del embudo de activación.

`tsc` 0, `pnpm build` limpio. NOTA: el webhook de Rebill (P0-2) sigue siendo acción de ops — ningún
pago activa PRO hasta verificar el secret/firma en prod.

---

## [1.36.0] — 2026-06-19

### Fix del money-path: el comprador PRO ahora ve la confirmación (Wave A del debug del journey)

Una auditoría del customer journey encontró que el embudo de pago no podía confirmar una venta:
distintas superficies leían tablas/columnas equivocadas. Esta release arregla la mitad
"después del webhook" (cuando el pago llega, el usuario lo ve bien). La verificación de la
firma/secret de Rebill (para que el webhook llegue) es ops, aparte.

- **PRO Usuario confirmable:** `/api/subscription-status` ahora consulta primero
  `user_subscriptions` (tier=pro, activo, período vigente) — antes solo miraba la tabla de
  entidad `subscriptions` y devolvía `no_entity` para un productor, así que la conversión
  nunca se confirmaba.
- **Estado "Activando tu PRO…":** nuevo componente que pollea la confirmación en `/cuenta`
  cuando el webhook se demora respecto del redirect, y refresca al confirmar. El cartel
  "Ya sos PRO / pago confirmado" ahora solo aparece cuando el tier es realmente PRO (antes
  aparecía optimista). Saca el momento "pagué pero dice FREE".
- **Columna muerta `consignatarias.subscription_tier`:** se eliminó de todas las queries
  (no existía → erroreaba y nulificaba la card de consignataria en `/cuenta` y el estado de
  `/planes`). El PRO de entidad ahora se deriva de la tabla `subscriptions` (server-side).
- **Reclamo de perfil honesto:** el éxito ya no promete "acceso en 2 minutos" (la aprobación
  es manual) — dice que revisamos a mano y avisamos por email; se quitó el número vanidad
  "47 consignatarias"; la notificación al admin ahora se espera y loguea fallas (la revisión
  manual no sirve si nadie se entera del reclamo).

`tsc` 0, `pnpm build` limpio.

---

## [1.35.0] — 2026-06-15

### "Owneá el INMAG": entidad + citabilidad sobre el término de mayor impresión

El término "inmag" es la consulta de mayor impresión del sitio (1.230 imp/28d) y rankea ~pos 7.
Esta release refuerza a consignatarias.com.ar como la ENTIDAD del INMAG, para ganar el snippet/
respuesta de IA aún sin estar #1 orgánico, y hace el valor diario citable con un click.

- **Entidad INMAG (`/mercado/inmag`):** el `Dataset` schema suma `@id` estable, `alternateName: "INMAG"`,
  nombre completo "Índice Novillo del Mercado Agroganadero" y una segunda `distribution` pública al
  snapshot `/precios.json` (CC-BY). Complementa el `DefinedTerm` "¿qué es el INMAG?" ya existente.
- **GEO/citabilidad:** `SpeakableSchema` + el lede de definición marcado `.speakable-content` (unidad
  citable por voz/IA) + `CitaBlock` (el valor del día se copia como cita con atribución).
- **Anclas internas:** refuerzo del ancla "INMAG" en links internos (p. ej. "Ver evolución del INMAG").

`tsc` 0, `pnpm build` limpio.

---

## [1.34.0] — 2026-06-15

### Nuevas familias de páginas programáticas: comparador, segmentos de calidad, origen + badge embebible

Cuarta tanda de la familia "answer-block": cuatro superficies de URL nuevas que convierten datos que ya
teníamos en páginas long-tail extractables, más un badge embebible para backlinks. Todo con dato honesto
(observado o aritmética sobre INMAG; nunca inventado).

- **`/precios/comparar/[par]` — comparador de categorías:** 15 páginas pareadas ("novillo vs vaquillona hoy")
  con veredicto extractable (spread aritmético sobre INMAG), tabla y FAQ. 308 de orden no-canónico vía middleware.
- **`/precios/[categoria]/calidad/[segmento]` — segmentos de calidad observados:** una página por subcategoría
  real del MAG (min/máx/promedio + cabezas, 100% observado). Segmentos de muestra reducida quedan noindex y fuera
  del sitemap.
- **`/mercado/origen/[provincia]` — procedencia de la hacienda:** de qué provincia/localidad provino la hacienda
  operada en el Mercado Agroganadero (agregado, sin remitente por privacidad), con `Dataset` schema.
- **Badge INMAG embebible (`/api/badge/[slug]`) + sección en `/indices`:** SVG en vivo con valor y fecha
  horneados, `X-Frame-Options ALLOWALL`; el snippet de embed enlaza de vuelta (backlink dofollow). Uso CC-BY.
- **Primitiva nueva:** [`quality-segments`](src/lib/data/quality-segments.ts) (slugs determinísticos compartidos
  por la ruta y el sitemap).
- **`sitemap.ts`:** suma los 15 comparadores + segmentos de calidad indexables + 6 páginas de origen.

`tsc` 0, `pnpm build` limpio.

---

## [1.33.0] — 2026-06-15

### Familia GEO/AEO "answer-block": respuestas extractables, feed machine-readable y superficie de precios observados

Tren de mejoras de citabilidad/AEO en el espíritu del `AnswerBlock` (1.32): primitivas reutilizables que
convierten datos reales en unidades extractables por motores de respuesta (AI Overviews, snippets, agentes),
con dato honesto siempre (observado o estimado etiquetado). Sin libs nuevas; build verificado.

- **Primitivas nuevas:** [`DataStamp`](src/components/seo/DataStamp.tsx) (`<time>` machine-readable de frescura,
  `.speakable-content`), [`CitaBlock`](src/components/seo/CitaBlock.tsx) (`<cite>` + "Copiar cita"),
  [`MethodologyMicroBlock`](src/components/seo/MethodologyMicroBlock.tsx) (`<details>` de procedencia crawleable),
  [`PriceWhatsAppShare`](src/components/share/PriceWhatsAppShare.tsx) (card de precio honesta para WhatsApp),
  [`PriceRangeTable`](src/components/market/PriceRangeTable.tsx) (subcategorías observadas del MAG).
- **`/precios/[categoria]` y `/precios/[categoria]/[provincia]` (~84 páginas):** segundo AnswerBlock + FAQ con el
  **promedio observado por subcategoría** (min/máx/prom/cabezas reales, fechado); DataStamp; CitaBlock; share de
  precio. La metodología del diferencial regional (Diez 2020 / Iriarte 2008) se colapsó en un `<details>` crawleable.
- **`/mercado/[categoria]`:** tabla de subcategorías observadas (`PriceRangeTable`) + schema ItemList/AggregateOffer.
- **`/precios.json`:** nuevo snapshot diario machine-readable (CC-BY), superficie de citación para agentes; linkeado
  desde `llms.txt` + `<link rel=alternate type=application/json>`. Aislado del feed Enterprise (sin serie histórica
  ni 16 subcategorías).
- **`/llms.txt`:** header `Last-Data-Date` + delta INMAG arriba de todo, para crawlers/LLMs.
- **`/glosario`:** los anchors de `DefinedTerm` y los selectores Speakable ahora resuelven a nodos reales del DOM.
- **Remates con YouTube:** schema `VideoObject` (con `BroadcastEvent` cuando es en vivo, gated a no-pasado).
- **`sitemap.ts`:** `lastModified` honesto por familia de URL (precio/remate/build/por-fila) en vez del "cambió hoy"
  uniforme; fechas futuras clampeadas a hoy (Google ignora lastmod futuro).

`tsc` 0, `pnpm build` limpio.

---

## [1.32.0] — 2026-06-15

### CTR + performance + accesibilidad + instrumentación de funnel + GEO answer-blocks

Tren nacido de la auditoría de tráfico (GSC: posiciones sanas 4-8, el cuello es **CTR, no ranking**)
y de un audit de performance/accesibilidad móvil (Lighthouse). Mejoras quirúrgicas, sin libs nuevas.

- **CTR sprint (títulos en páginas con muchas impresiones y bajo CTR):** el template de provincia de
  frigoríficos pasó a < ~60 chars para que Google no trunque el "(2026)" en la SERP; `/mercado/arrendamiento`
  lidera con "**Precio** Novillo Arrendamiento Hoy" para matchear la query real (antes "Índice").
- **Performance móvil:** el logo se sirve a 32px (`icon-32.png`, 1,4 KB) en vez del PNG 512px/106 KB
  (~105 KB menos por página); **gtag.js diferido a `lazyOnload`** (fuera del critical path, ~157 KB) con el
  stub inline temprano para que los eventos sigan encolando — **conversiones intactas** (verificado); `preconnect`
  a GTM/GA.
- **Accesibilidad:** labels asociados en los inputs de la calculadora (`ValuationWidget`); fix de
  `aria-hidden` con descendientes focuseables en `MarketTape` (la cinta duplicada va con `tabIndex=-1`);
  contraste subido (zinc-500 → zinc-400).
- **Instrumentación de analytics:** se cablearon superficies de funnel que no disparaban ningún evento —
  `ValuationWidget` (cálculo + lead), `/calculadora` (cálculo + lead + share), componentes de WhatsApp share,
  y los botones de referral/copiar/widget del dashboard.
- **Internal linking:** `getRelatedConsignatarias` ya no devuelve vacío para perfiles sin provincia y arma
  los relacionados desde el roster estático completo (rotado por hash del slug) → los perfiles huérfanos
  reciben links entrantes y entran al grafo de crawl.
- **GEO answer-blocks:** nuevo componente reutilizable [`AnswerBlock`](src/components/seo/AnswerBlock.tsx)
  con `SpeakableSchema` en `/precios/[categoria]` y `/precios/[categoria]/[provincia]` (~84 páginas): una
  respuesta concisa y extractable bajo el H1 para AI Overviews / featured snippets / answer engines.
- **OG dinámico de precio:** nueva `opengraph-image` en `/mercado/inmag` — el INMAG vivo horneado en cada
  preview de WhatsApp/social/prensa (se refresca con el commit diario de datos).

`tsc` 0, `pnpm build` limpio.

---

## [1.31.0] — 2026-06-13

### Precios de remate observados (fuente nombrada) + recuperación de answer-eligibility en /precios

Dos frentes nacidos de la auditoría de tráfico: una capa de datos nueva (precios
**observados**, no estimados) y la recuperación de las queries conversacionales que
`/precios` había perdido tras el honesty fix de 1.30.9.

- **Capa de precios observados por consignataria** — nueva fuente `src/lib/data/remate-promedios.json`
  (esquema genérico: fuente → remates[] → categorías min/max + plaza/provincia/fecha/cabezas) y
  componente server-rendered [`ObservedPricesSection`](src/components/consignataria/ObservedPricesSection.tsx)
  en el perfil de la consignataria. **No es un índice propio:** cada entrada es el rango $/kg vivo
  declarado por la firma para ese remate, con **fuente nombrada y atribuida**; el punto medio se muestra
  como referencia del rango (no como promedio ponderado). Primer dato real: **Etchevehere Rural SRL**,
  Feria María Dolores (General Ramírez, Entre Ríos), remate 09/06/2026 — 12 categorías, 483 cabezas.
  Citabilidad: `DatasetSchema` (creator = la firma) + `FAQPageSchema` con las preguntas que matchean
  queries reales ("¿A cuánto se vendió el ternero en General Ramírez?"). Cada planilla que entra del
  outreach se agrega como un objeto y aparece sola en el perfil de esa firma.
- **`/precios/[categoria]` — recuperación de answer-eligibility** — el FAQ usaba un template genérico
  que no matcheaba las frases reales de Search Console y tenía un **bug de género** (para `vacas`
  renderizaba "¿Cuánto sale *un vaca vivo*?"). Se agregaron las **frases exactas** que la gente busca,
  con respuesta **número-primero y honesta** (lidera el INMAG), y se corrigió el género por categoría
  (`articulo`/`vivoAdj`): "¿Cuánto sale una vaca viva en Argentina 2026?", "¿Cuánto cuesta una vaca
  adulta?", "¿Cuánto está el kilo de novillo en pie?", etc.
- **`/precios/hacienda-en-pie`** — sumada la frase exacta "¿Cuánto está el kilo de novillo en pie?"
  (era query perdida; la página decía "vivo", no "en pie").
- **Diseño honesto sostenido:** ninguna afirmación sin fuente (valor #1). El observado lleva fuente y
  fecha; el geo×categoría conserva su estimado etiquetado de 1.30.9–1.30.10 intacto (la arquitectura
  queda: query nacional → página nacional, query provincial → geo page honesto). El rewrite "observado
  lidera, estimado fallback" en `/precios/[cat]/[prov]` queda pendiente para cuando haya cobertura.

`tsc` 0, render verificado en dev (sección + Dataset/FAQ schema presentes en el HTML servido).

---

## [1.30.16] — 2026-06-09

### Rediseño de la landing — "cinta viva en broadsheet"

La home dejó el reflejo de categoría (fondo oscuro + grilla + tira de 5 cards iguales + botones blancos) por una identidad propia: **terminal de mercado vivo con rigor editorial**, donde el movimiento ES la data real, no fades decorativos.

- **`MarketTape`** — cinta de mercado en vivo (INMAG, categorías, USD blue, remates, en vivo, plantas) como latido de la página. Transform CSS (GPU), pausa en hover.
- **`LiveHero`** — hero "apertura de mercado": dateline con pulso, titular broadsheet, **readout del INMAG que cuenta al cargar** (reemplaza la grilla de cards), fila mono compacta del resto del mercado, CTAs jerarquizados.
- **`ScrollReveal`** — reveal-on-scroll en todas las `<section>` sin tocar su markup (IntersectionObserver, una sola vez). **SSR-safe** (sin JS, todo visible), saltea el hero y lo above-the-fold (sin flash).
- **`Reveal` / `CountUp`** — primitivas reutilizables (fade-up in-view, conteo in-view) para el resto del sistema.
- Movimiento **liviano**: sin libs nuevas (RAF propio + CSS), **respeta `prefers-reduced-motion`**, no anima layout. SSR/SEO intactos (componentes cliente render server-side; `<h1>` y data en el HTML). `pnpm build` limpio, `tsc` 0.

---

## [1.30.15] — 2026-06-09

### UX integral — showcase PRO, filtros de remates, calendario multi-localidad, bienvenida

Cuatro frentes bajo un brief de diseño común (terminal oscuro, accent sky = PRO, una acción primaria por vista, datos reales):

- **Showcase PRO** — los 5 tools PRO dejan de estar en cards tibias: sección de highlights en la home + nueva página **`/pro`** (tour con gancho real de cada tool + CTA), reutilizando `<ProReveal>`/`<HeroNumber>`. Componentes en `src/components/showcase/`.
- **Reorg de /remates** — barra de filtros **unificada** (período + En Vivo + buscar + Provincia + Tipo + FILTROS PRO) con **chips de filtros aplicados** removibles, en `src/components/remates/RematesFilterBar.tsx`. **Las rutas SEO siguen intactas** (filtra client-side el dataset ya cargado, no navega) — `/remates/[slug]`, `/ciudad`, `/tipo`, `/mes`, hoy/semana/en-vivo, etc.
- **Calendario multi-localidad** — `MultiSelectList` con **checkboxes por localidad agrupados por provincia + "seleccionar todas / toda la provincia"** (estado indeterminado), barra de selección con contador, y export `.ics` sobre **todas** las localidades tildadas. Antes: una sola.
- **Bienvenida ultra-PRO** — saludo/estado premium en el dashboard con datos reales de sesión, módulo de bienvenida al activar PRO ("esto desbloqueaste" + próximos pasos), y `WelcomeChecklist`/`ProfileProgressTracker` pulidos para guiar.

`/pro` agregada al sitemap. Sin datos inventados (regla #1). `pnpm build` limpio, `tsc` 0. Reporte: [`docs/REPORTE-ux-suite-2026-06-09.md`](docs/REPORTE-ux-suite-2026-06-09.md).

---

## [1.30.14] — 2026-06-09

### Fuentes de remate NEA/Corrientes — el scraper deja de estar sesgado al Pampa/Litoral

Diagnóstico: el scraper corría bien pero **todas sus fuentes eran consignatarias de BA/Santa Fe/Entre Ríos** → Corrientes tenía solo 4 remates a futuro (vs BA 151). Se sumó un **módulo aislado** [`scripts/scrapers/nea.mjs`](scripts/scrapers/nea.mjs) (export `scrapeNEA()`), wireado al runner con 1 import + 1 call + dedup consistente; cada fuente con `try/catch → []` para que una caída nunca rompa el pipeline.

Fuentes nuevas (self-test: **84 remates NEA, 13 de Corrientes** vs 4 previos):
- **Reggi & Cía** (Corrientes — Santo Tomé, Paso de los Libres, Curuzú, Bella Vista) · HTML server-rendered.
- **Aguerre SRL** (Mercedes, Corrientes) · Tribe Events REST API (carga tarde; endpoint OK).
- **HRE** (Entre Ríos) · Django REST.
- **Rosgan / RosganNet** (pantalla NEA) · JSON — fuente neutral atribuida (no se republica su índice).
- **ClicRural cartelera** (multi-provincia NEA) · HTML.
- Arzuaga: descartada por ahora (Wix JS-rendered, requiere headless).

Gap "en vivo": sólo 1 stream capturado — las fuentes no exponen YouTube por-evento de forma confiable; queda como problema aparte. La data de `remates.json` se puebla en la próxima corrida del cron `scrape-auctions.yml` (o `gh workflow run`). `node --check` 0, self-test verde, sin mutar data en este commit. Reporte: [`docs/REPORTE-fuentes-nea-2026-06-09.md`](docs/REPORTE-fuentes-nea-2026-06-09.md).

---

## [1.30.13] — 2026-06-09

### Suite PRO Usuario — gating unificado + vistoso + útil

Trabajo integral sobre los 5 productos PRO Usuario bajo un estándar único
([`docs/PRO-PRODUCT-STANDARD.md`](docs/PRO-PRODUCT-STANDARD.md)): **gancho gratis de
data pública → la decisión (premium) detrás de un soft-gate**, nunca muro duro ni
redirect. Componentes compartidos nuevos en `src/components/pro/`:

- **`<ProReveal>`** — gate reusable: muestra el contenido PRO verbatim al suscriptor;
  al free/anónimo lo muestra borroso + inerte con overlay (beneficio + CTA
  "Desbloquear con PRO — ARS $7.900/mes"). Honra la regla #1: el blur es render real
  tapado o skeleton no-real, jamás cifras fabricadas. Analytics `pro_prompt` variante `reveal`.
- **`<HeroNumber>`** / **`<StatPill>`** — número-hero pre-formateado + barra/percentil con color semántico (verde ≥70 / ámbar ≥40 / rojo).

Por producto:
- **¿Vendo ahora?** — gating migrado a `<ProReveal>`; bloque-**veredicto** ("Vender hoy / Aguantar / Zona neutra") sobre los números; percentiles en **USD real** (de v1.30.12); **fix honesto del proxy de categoría**: `precision: preciso|indicativo` — para novillo es directo, para el resto banner ámbar aclara que el percentil es **direccional** (no hay serie propia por categoría; no se fabricó ninguna).
- **Comparador** — candados 🔒 unificados a `<ProReveal>`; ranking que ayuda a decidir "a quién venderle" + pagador más rápido; tabla más vistosa.
- **Neto en mano** — desglose bruto→neto vistoso; comisión/gastos/flete **editables** (defaults honestos 3%/2%/0, no inventados).
- **Spread** — **ahora gateado** (estaba abierto): gancho gratis + detalle premium en `<ProReveal>`.
- **Histórico / Estacionalidad** — CSV y detalle de la década gateados consistente; estacionalidad como decisión (heatmap mes×año).

Reporte: [`docs/REPORTE-suite-pro-2026-06-09.md`](docs/REPORTE-suite-pro-2026-06-09.md).
`pnpm build` limpio, `tsc` 0.

---

## [1.30.12] — 2026-06-08

### Geo CTR sprint — titles/meta + FAQ schema en páginas-provincia

Diagnóstico GSC (28d): orgánico +93% clicks / +91% impresiones, pero **CTR clavado en 2,3% con pos media 6,4** → el cuello de botella es el CTR, no el ranking. Las páginas-provincia de frigoríficos concentran volumen con CTR pobre (buenos-aires 2.397 impr @1,1%); las de remates convierten 7-10% pero con pocas impresiones. Se aplicó la fórmula probada (geo + número real + actualidad + intención al frente) donde estaba el volumen desperdiciado, todo con datos reales en scope (sin inventar):

- **`/frigorificos/[provincia]`** — title `Frigoríficos en X: N Plantas Habilitadas SENASA/MAGYP (2026)`, description con intención al frente, H1 con conteo, + `FAQPageSchema` (conteo, ciclo I/II/III vía STAGE_LABELS, dónde faenar).
- **`/remates/[provincia]`** — title con `N en calendario · Novillo $X/kg (INMAG)` (precio vivo de market-prices.json + fecha), description con remates+consignatarias+precio, + `FAQPageSchema`.
- **`/consignatarias/[provincia]`** — title `Consignatarias en X: N Activas con Remates 2026`, + `FAQPageSchema`.
- **`/consignatarias/[slug]`** — fallback de title con geo (`… Consignataria de Hacienda en {Provincia}`) solo en la rama sin customSEO (perfiles curados intactos).
- **`ProvinceCluster`** — link geo de precio (`/precios/novillos/{prov}`) solo en las 13 provincias donde `/precios` es estático (guard anti-404); cierra el loop precio↔remate↔frigorífico↔consignataria.

Reporte completo + metas de KPI: [`docs/REPORTE-geo-organic-sprint-2026-06-08.md`](docs/REPORTE-geo-organic-sprint-2026-06-08.md). Roadmap geo (backlog): expandir `/precios` 13→22 provincias (requiere verificar existencias-bovinas + km), hubs geo. `pnpm build` limpio (2.717 páginas), `tsc` 0.

---

## [1.30.11] — 2026-06-08

### El Corredor: landing al día con la edición de Mayo + copy sin jerga

- **Landing + `/el-corredor` apuntan a la edición Mayo 2026 (05/26)**: CTA ("Recibir Edición 05/26"),
  cover y OG (`cover-mayo-2026.png` / `og-mayo-2026.png`), etiqueta "Última edición · Mayo 2026" y
  fecha de próxima edición ("en julio" / "cierre de junio · primer día hábil de julio"). Estaban
  hardcodeadas en Abril (04/26) aunque la edición de mayo ya estaba publicada (`manifest.json`).
- **KPI interanual actualizado a `+24,4% USD interanual real`** (cifra de la edición de mayo, tomada
  del PDF `mayo-2026.pdf`, p.1 resumen ejecutivo) — antes `+24,9%` (abril). Sin inventar el dato.
- **Se eliminó la jerga "buckets del MAG" → "categorías de hacienda del MAG"** en landing,
  `/el-corredor` y el card `ElCorredorCTA` (nadie fuera de la mesa entiende "bucket").
- `package.json` realineado (estaba en 1.30.7 por drift; el tag real era 1.30.10).

Typecheck OK (`npx tsc --noEmit` → 0).

---

## [1.30.10] — 2026-06-05

### Estimated regional basis on geo×category price pages

Builds on 1.30.9: `/precios/[categoria]/[provincia]` now shows a **"Diferencial regional estimado"** —
an estimated in-origin price per province, clearly labeled as an estimate (not observed). The producer
in Formosa now sees ~$3.840/kg for the ternero (−14,4%) instead of the misleading national $4.488.

- Model: linear discount by road-distance to Cañuelas, calibrated to **Diez 2020** (Liniers +8,63% over
  Sudoeste Bonaerense @ 660 km) and **Iriarte 2008** (*precio interior = Liniers − flete − costos*).
  `BASIS_DISCOUNT_PER_KM ≈ 0,012 pts%/km`, defensive cap 25%. Per-province `km` added to the PROVINCES map.
- UI: estimate line under the H1, a dedicated amber panel (referencia nacional · estimado en origen ·
  diferencial % · km) with the **method + sources visible** and an honest "estimación, no precio
  observado" caveat, linking the local remates as where the real price forms.
- A 4th FAQ ("¿Cuánto se paga el {cat} en origen en {prov}?") carries the labeled estimate into the
  FAQ schema, so the AI-cited answer is both useful and honest.

Honors brand values #1 (no claim without source) + #5 (declare the method). `pnpm build` clean.

---

## [1.30.9] — 2026-06-05

### Honesty fix: geo×category pages no longer claim the price is provincial-flat

`/precios/[categoria]/[provincia]` stated *"el precio del ternero no se fija por provincia… lo que
cambia es la plaza"* and presented the national INMAG number as the province's price. That contradicts
our own bibliography: **Iriarte 2008 (p.103-104)** — *Precio interior = Precio Liniers − flete − costos
de comercialización* — and **Diez 2020** (+8,63% Liniers vs Sudoeste Bonaerense @ 660 km). Confirmed in
data: Formosa's MAG-entry share ≈ 0 — far cría provinces don't sell at Cañuelas; their price forms at the
**remates en origen** and trades below the national reference (freight + distance to consumption/export hubs).

Minimal copy patch (no fabricated local number): the misleading sentence + the FAQ #1 answer (the one the
AI Overview cites) now say the INMAG is the **national reference**, that the price realized in the province
**differs** (freight, costs, distance — typically below in far provinces), and that the **local price forms
at the remates en origen**. Makes the AI-cited answer accurate. `pnpm build` clean.

---

## [1.30.8] — 2026-06-05

### Pillar 2 pivot: no data license — institutional access to the *service*

Decision (owner): we will **not license/sell data at all**. The institutional offering is reframed one
notch down — the buyer **pays for access + service + tooling, not for a license of the datum**. Grounded
in a legal review (Ley 11.723 art. 1, reformed by Ley 25.036, protects *compilations*; reproducing/
redistributing a third party's compiled series can infringe copyright — even criminally, art. 72 — and
the unfair-competition regime, Decreto 274/2019; CSJN *Directv* 2022). The MAG publishes no terms we
could find, so we default to the conservative position.

- `/enterprise`: section **"Licencia de datos institucional" → "Acceso institucional"** (`id`
  `licencia-datos` → `acceso-institucional`). All "licencia/licenciar" copy removed. New framing: *"El
  INMAG es público (lo publica el MAG) — no lo vendemos ni lo redistribuimos. Pagás el acceso, el
  mantenimiento y las herramientas. Pagás por el servicio, no por una licencia del dato."* "Qué
  licenciás" → "Qué incluye el acceso"; rights line "uso interno y valuación" → "soporte + SLA +
  actualización mantenida"; CTA "Solicitar licencia de datos" → "Solicitar acceso institucional".
- Discovery updated everywhere: footer (`layout.tsx`), `/metodologia` chip, `/mercado/inmag` line,
  `/indices` citation note — all now say **"acceso institucional al servicio"** and point to the new anchor.
- `/terminos` unchanged (it already *restricts the API user* from reselling/redistributing — that protects us).
- Legal memo saved to research (`~/Downloads/cnsg-vision/DATA-LICENSING-LEGAL-MEMO.md`): facts/prices are
  free to publish with attribution; our value-add/service is defensible; redistributing MAG's raw series
  needs a MAG agreement + lawyer review.
- ROADMAP: Pillar 2 renamed "Data-Licensing" → "Institutional Access" throughout.

No data sold or licensed anywhere on the site. `pnpm build` clean.

---

## [1.30.7] — 2026-06-05

### Legal de-risk: data-licensing copy reframed to value-add + service (drop "redistribución")

The institutional data-licensing offering (1.30.0) over-claimed: it framed the deal as licensing "la
serie de referencia" / "serie propietaria" with a **"redistribución (según contrato)"** right — but we
do NOT own MAG's INMAG (we scrape/mirror it) and have no confirmed authorization to resell/redistribute
it. Reframed to what is actually defensible:
- We license **our value-add + the access service** — our archived (2015→), normalized, USD-overlaid
  series, our derived indices (our calculations), structured lote-level, and the bulk-access service —
  explicitly stating the INMAG is a **public** index published by the MAG (the raw third-party datum is
  not ours to sell).
- **Removed "redistribución"** from the offering, the rights line ("uso interno y valuación"), and the
  contact mailto. Pricing "según alcance de uso" (was "...y redistribución").
- Methodology ref bumped to v1.3.

Lowers legal exposure immediately. Still pending (owner/legal): confirm MAG's terms of use + whether a
data agreement is warranted before any redistribution claim. pnpm build clean.

---

## [1.30.6] — 2026-06-04

### AI-referral detection — first-class `ai_referral` GA4 event

Verified via the GA4 API that AI traffic IS arriving (ChatGPT ~166 sessions/30d, the #1 AI referrer;
Copilot/Gemini/Claude trailing) but was **neither unified nor queryable**: chatgpt.com splits across
Referral/Unassigned, no custom AI event existed, and GA4 custom channel groups aren't exposed by the
Data API. Added an `AiReferralTracker` in `AnalyticsProvider` that fires a first-class `ai_referral`
event (with `ai_engine` + `landing_page`) when `document.referrer` matches an AI engine
(chatgpt/perplexity/copilot/gemini/claude/you.com), once per session. Makes "traffic from AI"
measurable + attributable — the thesis metric (are we the source AI cites?).

Note: the `ai_referral` event count is queryable immediately; to break it down by `ai_engine` in GA4,
register `ai_engine` as a custom dimension. Referrer-stripping engines land as Direct (undetectable
client-side) — an inherent limit. pnpm build clean.

---

## [1.30.5] — 2026-06-04

### Fix: /metodologia described an abandoned weighted index (it's observed prices per category)

The methodology page (the data-licensing credibility gate) still described a **synthetic composite
with category weightings** (Novillo 35% / Ternero 25% / …) and an "Índice de Precios Consignatarias
(IPC)". That model was abandoned: we have a **direct source per category**, so each price is observed,
not a ratio. The page contradicted the site's own stance ("precios observados, no ratios sintéticos").
- Removed the ponderaciones table + the synthetic-composite framing. Section 2 now states: **observed
  price per category** (fuente MAG), **INMAG is published by the MAG itself** (we replicate/archive/USD-
  overlay it — we don't recompute or re-weight it), and **VWAP is intra-category** (between a day's
  operations, when volume exists — not between categories).
- Reframed the title/intro/metadata/TechArticle schema off the synthetic "IPC" onto "precios e índices
  observados". Version 1.2 → 1.3.

`pnpm build` clean.

---

## [1.30.4] — 2026-06-04

### Docs: ROADMAP rewritten around the positioning thesis (3 pillars × 3 horizons)

The ROADMAP was stale (header at v1.29.0, structured around the obsolete v1.13→v1.20 revenue-milestone
plan). Rewrote it to current state: header at v1.30.3, a "Where we are now" snapshot of the
v1.29→v1.30 train (conversion unblocked, Pillar 2 launched, citability hardened, reliability fixes),
the thesis framing (Pillar 1 Index family / Pillar 2 Data-licensing / Pillar 3 Auction flywheel with
done-vs-next per pillar), a prioritized post-v1.30 next list (test payment E, sales enablement,
conversion measurement, indicators, API), a Pillar-mapped backlog (carrying the still-relevant v1.16/
1.17/1.18/1.19 items), and the historical journey/pivot preserved as record. CHANGELOG confirmed
complete (1.28.0→1.30.4, no gaps).

---

## [1.30.3] — 2026-06-04

### HOTFIX: production build broken since 1.29.14 — nothing was deploying

`next build` failed on an ESLint `react/no-unescaped-entities` error: a literal `"restos"` in the
`/metodologia` honesty section (added in 1.29.14). Because the build failed, **every push since
1.29.14 never deployed** — the institutional data-licensing section, the generated llms.txt, the
methodology audit, the discovery links, and the email-first B2C + Enterprise checkout (incl. the
"Cargando…" stall fix) were all stuck behind a red build. That is why the Enterprise button still
showed loading: production was running 1.29.13 code.

Fix: `"restos"` → `«restos»`. `pnpm build` now exits 0; the accumulated 1.29.14→1.30.2 work deploys.

Process note: dev (`next dev`) does not run the production ESLint gate, so the error didn't surface in
dev verification. Run `pnpm build` before pushing JSX changes.

---

## [1.30.2] — 2026-06-04

### Hotfix: Enterprise checkout stalled on "Cargando…" + login wall (couldn't pay)

Reported: "/enterprise se stallea cargando y nunca te deja pagar." Two failures:
- **The stall:** `EnterpriseTierCTA` gated the whole button behind a disabled "Cargando…" until an
  async auth-check (`/api/me` + `/api/account`) resolved. A slow network, a **stale JS bundle** (after
  the day's many deploys), or a failed hydration left it frozen there forever — same class as the
  INMAG-$0 bug (critical UX depending entirely on client JS). Fixed: the button now renders an
  **actionable CTA from first paint** (treats unknown auth as 'none'); the auth-check only *enhances*
  it into current-plan / upgrade / downgrade states once it resolves. Verified actionable at 300ms.
- **The login wall:** even past the spinner, an anonymous Starter buyer was sent to `/login` — they
  couldn't pay (same bottleneck the B2C fix removed). Added **email-first Enterprise Starter checkout**:
  new `POST /api/enterprise/checkout-public` (creates/recovers the user server-side first, then the
  Rebill link), and the anon Starter CTA now collects an email inline instead of bouncing to login.

Verified on dev: no "Cargando…" at first paint, 1 email field, "Contratar Starter · USD 99/mes →",
0 pageerrors. Typecheck clean. (Higher tiers stay sales-led via mailto.)

---

## [1.30.1] — 2026-06-04

### Discovery for the institutional data-licensing offering

The data-license offering (1.30.0) lived only on /enterprise where institutions wouldn't find it.
Added a deep-linkable anchor (`/enterprise#licencia-datos`) and entry points from the high-intent
institutional surfaces:
- **`/metodologia`** — "Licencia institucional" in the access block (methodology readers are evaluating the data).
- **`/mercado/inmag`** — a line under source attribution targeting banks/frigoríficos/exchanges/fintech (the reference-series page).
- **Footer (site-wide)** — "Licencia de datos" in the explore row, present on every terminal page.

Verified all four surfaces serve the link/anchor. Typecheck clean.

---

## [1.30.0] — 2026-06-04

### Pillar 2 — Institutional data-licensing offering (the revenue engine)

Per POSITIONING-THESIS Pillar 2: the moat/revenue is **licensing the series**, not per-request API.
`/enterprise` only sold per-request dev tiers (Starter/Growth/Scale). Added a distinct **"Licencia de
datos institucional"** section — the higher-ACV, sales-led offering (CEPEA/Bloomberg model):
- **What you license:** full INMAG series (2015→, 11 yrs) + USD overlay, lote-level transactional data,
  the proprietary index family, bulk/scheduled delivery, internal-use/valuation/redistribution rights.
- **For whom:** banks (cattle-collateral valuation), export frigoríficos (pricing/hedging),
  exchanges/MATBA-ROFEX (settlement reference), fintech/agtech, research/press.
- **Gated by credibility:** links the now-published methodology (v1.2) + honest coverage declaration —
  exactly the gate the thesis requires before institutional sales (resolves El Oráculo #14).
- Bespoke annual pricing via a structured "Solicitar licencia de datos" contact. Emerald accent to
  differentiate from the sky-accented per-request tiers.

This is the surface where institutional demand lands — the first concrete build of the revenue engine
that both the positioning thesis and the conversion swarm flag as the real money (vs. squeezing B2C).

Typecheck clean; /enterprise serves 200 with the section.

---

## [1.29.14] — 2026-06-04

### Citability hardening (thesis Pillar 1): generated llms.txt + methodology audit

**1) `/llms.txt` is now generated from live data** (route handler, replaces the static `public/llms.txt`
that silently drifted — it said "74 consignatarias" while canonical was 104). It now interpolates the
real counts (`getAllProfiles().length`, frigoríficos), the **current INMAG reading**, the **current El
Corredor edition**, and a freshness stamp — and fixes the coverage narrative to be thesis-consistent
(was three contradictory figures "88% formal / 71% off-screen / dark 78%"; now: INMAG observes the
formal MAG channel ~12% of the national herd, ~71% trades off-screen). The number ChatGPT/Perplexity
(#1 referrer) reads to cite the site can no longer go stale.

**2) `/metodologia` audited** (the credibility gate for institutional data-licensing — Pillar 2):
- Fixed fabricated/stale figures: "5 provincias" → 12, "86+ consignatarias" → 104, "365 días" → the
  real **2015→ (11-year) archive** (that depth IS the moat), "5 categorías" → 6.
- **Removed the fabricated per-province coverage table** (Corrientes 25 / Santa Fe 18 / … — invented,
  contradicted reality) on a page whose whole pitch is "transparencia total".
- **Added the honesty-as-moat section**: what the INMAG *does and does not* observe (~12% national
  herd; FCV-UBA ~71% dark pool). This is the credibility differentiator for licensing the series.
- Version bumped 1.1 → 1.2.

Typecheck clean. Verified both routes serve 200 with the corrected, live content.

---

## [1.29.13] — 2026-06-04

### Citability (positioning thesis, Pillar 1) — fresh + correct reference signals

Acting on POSITIONING-THESIS Horizon 1 ("become the citable reference"). Most of the GEO foundation
was already shipped; closed two freshness/accuracy gaps that directly affect how AI engines (ChatGPT
is the #1 referrer) and Google cite the site:
- **`llms.txt` said "74 consignatarias"** (×2) — the number LLMs read to cite us — while the canonical
  count is 104. Updated to 104 (matches the unified count from 1.29.7).
- **INMAG `Dataset` schema gained freshness + structured value**: `dateModified` (latest data date),
  `variableMeasured` (current INMAG value + unit), `measurementTechnique` (→ /metodologia),
  `distribution` (→ /api/market/history), and `publisher` (consignatarias as the reference layer).
  A daily reference price must signal it's *today's* and expose the value structurally so AI/Google
  cite it as a live source — the core of "el precio de referencia del ganado argentino".

Typecheck clean. Note: llms.txt is static and will drift again — a generated llms.txt is the durable fix.

---

## [1.29.12] — 2026-06-04

### Conversion #1 — email-first checkout (remove the login wall from the payment path)

The confirmed root cause of $0-ever: paying required creating an account (magic-link), a wall only ~10
people crossed in 3 months — so the money was physically unreachable for cold organic traffic.
- **New `POST /api/subscribe/checkout-public`** — takes an email, creates OR recovers the auth user
  **server-side first** (the Rebill webhook activates PRO by `userId`, so the link must be bound to a
  real user — never charge without one), then returns the Rebill checkout URL. Rate-limited. Fail-safe
  ordering: if user creation fails, no link is created and no card is charged.
- **`/upgrade` no longer redirects anonymous users to `/login`** — it renders an email-first form.
  `UpgradeButton` gains a `loggedIn` prop: logged-in → `/api/subscribe/checkout` (current session);
  anonymous → email input → the public endpoint.
- Post-payment access uses the existing magic-link login (same email → same user → PRO already active
  by userId), so no webhook change was needed.

Verified: `/upgrade` anonymous returns 200 with the email form (was a 307 to /login). Typecheck clean.

**⚠️ Requires a real test payment to confirm end-to-end** (the only valid verification — see plan item E):
confirm Rebill env (`REBILL_SECRET_KEY`, `REBILL_USER_PRO_AMOUNT`) + webhook signing secret in Vercel,
then pay ARS 7.900 with a real card from a logged-out browser and verify a `user_subscriptions` row with
`tier='pro'` AND `rebill_subscription_id` appears; refund after.

## [1.29.11] — 2026-06-04

### Conversion swarm — quick wins (prompt copy + B2B unlock + kill fake social proof)

First batch from the conversion diagnosis (traffic but $0 ever — verified: 0 real payments in DB).
- **PRO prompt CTA reveals the price**: default ctaText "Ver cómo funciona →" → "Activar PRO · ARS
  $7.900/mes →" (no more vague click-through).
- **INMAG prompt copy fixed**: it sold *PRO Consignataria* ("Que vean tus remates") to *producers*.
  Now producer-facing value: "...con PRO sabés cuánto te queda NETO a este precio y si está caro o
  barato vs. los últimos 365 días."
- **B2B $45k CTA un-deadcoded**: was gated `profile.verified && tier==='free'` — 0 profiles are
  verified so it never rendered. Now also shows on **unclaimed** profiles (where claim_cta_click has
  pulse — the consignataria looking at her own listing).
- **Killed fake social proof**: "47 ya lo hicieron" on profile claim block (DB has 2 claims, both the
  founder) → "Gratis · 5 minutos". Removes a Ley 24.240 false-claim risk.

Next: the structural #1 — email-first checkout (remove the login wall from the payment path).

## [1.29.10] — 2026-06-04

### Hotfix: INMAG price frozen at $0 (SSR + hydration)

`/mercado/inmag` (and `/mercado/arrendamiento`) showed the hero price **frozen at $0**. Root cause:
`AnimatedPrice` initialized `useState(0)` and only reached the real value via a client-side count-up —
so SSR/no-JS/failed-hydration/stale-bundle rendered "$0". It also threw a **React #418 hydration
mismatch** (Node vs browser `toLocaleString('es-AR')`), which could halt the animation, leaving $0.
- `useState(value)` → SSR and the no-JS fallback now render the **real price**; the effect resets to 0
  and animates up only when client JS runs. The price is never $0 again, even if JS breaks.
- `suppressHydrationWarning` on the value span → clears the #418 number-format mismatch.

Verified: SSR HTML contains `$4.079,69` (was `$0`); with JS the value animates to the real number with
**0 pageerrors** (was 1). Typecheck clean.

## [1.29.9] — 2026-06-04

### Post-payment success state on /cuenta?upgraded=true (close the conversion loop)

After a successful Rebill payment the user lands on `/cuenta?upgraded=true` (see `rebill.ts`). The page
already read the flag but only showed a small "Listo. Sos PRO." banner — the conversion moment was
under-celebrated and gave no first-use guidance (a refund/abandonment risk and a missed activation).
Upgraded it to a proper success panel:
- Prominent confirmation ("¡Listo! Ya sos PRO.") + checkmark + "comprobante enviado a {email}".
- **"Lo que acabás de desbloquear"** grid linking straight to the PRO features so the user uses one
  immediately (calculadora ¿Vendo ahora?, histórico INMAG + descargas, medios de pago, SENASA expandida)
  — first-use drives retention.
- Primary CTA to the dashboard + renewal/cancel note. The redundant standalone dashboard link is hidden
  when `justUpgraded`.

Note: a second checkout flow redirects to `/dashboard?upgraded=true` (`rebill.ts:26`), already handled
by `DashboardClient`. Typecheck clean.

---

## [1.29.8] — 2026-06-04

### Lead-magnet audit — El Corredor CTA now converts inline (was link-only + stale)

Audited why the El Corredor lead magnet captured **0 subscribers** despite CTAs across the site.
Backend verified healthy (POST `/api/el-corredor/subscribe` → `ok: true, delivered: true`, end-to-end
test inserted + delivered + cleaned up). The `/el-corredor` landing form is also fine. **The CTAs were
the bottleneck:**
- **Link-only, no inline capture** — every `ElCorredorCTA` just linked to `/el-corredor`, an extra
  navigation step before any email field. Added `ElCorredorInlineForm` (email + button, POSTs to the
  verified endpoint) embedded directly in the card variant → subscribe without leaving the page.
- **Stale hardcoded edition** — the CTA advertised "Edición Abril 2026" + showed the *April* cover even
  after Mayo shipped. Now reads `manifest.current` (edition label + cover) → always the live edition.
  (Same hardcoded-drift class as the consignatarias count.)
- **Placement** — added the CTA (inline capture) to `/mercado`, the high-traffic hub that lacked it.

The rewrite upgrades every existing placement (homepage, `/mercado/inmag`, planes, etc.) to inline
capture + the current edition at once. Verified: card renders the email field + "Recibir Mayo →" +
the Mayo cover; `/mercado` mobile `scrollWidth == 390` (no overflow). Typecheck clean.

---

## [1.29.7] — 2026-06-04

### Fix: desktop "/kg" overflow + unify the consignatarias count to one source

**Desktop "/kg" overflow** — on `/mercado/inmag` and `/mercado/arrendamiento` the hero price was
`lg:text-6xl` (60px); after the count-up settled, `$4.079,69 /kg` pushed the `/kg` **78px past the
card** at 1280–1440px (1.29.4 only fixed mobile). Capped the number at `text-5xl` and widened the
card to `lg:min-w-[400px]`. Verified with desktop emulation after the animation: `/kg` margin now
**+41px @1440/1280** (was −78px), mobile still +82px.

**Consignatarias count unified → 104.** The number was inconsistent everywhere: header **82**,
landing **104**, README **80**, email **74**, TECHNICAL **86/80**, `/api/stats/platform` **56** (five
different sources). Canonical source of truth = `getAllProfiles().length` (the deduplicated registry
that drives the profile pages — variants live in `allSlugs`, not as separate entries) = **104**.
- `/api/stats/platform` now counts via `getAllProfiles()` (was `consignatarias.json`, 56).
- Header (`layout.tsx`) and `PlatformStats` static values → 104.
- README, `email.ts`, `docs/TECHNICAL.md`, `CLAUDE.md`, and the registry comment → 104.
- The landing and `/consignatarias` already used `getAllProfiles().length`, so they were the right
  number all along. (`consignatarias` DB table still has 86 rows — a separate store; noted in TECHNICAL.)

---

## [1.29.6] — 2026-06-04

### El Corredor blast — audience broadened to market segments

The blast targeted only the `corredor` segment, which has 0 active subscribers (so it reached nobody
even once fixed). Broadened the audience to all market-interested active subscribers — `el-corredor`,
`cierre-mensual`, `reporte-semanal`, `remates`, `frigorificos`, `valuation_widget` (excludes
product-only `exportar-datos`). The monthly market close is exactly the content these subscribers
asked for. As the corredor segment grows via the lead-magnet CTAs it becomes the core; this is the
bridge so the edition reaches its natural audience now.

---

## [1.29.5] — 2026-06-04

### Fix: El Corredor pipeline was broken in 3 places (PDF 404 + blast never sent)

The Mayo 2026 edition published on schedule (1/6) but the report was unreachable and no email
ever went out. Three independent failures:
1. **PDF 404** — `.gitignore` has `*.pdf`, so `git add public/el-corredor/` silently dropped each
   edition's PDF; only the cover/og PNGs + manifest committed → the manifest pointed at a missing
   file. Fixed with a `!public/el-corredor/*.pdf` exception so editions deploy. (Abril survived only
   because it was force-added manually.)
2. **Blast never sent** — the route + workflow required `EL_CORREDOR_BLAST_TOKEN`, which was never
   set in GitHub or Vercel → the blast step skipped with a `::warning::` and a green check, every
   month. Switched the route to `authorizeCron()` (CRON_SECRET, the one secret set everywhere) and
   the workflow to send CRON_SECRET and **fail loud** on any non-2xx (same fix as 1.28.1).
3. Workflow gained a `force_blast` input to re-send the current edition without a new commit.

**Known follow-up (not code):** the `corredor` subscriber segment has **0 active subscribers**, so a
blast currently reaches nobody — the lead-magnet CTAs aren't converting. Audience + CTA work tracked
separately.

---

## [1.29.4] — 2026-06-04

### Fix: "/kg" overflow in the INMAG/arrendamiento hero price card (post-animation)

Pinpointed by the user: "after it loads, the word kg overflows" on `/mercado/inmag`. The hero price
animates (`AnimatedPrice`, 2800ms) — earlier measurements at 1.5s caught it mid-count (narrower
number) and missed it. At the **final** value, `$4.079,69` rendered at `text-5xl` (48px) left the
`/kg` jammed against the card edge: it fit on a 390px iPhone by ~15px but **overflowed on narrower
phones (360px Android) and would break with 5-digit prices** (Argentine inflation).

- Hero price number → responsive `text-4xl sm:text-5xl lg:text-6xl` (smaller on mobile), `tabular-nums`,
  `gap-2 sm:gap-3`, and `/kg` made `shrink-0`. Applied to `/mercado/inmag` and `/mercado/arrendamiento`.

Verified with device emulation **after the animation settles** (3.5s): `/kg` margin to the card edge
is now **+52px @360px, +82px @390px** (was overflowing), and still fits at 320px. Typecheck clean,
CSS-only.

---

## [1.29.3] — 2026-06-03

### Fix: mobile horizontal overflow on the market/index pages

Reported "kg overflow + other errors" on the index pages. Diagnosed with real device emulation
(Playwright, iPhone 12 @ 390px) measuring `document.documentElement.scrollWidth` per page — desktop
was clean, the bug was mobile-only. `/mercado` overflowed the viewport by **+39px**; the rest were OK.
Fixes for elements that didn't fit/wrap at 390px:
- **`CategoryComparison`** 6-column table → hide the 3 non-essential columns (vs 2Y, Máx Hist., vs Máx)
  on mobile with `hidden sm:table-cell`; keep Categoría / Actual / vs YoY.
- **`LongTermChart`** + **`MercadoClient`** panel headers (`justify-between`) → `flex-wrap` so the
  range selector / timestamp drop below the title instead of pushing the row past the edge.
- **`MercadoClient`** category table → narrower CATEGORIA column on mobile + BARRA hidden below `sm`.
- **`/mercado/inmag` + `/mercado/arrendamiento`** hero price cards → `min-w-[320px]` gated to `lg`
  so they never force overflow on sub-352px phones.

Verified: every market page (`/mercado`, `/mercado/inmag`, `/mercado/inmag-dolares`,
`/mercado/arrendamiento`, `/mercado/spread`, category + year pages) now measures `scrollWidth == 390`
on mobile — zero horizontal overflow. Typecheck clean. CSS-only, no API/behavior change.

---

## [1.29.2] — 2026-06-03

### Conversion & retention surfaces on the top traffic pages

Acting on the weekly funnel data (data-layer pages pull the traffic, but the highest-traffic ones
had no conversion surface):
- **PRO upsell on `/mercado/arrendamiento`** — the #2 page by traffic had **no** `ProUpgradePrompt`
  at all. Added the tracked card (`context="arrendamiento"`) so it enters the `pro_prompt_view/click`
  funnel like the other data pages.
- **"Mi Ganado" CTAs on `/mercado/inmag` and `/mercado/arrendamiento`** — surface the
  libreta-del-campo retention feature (valuá tu rodeo al INMAG) to exactly the price-looking
  audience. `/mi-ganado` is `noindex` (personal page), so it was invisible to organic visitors;
  these CTAs are its discovery path. Feeds recurrence (record-high 16.6% this week).

Note: `/mercado/inmag` on-page SEO audited and confirmed already at top standard (title with live
price, FAQ + Dataset + DefinedTerm schema, definition lede) — the remaining lever for the "inmag"
query (pos ~6.7) is off-page authority, not code. No fake edits made there.

---

## [1.29.1] — 2026-05-31

### Full cron observability — data crons now report to /admin/ops

Wired the `cron-hook` (start/finish → `/api/internal/cron-hook`) into the 9 remaining active
data/ops workflows: mag-detailed-prices, mag-lots-pipeline, mag-lots-discover, backfill-inmag,
backfill-usd, scrape-senasa-habilitados, quota-alerts, trial-nudges, post-remate-outreach. Each
opens a `cron_runs` row on start and closes it (ok/error from `job.status`) on `if: always()`.
Combined with the 4 self-logging email crons + scrape-auctions (done in 1.29.0), **every active
cron now shows in `/admin/ops`.** Added the missing cadences to `EXPECTED_CRONS` (trial-nudges,
monthly-close, faena-newsletter, scrape-senasa-habilitados). Observability-only — no behavior/API change.

---

## [1.29.0] — 2026-05-31

### Maturity pass — docs, versioning and operations at the level of the product

The product became market-intelligence infrastructure; this raises the wrapper to match.
No app behavior / API contract change — hence a minor, **not** a 2.0 (the major is reserved for
the first break of the API/data contract, per the new policy).

**Operations**
- `.env.example` documenting every secret/var, grouped, with the **CRON_SECRET-is-the-one** rule
  and the `ADMIN_SECRET` deprecation (the silent-401 that took emails down).
- `docs/RUNBOOK.md`: platform map, secrets golden rule, full cron inventory, email pipeline +
  segmentation + fail-safe, `/admin/ops` observability, and incident playbooks.
- `scrape-auctions` now reports to `/api/internal/cron-hook` → the flagship daily data cron shows
  in `/admin/ops`; RUNBOOK has the paste-ready snippet for the rest.

**Documentation**
- README + CLAUDE.md repositioned from "directorio de remates" to "infraestructura de inteligencia
  del mercado ganadero" — the directory/calendar are surfaces on the data+index spine.
- `docs/README.md` index (Strategy / Engineering & Ops / Methodology / Brand / Archive); strategy
  docs moved into `docs/strategy/`; dated/session/launch docs archived into `docs/archive/`.

**Versioning**
- `docs/VERSIONING.md`: SemVer policy with the **Enterprise API contract as the MAJOR boundary**.
  Daily data updates and editorial content are not versioned. Git tagging starts at **v1.29.0**.

---

## [1.28.2] — 2026-05-31

### Fail-safe segmentation — no new subscriber gets silently dropped

Audited every signup `source` against the segment map and found orphans: `rebill`
(paying customers!), `fab`, `manual`, `web`, and the El Corredor subscribe default
`el-corredor-landing` — none were mapped, so subscribers from those points received
**nothing**.

- `isWeeklyRecipient(source)` in `newsletter-segments.ts`: any UNMAPPED source now falls
  into the weekly digest (the general newsletter), instead of being dropped. Excludes only
  test sources, product-update-only sources, and subscribers who opted into a specific
  segment (faena / cierre / corredor — they get their own content).
- `weekly-newsletter` now fetches all active subscribers and filters with `isWeeklyRecipient`,
  so future signup points are covered automatically without a code change.
- Fixed the El Corredor subscribe endpoint to record `source: 'el-corredor'` (was
  `el-corredor-landing`), so landing subscribers enter the monthly blast — not just the
  immediate one-time delivery.

Verified live: triggered weekly-newsletter → **HTTP 200, sent 4/4, 0 errors**, run logged to
`cron_runs` (visible in /admin/ops). 4 test addresses cleaned to `unsubscribed` beforehand.

---

## [1.28.1] — 2026-05-31

### Fix: email crons never sent — wrong auth secret (silent 401)

Root cause of "subscribers aren't getting their newsletters": the email crons
(weekly-newsletter, faena-newsletter, monthly-close) authenticated against
`ADMIN_SECRET`, while every **working** data cron uses `CRON_SECRET`. With
`ADMIN_SECRET` unset/mismatched, those routes returned **401 and sent nothing** — and
because the workflow `curl -sL` ignored the HTTP status, the GitHub Action stayed green,
so the failure was invisible. (Confirmed against the Resend export: no weekly/faena/cierre
ever reached subscribers — only welcome + outreach + manual tests.)

- New `authorizeCron(req)` helper (`src/lib/cron-auth.ts`): accepts the secret via
  `Authorization: Bearer`, `x-cron-secret`, or `?secret=`, matched against `CRON_SECRET`
  (the proven secret) **or** legacy `ADMIN_SECRET`. Applied to weekly-newsletter,
  faena-newsletter and monthly-close.
- The three workflows now send `secrets.CRON_SECRET` (same secret the working data crons use)
  and **fail loudly**: the curl checks the HTTP status and the job goes red (with the
  response body) on any non-2xx, so a future failure can't hide behind a green check.
- Combined with the cron_runs self-logging added in 1.28.0, each run is now both visible in
  /admin/ops and surfaced in GitHub Actions.

After deploy, the email crons authenticate and send on schedule (or via workflow_dispatch).

---

## [1.28.0] — 2026-05-31

### Cron observability — email crons now self-log to /admin/ops

`cron_runs` was empty because no workflow ever reported a run (the cron-hook bridge was
"not wired yet"), leaving the ops panel blind to whether subscriber emails actually went out.

- New `trackCron(workflowName, fn)` helper in `src/lib/ops.ts`: wraps a cron handler so each
  run records a `cron_runs` row (running → ok/error) with run metadata, never breaking the cron.
- Wired the four subscriber-email crons to self-log **with their sent counts**: `weekly-newsletter`,
  `faena-newsletter`, `monthly-close`, and the El Corredor blast (`el-corredor-publish`). The
  /admin/ops cron-health table + sent counts now populate on each run; API `ops_events` (api_call)
  were already being captured.

**Email-delivery audit (verified, no code change needed):** the newsletter segmentation
(`newsletter-segments.ts`) is correct and every current subscriber source maps to an active cron —
weekly digest (remates/reporte-semanal/homepage), monthly close (cierre-mensual/valuation_widget),
faena (frigorificos), El Corredor (el-corredor); `exportar-datos` opted into product-updates only
(no market email, by design). The `alertas` table is empty, so the disabled remate-alert crons leave
no one unserved. Conclusion: no subscriber is structurally missing what they requested — the gap was
visibility, now fixed.

---

## [1.27.0] — 2026-05-31

### Botón de Arrepentimiento (Res. 424/2020) — functional

Implemented the visible, functional right-of-withdrawal button required for e-commerce by
Resolución 424/2020 SCI (art. 34 Ley 24.240, art. 1110 CCCN) — the operational piece the legal
docs committed to.

- New page **`/arrepentimiento`**: explains the right (10 días corridos, sin costo), three ways
  to exercise it (cancel from account, the form, or email), and a working form.
- New endpoint **`/api/arrepentimiento`**: validates and routes the request — notifies the team
  (agro@ + legales@memola.com.ar) and emails the user an acknowledgement, via `sendArrepentimientoRequest`.
  No account required, per the resolution.
- Prominent **footer link** "Botón de Arrepentimiento" (amber) on the homepage, as the resolution
  requires it visible; linked from the Términos subscription clause and in the sitemap.

---

## [1.26.1] — 2026-05-31

### Legal compliance hardening (enforceability pass)

Verified the legal documents against the Argentine adhesion/consumer-contract enforceability
framework and tightened the clauses that, as drafted, risked being read as abusive/void:

- **Limitation of liability** (Términos + Aviso Legal) now explicitly carves out **dolo y culpa
  grave** (art. 1743 CCCN) — a liability cap that purports to cover those is void.
- **Unilateral modification** of paid subscriptions now requires prior notice + the right to
  rescind without penalty (arts. 985-989 CCCN, art. 37 LDC) — a bare "we can change anytime"
  clause is abusive against consumers.
- **Right of withdrawal** spelled out with article cites (art. 34 LDC, art. 1110 CCCN) + the
  Botón de Arrepentimiento / baja mechanism (Res. 424/2020 SCI).
- **Consumer jurisdiction** carve-out now cites the nullity of any prorogation against the
  consumer (art. 36 LDC, art. 2654 CCCN).
- **Privacy**: added the consent legal basis (arts. 5-6 Ley 25.326).

Law set confirmed current (Ley 25.326, 24.240, 11.723, 27.275, CCCN, Res. 424/2020).

---

## [1.26.0] — 2026-05-31

### Legal layer — Términos, Privacidad y Aviso Legal (liability shield)

Rebuilt the legal documents into a coherent, defensible set grounded in Memola's
incorporation document and the Argentine statutes that protect public-data access and
legitimate use. No code/runtime changes beyond the three pages + footer links.

- **Términos y Condiciones** (`/terminos`) — full rewrite: company identity (Memola Medios
  S.A.S., CUIT 30-71863222-2, sede Córdoba), nature of the service (a directory/observatory,
  **not** a consignataria/broker/ALyC and not a party to operations), legal basis for accessing
  public data (Ley 27.275 de acceso a la información pública + art. 28 Ley 11.723 — facts/data
  not copyrightable), information "as is" without warranty, no guarantee of site permanence,
  right to change the terms, IP/database protection (Ley 11.723), subscriptions with consumer
  rights (Ley 24.240, derecho de arrepentimiento), takedown procedure, limitation of liability,
  and governing law/jurisdiction.
- **Política de Privacidad** (`/privacidad`) — Ley 25.326: responsable, datos recolectados,
  finalidad, derechos de acceso/rectificación/supresión (con plazos legales), AAIP as control
  authority, encargados y transferencias internacionales, conservación, seguridad.
- **Aviso Legal y Descargo de Responsabilidad** (`/aviso-legal`, new) — the consolidated shield:
  information "as is" from public/third-party sources without warranty, no guarantee of
  permanence/continuity, limitation of liability, and a detailed **takedown/correction
  procedure** routed to **legales@memola.com.ar**.
- Footer now links Términos · Privacidad · Aviso legal + the © Memola Medios S.A.S. line; the
  three pages cross-link and are in the sitemap. `legales@memola.com.ar` is the single contact
  for removals and data-rights requests.

---

## [1.25.0] — 2026-05-31

### INMAG historical-by-year pages — peso-vs-USD overlay (the compounding moat)

**`/mercado/inmag/[anio]`** — one page per year (2015 → today, 12 pages) answering
"¿cuánto valía el novillo en [año]?" with the annual INMAG **in pesos AND in dollars** —
the peso-vs-USD overlay no competitor publishes and the platform's most defensible,
compounding long-tail asset. Each page computes avg/min/max in ARS and USD plus the USD
year-over-year change directly from the paginated `mag_inmag_history` + `usd_blue_history`
series at build time, with an honest "lectura" (e.g. 2018: novillo up in pesos but −21% in
USD — the devaluation the peso figure hides), year-to-year navigation, an all-years index,
and `Dataset` + FAQ schema. Linked from the INMAG page ("el novillo año por año") and added
to the sitemap.

Closes this SEO/GEO build cycle: the citation audit's gaps + the top SEO opportunities
(province mesh, geo×category, named index family, historical years) are all shipped. Site now
generates **2.654 static pages** (was 2.552 at the start of the cycle).

---

## [1.24.0] — 2026-05-31

### Geo × category long-tail (78 pages) + named index family (positioning Pillar 1)

**Geo × category programmatic pages — `/precios/[categoria]/[provincia]`** (6 categories ×
13 provinces = 78 pages, the #2 SEO opportunity). Built HONESTLY: the reference price is
**national** (INMAG, formed at Cañuelas — the page says so), and each page earns its keep with
real province-specific context: provincial cattle stock (SENASA existencias), the province's
supply share at the MAG, the relevant local remates (filtered by the sale-types that map to the
category, so the 6 category pages of a province aren't duplicates), and the consignatarias that
operate there — plus the province internal-link mesh. Answers "precio del novillo en [provincia]"
without fabricating a per-province price competitors invent. Added to sitemap (priority 0.6).

**Named index family — `/indices`** (positioning thesis Pillar 1: "el precio de referencia del
ganado argentino"). A hub that packages the market-intelligence layer as a documented, citable
family — **INMAG**, **INMAG en dólares**, **panel de categorías**, **índice de arrendamiento**,
**spread maíz-novillo** — each with tagline, what-it-measures, methodology, cadence and its own
`Dataset` schema, so the indices get referenced by name (the move that turns answer-first SEO into
a price-reference moat). Linked from `llms-full.txt`; methodology + citation format published.

The site now generates **2.642 static pages** (was 2.552).

---

## [1.23.0] — 2026-05-31

### SEO province internal mesh + positioning thesis

Acts on the #1 SEO-opportunity finding (highest impact-per-hour, zero new pages):
a **province internal-link mesh** that cross-links the four per-province silos into one
authority cluster.

- New `ProvinceCluster` component (`src/components/seo/ProvinceCluster.tsx`) rendered on
  every province page — `/remates/[prov]`, `/consignatarias/[prov]`, `/frigorificos/[prov]` —
  linking the sibling silos (remates ↔ consignatarias ↔ frigoríficos ↔ mercado) with
  descriptive anchor text, excluding the page you're on. Null-guards provinces without a
  full silo set, so no broken links.
- Turns four isolated directory silos into a connected per-province cluster (×13 provinces) —
  diversified internal anchors + crawl-depth reduction toward the long-tail.

**Strategy docs** (in `geo-audit-2026-05-30/`): added `POSITIONING-THESIS.md` — a
world-innovation-grounded positioning thesis (CEPEA/B3, USDA MPR/Cattlefax/DTN, MLA/AuctionsPlus,
Bloomberg data-licensing). Core: own **"el precio de referencia del ganado argentino"** — the
price-discovery layer for the ~71% opaque market — via a named proprietary index family,
data-licensing, and an online-auction data flywheel. Ties the SEO/GEO work into the 3-horizon play.
Joins the existing `CITATION-AUDIT.md` and `SEO-OPPORTUNITIES.md`.

---

## [1.22.0] — 2026-05-31

### GEO (Generative Engine Optimization) — Phase 0 audit + Phase 1 strengthening

Kicked off the project to make the site the **cited source** in AI answer engines
(ChatGPT, Perplexity, Gemini/AI Overviews, Claude). A web-grounded citation audit
mapped where the site owns the answer-space vs the gaps; this release ships the
Phase-1 fixes the audit prioritized. No migrations; no Enterprise API changes. Audit
+ SEO-opportunity docs live in `geo-audit-2026-05-30/`.

**Closed the "Cañuelas/Liniers" terminology gap (audit ❌ → page).** The site spoke
"INMAG" while producers and AI engines search "precio Cañuelas/Liniers hoy" — the site
didn't surface at all there. New answer-first page **`/mercado/canuelas`** (current
market = Mercado Agroganadero, ex Liniers) with a self-contained lede bridging
Cañuelas → MAG → INMAG, live prices, FAQ, freshness stamp and TechArticle + FAQ schema.
Also corrected the existing `/mercado/liniers` page, which framed Liniers as the
operating market (it closed in 2018 → moved to Cañuelas) and cross-linked the two.

**New guide `/como-elegir-consignataria`** — the audit found "cómo elegir consignataria"
had no owner and AI engines noted the gap explicitly. Answer-first guide (7 criteria,
HowTo + FAQ schema) that also funnels to the PRO comparador (medios de pago + días de cobro).

**Entity / citability markup (lock-in of the data moat):**
- Glossary `DefinedTermSet` upgraded with stable per-term `@id` and canonical `url`
  per term; the standalone INMAG `DefinedTerm` now shares `@id .../glosario#inmag` so the
  glossary and the INMAG page reinforce one entity in the graph.
- `TechArticleSchema` extended with named author (editorial byline) + `citation` (sources:
  MAG, MAGYP, INDEC, SENASA, FCV-UBA…). Applied to **El Oráculo** (real datePublished +
  bibliography) and **El Corredor** (which had no structured data at all → now TechArticle +
  breadcrumb).
- `Dataset` schema on the INMAG and INMAG-USD series — the peso-vs-USD historical overlay is
  the site's defensible, citable edge (validated independently by the SEO-opportunities pass).

**AI-ingestion + freshness:** added **`/llms-full.txt`** (extended, citable definitional dump:
INMAG definition, market structure, categories, how-to, sources, citation format) linked from
`llms.txt`; added visible "Actualizado [fecha]" stamps + `dateModified` on daily-refreshed pages.

---

## [1.21.0] — 2026-05-30

### PRO Usuario — value build-out + merchandising (conversion)

Analytics showed traffic engaging the PRO surface (`pro_badge`) without converting: the
problem was merchandising + thin demand-side value, not demand. This release builds four
decision-grade PRO features and surfaces the value (with the price anchor) on `/planes`, the
landing, and at each point of use. No Enterprise API contract changes; no migrations.

**New / reworked PRO features**

- **Calculadora «neto en mano»** (`/calculadora`) — below the gross INMAG value, a PRO panel
  takes gross → take-home: editable commission %, marketing % and freight $/head, with the
  result in ARS, USD and $/kg. IVA (10.5% on hacienda) is shown as info, **not** subtracted —
  for a responsable inscripto it is collected and remitted, neutral to take-home. Free users get
  a teaser with the price anchor.
- **Full INMAG history + CSV** (`/mercado/inmag`) — the recent 30-day table stays free and
  indexable; the complete daily series **2015→** is a PRO CSV export via the new PRO-gated
  `/api/market/inmag-export` (pulls the full series from `mag_inmag_history`). Fixes a latent
  gap: the old download link silently returned JSON and only one year.
- **Comparador PRO** (`/comparar`) — adds *medios de pago* and *días de cobro* columns. To keep
  the page static without leaking PRO data into the HTML, these are fetched on demand for PRO
  users from the new PRO-gated `/api/consignatarias/medios-pago`; free users see a locked row + upsell.
- **Estacionalidad «show, don't blur»** (`/mercado`) — the heatmap used to be fully blurred
  (free users saw nothing → no desire). Now free users see the **last 3 years** in full and an
  upsell to unlock the full decade; PRO users get 2015→.
- **INMAG-en-dólares decade chart now PRO** (`/mercado/inmag-dolares`) — the "desde 2015" chart
  was free, giving away the marquee "la década completa" pitch. Free users keep the recent
  12-month and 5-year charts; the full decade is now a PRO gate (same recent-free/decade-PRO
  pattern as the CSV and seasonality).

**Audit corrections (truth-in-advertising + correctness)**

- Removed two PRO-Usuario bullets that didn't hold up: **"Alertas de precio"** (the `/api/alertas`
  quota keys off a `users.plan`/api-key model the PRO-Usuario subscription never sets, and there's
  no alerts UI) and **"Verificación SENASA"** (the registry data — propietario/actividades/ciclos —
  is public and shown free; only an unbuilt teaser was behind the gate). Selling either eroded
  trust at the decision moment.
- `ProUpgradePrompt` is now tier-aware: it renders nothing and fires **no** `pro_prompt_view` for
  PRO users (or before tier resolves), so the conversion-funnel denominator is no longer inflated
  or contaminated — critical since the whole point is measuring conversion.
- Net-back calculator: guarded the USD divisor (a missing/zero blue rate produced `USD ∞`) and the
  PRO/free panel no longer flashes the wrong state while the session loads.
- Removed the dead "Sistema de Puntos / Ganá PRO sin pagar" card from the landing (the points
  system was killed; the copy cannibalized paid conversion) and deleted unused `ProOverlay`.

**Merchandising**

- `/planes` — PRO Usuario card + "Por qué PRO Usuario" panel rewritten to lead with the
  money-decision tools (neto en mano, ¿vendo ahora?, comparador con plata, la década completa).
- **Landing** — added a dedicated **PRO Usuario** section ("Las herramientas del que vende
  hacienda", ARS $7.900/mes). The landing previously merchandised only PRO Consignataria — the
  demand-side plan had no home on the homepage, a likely cause of the non-conversion.
- Contextual upsells with the price anchor at each feature (calculadora, INMAG CSV, comparador,
  estacionalidad), all wired to the existing PRO-prompt analytics (`trackProPromptView/Click`).

---

## [1.20.0] — 2026-05-30

### Market data fix (was silently 5 years stale) + "INMAG en dólares" recent view + build hygiene

A correctness release. The headline bug: **every chart fed by the daily market series had been showing 2016–2020 data labelled as "hoy"**, because the Supabase fetchers hit PostgREST's default 1000-row cap. No API contract changes; no migrations.

**Data layer — page through the 1000-row cap (the real bug)**

- `fetchInmagSeries` / `fetchUsdSeries` (`src/lib/charts/data.ts`) had no `limit` and ordered ascending, so PostgREST returned only the **oldest 1000 rows**. A 10-year daily series is ~1.9k (INMAG) / ~3.6k (USD blue) rows, so the joined series silently ended at **2020-12-02** — the "hoy" value, the 5y/10y charts, and the percentiles were all frozen ~5 years in the past.
- Fix: both fetchers now **paginate via `.range()`** in 1000-row pages until drained. Verified against the live anon client: 1927 INMAG rows through 2026-05-29 (was 1000 through 2020).
- Corrects four consumers at once: `/mercado/inmag-dolares`, `/api/vender-ahora` (sell-timing percentiles), `YearOverYearBlock`, and `SeasonalityHeatmap`.

**`/mercado/inmag-dolares` — recent, month-to-month view (primary)**

The page was all long-term (10y stats + 5y monthly + since-2015), every chart zeroed on the Y axis, which flattens recent movement. Added a recent layer on top:

- **"Últimos 12 meses" stats strip**: today's USD/kg, change vs 30 days and vs 12 months (green up / red down), and the 12-month range.
- **"Últimos 12 meses — día por día" chart**: daily series scaled to the recent range (`yZero: false`) so month-to-month movement is actually visible.
- The historical charts (10y stats, 5y monthly, full history) moved below under a "Contexto histórico" heading. The "hoy" figure (H1 + FAQ + stats) now reflects the true latest trading day instead of the last monthly average.

**Build / deploy hygiene**

- `/api/top-followed` declared `revalidate` while reading `request.url` → a `DYNAMIC_SERVER_USAGE` error on every build. Switched to `export const dynamic = 'force-dynamic'` (CDN caching still via the response `Cache-Control` header).
- `vercel.json`: removed the per-function `memory` keys (ignored on Active CPU billing) and the `opengraph-image`/`twitter-image` function globs (only set the ignored memory + a `maxDuration` Vercel couldn't map to the hashed image routes). `maxDuration` for API/cron/webhook functions retained.
- Cleared all 17 ESLint warnings (unused vars/imports across 13 files; `useMemo` dependency fixes in `MiGanadoClient` and `InteractivePriceChart`). Production build is now warning- and error-free.

---

## [1.19.0] — 2026-05-29

### Detail-page enrichment + trial-end nudges + scraper accuracy

A SEO-depth + retention release driven by the v1.18.0 GSC pull (search lives in the frigorífico/market surfaces, not remates). No Enterprise API contract changes.

**Remate, consignataria & frigorífico detail enrichment**

- **Remate detail** (`remates/[slug]`): related-remates modules (same consignataria / same province), per-category reference price, and a breed reference block — turning a thin auction page into a navigable hub.
- **Consignataria & frigorífico detail**: added SENASA cattle-existence context **by province** (`existencias-bovinas.json`), plus richer profile copy on both surfaces.

**SEO indexing corrections**

- `noindex` applied to **thin consignataria profiles** (0–1 remates, no enhancement) so crawl budget concentrates on pages with real content.
- Dropped the bare-establishment `noindex` on frigoríficos — **all frigoríficos are now indexed** (the directory is the proven search entry point).

**Retention — trial-end nudges**

- New cron `trial-nudges` (`route.ts` + `trial-nudges.yml` + migration `20260529_trial_nudges.sql`): emails at **7 days and 3 days before trial end** (two new templates in `email.ts`).
- Home live counter fixed to show estimated streams instead of a misleading literal count.

**Scraper accuracy + brand wall**

- Added **HK Agro SRL** as a scraper source + logo (brand wall + auction coverage).
- Fixed **Colombo y Colombo** remates mislabelled CHUBUT → Buenos Aires (locality-province map + scraper guard).

---

## [1.18.0] — 2026-05-20

### "Mi Ganado" — herd-value tracker + nav simplification + SEO rank-lift

A regresabilidad (return-rate) release driven by a fresh read of the analytics. **No Enterprise API contract changes.** The new `user_ganado` table was applied to production via migration; everything else is metadata, content, and one new authenticated page.

**The evidence that drove this release**

Reconnected Google Search Console + GA4 (OAuth re-authorized, Search Console + Analytics Data/Admin APIs enabled) and pulled the real picture for the first time in months:

- Search traffic is **not** coming from remates (the architectural bet) — it comes from market data (`/mercado/inmag`, the query "inmag" = 992 impr at pos 7.4) and the frigorífico directory (province pages + by-CUIT + "habilitados senasa"). Remates barely register in search.
- Returning users are only ~10% of users but engage **2×** (346s vs 166s, 3.9 vs 2.3 pageviews). They are desktop professionals who **search** (88% of all on-site searches come from returning users) and monitor `/frigorificos` (418s, the #1 internal hub) + weekly prices.
- The leak: returning users **re-Google** the term (Organic returning 225 vs Direct 55 in 90d) — there was no product-native reason to come back on their own.

**"Mi Ganado" — the producer's herd, valued daily (free, login-gated)**

A return loop built on intrinsic value, not notifications: the producer sets his herd once and comes back to see what it's worth as the INMAG moves — *his* number, changing on its own.

- Migration `20260520_user_ganado.sql`: table `public.user_ganado`, one row per user (`UNIQUE(user_id)`), `items` JSONB (`[{categoria, cabezas, peso}]`), plus `last_seen_at` + `last_seen_value_ars` to compute "Δ desde tu última visita". RLS scoped to `auth.uid()` with the four own-row policies (select/insert/update/delete).
- `src/hooks/useGanado.ts`: load/save via the browser Supabase client + RLS — **no API route** (mirrors `useFavorites`). `saveGanado` upserts on `user_id`; `markSeen` stamps the value being viewed so the next visit can show the delta.
- `/mi-ganado` (`page.tsx` + `MiGanadoClient.tsx`): live valuation in ARS + USD (blue) at the per-category INMAG price, editable herd line-items (reuses the calculator's category model), and the **Δ-since-last-visit** badge color-coded green/red. Logged-out state is an invitation to sign in (free) with a fallback link to the public `/calculadora`; the page is `noindex` (personal/auth surface).
- Data lock-in by design: the herd composition is persisted server-side per user — a switching cost and a first-party dataset, not an email blast.

**Aha-moment flow + value history — "la libreta del campo"**

A second layer turns Mi Ganado from a flat form into a return loop with a payoff on every visit, around the single concept of the field ledger:

- **Reveal:** the herd value runs an animated count-up (`easeOutCubic`) on each visit, with an INMAG ticker and a pulsing live dot — the number *performs* the change instead of just printing it.
- **Welcome flow:** a first-time user (no herd yet) gets large category buttons and reaches the first valuation in a single tap — no empty form to fill.
- **30-day sparkline** derived from the real INMAG history (reuses `PriceSparkline`).
- **Value register:** a per-producer daily snapshot (new table `ganado_value_snapshots`, own RLS) builds the evolution curve of *his* herd over time — with one data point it shows explanatory copy, with two or more it draws the curve.
- **Weekly-alert opt-in:** new `alerts_opt_in` column on `user_ganado` (the Monday email send + the consignar/permission step are deferred to later phases).
- Additive migration `20260520_user_ganado_value_history.sql` (`CREATE TABLE` + `ADD COLUMN IF NOT EXISTS` + RLS), applied to production; security advisor clean.

**Navigation simplified — 8 → 6 items**

The top nav had grown overloaded. Trimmed to the core surfaces a producer actually needs, and surfaced the new tool:

- Removed: **DASHBOARD** (already reachable as "Mi Panel" in `AuthButton`), **MIS GUÍAS** (niche DT-e archive, reached from `/dte`), **PLANES** (lives in the footer).
- Added: **MI GANADO**, visible to everyone (not auth-gated in the nav) so anonymous users discover it and convert to a free account.
- Result: `INICIO · REMATES · CONSIGNATARIAS · FRIGORIFICOS · MERCADO · MI GANADO`.

**SEO — own "habilitados senasa", capture the INMAG featured snippet, lift CTR**

Grounded in the GSC pull; all on-page, all reversible:

- **`/frigorificos`** — title + H1 rewritten to exact-match the money query "listado de frigoríficos habilitados por senasa" (was pos ~6 with high impressions): H1 is now "Listado de Frigoríficos Habilitados por SENASA en Argentina".
- **`/mercado/inmag`** — added a `DefinedTerm` schema (entity-level definition, more precise than `Dataset` for "qué es el inmag") and moved a concise, self-contained definition lede high in the DOM, so the page can win the featured snippet (position 0) even while the organic listing sits at pos ~7.
- **`/mercado/arrendamiento`** — baked the live INMAG price into the title (CTR was ~0.9% at pos 8.7: page-1 impressions, almost no clicks), matching the self-answering pattern already used on `/mercado`.
- **Frigorífico province pages** — "Habilitados" + "SENASA" front-loaded in the title (e.g. "Frigoríficos Habilitados en Santa Fe · 124 Plantas SENASA/MAGYP") to lift CTR on province queries at pos 7-9.

**Tooling / hygiene**

- GSC + GA4 pull scripts run from the repo against the live OAuth token; the credential and token files under `scripts/archive/` are now covered by `.gitignore` (`scripts/**/oauth-*.json`, `client_secret_*`) so secrets can never be committed.

**Mi Ganado — progressive onboarding (wizard)**

The herd setup moved from "pick a category" (instant prefill) to a one-question-per-screen wizard, so a producer who has never used the page reaches a value with almost no friction:

- ¿Qué hacienda tenés? (category) → ¿Cuántas cabezas? (stepper + input) → ¿De qué peso aproximado? (input + ±kg chips, prefilled per category) → "Calculando…" → the value of *that* lot + "guardamos este valor en tu cuenta automáticamente".
- Each completed lot is appended and **auto-saved** (`saveGanado` + `markSeen` + snapshot) — the value shows instantly and persists. "Agregar otra categoría" loops the wizard; "Listo, ver mi hacienda" exits to the dashboard.
- The dashboard keeps **"+ Agregar (guiado)"** (reopens the wizard) and **"+ manual"** (direct per-row edit). Frontend-only; no schema change.
- The **sell flow** (partial lot → consignataria search/checklist → a request stored as a lead + emailed to the consignatarias.com.ar team) is deferred to a follow-up.

**Remates — province by event locality (georef) + new source (Entre Surcos)**

Fixes a real data-quality bug a power user surfaced: the `/remates/[provincia]` filter listed Buenos Aires auctions (Coronel Dorrego, Tres Lomas, Tornquist, Pehuajó…) under **"Corrientes"**, because province was derived from the feed/consignataria and `CITY_PROVINCE_MAP` only covered ~50 towns — every unmapped locality fell back to the wrong feed province.

- **`enrichProvinces()`** resolves province by the *event locality*, not the feed: `VENUE_FIX` → `CITY_PROVINCE_MAP` (curated, handles ambiguous names like Mercedes→Corrientes) → local cache → **georef API** (`apis.datos.gob.ar`) → feed fallback. Replaces the per-city `correctProvince`. Committed cache `scripts/data/locality-province.json` (124 localities pre-resolved) so CI doesn't hammer the API.
- **`VENUE_FIX` for La Rural:** CACG sends `building_name "PALERMO"` with `state_id=2` (Catamarca) → it was showing "PALERMO, CATAMARCA"; now "La Rural, Palermo / CAPITAL FEDERAL". Existing records corrected in `remates.json`.
- **New source — Entre Surcos y Corrales (source 9):** static-HTML cartelera with per-event province/locality/heads/time/logo. 94 remates parsed, 88 with consignataria resolved from the logo (manual `ENTRESURCOS_LOGO` map + heuristic). Dedups against CACG by `date + slug + locality`, filling head/time gaps. The data correction lands on the next scrape run.

**Remates — SSR of the listing (citability)**

`/remates` was serving only "Cargando remates…" to crawlers/bots: `RematesClient` used `useSearchParams()` (to read `?q=`), forcing a CSR bailout so the served HTML was the `<Suspense>` fallback — the calendar was invisible to search and LLMs.

- `?q=` is now read client-side from `window.location.search` in a `useEffect` (no `useSearchParams`), and the now-pointless `<Suspense>` wrapper + import are removed. The list renders SSR — verified: served HTML went from the fallback to **176 remates** with province/consignataria embedded. The page stays static (`revalidate = false`).

**What's next on the regresabilidad loop ("El Rodeo")**

Mi Ganado is move #1 of three. Still to ship: #2 an INMAG header that leads with the % delta vs ayer/7d/30d (color-coded, the dólar pattern), and #3 the watchlist (`FollowButton`) placed on the `/frigorificos/[slug]`, `/consignatarias/[slug]` and `/remates/[slug]` profiles where returning users actually live, with a "nuevo desde tu última visita" badge.

---

## [1.17.0] — 2026-05-19

### Productor reviews + home repositioning + top-20 persona seed

User-facing rollout of the consignatario-as-protagonist arc. **No Enterprise API contract changes.**

**Productor reviews on every consignataria profile**
- New table `public.consignataria_reviews` with check constraints (rating 1-5, body 30-2000 chars, status pending|approved|rejected) and unique `(slug, email)` so one reviewer = one review per consignataria; re-submits update the existing row.
- RLS policy: public reads only `status='approved'` rows. Writes go through service-role DAL — no anon insert path, avoids email-enumeration leaks via duplicate-key errors.
- Anti-abuse: `ip_hash` = SHA-256(ip + REVIEW_IP_PEPPER), never reversible; existing per-IP middleware rate-limit is the first guard.
- `POST /api/reviews/submit` — anonymous endpoint, logs every outcome (success / validation / server error) to `ops_events`.
- `<ReviewsPanel>` on every `/consignatarias/[slug]`: header with avg rating + count, list of approved reviews, inline form (name + email + role + provincia + 1-5 stars + comment). Empty state copy invites the first reviewer.
- `/admin/reviews` (RESEÑAS tab in admin nav): moderation queue with approve / reject buttons. Reject modal captures a reason for audit. All admin actions hit `POST /api/admin/reviews/[id]/{approve,reject}` behind `requireAdmin`.
- Email verification (magic link) deferred to a follow-up; admin moderation is the credibility filter for v1.

**Home repositioned around consignatarios**
- Hero rewritten: "Los consignatarios que mueven el mercado argentino" replaces the prior calendar-led headline.
- Primary CTA order: directorio completo → 🔴 en vivo → calendario.
- New regional grid between the stats strip and the conversion block: seven cattle-industry regions (Pampa Húmeda · Centro · Mesopotamia · NEA · NOA · Cuyo · Patagonia), each card listing the top 3 consignatarios for that region by upcoming-remate count then total. Region inferred from each consignataria's most-frequent province; falls back gracefully where `region_operativa` isn't populated yet.
- Price stats strip preserved as a secondary band — visible, no longer the protagonist.

**Top-20 persona seed (research session)**
- 20 consignatarias by remate volume filled with `referente_nombre`, `referente_cargo`, `especialidad`, `region_operativa`, `bio_referente`, plus `anos_oficio` where a primary source confirms it.
- Every entry carries `_source_urls` in `consignataria-persona-seed.json` as the editorial audit trail.
- 4 entries shipped without `referente_nombre` (sources don't attribute a single referente to the firm) — omission preferred over guess.
- Seed script extended to silently ignore underscore-prefixed metadata keys.

**Referente photos**
- 9 of 16 candidate referentes shipped with `foto_referente_url` (7 high-confidence + 2 low-confidence). All URLs verified `HTTP 200 + image/*` content-type at commit time.
- 7 candidates withheld where the photo could plausibly be a different family member, sibling, or unrelated person — wrong photo treated as the worse outcome than no photo.
- Hot-link strategy: photos point to the original publisher. Long-term: mirror to Supabase Storage with explicit per-consignataria permission.

**Coverage of the persona schema after this release**
- `referente_nombre`: 17 / 86 rows
- `bio_referente`: 20 / 86 rows
- `especialidad` + `region_operativa`: 21 / 86 rows each
- `anos_oficio`: 11 / 86 rows
- `foto_referente_url`: 9 / 86 rows

---

## [1.16.0] — 2026-05-19

### Consignatario protagonism (foundations) + SENASA verification + audit triplet

Three threads in one release: positioning shift toward the consignatario as the unit of value, three operational data-loop closures (GSC indexability triage, broken-link audit, SENASA cross-reference), and three reusable internal audits plus a daily-pipeline recovery. **No Enterprise API contract changes.** `/api/lots` begins returning real data on the first Tue/Wed/Fri after this release once the recovered pipeline first fires.

**Persona schema + profile page rewire (Sprint 1 + 2)**
- Migration `20260518_consignataria_persona_fields.sql`: 7 optional columns on `public.consignatarias` (`region_operativa`, `especialidad`, `anos_oficio`, `bio_referente`, `referente_nombre`, `referente_cargo`, `foto_referente_url`) + partial indexes on `especialidad` and `region_operativa` for the regional grid.
- `EnrichedProfile` extended; `getConsignatariaProfile` returns the new fields.
- Idempotent seed pipeline: `consignataria-persona-seed.json` + `scripts/seed-consignataria-persona.mjs` with strict `especialidad` vocabulary validation.
- `QUIÉN OPERA` panel on every profile: rich card when populated (photo + referente + especialidad / región / años + bio); discreet "Reclamar perfil →" prompt otherwise.
- `HISTORIAL VERIFICABLE` panel: 4-column grid (remates 90d + monthly rate · próximos confirmados · tipo dominante · plazas) + top-5 cities chip row. Computed client-side from existing auctions data; works for every consignataria today.

**MAG lots pipeline recovery**
- Root cause for empty `mag_consignataria_sales_lots`: the upstream `mag-lots-discover` workflow was manual-only and had never run, so the master table `mag_consignatarias` was empty → every `enqueue` returned 0 jobs → every `process` silently exited on iteration 1.
- Fix: triggered discover (max=200) → 64 active consignatarias upserted. Then wired discover as the first step of `mag-lots-pipeline.yml` so the master refreshes idempotently every scheduled run. Verified end-to-end: queue went from 0 → 128 pending in a single dispatch.

**SENASA habilitados verification**
- `scripts/scrape-senasa-habilitados.mjs` hits the public JSF registry at `aps2.senasa.gov.ar`, captures the JSF ViewState + JSESSIONID, POSTs `Exportar TODO` for each Ciclo (I matarife/frigorífico · II elaborador · III dador de frío), parses the XLS, normalizes CUIT to 11 digits, writes `senasa-habilitados.json` (~600 KB, ~860 distinct CUITs).
- `HABILITACION SENASA` panel on every `/frigorificos/[cuit]`: `VIGENTE` badge + snapshot date for free users; PRO Usuario sees the full registry detail (propietario, partido, localidad, Nº oficial, ciclos habilitados, full Actividades autorizadas list). `NO ENCONTRADA` rows carry a careful disclaimer.
- `scripts/merge-senasa-into-frigorificos.mjs`: stamps `senasaActive` + `senasaLastSeen` on every existing row, appends 728 SENASA-only CUITs absent from our static list. Directory grew from 364 → 1092 rows (860 SENASA-verified active + 232 unverified).
- `/frigorificos` banner: live counts ("860 habilitados activos · 232 sin verificación") + snapshot date. Each row renders a dim "sin SENASA" chip when `senasaActive === false`.
- Monthly cron `scrape-senasa-habilitados.yml` (1st of each month, 04:23 ART) regenerates the snapshot; commit message includes resulting counts.
- `/planes` aligned: new PRO Usuario bullet "Verificación SENASA del frigorífico (propietario, actividades, ciclos)".

**Audit triplet (3 reusable internal scripts)**
- `scripts/audit-data-integrity.mjs` — scraper drift + data sanity (no DB). Catches canonical-slug duplicates, unresolvable slugs, duplicate frigorifico CUITs, orphaned youtube-channel keys, market-prices staleness, zombie consignatarias. Exits non-zero on P0.
- `scripts/audit-api-health.mjs` — Supabase rollup of `ops_events` + `api_keys`: per-route P50/P95/P99 latency last 7d vs prior 7d (flags ≥2× regressions), error rates (≥5% triggers alert), zombie routes, top consumers vs plan quota.
- `scripts/audit-link-graph.mjs` — crawls the sitemap, builds the directed graph from `<main>` content (skips nav/footer), 25 iterations of PageRank, flags orphans / weak nodes / broken targets / anchor-text monocultures / outbound spam.
- `scripts/audit-content-quality.mjs` — full sitemap crawl, per-route boilerplate detection via 3-gram shingles, near-duplicate clustering via 5-shingle Jaccard ≥ 0.85. Used to triage the GSC "Discovered/Crawled, not indexed" bucket.

**6 link-graph fixes (audit findings)**
- New `consignatariaProfilePath()` helper resolves variant slugs to canonical and handles null gracefully. Applied across 6 calendar pages + remate detail + province/type aggregator. Eliminated 53 variant-slug links to `bressan-y-cia-srl`, 21 to `ivan-l-ofarrell-srl`, and 11 to `/consignatarias/null`.
- 18 external `href` occurrences rewrapped in `normalizeUrl()` so raw `www.x.com` strings no longer render as relative paths (80 inbound broken refs across 12 hosts → 0).
- `/precios` commercial-orphan fix: footer link + content-area teaser in `/mercado`.
- `/frigorificos/verificar` (noindex claim form) marked `rel="nofollow"` on the 3 CTA call-sites → Google stops wasting crawl budget on 363 inbound links.
- 9 duplicate auctions in `remates.json` collapsed: variant slug mappings added to `SLUG_DEDUP_MAP` in the scraper + one-shot cleanup of existing dupes (356 → 347 rows).
- Net: total broken targets 363 → 128 (−65%).

**Archived-remate 301 redirects**
- `scripts/audit-404-candidates.mjs` audit found 703 historical remate slugs that shipped at some point but have since been archived. With `dynamicParams = false` on `/remates/[slug]`, all of those 404 today.
- Middleware extended to intercept `/remates/<slug-YYYY-MM-DD>` when the slug matches the detail shape but isn't in the current set; parses the consignataria portion, resolves to canonical, 301s to `/consignatarias/<canonical>`. Sibling routes (`/en-vivo`, `/hoy`, `/ciudad/*`, `/mes/*`, `/tipo/*`) pass through unchanged.

**YouTube channel coverage (53% → 85% upcoming-stream matches)**
- `youtube-channels.json` rewritten to use canonical slugs (previous file mixed long descriptive keys that silently failed canonical matching).
- 5 channels added: `pedro-noel-irey`, `jauregui-lorda`, `hasenkamp`, `mondino`, `monasterio-tattersall`.
- `ivan-l-ofarrell-srl` and `ivan-l-o-farrell-s-r-l` added as aliases of canonical `ofarrell`.
- `scripts/check-missing-channels.mjs` audit script.

**Cron schedule corrections**
- `mag-detailed-prices`: `30 18 * * 1-5` → `37 22 * * 1-5` (15:30 → 19:37 ART). Captures same-day MAG closing data; non-round minute avoids GitHub Actions schedule-throttling.
- `mag-lots-pipeline`: `0 19 * * 2,3,5` → `42 22 * * 2,3,5` (16:00 → 19:42 ART, 5 min offset from mag-detailed-prices).

**Misc**
- Sitemap count corrected in `CLAUDE.md` (1554 → 1062). Shrink is by design — scraper archives old remates.
- `xlsx@^0.18.5` added as devDependency (SENASA scraper).

---

## [1.15.0] — 2026-05-17

### SEO sprint — title fix + foundations + structured data + programmatic OG

A full audit + 8-commit sprint focused on the biggest SERP/CTR levers and on
closing gaps the prior sessions had not noticed.

- **Title bug fixed across 45 files.** The root layout already appends
  `| Consignatarias.com.ar` via `title.template`, but most pages also included
  the brand suffix manually — so production was emitting it twice. The fix
  strips the manual suffix from 63 title fields and lets the template do its
  job once.
- **Live transmissions now actually populate.** `/remates/en-vivo` had always
  shown zero because the scraper only attaches a YouTube URL after the
  auction airs. A new `youtube-live` helper resolves any upcoming auction to
  the right channel `/streams` URL via canonical-slug matching against
  `youtube-channels.json` — ~80 upcoming auctions surface as probable streams,
  separately badged from the confirmed ones.
- **llms.txt** for AI crawlers (`robots.ts` already opted them in; this gives
  them structured context to cite from).
- **Footer site map** with 16 internal hub links — distributes PageRank from
  every page view to long-tail destinations.
- **Hub `/precios`** consolidating the six livestock categories into one
  navigable index with FAQ and breadcrumb schema.
- **Programmatic OG** for every individual remate (date hero, consignataria,
  type pill, estimated heads), plus a root-level OG image that any route can
  inherit by default. Fixes the empty `og:image` that several core pages
  were emitting.
- **Schema depth** improved: `BreadcrumbSchema` on `/remates/[slug]` now goes
  four levels deep instead of two; `SpeakableSchema` added to FAQ and
  Glosario for voice search.
- **H1 hygiene**: `/mercado` had none, `/consignatarias` had two. Both fixed.
- **Sitemap completeness**: `/remates/en-vivo` and `/precios` added.
- **Internal documentation**: full audit + roadmap at
  `docs/SEO-AUDIT-2026-05-17.md`. Internal-only PDF report produced via
  `scripts/seo-report/` (gitignored).

---

## [1.14.8] — 2026-05-15

### Repository hygiene — Batch 3 of consistency audit

- Removed orphaned components after verifying zero references across the codebase.
- Reconciled `reports.json` with the files actually shipped; one download surface, not four.

---

## [1.14.7] — 2026-05-15

### Repository hygiene — Batch 2 of consistency audit

- Archived stale pre-pivot documentation, one-shot bootstrap scripts, and cost-disabled workflows under dedicated `archive/` and `disabled/` paths.
- Fixed a 404 on a static asset that lived at the repo root instead of `public/`.

---

## [1.14.6] — 2026-05-14

### Repository hygiene — Batch 1 of consistency audit

- Rewrote `CLAUDE.md` as a one-screen briefing aligned with the current product state.
- Bumped `package.json` to match the shipped version.
- Merged a divergent migrations folder into the canonical Supabase location.
- Flagged superseded strategy docs and updated cross-references.

---

## [1.14.5] — 2026-05-14

### Observability — instrumentation reliability fix

- API request events now persist reliably across serverless function teardown.
- `/admin/ops` surfaces real data going forward on every authenticated request.

---

## [1.14.4] — 2026-05-13

### Security hardening — high-priority items

- Closed multiple high-severity items from the platform's integral security audit. No customer data was at risk.

---

## [1.14.3] — 2026-05-13

### Security hardening — critical items

- Closed all critical items from the platform's integral security audit. No customer data was at risk.

---

## [1.14.2] — 2026-05-13

### Email sender configuration

- Standardized the outbound sender domain across the codebase.

---

## [1.14.1] — 2026-05-13

### Outreach refinement

- Rebuilt outreach templates and added per-recipient rate-limiting.

---

## [1.14.0] — 2026-05-13

### Observability foundation

- New `ops_events` + `cron_runs` tables, plus a server-rendered `/admin/ops` dashboard for cron health, API activity, and recent errors.
- Request-level instrumentation on the public API endpoints with `X-Request-Id` response headers.

---

## [1.13.3] — 2026-05-13

### Performance — eliminated unnecessary SSR invocations

- Slug variants now redirect to canonical pages at the edge.
- Past-auction URLs return 404 at the edge without invoking server functions.

---

## [1.13.2] — 2026-05-13

### Public API behind authentication

- All public API endpoints now require an authenticated key.
- Conservative compute resource floors per route family.

---

## [1.13.1] — 2026-05-13

### Routing fix

- Resolved a Next.js dynamic-segment naming conflict that was preventing profile pages from rendering in production.

---

## [1.13.0] — 2026-05-13

### Billing-aligned quotas + self-serve upgrades + dev invite system + bugfixes

Multiple cycles of correctness work on the Enterprise stack. Quotas now align with Rebill billing periods (28-day cliff, not calendar month), aggregate per-user across all keys (closes a real revenue-leak bug), expose a self-serve Starter→Growth upgrade flow, and a pre-invite mechanism lets us elevate beta dev users on signup.

#### Quota system rework

- New `getUserCurrentPeriodUsage(userId)` aggregates `request_count` across ALL of a user's active keys within the current 28-day window anchored to `api_tier_activated_at`. Replaces per-key calendar-month counters. Closes a real bug: a user with 5 keys had 5×50K capacity, not 50K.
- `currentPeriod(activatedAt)` computes the active period deterministically without needing Rebill renewal webhooks: `[anchor + N×28d, anchor + (N+1)×28d)`.
- `authenticate()` uses the user-level count; 429 quota_exceeded response now includes `period_start`, `period_end`, `days_until_reset`, and `upgrade_url`.
- Response headers extended: `X-RateLimit-Period-End`, `X-RateLimit-Days-Until-Reset`.
- `/api/account` exposes period info instead of calendar-month resets_on. Includes `upgrade_url` when usage ≥ 80%.
- Cron `/api/cron/quota-alerts` switched to per-USER iteration (one alert per user per period, not per key). Dedup key is the period start ISO date.

#### Self-serve upgrade flow

- `createEnterpriseGrowthLink()` in `lib/rebill.ts` — generic factory for Enterprise plan payment links. Default Growth = ARS 700.000 (~USD 500 al blue), override via `REBILL_ENTERPRISE_GROWTH_AMOUNT`.
- New endpoint `POST /api/enterprise/upgrade?target=growth` — session-gated, returns Rebill checkout URL for Starter→Growth upgrade. Scale stays sales-led (mailto).
- New `UpgradeNudge` component on `/cuenta/api-keys`, visible when usage ≥ 80%. Shimmering gradient CTA (matches Enterprise tier card upgrade buttons), urgency indicator (medio/alto/crítico), days remaining. Self-serve checkout button for Growth; mailto for Scale.
- `EnterpriseTierCTA` component on `/enterprise` renders 5 states per tier: loading, current plan (glowy + pulse animation + "Tu plan actual · Dashboard"), upgrade target (shimmer + "Upgradearme a {Tier}"), downgrade (muted "Plan menor — ya tenés X"), default (existing CTA). One detection per page load, all three tier cards aware.

#### Dev invite system

- New `pending_api_invites` table — pre-approves `api_tier` by email before signup.
- Trigger `zz_redeem_api_invite_on_signup` fires AFTER `handle_new_user_subscription` on `auth.users` insert. Looks up unredeemed invite by email, applies `api_tier`, marks invite redeemed.
- Pre-loaded an external developer for first Starter validation.

#### Bug fixes + ops cleanups

- **Project clone bypass.** The local repo was linked to the wrong Vercel project (`consignatarias` clone) when env vars were initially set. Production serves from `consignatarias-next`. Re-linked + added `API_KEY_PEPPER` to the correct project. Clone is being archived (git disconnected) since it was duplicating builds.
- **`increment_api_usage` RPC** was missing from remote DB despite the original migration declaring it (cause unclear — possibly an MCP apply_migration race condition that dropped the function definition). Re-applied via `api_keys_increment_rpc_fix` migration.
- **Quota math inflation.** `authenticate()` was double-counting today's RPC return value plus the monthly aggregate. Fixed to `usedAfter = used + 1`.
- **Middleware Bearer detection.** Rate-limit middleware was looking for `sk_live_` prefix in `api_key`/`x-api-key` headers, but our Enterprise keys are `cnsg_live_` in the `Authorization: Bearer` header. Result: Enterprise calls were being throttled as anonymous (1 req/min) instead of getting their per-plan quota. Now: if `Authorization: Bearer cnsg_*` is present, middleware bypasses IP rate-limit and the route handler's `authenticate()` takes over with real quota enforcement.
- **Rate-limit message** updated from stale "Actualiza a PRO para 100 req/min" to reflect actual Enterprise tier matrix.
- **API keys client** now surfaces real server errors (HTTP code + body preview) instead of swallowing them as "Error de red".
- **Confidential testimonial removed** from `/enterprise` page (had used anonymized content from a private email, even with anonymization that was inappropriate).
- **Upgrade nudge button** Growth→Scale switched from mailto (didn't always open mail client) to deep-link `/enterprise?upgrade=scale&from=growth#calculadora`.

#### Sitemap additions

- `/el-corredor`, `/el-oraculo` (public landings, monthly priority)
- `/mercado/inmag-dolares` (priority 0.95, daily — the new INMAG-in-USD landing was missing from sitemap)
- `/mercado/arrendamiento`
- `/terminos`, `/privacidad` (priority 0.2, yearly)

#### Schema additions

- `pending_api_invites` (email PK, api_tier, note, redeemed_at, redeemed_user_id)
- `api_tier_activated_at` already existed, now used as the period anchor
- New RPC `redeem_api_invite_on_signup()` + trigger `zz_redeem_api_invite` on auth.users INSERT

#### Known issues — `/consignatarias/[slug]` profile pages hang (still open)

Profile slug pages (`/consignatarias/bressan-y-cia` etc.) hang 25+ seconds in production with no response. Province slugs (`/consignatarias/buenos-aires`), directory page, and all other routes work fine. **Discovered + partially mitigated this release; root cause not fully identified.**

What we tried:
- Merged `[provincia]` + `[slug]` sibling dynamic routes into a single `[slug]` (Next.js doesn't support two dynamic param names at the same path level, evidence in routes-manifest.json showing identical regex). Move correct architecturally but did NOT solve the hang.
- Aligned generateStaticParams across sibling files (page.tsx, opengraph-image.tsx, twitter-image.tsx, verificar/page.tsx) via shared `mergedSlugStaticParams` helper. Next was silently deduping mismatched lists.
- Added `dynamicParams = true` for safety fallback.
- Wrapped every Supabase fetch in the page handler with `Promise.race` timeout (3.5–4.5s each).
- Static-profile fallback when `getConsignatariaProfile` returns null so notFound() can't drop slugs from manifest.

What we did NOT identify yet:
- Why the build only materializes 13 prerendered HTML files for `/consignatarias/[slug]` despite generateStaticParams returning 93 entries (13 provinces + 80 profiles). Province slugs are the 13 that make it through.
- Why the function hangs at request time even after timeouts on every Supabase call. Possible: Supabase client connection deadlock, function maxDuration not enforcing, or Next.js render-pipeline issue with the page's heavy component tree (ConsignatariaProfileClient + MediosPagoSection + VideoGallery client components).

Production impact: 80 consignataria profile URLs return no response. SEO at risk if Google retries multiple times and marks pages dead. **High priority for next session.**

Next debug steps:
1. Reproduce locally with `next start` (production build, not dev) and curl against localhost. If it hangs locally → bug is in our code. If it works locally but breaks on Vercel → infra/edge issue.
2. Strip the page to bare minimum (just `getProfile + display name`) and verify it serves fast. Then re-add features one by one to isolate.
3. If supabase is the culprit, inspect the actual network call (Supabase logs, Vercel function logs with NODE_INSPECTOR).

---

## [1.12.0] — 2026-05-12

### Lote-level transactional pipeline + Self-serve Enterprise Starter via Rebill

Two features that together close the loop on Enterprise: (1) we now ingest the deepest publicly-available MAG data (per-pesada lote-level transactions across 44 consignatarias × FAENA/INVERNADA), and (2) a brand-new user can self-serve their way to an active Enterprise plan in under 5 minutes — no email back-and-forth.

#### Lote-level scraper pipeline (haciinfo000007)

Each pesada × remitente × categoría within a consignataria's day at MAG. ~88 jobs per remate day (44 consignatarias × 2 tipos), processed at MAG's agreed 1-req/min rate from the GH Actions runner. ~90 minutes per day, idempotent.

- **Schema** (applied to remote):
  - `mag_consignatarias` — master list (mag_id PK, name, slug, active, first/last_seen)
  - `mag_consignataria_sales_lots` — granular rows (pesada, remitente, localidad, provincia, head_count, category, total_kgs, kg_avg, price). Unique key `(date, consig, tipo, pesada, remitente, category)` for idempotent re-runs.
  - `mag_scrape_queue` — job queue with `(date, consig_id, tipo)` unique, status `pending|running|done|failed`, attempts counter, last_error

- **Worker route** `/api/cron/mag-lots-worker` with three actions:
  - `?action=discover&start=N&count=M` — scans an ID window (≤30 at a time to stay under Vercel's maxDuration), extracts name from "CONSIGNATARIO: ID NAME" header, upserts master.
  - `?action=enqueue&date=YYYY-MM-DD` — creates pending jobs for the date × all active consignatarias × {FAENA, INVERNADA}.
  - `?action=process` — pulls ONE pending job, fetches haciinfo000007 with the right params, parses the row table (skipping headers + totals), batch-upserts into `mag_consignataria_sales_lots`, marks the job done.

- **Orchestration via GH Actions** (the runner does the 1-req/min throttling):
  - `mag-lots-discover.yml` — workflow_dispatch, loops 20-ID windows with 5s sleep. ~3 min for IDs 1-200.
  - `mag-lots-pipeline.yml` — Mar/Mié/Vie 16:00 ART, calls enqueue then loops process with 65s sleep until queue empty. Hard cap 200 iterations safety.

- **Public API** `GET /api/lots` — date/range/consignataria/category/tipo/provincia filters, pagination up to 1000 rows/page, max 90-day window. Returns aggregates over the page (cabezas, kgs, weighted avg price). Enterprise-tracked when called with Bearer key.

#### Self-serve Enterprise Starter via Rebill

Cierra el gap de autonomía. Cualquier logged-in user clickea "Contratar Starter ahora" en `/enterprise` → Rebill checkout en ARS (default 139.900, equivalente USD 99 al blue) → webhook flips `api_tier='starter'` automáticamente → welcome email branded → user va a `/cuenta/api-keys` y empieza a operar. Cero intervención humana.

- **`createEnterpriseStarterLink()`** en `lib/rebill.ts` — sigue el patrón de `createUserSubscriptionLink`, metadata.kind=`enterprise_starter_subscription` + api_tier para que el webhook lo rutee correctamente.
- **Webhook handler extendido** (`/api/webhooks/rebill`): branch nueva detecta `kind === 'enterprise_starter_subscription'`, upsertea `api_tier` + `rebill_enterprise_subscription_id`, dispara welcome email. **Preserva el tier de PRO Usuario** si ya existía — un user puede tener PRO Usuario + Enterprise simultáneamente. Branches de cancellation/failure también separadas: cancelar Enterprise solo toca api_tier, no rompe PRO Usuario coexistente.
- **Schema** (applied to remote):
  - `user_subscriptions.rebill_enterprise_subscription_id TEXT` — separado del `rebill_subscription_id` (PRO Usuario), porque un user puede tener ambos
  - `user_subscriptions.api_tier_activated_at / api_tier_cancelled_at` — auditoría
- **POST `/api/enterprise/checkout`** — session-gated, devuelve Rebill payment URL. 401 si no logged-in. 502 si Rebill no responde URL.
- **`EnterpriseStarterButton` component** — auth-aware: anon → "Iniciar sesión para contratar", logged-in sin Enterprise → "Contratar Starter ahora", logged-in con Enterprise → "Ya sos Enterprise · Ir al dashboard". Reads `/api/me` y `/api/account` para discriminar.
- **`/enterprise` page Starter card** — reemplaza mailto por el self-serve button. Growth (USD 500) y Scale (USD 700+) **siguen sales-led** vía mailto, porque cada contrato grande requiere NDA + plan custom.
- **`sendEnterpriseWelcome(to, plan)`** en `lib/email.ts` — HTML brandeado con 3 next-steps: generar key en `/cuenta/api-keys`, guardar en `.env`, primer curl con Bearer. Link directo a docs.

#### Env vars

Opcional override del precio: `REBILL_ENTERPRISE_STARTER_AMOUNT` (default 139900 ARS). Rebill secret key + webhook secret ya estaban configurados desde el flujo PRO Usuario.

#### Pricing alignment

ARS 139.900 ≈ USD 99 al blue $1.413 (mediados may 2026). Si el blue se mueve mucho, ajustás la env. Para Growth y Scale, los pagos cross-border siguen vía transferencia/USDT/Stripe (sales-led, cero cambio en el flow).

**Impact:** la primera línea Enterprise (Starter USD 99) es ahora completamente self-serve. Desde que un desarrollador entra al sitio hasta que tiene su primera API key generada y un curl funcionando, son 4-5 clicks y 3-5 minutos. Antes era 24-48h de email + setup manual. Acompañado por el pipeline lote-level que arranca a llenar la tabla con la data más granular publicada por MAG, este release nos pone al frente del mercado en transparencia + speed-to-value.

---

## [1.11.0] — 2026-05-12

### Sprint 1+2+3: USD-deflactado, year-over-year, heatmap, calculator, MEMOLA Index

Three sprints in one push. The thesis: MAG publishes the day, we publish the series and the derivatives. This release turns 11 years of raw INMAG into visual + decision tools that MAG itself never builds.

#### Sprint 1 — Marketing pieces (public, SEO bait)

- `/mercado/inmag-dolares` — full-screen landing showing INMAG deflactado por dólar blue. Server-rendered SVG line chart (last 5 years + full history since 2015), big-number panel (hoy, promedio 10y, mínimo, máximo). Title interpolates today's USD value: *"Precio Kilo Vivo Novillo en Dólares Hoy: USD 3.03 | INMAG Histórico"*. FAQ verbatim long-tail: `cuanto vale el novillo en dolares`, `precio kilo vivo en dolares`, `carne en dolares argentina`. SSG with daily revalidate.
- `YearOverYearBlock` — embedded on `/mercado`, overlays last 6 years on the same Jan-Dec axis. Reveals seasonal patterns the daily INMAG hides.
- New table `usd_blue_history` (5.608 días desde 2011, source argentinadatos.com) backfilled via `/api/cron/backfill-usd` (workflow_dispatch `backfill-usd.yml`).
- `/api/cron/scrape-mag-detailed` extended to also fetch today's USD blue from dolarapi → keeps `usd_blue_history` current going forward.

#### Sprint 2 — PRO Usuario decision tools (gated)

- `SeasonalityHeatmap` on `/mercado` — mes × año grid colored by z-score per year (azul = sobre promedio anual, rosa = bajo). Strips inflation noise, reveals the real cycle. PRO-gated via client-side `ProOverlay` (reads `/api/me` to show/hide blur+CTA). Data is still in HTML for SEO.
- `/mercado/vender-ahora` — full calculator page. Server-redirect to `/upgrade` if non-PRO. Client form with 6 categorías + peso vivo input → `/api/vender-ahora` returns: valor cabeza ARS, valor cabeza USD blue, percentil últimos 30 días, percentil último año, mín/máx/promedio 5 años, statistically-reasoned recommendation in plain Spanish.
- The recommendation engine isn't ML — it's rule-based on the joint distribution of `pct30` and `pct365`. Honest tool: "percentil 80+ últimos 30 días con 60+ anual = momento de salida". Disclaimer obligatorio.

#### Sprint 3 — Enterprise differentiation (API)

- `GET /api/index/memola` — composite ponderado por kgs operados sobre las 16 sub-categorías MAG. Fórmula: `Σ(price_avg_i × total_kgs_i) / Σ(total_kgs_i)`. Pondera por mix real de faena, no novillos solos como el INMAG oficial. Params `?days=N` o `?from=&to=`. Devuelve serie + stats (latest/min/max/avg). Hoy responde vacío hasta que `mag_prices_detailed` acumule data (cron Mar/Mié/Vie comenzando esta semana).
- Honors Enterprise auth + quota tracking when called with `Authorization: Bearer`.

#### Infra: chart rendering

- `src/lib/charts/svg.ts` — server-rendered SVG primitives: `lineChartSvg`, `sparklineSvg`, `heatmapSvg`. Zero client JS. Inline content indexable por Google. Estética terminal (zinc-500/sky-400, monospaced labels).
- `src/lib/charts/data.ts` — data helpers (`fetchInmagSeries`, `fetchUsdSeries`, `fetchInmagUsdJoined` con forward-fill, `aggregateMonthly`, `withYearZScores`, `percentileOf`). Usa anon client (RLS public-read), funciona en SSG sin service key.

#### Schema additions

- `usd_blue_history` (date PK, compra, venta, source_url) — public read RLS

#### Migration / data ops applied to remote

- Migration `usd_blue_history` applied via MCP
- Backfill workflow `backfill-usd.yml` ready (workflow_dispatch) — disparalo una vez desde GH Actions UI para sembrar 5.608 días

#### New routes summary

| URL | Tipo | Acceso |
|---|---|---|
| `/mercado/inmag-dolares` | SSG | Público (SEO) |
| `/mercado/vender-ahora` | Dynamic | PRO Usuario only (redirect) |
| `/api/vender-ahora` | API | PRO Usuario (session) |
| `/api/index/memola` | API | Public + Enterprise tracked |
| `/api/cron/backfill-usd` | Cron | CRON_SECRET |

**Impact:** the platform now ships derivatives, not just the wrapper. INMAG en dólares es bait orgánico para Google. Heatmap + calculator son las dos features que justifican PRO Usuario $7.900 (antes el pitch era "medios de pago + descargas", débil). MEMOLA Index es la primera marca propia del data product Enterprise.

---

## [1.10.1] — 2026-05-12

### MAG Data Deepening — 16 sub-categories + 11 years of INMAG history

The headline INMAG number our existing scraper has been pulling is the tip of what MAG Cañuelas actually publishes. This release ingests the full detail: 16 official sub-categories with weight thresholds (Esp.Joven +430, Regular h430, Conserva Buena/Inferior, MEJ, etc.) and the complete daily INMAG series going back to 2015.

#### New persistent tables (RLS public-read, service-role write)

- `mag_inmag_history` — daily INMAG index series. **2.236 days backfilled** (2015-01-02 → 2026-05-12), **1.690 days with calculated INMAG** (the rest are days where novillo count <300, marked `inmag_calculated=false` per MAG methodology). Average INMAG by year: $18 (2015) → $642 (2023, hyperinflation) → $4.324 (2026 YTD).
- `mag_prices_detailed` — primary key `(date, subcategory)`. Carries `category_group`, `weight_threshold`, `price_{min,max,avg,median}`, `head_count`, `total_amount`, `total_kgs`, `kg_avg` per sub-category per day.

#### Scraping pipeline (additive, not replacing the existing daily scraper)

- `/api/cron/scrape-mag-detailed` — fetches both `haciinfo000502` (16 sub-cat) and `haciinfo000011` (headline INMAG) for today's date, upserts both tables in one invocation. Closes the gap where the JSON-driven scraper kept `market-prices.json` current but never wrote to DB.
- `/api/cron/backfill-inmag` — one-shot endpoint with `from`/`to`/`months` params. Fetches MAG in 6-month windows, throttles 2.5s between windows, upserts. `maxDuration=300s` covers ~12 years.
- GH Actions: `mag-detailed-prices.yml` runs Lun-Vie 15:30 ART (after MAG closes ~14:30 ART). No-op on non-trading days. `backfill-inmag.yml` is `workflow_dispatch`-only — manually triggered when expanding history range.

#### API surfaces

- `GET /api/precios?detallado=true` — returns the 16 sub-categories of the latest scraped date with full breakdown + source attribution to MAG haciinfo000502.
- `GET /api/precios?historico=N` — returns N days of INMAG history (7–3650) + aggregate stats (min/max/avg/count). Source: MAG haciinfo000011.
- Both endpoints honor the existing Enterprise auth + quota tracking when an `Authorization: Bearer` header is present.

#### /api-docs page rewrite

- Authentication section: removed stale `x-api-key` header doc, replaced with `Authorization: Bearer cnsg_live_...` matching the actual Enterprise key format. Links updated to `/cuenta/api-keys` for self-serve.
- Rate limits table replaced: was generic "100 req/min público / 1000 PRO" → now shows actual 4-tier matrix (Público / Starter 30/min / Growth 300/min / Scale 5000/min) with SLA per tier.
- New sections: "Precios detallados (16 sub-categorías)" and "Histórico INMAG (desde 2015)" with literal `curl` examples and sample JSON responses.

#### /enterprise page

- Coverage strip swaps `Fuentes scrapeadas: 8` and `Histórico INMAG: 2022→hoy` for `Sub-categorías MAG: 16` and `Histórico INMAG: 2015→hoy` — more honest about what's actually queryable.
- Starter tier feature list now leads with "INMAG diario + serie histórica completa (desde 2015)" and "16 sub-categorías oficiales MAG con corte por peso".
- Growth tier adds "Lote-level transactional data (próximamente)" — flags the next ingestion target (haciinfo000007).

#### Cron audit map

Six active workflows, no overlap with the new MAG layer:

| ART | Workflow | Scope |
|---|---|---|
| 10:00 Lun | `weekly-newsletter`, `quota-alerts` | Email, alerts |
| 11-19 hourly | `post-remate-outreach` | Auto-email post-remate |
| 14:00 daily | `scrape-auctions` | 8 fuentes → JSON → SSG rebuild |
| 15:30 Lun-Vie | `mag-detailed-prices` (new) | DB persistence MAG |
| 14:00 1º del mes | `el-corredor-publish` | PDF mensual |

The old `scrape-auctions.yml` keeps writing `market-prices.json` (which drives SSG pages like `/mercado`, `/precios/*`). The new `mag-detailed-prices.yml` writes to DB only (which drives the API endpoints). Two distinct write paths, zero duplication.

**Impact:** the API can now answer questions our old "6 generic ratios" couldn't: *"¿Cuánto vale el novillo Esp.Joven +430 hoy vs hace un año?"*, *"¿Qué peso promedio se está faenando este mes?"*, *"Dame el INMAG mes a mes desde 2018"*. Real differentiator vs any competitor that just republishes the headline number.

---

## [1.10.0] — 2026-05-12

### Three-Product Pricing + Enterprise API + SEO Pivot to Answer-First Snippets

Major release. Three concurrent shifts: (1) disambiguates the two consumer PRO tiers and adds a third Enterprise API product line, (2) rebuilds `/planes` with an audience toggle so productores and consignatarias see only their own pitch, (3) attacks the #1-rank-but-0-CTR SEO problem by making page titles and meta descriptions answer the user's query in the SERP itself — with seven new daily-rebuilt landing pages anchored on live INMAG prices.

#### New product: Enterprise API

Three tiers, billed in USD, gated by a new `user_subscriptions.api_tier` column (independent from `tier` so a user can be both PRO Usuario and Enterprise):

- **Starter** — USD 99/mes — 1.000 req/mes, 1 webhook, full endpoints, SLA 99.5%
- **Growth** — USD 500/mes — 50.000 req/mes, webhooks ilimitados, exports CSV/JSON, reportes semanales PDF+JSON, dashboards, analyst access, SLA 99.8%
- **Scale** — USD 700–7.500/mes via volume slider — 100K → 5M req/mes, multi-seat, ERP/BI integration, white-label opcional, CSM desde 500K req/mes, SLA 99.9%

Pricing anchored on real infra cost (~USD 50/mes at 1M req/mes, mostly Vercel Pro + Supabase Pro), not on speculative competitive value. Calculator at `/enterprise` interpolates price from anchor points with decreasing $/1K req as volume grows.

#### Authentication infrastructure for the API

- `api_keys` table — HMAC-SHA256 hash with server pepper, prefix-only display (`cnsg_live_a1b2…`), per-key environment (`live`/`test`), optional IP whitelist
- `api_usage_daily` table — atomic increment via `increment_api_usage` RPC, monthly quota enforced in `authenticate()` middleware
- `/cuenta/api-keys` dashboard — generate (one-time secret modal with copy + Escape close + focus management + `role="dialog"`), list with usage per key, revoke. Gated to `api_tier !== 'none'`
- `/api/internal/keys` — POST/GET/DELETE, session-authed, max 5 active keys per user
- `/api/precios` — opt-in auth: header present → must be valid + quota OK + tracked; no header → public legacy access. Sets `X-RateLimit-{Plan,Limit,Remaining}` headers
- Weekly cron `/api/cron/quota-alerts` (Mondays 10:00 ART) — sends 80% threshold email once per month per key, tracked via `api_keys.quota_alert_month`. Branded HTML in `sendQuotaAlert()`

#### Audience toggle on `/planes`

Single source of truth replaces the previous consignataria-only pitch. Toggle state lives in URL (`?audience=productor|consignataria`) so links from across the site can deep-link the right audience and `MobileStickyCTA` can read the same state.

- **Productor view (default)** — Free + PRO Usuario ARS $7.900/mes + Enterprise card. CTA → `/upgrade` (Rebill). Pitch focused on observatorio access.
- **Consignataria view** — Free directorio + PRO Consignataria ARS $45.000/mes + Enterprise card. Existing flow with `pln_f644261ffe68462497eeb78d4363f377`. Newsletter preview + "Why PRO" benefits only shown in this view.
- `MobileStickyCTA` is audience-aware — productor (sky #38bdf8, $7.900, `/api/subscribe/checkout`) vs consignataria (amber #fbbf24, $45.000, `/api/subscribe`). Hides automatically if the user already has the corresponding tier.

#### SEO: answer-first titles + 7 new landing pages

Audit found multiple high-volume queries ranking #1 with **0 CTR** because titles/descriptions didn't carry the answer. Examples: `kilo de novillo`, `precio kilo vivo novillo`, `cuanto esta el kilo vivo de novillo`, `hacienda en pie`, `carnes pampeanas cuit`.

- `/mercado` title and description now interpolate live INMAG + category prices at build time: `Precio Kilo Vivo Novillo Hoy: $4.428 (INMAG 2026-05-10) | Consignatarias.com.ar`. FAQ uses verbatim Google Search Console query strings.
- `/overview` title carries INMAG + change percentage
- `/frigorificos/[cuit]` title and description lead with CUIT and SENASA matrícula so brand+CUIT queries become self-answering snippets
- **New** `/precios/[categoria]` — six daily-rebuilt SSG pages (novillos, novillitos, vaquillonas, vacas, toros, terneros) with Product schema (`Offer.price` in ARS), Article schema (`datePublished`/`dateModified` for "Updated DD/MM" SERP badge), FAQ schema with verbatim GSC queries, big-number panels and per-cabeza calculations
- **New** `/precios/hacienda-en-pie` — hub page with all categories in one table, INMAG anchor, FAQ targeting `hacienda en pie` / `kg novillo` / `kilo de novillo` queries
- Sitemap: 7 new URLs with `priority: 0.9–0.95`, `changeFrequency: daily`

#### New product: Reports for PRO Usuario (and Enterprise)

PRO Usuario was promising "descargas premium" but had no actual reports page. Built it.

- `user_report_downloads` table — granular tracking, RLS owner-read, RPCs `get_user_report_stats` and `record_report_download`
- `/cuenta/reportes` — catalog from `src/lib/data/reports.json`, per-user stats (download count, last downloaded), CTA flips to "Descargar de nuevo" once consumed
- `/api/reportes/[slug]/download` — auth + tier gate (PRO Usuario OR any Enterprise tier), atomic count increment, 302 to file
- 4 placeholder reports shipped in `public/reports/` (El Corredor abr+mar, Oráculo Q1, archivo INMAG zip) — replace with real PDFs without code changes

#### Coherence fixes across the site

Audit found 23 incoherencies after the product split. Critical fixes:

- All consignataria-facing CTAs append `?audience=consignataria` (ConsignatariaProfileClient, DashboardClient ×2, homepage PRO section)
- Login redirects normalized to `?next=` everywhere (was a mix of `?redirect=` and `?next=`) and URL-encoded (was breaking when target contained `?`)
- `/auth/login` broken refs in FollowButton + mi-cuenta/favoritos rewritten to `/login`
- `/newsletter` href in RematesClient → `/alertas`
- FeatureGate default fallback rewritten to be audience-agnostic (was consignataria-only copy)
- Founder-pricing theatre stripped — `$65.000 luego` references removed from FounderSpotsRemaining + DashboardClient (the escalation was never going to ship)
- `analytics.trackCheckoutStart` differentiates `PRO_USER` (7900) from `PRO_CONSIGNATARIA` (45000)
- `/cuenta` now shows a Consignataria card when user has claimed an entity, with its current subscription_tier

#### Tech + UX polish

- `src/lib/platform-stats.ts` — single source of truth for headline counts (remates / consignatarias / frigoríficos / provincias) derived from JSON at import time. Eliminates the prior 82/74/392/366/12/14 drift across `/layout`, `/enterprise`, `PlatformStats`, FAQ strings.
- `PlanesToggle` mobile labels shortened (`Productor` / `Consignataria` instead of full phrases) below sm breakpoint, with `flex-wrap` so they don't overflow on <375px screens
- `.safe-area-inset-bottom` CSS utility added to `globals.css` (was referenced but undefined)
- Modal a11y in `ApiKeysClient`: `role="dialog"`, `aria-modal`, `aria-labelledby`, `<label htmlFor>`, Escape closes
- New legal stubs `/terminos` + `/privacidad` (login screen was 404-ing on these)
- `text-zinc-600 text-xxs` → `text-zinc-500 text-xxs` in new files for WCAG AA contrast

#### Database migrations

Applied to remote in this release:

- `20260511_user_subscriptions.sql` — was in repo but never applied; required by the entire PRO Usuario flow. Triggers backfill all existing `auth.users`
- `20260512_api_keys.sql` — keys + usage table + `increment_api_usage` RPC + RLS
- `20260512_api_tier_entitlement.sql` — adds `api_tier` column with CHECK constraint
- `20260512_user_report_downloads.sql` — tracking table + 2 RPCs
- `20260512_api_keys_quota_alert.sql` — adds `quota_alert_month` for cron dedup

#### Env

- `API_KEY_PEPPER` — required for HMAC-SHA256 of API key secrets. Provisioned in Vercel Production + Development. Preview env had to be set via dashboard (CLI 50.39.0 bug with non-interactive `vercel env add NAME preview`)

**Impact:** the pricing page no longer presents a single confusing PRO to all visitors; SEO surfaces should start converting #1 rankings into clicks once Google recrawls (typically 1–2 weeks); Enterprise can be sold with a real product page, real API, real onboarding, and real billing — not just a contact form.

---

## [1.9.13] — 2026-05-08

### Fix: Daily Rebuild Guarantee + Scraper Hardening

The auction calendar and INMAG page silently went stale for ~28 days. Two root causes compounded: (1) `scrape-auctions.yml` had been switched to **weekly** + the `Check for changes` step skipped the commit when the scraper produced no diff, so quiet days (no MAG publish, weekends, holidays) yielded no rebuild; (2) ~13 pages snapshot `new Date()` at SSG build time, so without rebuilds every "today/tomorrow" filter froze. `/remates/manana` was showing **26-Apr** instead of today+1.

#### Scraper workflow (`.github/workflows/scrape-auctions.yml`)
- **Cron:** weekly Monday → daily 7-days at 17:00 UTC (14:00 ART, MAG closing time)
- **Build trigger file:** every run writes `src/lib/data/last-build-trigger.json` with timestamp + GitHub run id. Guarantees a commit even on quiet days, which guarantees a daily Vercel rebuild
- **Honest commit messages:** `data: update auctions (N) + match videos` for real data updates, `ci: daily rebuild trigger` when only the trigger file changed — keeps the git log readable
- `actions/checkout@v4` → `@v5`; `setup-node` pinned to `@v4` (TODO: bump after closing pnpm-lock vs npm; Node 20 deprecation deadline 2026-06-02)

#### INMAG backfill (11/04 → 06/05)
9 trading days missing from `market-prices.json` (last point was 10/04 = $4,247.31). Series now extends through 06/05 = $4,242.23 (336 points total).
- **Period average:** $4,255/kg vivo
- **Range:** $4,067 (15/04) → $4,419 (24/04)
- **Net change:** ~flat (-0.12%)
- **Volume:** 76,036 cabezas across 9 trading days (~8.4k/day)

#### API
- `/api/health`: removed `runtime = 'edge'`. Vercel is deprecating Edge Functions in favor of Fluid Compute (same regions, same price, full Node.js APIs, fewer compatibility issues)

#### Cleanup (no functional change)
- Deleted `scripts/fetch-inmag-{daily,complete}.mjs`. Both pointed at `haciinfo000013` with deprecated form params (`txtFechaDesde/Hasta` — MAG renamed to `txtFechaIni/Fin`) and the endpoint actually returns "Índice Arrendamiento", not the canonical INMAG. The production scraper (`scripts/scrape-auctions.mjs`) uses `haciinfo000011` correctly and was never affected

**Impact:** date-sensitive static pages (`/remates/manana`, `/remates/hoy`, every `>= today` filter in directories, profile "upcoming" counts) refresh daily. The 26-Apr-style staleness cannot recur as long as the daily cron runs successfully.

---

## [1.9.12] — 2026-04-11

### YouTube Channel Expansion + Improved Video Matching

Major expansion of live streaming coverage with 9 new YouTube channels mapped and improved slug matching algorithm.

#### New YouTube Channels (24 total, was 15)
- **Canal Rural** — Aggregator channel (150K subs) that streams many consignatarias
- **Ganadera Salliquelo SA** — Direct channel
- **Casa Usandizaga S.A** — Direct channel
- **HK AGRO SRL** — Direct channel
- **Idercor Remates** — Corrientes region
- **Ildarraz Hnos. S.A.** — Direct channel
- **Carlos J. Lanser S.A.** — Direct channel
- **Néstor Hugo Fuentes S.A.** — La Pampa region
- **HRE Consignaciones S.R.L** — Direct channel

#### Improved Video Matching (`match-youtube-videos.ts`)
- **Slug aliases** — Manual mappings for common mismatches (AFA, UMC, Ferias Rauch)
- **Enhanced normalization** — Handles `-srl`, `-sa`, `-scl`, `-ltda`, `-soc-coop-lt` suffixes
- **Fuzzy matching** — Partial slug matches for edge cases
- **Result:** 3x more channels matched on daily scrape runs

#### Data Update
- **386 remates** across 14 provinces
- **81 consignatarias** in directory
- **INMAG:** $4,247.31/kg (April 10 data)

**Impact:** More live auctions will be automatically linked when consignatarias schedule YouTube streams. The `/remates/en-vivo` page now has broader coverage.

---

## [1.9.11] — 2026-04-10

### En Vivo Focus + Market Decision Infrastructure

Strong focus on live streaming auctions across the entire platform, plus strategic architecture for evolving into a market decision infrastructure.

#### Homepage En Vivo Integration
- **En Vivo in navbar** — Red pulsing indicator with live count, always visible
- **En Vivo stat card** — First position in stats strip with gradient red styling
- **En Vivo CTA button** — Hero section shows "🔴 X en vivo" when streams available
- **En Vivo quick nav** — Prominent red button with count badge in navigation

#### Remates Page Enhancement
- **EN VIVO toggle filter** — Red button next to period tabs (HOY/PROXIMOS/PASADOS)
- **LIVE NOW banner** — Appears when streams happening today, shows consignataria names and times
- **En Vivo in stats strip** — Clickable count that toggles the filter
- **Filter pill display** — Shows active "En Vivo" filter with pulsing indicator

#### New Pages
- **`/remates/en-vivo`** — Dedicated page for auctions with YouTube streaming
  - YouTube thumbnails with play button overlay
  - Live badges (🔴 EN VIVO) for today's remates
  - Grouped by date with prominent visual hierarchy
  - Stats bar showing stream count
  - Mobile responsive card layout
  - SEO optimized for "remates ganaderos en vivo", "remates online"

- **`/mercado/arrendamiento`** — Land lease index page
  - Current INMAG value prominently displayed ($4,329.89/kg)
  - Live calculation example (500 ha × 8 kg/ha = ~$17.3M/month)
  - 90-day interactive price chart
  - 12-month averages table
  - FAQ with FAQPage schema
  - SEO optimized for "índice novillo arrendamiento"

#### Strategic Documentation
- **`docs/MARKET-DECISION-INFRASTRUCTURE.md`** — Complete architecture for evolving from data platform to decision infrastructure:
  - Phase 1: Statefulness (follows, personalized feed, history)
  - Phase 2: Intelligent alerts (multi-channel, granular triggers)
  - Phase 3: Dynamic rankings (leaderboards, competition metrics)
  - Phase 4: Comparatives (consignatarias, remates side-by-side)
  - Phase 5: Direct actions (structured contact, lead tracking)
  - Phase 6: Watchlists & portfolios (persistent user state)
  - Phase 7: Network effects (data gravity, feedback loops)
  - Phase 8: Operational standard (API, embeds, ecosystem lock-in)

#### Technical
- Analytics tracking for `en_vivo` filter usage
- Build optimized: 0 lint errors, 0 type errors

**Thesis:** The platform is transitioning from information provider to decision infrastructure — users don't just access information, they make decisions inside the platform.

---

## [1.9.10] — 2026-04-07

### Frigorífico Monetization (Movement 4)

The `/frigorificos` directory is the #1 traffic page (241 views Q1) but generated $0. This release adds monetization hooks.

#### Claim CTA Enhancement
- **Prominent claim box** on unclaimed frigorífico pages with amber styling
- Clear value proposition: "Reclamá gratis y actualizá tu información"
- Benefit list: verified badge, contact info visible, receive buyer inquiries

#### Lead Generation
- **"Consultar este frigorífico"** email form for unclaimed profiles without contact info
- Routes inquiries to agro@memola.com.ar for manual forwarding
- Creates lead pipeline for outreach

#### PRO Upsell for Verified
- **"Frigorífico Destacado"** tier at $30.000/mes shown to verified frigoríficos
- Benefits: Priority in province search, gold badge, newsletter promotion
- Contact CTA for enterprise sales

**Revenue model:**
- Free: Claim profile, add contact info
- Destacado ($30K/mes): Priority placement, newsletter, badge

---

## [1.9.9] — 2026-04-07

### Pricing Page Reframe (Movement 6)

Psychological pricing optimization to reduce sticker shock and improve conversion.

#### Price Reframe
- **Primary display:** "$1.500/día" instead of "$45.000/mes" (feels 30x cheaper)
- **Secondary:** Monthly price shown in smaller text with "Sin permanencia"

#### Price Anchoring
- Added comparison box: "Aviso diario: $200.000 · Cartel ruta: $150.000/mes"
- Reframe: "Tu remate llega a +500 productores por menos que un café por día"

#### ROI Enhancement
- Stronger FAQ answer: "Un solo comprador nuevo te devuelve la inversión del año entero"
- Added: "Un novillo vendido a mejor precio paga 10 años de PRO"

**Psychology applied:**
- Daily pricing reduces perceived commitment
- Anchoring against expensive alternatives makes PRO feel like a bargain
- Concrete ROI examples make value tangible

---

## [1.9.8] — 2026-04-07

### Points System Completion (Movement 2)

The gamification system is now fully operational. Users can earn points by completing profile actions and redeem 4,500 points for 1 month of PRO free.

#### Database Schema
- `point_redemptions` table — tracks user redemptions (one per user)
- `point_transactions` table — audit trail of point changes
- RLS policies for user-owned data access

#### API Endpoint
- `POST /api/redeem-points` — validates points, checks eligibility, activates PRO
- Creates subscription record with 1-month expiration
- Logs transaction for audit trail

#### Dashboard Integration
- `ProfileProgressTracker` now has functional "Canjear mes PRO gratis" button
- Error handling for insufficient points or already-redeemed state
- Loading state during redemption process
- Automatic page refresh on successful redemption

#### Point Values (unchanged)
| Action | Points |
|--------|--------|
| CUIT verificado | 300 |
| Teléfono | 200 |
| Email | 200 |
| WhatsApp | 200 |
| Sitio web | 200 |
| Descripción | 300 |
| Logo | 400 |
| DT-e subida (×3 max) | 500 each |
| Primer remate | 800 |
| Resultado de remate | 500 |
| Bonus: perfil completo | 300 |
| **Total possible** | **5,500** |
| **PRO threshold** | **4,500** |

**SQL Migration:** `migrations/005_points_redemption.sql`

---

## [1.9.7] — 2026-04-07

### Conversion Optimization Sprint — Form Recovery & PRO Copy Rewrite

Based on Q1 analytics diagnostic showing 91% form abandonment and 1.1% PRO prompt CTR, this release implements the first two high-impact movements from the conversion optimization plan.

#### Form Abandonment Recovery System
- **Email capture on blur** — captures email before form submit for recovery campaigns
- New `/api/form-abandonment` endpoint (fire-and-forget, non-blocking)
- DB schema: `form_abandonment` table with email, slug, form_type, timestamps
- Applied to both `ClaimForm.tsx` and `FrigorificoClaimForm.tsx`
- **Impact:** Previously lost 11 of 12 form starters. Now recoverable via email campaigns.

#### Form UX Clarity
- All optional fields now labeled "(opcional)" — reduces perceived effort
- Helper text under email: "Te enviaremos un enlace para acceder"
- Clearer value proposition in form copy

#### PRO Prompt Copy Rewrite (Movement 1)
- **CTA change:** "Activar PRO" → "Ver cómo funciona →" (lower commitment)
- **Price removed from prompt** — moved to /planes page (reduces sticker shock)
- **New reassurance:** "Sin permanencia · Cancelá cuando quieras"
- **Benefit-first copy** across all 5 contexts:

| Context | Before | After |
|---------|--------|-------|
| comparar | "Compará hasta 5 consignatarias" | "Tu remate llega a +500 productores cada semana. Destacalo." |
| calculadora | "Guardá tus cálculos y accedé al historial" | "Productores calculan precios acá. Tu remate al lado de su resultado." |
| exportar | "Accedé a datos históricos y formatos API" | "Datos completos para decidir mejor. Sin límites de exportación." |
| inmag | "Mostrá tus remates a +5000 usuarios" | "Productores revisan precios acá antes de vender. Que vean tus remates." |
| remate-detail | "Recibí alertas para remates de este tipo" | "No te pierdas remates como este. Alertas en tu email." |

- **Expected impact:** CTR from 1.1% → 5-8% (benchmark for contextual B2B prompts)

#### Build Fix
- `/frigorificos/verificar` marked as `force-dynamic` to fix Next.js 15 static generation error with `useSearchParams()`

---

## [1.9.6] — 2026-04-04

### Middleware Scope Fix — Eliminate Unnecessary Function Invocations

> fix: scope middleware matcher to auth/API routes only — public pages served from CDN with zero compute

**Problem:** Middleware was running on *every* page request (broad negative-lookahead matcher), creating a Supabase `auth.getUser()` call even for anonymous visitors on fully static pages like `/remates/buenos-aires`. This caused 100% Fluid Compute usage across all routes and unnecessary costs.

**Fix:** Restricted middleware matcher to only the 6 route prefixes that actually need auth or rate limiting:
- `/api/*` — rate limiting + auth
- `/admin/*` — auth
- `/dashboard/*` — auth
- `/login/*` — auth session
- `/mi-cuenta/*` — auth
- `/auth/*` — auth callbacks

**Impact:** All public/static routes (`/remates/*`, `/consignatarias/*`, `/frigorificos`, `/`, `/overview`, `/mercado`, etc.) now serve directly from CDN edge cache with zero function invocations. ~200+ invocations/day eliminated.

---

## [1.9.5] — 2026-03-20

### Homepage Conversion Optimization & Supply Chain Intelligence

Major platform update introducing instant value delivery, user lock-in mechanisms, and differentiated supply chain data.

#### Valuation Widget (Instant Aha Moment)
- **Real-time livestock calculator** on homepage using live INMAG prices
- 6 cattle categories with province-specific weight averages
- Instant value display: $/kg × avg weight × head count
- Price change indicator (% vs previous week)
- Email capture integration for price alerts
- Conversion funnel: anonymous visitor → qualified lead in <10 seconds

#### Homepage Quick Navigation
- **17 new internal links** from homepage to deep content
- Time-based filtering: Today / Tomorrow / This Week / Historical
- Type-based filtering: Invernada / Cría / General / Especial / Reproductores
- Market shortcuts: INMAG / Prices by Category / Frigoríficos / Directory
- Province quick links on auction preview cards

#### Clickable Stats Strip
- All 4 KPI cards now route to relevant sections
- INMAG → /mercado/inmag (price history)
- Auctions → /remates (calendar)
- Plants → /frigorificos (database)
- USD Blue → /mercado (macro context)

#### Watchlist Teaser (Lock-in Mechanism)
- Visual preview of favorites functionality
- Dual CTA: Create Watchlist + Explore Consignatarias
- Pre-registration value demonstration
- Mobile-responsive card layout

#### PRO Section Enhancement
- **3 new feature cards**: Video Catalogs, Points System, Profile Analytics
- Dual conversion path: "Claim free profile" + "View PRO plans"
- 8 total feature cards (was 5)
- Clear value differentiation between free and PRO tiers

#### Hero CTA Optimization
- Dynamic auction count in primary CTA ("Ver X remates esta semana")
- Secondary CTA targets consignataria funnel ("Buscar mi consignataria")
- Reduced cognitive load with specific vs generic copy

### Remitente Network Display (Supply Chain Intelligence)

First-to-market feature exposing producer-level livestock movement data.

#### Remitentes Page (`/consignatarias/[slug]/remitentes`)
- Full remitente list grouped by locality (partido/departamento)
- Province badge indicators
- Head count aggregation per establishment
- Responsive table with search/filter
- Historical data visualization

#### Enhanced MAG Panel
- Renamed to "RED DE REMITENTES" for clarity
- Locality count indicator
- "View all" navigation to full remitentes page
- Integrated with existing profile layout

#### Competitive Differentiation
- **Only platform in Argentina** surfacing producer-level supply chain data
- Data sourced from MAG haciinfo000006 (public records)
- Enables buyer intelligence: which ranches supply which consignatarias
- Enables producer intelligence: which consignatarias serve my region

### SEO Infrastructure

#### New Landing Pages
- `/remates/anteriores` — Historical auctions archive
- `/remates/mes/[mes]` — 12 monthly landing pages for seasonal queries
- FAQ schema on `/mercado` page (4 market-related FAQs)

#### Performance Optimizations
- Dynamic import for jsPDF: 134KB → 6KB client bundle (95% reduction)
- Tesseract.js lazy loading: -3-8MB initial bundle
- Offer + PriceSpecification schema on market pages

### Database Migrations (Queued)

#### Points System Schema
```sql
ALTER TABLE consignatarias ADD COLUMN onboarding_points INTEGER DEFAULT 0;
-- Point transactions table with RLS policies
-- award_points() function with duplicate prevention
-- redeem_points_for_pro() function for 4500pts → 1 month PRO
```

#### Watchlist/Favorites Schema
```sql
CREATE TABLE user_favorites (
  user_id UUID REFERENCES auth.users(id),
  consignataria_slug TEXT NOT NULL,
  notify_new_remate BOOLEAN DEFAULT false,
  UNIQUE(user_id, consignataria_slug)
);
-- RLS policies for user-owned data
```

### Technical Metrics

| Metric | Before | After |
|--------|--------|-------|
| Homepage internal links | ~10 | 40+ |
| Homepage feature cards | 5 | 8 |
| Homepage CTAs | 2 | 6 |
| Sitemap URLs | 1,103 | 1,116+ |
| Client bundle (PDF) | 134KB | 6KB |

---

## [1.9.4] — 2026-03-20

### Navigation Unification (BATTLE #3 Day 5)

Improved navigation flow between dashboard and DT-e management.

#### Changes
- **Main Nav**: Added "MIS GUÍAS" link to terminal layout navigation bar
- **Dashboard Quick Actions**: Added "📄 Mis Guías DT-e" button in ACCIONES RÁPIDAS section
- **Breadcrumb**: /mi-cuenta/guias now shows "← Volver a Mi Panel" breadcrumb navigation
- **Bidirectional Flow**: Users can now navigate seamlessly between dashboard and guias

This completes BATTLE #3 (Onboarding & Dashboard UX) at the frontend level. Only pending: database schema for points redemption.

---

## [1.9.3] — 2026-03-20

### Onboarding & Dashboard UX Overhaul

Complete redesign of the new user experience and empty states across the platform.

#### Points System (Gamification)
- **Point Values**: 10 pts = 1 peso, 4500 pts = 1 month PRO free
- **ProfileProgressTracker**: Visual progress bar with percentage toward free PRO month
- **Action Suggestions**: Clickable next steps that route to relevant dashboard tabs
- **Point Breakdown**: Expandable view showing all earning opportunities
- **Redemption Flow**: Early adopter badge + PRO activation (pending: DB + webhook)

#### Claim Flow Improvements
- **CUIT Validation**: Real-time validation using Argentina's modulo 11 algorithm with visual ✓/✗ feedback
- **Success State**: Clear post-submission guidance with email instructions and spam folder reminder
- **Error Recovery**: 409 conflict now shows login link instead of dead-end message

#### Empty Dashboard Wizard
- New users now see a 3-step "Getting Started" guide instead of blank screen
- Step 1 (active): Verify your profile with clear CTAs
- Step 2-3 (greyed): Complete information, Publish auctions
- Footer explains benefits of verified profile

#### Empty States Redesign
Unified empty state pattern across all listing pages:
- **Remates**: Calendar icon + filter clear + newsletter signup CTA
- **Consignatarias Directory**: Search icon + dynamic query message + clear button
- **Frigoríficos Table**: Building icon + clear all filters button
- **Comparar**: Chart icon + directional guidance to sidebar
- **Dashboard Resultados**: Analytics icon + benefits grid (prices, trends, comparisons)

#### Other Improvements
- Admin dashboard: Loading spinner and retry button on error
- WelcomeChecklist: Button now scrolls to edit section properly
- Copy improvements throughout onboarding flow

---

## [1.9.2] — 2026-03-19

### DTE Period Comparison

Analytics feature allowing users to compare their DTE (livestock movement) activity across time periods.

#### Features
- Compare month vs month, quarter vs quarter, or year vs year
- Visual change indicators with +/-% and color coding
- Category breakdown showing side-by-side livestock types
- Natural language insights ("Your February was +45% vs January")
- Collapsible UI to reduce noise for new users

#### Purpose
Creates user investment in accumulated data — seeing historical trends encourages continued platform usage.

---

## [1.9.1] — 2026-03-19

### Internal Linking & Conversion Optimization

#### SEO Improvements
- Cross-links between consignataria profiles
- City quick-links on province pages
- City-to-province navigation breadcrumbs

#### Conversion Features
- Dynamic founder spots scarcity counter
- DTE data export (CSV)
- WhatsApp share analytics tracking

---

## [1.9.0] — 2026-03-18

### Price Oracle & MAG Integration

#### Market Data
- Real-time INMAG index integration ($/kg live weight)
- 6 cattle category prices from Mercado Agroganadero
- Price display on consignataria profiles with MAG data

#### Onboarding Stack
- Complete activation funnel: Welcome → DT-e upload → PRO conversion
- Profile completion checklist with progress tracking
- Onboarding prompts for first-time users

#### SEO Landing Pages
- `/remates/hoy` — Today's auctions
- `/remates/manana` — Tomorrow's auctions
- Full PRO conversion tracking funnel

---

## [1.7.2] — 2026-03-16

### Post-Remate Outreach System

Automated email outreach to consignatarias after their auctions to collect official results.

#### Features
- Automatic detection of completed auctions (+3-5h after scheduled time)
- Professional email requesting price averages and head counts
- 83% email coverage (71 of 86 consignatarias)
- Outreach log to prevent duplicate emails

---

## [1.7.1] — 2026-03-15

### SEO Expansion & Dynamic OG Images

#### Province + Type Combo Pages
- 35 new landing pages combining province and auction type
- Example: `/remates/buenos-aires/invernada`

#### Dynamic OG Images
- Auto-generated social share images for consignataria profiles
- Modern card design with logo, stats, and branding

#### External Resources
- Curated links section on consignataria profiles
- Links to official websites, social media, catalogs

---

## [1.7.0] — 2026-03-15

### Video Catalogs

Automated YouTube integration linking auction livestreams to consignataria profiles.

#### Features
- 15 YouTube channels mapped with resolved channel IDs
- Automated video matching based on auction date and location
- VideoGallery component with modal player
- Featured video badges for highlighted content
- ~14,500 combined subscriber reach

#### Technical
- Daily video matcher runs in GitHub Actions
- VideoObject schema for SEO
- Lazy loading for performance

---

## [1.5.0] — 2026-03-14

### Email Marketing Automation

#### Newsletter System
- Weekly newsletter with upcoming auctions summary
- PRO auctions highlighted with special treatment
- Province/type filtering (foundation for alerts)

#### Transactional Emails
- Resend integration with verified domain
- Terminal-style HTML templates
- Pre-auction reminders (daily cron)

---

## [1.3.0] — 2026-03-14

### API Completion

#### New Endpoints (20 total)
- Consignataria ranking by auction count
- PDF report generation
- Full OpenAPI spec at `/api/openapi.json`

#### B2B SEO
- Dataset schema markup
- API documentation page at `/api-docs`

---

## [1.2.0] — 2026-03-13

### Lead Magnets & Tools

#### 5 Free Tools (`/herramientas`)
- Livestock calculator (estimate lot value)
- Auction calendar (weekly/monthly view)
- Weekly market report (PDF download)
- Price comparator (by category and date)
- Data export (CSV/JSON)

#### Glossary Expansion
- 38 livestock industry terms
- DefinedTermSet schema for AI search

---

## [1.1.0] — 2026-03-12

### Subasto API Launch

Public REST API for Argentina's cattle market.

#### 11 Initial Endpoints
- Upcoming auctions, today's auctions, statistics
- Full-text search with filters
- Calendar view, highlighted auctions
- Market prices, health checks

#### Integration Features
- Webhook registration
- Persistent alert subscriptions
- Rate limiting for free tier

---

## [1.0.0] — 2026-03-10

### Platform Launch

Full-featured cattle auction directory and market intelligence platform.

#### Core Features
- 385 auctions from 77 consignatarias
- 364 frigoríficos from SENASA registry
- Daily market prices (INMAG, USD, corn)
- 10 province landing pages

#### User Features
- Profile verification (trust-first, auto-approve)
- Owner dashboard with auction CRUD
- Rebill payment integration for PRO tier
- Magic link authentication

#### Technical
- Next.js 15 with SSG (552 static pages)
- Supabase PostgreSQL (10 tables)
- Daily scraper (9 sources via GitHub Actions)
- Full JSON-LD schema coverage

---

## [0.9.x] — 2026-03-09 to 2026-03-10

### Pre-Launch Development

- 0.9.9: AI SEO (robots.txt, FAQ schema, glossary)
- 0.9.8: Logo upload, data quality page, monthly metrics
- 0.9.7: Trust-first onboarding, auction CRUD
- 0.9.5: SaaS foundation (Rebill, DAL, analytics)
- 0.9.2: Frigorifico detail pages, auction results
- 0.9.1: FrigoConnect (claims + 126 enriched profiles)
- 0.9.0: SEO overhaul (homepage, provinces, E-E-A-T)

---

## [0.8.x] — 2026-03-09

### Verification System

- 0.8.3: Province accuracy fix (CITY_PROVINCE_MAP)
- 0.8.1: Supabase integration, claims system, admin dashboard

---

## [0.7.0] — 2026-03-08

### SEO Foundation

- JSON-LD structured data (Organization, Event, LocalBusiness)
- Dynamic sitemap generation
- Open Graph and Twitter Card meta tags
- 9th scraper source added

---

## [0.6.0] — 2026-03-07

### Terminal Redesign

- New visual language with glass panels
- Dark theme with accent colors
- Consistent typography and spacing

---

## [0.5.0] — 2026-03-07

### Consignataria Profiles

- 70 static profile pages with canonical slug system
- Calendar heatmap and type distribution charts
- Google Analytics 4 integration

---

## [0.4.0] — 2026-03-06

### Monetization Foundation

- PRO auction system with visual treatment
- Amber/gold highlighting for featured listings

---

## [0.3.0] — 2026-02-26

### Automation

- Daily scraper via GitHub Actions
- Live market data integration
- Platform identity established

---

## [0.2.0] — 2026-02-26

### Data Expansion

- 277 auctions from 15+ sources
- Multi-source data normalization

---

## [0.1.0] — 2026-02-26

### Genesis

- Initial commit with 92 auctions
- 364 frigoríficos from SENASA
- Basic dashboard structure

---

## [0.0.0] — 2026-02-26

### Project Start

- `npx create-next-app`
- Data collection began
- Architecture decisions made

---

*Built by Memola Medios SAS. One human, one AI, 22 days.*
