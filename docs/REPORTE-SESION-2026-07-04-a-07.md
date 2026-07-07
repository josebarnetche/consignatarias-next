# Reporte de trabajo — Sesión consignatarias.com.ar

**Período:** 29-jun → 7-jul 2026 (núcleo de commits: 4→7 jul)
**Versiones:** 1.93.0 → 1.130.5 · **~60 commits** co-autoreados
**Origen:** arrancó como *security audit / hardening* (migraciones `20260629_security_hardening*`) y derivó en un ciclo largo de producto, datos, monetización y contenido. Este documento es una **bitácora hora-a-hora** (timestamps reales de los commits), no un changelog.

---

## Resumen ejecutivo

Lo que empezó como una auditoría de seguridad terminó siendo la construcción de:
1. **El pivot API-first** (productor gratis, monetización por API/MCP/PRO).
2. **La capa de dato transaccional del MAG** (scraper haciinfo000007 + Intel + Pulso).
3. **La capa de datos first-party** (visitantes, atribución, personalización).
4. **El perfil PRO diferenciado** de consignataria.
5. **El showcase histórico "El novillo en dólares"** (demo del Enterprise API).
6. **Investigación estratégica** de monetización (x402) y mercado de carne.
7. Actualización integral de **contenido legal/institucional**.

---

## Bitácora hora a hora

### Viernes 4-jul — Pivot API-first + marca
| Hora | Trabajo |
|---|---|
| 15:39 | Fix pago: acceso API por `metadata.api_tier` + montos Enterprise nuevos |
| 15:51 | Onboarding no-técnico: connector MCP con la key + welcome post-pago |
| 15:56 | Copy /planes: Starter MCP-first (le habla al operador no-técnico) |
| 16:08 | Fix precio Starter USD 99 → 49 |
| 16:11–16:26 | Marca: ★ PRO de consignataria/featured **amber → cielo** (acento único v2.0) + glow |
| 16:34 | Changelog 1.93.0 — pivot API-first, productor gratis, pago E2E, karma, marca |

### Sábado 5-jul — MAG transaccional, Intel, Pulso, landing PRO
| Hora | Trabajo |
|---|---|
| 18:32 | **Fix crítico del scraper MAG** (`mag-lots-worker`): params correctos de haciinfo000007 → traía 0 filas |
| 18:40 | Índice único para el upsert + `remaining` en returns de error |
| 18:45 | Changelog 1.106.0 — CUITs de consignatarias + fix scraper transaccional |
| 18:47 | Decodificar ISO-8859-1 en el fetch (ñ/acentos en remitentes) |
| 19:06 | MCP: tool `actividad_consignatarias` + CUIT en `buscar_consignataria` |
| 20:04 | **Panel Intel de mercado** en dashboard — seguí a la competencia (free 3 / PRO 20) |
| 20:06 | Changelog 1.107.0 — Intel + integración del dato nuevo en MCP/API/dashboard |
| 20:22 | **MagPulse** — drip animado de la actividad de Cañuelas (count-up) |
| 20:25 | Worker drena la cola *newest-first* (mercado reciente primero) |
| 20:30 | Changelog 1.108.0 — Pulso del mercado |
| 20:41 | Página pública `/mercado/pulso` (demo + autoridad, sin login) |
| 21:01–21:18 | Pulso en menú MERCADO · **Intel de-gateado por julio** (todos ven todas las firmas) · watchlist anónima en localStorage · anclar ventana al último día con datos |
| 21:39–23:53 | **Landing PRO** (`/para-consignatarias`): scroll-to-discover → reenfocada (ABM, personalizable por firma) — changelogs 1.112/1.114 |

### Domingo 6-jul (madrugada) — Landing PRO, arrendamiento, contenido, frigos, first-party
| Hora | Trabajo |
|---|---|
| 00:26–00:42 | Landing PRO cerrada sobre el producto ("publicitá tus remates + medí tu presencia en IAs") → rehecha **evocativa (show don't tell)**, la escena de la IA |
| 01:07 | **Arrendamiento**: cierre mensual OFICIAL del MAG (para facturas) — coincide exacto (junio = 4.164,558) |
| 01:12 | Changelog 1.117.0 |
| 01:20 | **Cron mensual del cierre de arrendamiento por email** a los suscriptos (`sendArrendamientoCierre` + `/api/cron/arrendamiento-cierre` + GH Action) |
| 01:26 | Changelog 1.118.0 |
| 01:49 | **Actualización de contenido** (vía workflow, 5 páginas): manifiesto/El Oráculo, términos, privacidad, glosario, enterprise |
| 02:00 | **Frigoríficos: estandarizar el directorio a 1.102** (era 364, un subset) |
| 02:18 | **Capa de datos first-party**: visitor ID (cookie `cid` en middleware), atribución (first/last touch), stitching a la cuenta, consentimiento |
| 02:27 | Fix reintento en `VisitTracker` (race de la cookie en la 1ra carga) |
| 02:31 | Changelog 1.121.0 — cimiento first-party |

### Domingo 6-jul (mañana–tarde) — first-party 2, pipeline, El Corredor, perfil PRO
| Hora | Trabajo |
|---|---|
| 11:03 | **First-party parte 2**: dashboard de visitantes en `/admin/ops`, personalización (`SmartWelcome`), señales de engagement (`scroll_depth`/`time_on_page`) |
| 11:15 | Cablear `tool_used` en calculadoras de valuación y arrendamiento |
| 11:24 | **Fix droplist** del panel intel/pulso (leía la forma equivocada del ranking → quedaba vacío) |
| 12:00 | **Fix del pipeline MAG** (`mag-lots-pipeline`): batch processing — se cancelaba a las 3h de GH Actions |
| 12:16 | Delay 3000→1500ms (backfill más rápido) |
| 12:21 | **El Corredor**: sección "cabezas operadas por consignatario" del mes cerrado |
| 13:58–14:03 | Fixes El Corredor: `force-dynamic` (Data Cache lag) + agregar en la DB vía rpc (cap de 1.000 filas de Supabase) |
| 15:07 | **Droplist con TODAS las firmas** (con o sin remates) + link al perfil |
| 15:11–15:14 | **Perfil PRO diferenciado**: logo destacado + último remate en autoplay/mute (`ProRemateVideo`) — fuente del video: canal YouTube/remate |

### Domingo 6-jul (tarde–noche) — refinamientos PRO
| Hora | Trabajo |
|---|---|
| 18:22 | Changelog consolidado 1.124–1.127 (pipeline, El Corredor, droplist, PRO) |
| 18:31 | Screenshot del perfil PRO (sub temporal + `force-dynamic`, revertidos) |
| 19:56 | **Freshness gate**: el video PRO solo si la transmisión es reciente (≤45 días) |
| 23:46 | **Revalidación on-demand**: el webhook de Rebill hace `revalidatePath` al activar/cancelar PRO → aparece al instante sin deploy |

### Lunes 7-jul (madrugada) — Showcase "El novillo en dólares"
| Hora | Trabajo |
|---|---|
| 01:11 | **`/el-novillo-en-dolares`**: máquina scrollable histórica (INMAG × dólar blue, 2015→hoy). Demo del Enterprise API "from ISO-8859-1 to full historic" |
| 01:16–01:41 | Pulido: INMAG redondeado, **USD explícito** (en AR "$" = pesos), botón despejado (la barra sticky lo tapaba), chart con fill, **animación fluida** (marcador que glidea + escenas con fade) |

### Lunes 7-jul (tarde) — Investigación estratégica + cierre
| Hora | Trabajo |
|---|---|
| ~13:00 | **Research paralelo (3 agentes)**: x402 (pagos agénticos), mercado de carne argentina, demanda de APIs de datos agro → memo estratégico |
| 13:58 | Changelog 1.130 + **resolver el drift** (allowlist de 6 objetos verificados en prod) |

---

## Funciones, tablas y archivos añadidos (catálogo)

### Objetos de base de datos (SQL)
- **Tablas:** `visitors` (identidad first-party), `inmag_monthly_close` (cierre mensual oficial)
- **Columna:** `value_events.visitor_id`
- **Funciones:** `upsert_visitor`, `visitor_stats`, `mag_monthly_consignatario_stats`, `novillo_usd_days`, `novillo_usd_series`
- **Migraciones:** `20260706_inmag_monthly_close`, `20260706_visitors_firstparty`, `20260706_mag_monthly_consignatario_stats`, `20260707_novillo_usd_history`

### API routes nuevas
- `/api/cron/arrendamiento-cierre` — cron mensual del cierre por email
- `/api/track/visit` — registro de visita first-party (upsert + stitching)
- `/api/visitor/me` — contexto de personalización del visitante
- `/api/consignatarias/list` — lista completa de firmas (droplist)

### API routes modificadas
- `/api/track/event` (+`visitor_id`), `/api/webhooks/rebill` (+`revalidatePath`), `/api/market-intel`, `/api/market-pulse`, `/api/cron/mag-lots-worker` (batch `actionProcessBatch`)

### Componentes nuevos
- `CookieConsent.tsx`, `SmartWelcome.tsx`, `ProRemateVideo.tsx`, `NovilloEnDolares.tsx`, `MagPulse.tsx`, `MarketIntelPanel.tsx`, `ConsignatariaShowcase.tsx`

### Componentes modificados
- `AnalyticsProvider.tsx` (+`VisitTracker`, +`EngagementTracker`), `ConsignatariaProfileClient.tsx` (hero PRO), `ArrendamientoCalculator.tsx` / `ValuationWidget.tsx` (`tool_used`)

### Lib
- `email.ts` (+`sendArrendamientoCierre`), `visitor-segment.ts` (`getVisitorContext`), `ai-citations.ts`, `value-events.ts` (+`scroll_depth`/`time_on_page`/`tool_used`)

### Páginas nuevas
- `/el-novillo-en-dolares`, `/mercado/pulso`, `/para-consignatarias` (+`[slug]`)

### Páginas modificadas
- `/mercado/arrendamiento`, `/el-corredor`, `/terminos`, `/privacidad`, `/glosario`, `/enterprise`, `/el-oraculo`, `/admin/ops`, `/consignatarias/[slug]`

### Infra
- Middleware: cookie `cid` first-party
- GH Actions: `arrendamiento-cierre.yml`, `mag-lots-pipeline.yml` (batch + input `backfill_month`)

---

## Investigación y estrategia (no-código)

### x402 / pagos agénticos
- **Prototipable en Vercel hoy** (`x402-mcp` de Vercel Labs, USDC en Base, facilitator Coinbase gratis ≤1.000 tx/mes).
- **Demanda real nascente** (~$28k/día en todo el protocolo, mucho wash-trading). Apuesta de posicionamiento, no ingreso a corto.

### Mercado de carne argentina
- China ~68-70% pero compra **producto frozen FOB en el frigorífico, no en remates**.
- El API de remates es **producto B2B doméstico** (mesas de compra de frigoríficos, feedlots, bancos que indexan a INMAG) + borde fino de integradores extranjeros (Sun Wei, Black Bamboo).

### Corrección clave de tesis
- **INMAG no es licenciable** (es del MAG, no nuestro). El producto es **acceso confiable + capas derivadas propias** (calendario, directorio, agregaciones, medición de citas de IA), no la IP del número.

---

## Estado final
- **v1.130.5** desplegada. tsc limpio, check-db-refs OK (sin drift).
- **Drift auditado:** los 6 objetos flaggeados existen en prod (verificado 7-jul); documentados en la allowlist. Fix de raíz pendiente: regenerar `database.types.ts`.
- **Backfill junio:** 13 días · 35.637 cabezas · 22 firmas cargados.
- **Pendiente conocido:** pipeline MAG termina de drenar junio vía agenda; el showcase novillo puede sumar un scrubber "cualquier día".

---
*Generado como bitácora de la sesión. Archivo local (no commiteado).*
