# Proyecto A — Integridad de Analytics

> Estado: fix del pageview **aplicado**. Resto = roadmap priorizado.
> Fecha: 2026-07-03. Base: auditoría de instrumentación + data GA4/first-party.

## 1. El problema de fondo

El sitio tiene **dos capas de analytics** — GA4 (`trackEvent`/`gtag` en `src/lib/analytics.ts`) y un ledger propio de "eventos de valor" (`trackValueEvent`/`emitValueBeacon` → `/api/track/event` → tabla `value_events`) — **pegadas de a parches, sin un contrato único de instrumentación**.

Cada call site decide ad-hoc: a qué capa(s) pega, con qué nombre, y con qué guard de "una vez" (algunos `useRef`, otros `sessionStorage`, otros nada). El síntoma raíz: **la medición está acoplada al ciclo de render/montaje, no a la acción discreta del usuario.** Por eso el mismo hecho se sobre-cuenta por página, se emite con nombres distintos en cada registro, o no llega a una de las dos capas.

Consecuencia de negocio: **las métricas que importan mienten.** El funnel de PRO está inflado en el denominador; los grupos "recurrencia" y "lead" del value-index (la palanca #1 declarada) están casi vacíos porque los eventos nunca llegan al ledger; y los pageviews/bounce/engagement están distorsionados por el conteo de filtros.

## 2. El fix ya aplicado — pageview inflation

`src/components/AnalyticsProvider.tsx` · `PageViewTracker`

**Antes:** `useEffect(() => trackPageView(...), [pathname, searchParams])` → cada cambio de query-string (filtro/orden/paginación) disparaba un `page_view`. Evidencia: `/frigorificos` 11,7 pág/sesión, `filter_apply` 33 usuarios / 132 filtros, `/frigorificos/buenos-aires` 195 pv / 9 sesiones el 29-jun.

**Después:** el disparo depende **solo de `pathname`**; el query se lee para el URL pero no re-dispara. Un pageview por cambio de ruta real. Limpia pageviews, pág/sesión, bounce y engagement hacia adelante.

## 3. Auditoría — mismos síntomas en otras zonas (ordenado por impacto)

### 🔴 A1 · `SinceLastVisit` se dispara ~3× por usuario
`src/components/landing/SinceLastVisit.tsx:34-74` — `trackSinceLastVisitShown` dentro de `useEffect([snapshot])` **sin guard de sesión**, y el componente está montado en **4 páginas** (`frigorificos`, `mercado/inmag`, `mercado/arrendamiento`, `overview`). Como los remates futuros siempre tienen `date > lastVisit`, se muestra y dispara en cada una. Además `snapshot` es un objeto nuevo por render → ni protegido dentro del mismo mount. **Evidencia GA4: 476 eventos / 156 usuarios ≈ 3×.**
**Fix:** guard `sessionStorage('slv_shown')` una vez por sesión (molde: `AiReferralTracker`).

### 🔴 A2 · `pro_prompt_view` — fan-out de 6 componentes + dos caminos
Se emite desde `market/ProChartGate`, `market/SeasonalityView`, `market/HistoryDownloadPro`, `ProUpgradePrompt`, `pro/ProReveal` y `Paywall`. Cada instancia tiene su `useRef` (bien a nivel mount) pero **un pageview genera N `pro_prompt_view`** → el denominador del funnel queda inflado por página. Peor: **dos nombres/caminos** — `trackProPromptView()` pega **solo a GA**, mientras `Paywall` usa `<TrackOnMount event="pro_prompt_view">` → `trackValueEvent` (GA **+** ledger). GA y `value_events` cuentan universos distintos, y ninguno es "usuarios que vieron el muro".
**Impacto directo:** el CTR del muro (919 vistas → 6 clicks = 0,65%) que vimos está calculado sobre un denominador inflado — el CTR real es mejor, pero no lo sabemos.
**Fix:** contar **una impresión por página** (guard a nivel página, no por gate), un solo helper que decida GA-vs-ledger.

### 🟠 A3 · Taxonomía muerta — los eventos de recurrencia/lead no llegan al ledger
`src/lib/value-events.ts` define eventos que **nunca se emiten** al ledger, o que en GA salen con otro nombre:
- `alert_create` (w8, recurrencia): los 3 forms de alerta (`PriceAlertSignup:74`, `SellZoneAlertSignup:55`, `ArrendamientoLiquidacionSignup:86`) llaman `trackAlertSubscribe` → GA `alert_subscribe`, **sin beacon**. `alert_create` jamás entra al ledger.
- `newsletter_subscribe` (w8): ningún componente lo emite.
- `signup` (w15): `trackSignup` emite GA `sign_up`, sin beacon → `signup` nunca entra al ledger.
- `contact_phone/email/web`, `youtube_channel_click`: definidos, nunca emitidos.
**Impacto:** los grupos **recurrencia** y **lead** del value-index están casi vacíos (solo `calendar_subscribe`, `lead_form`, `contact_whatsapp` alimentan algo). **El value-index subestima la demanda real** — justo la métrica con la que se justifica la estrategia del Proyecto B.
**Fix:** emitir el value-event desde esos forms (o borrar las entradas muertas). Ver §5.

### 🟠 A4 · WhatsApp — 3 caminos inconsistentes
- `ConsignatariaProfileClient:759`: `trackOutboundClick` + `trackValueEvent('contact_whatsapp')`.
- `SmartWhatsAppCTA:45`: `trackOutboundClick` + `fetch('/api/track/whatsapp')` (tabla `whatsapp_clicks`), **sin** `contact_whatsapp`.
- `WhatsAppFAB:28`: `trackOutboundClick('whatsapp_fab')` + `/api/track/whatsapp`, **sin** `contact_whatsapp`.
**Impacto:** `contact_whatsapp` sub-cuenta (solo dispara desde una superficie); `whatsapp_clicks` y `value_events` miden subconjuntos distintos.
**Fix:** un handler único de WhatsApp que emita las 3 señales consistentes.

### 🟡 A5 · Beacons que fallan en silencio
`api/track/event/route.ts:48-51` y `api/track/whatsapp/route.ts:48-51`: `console.error` + `success:true` ante error de insert. Es el mismo patrón que perdió los clic-lead cuando `whatsapp_clicks` no existía. Cualquier drift de esquema futuro pierde datos sin alarma.
**Fix:** distinguir "tabla ausente" (tolerar) de otros errores (loguear a `ops_events`/monitor); no reportar `success` si el insert falló.

### 🟡 A6 · `subscription_paid` puede duplicar en renovaciones
`api/webhooks/rebill/route.ts` inserta `subscription_paid` (w100). Si Rebill dispara el webhook en **cada cobro mensual**, cada mes suma 100 al value-index por el mismo cliente → conversiones infladas en renovaciones.
**Fix:** deduplicar por primer cobro (o peso distinto para renovación). Verificar el filtro de evento del webhook.

## 4. La solución de fondo — un contrato único de instrumentación

El patrón correcto ya existe en el repo (`AiReferralTracker`, `SignupTracker`, `UpgradeConfirmTracker`: guard de sesión + limpieza de query + dedupeId). Hay que converger todo a él:

1. **Un solo `track(action, opts)`** que lea la taxonomía de `value-events.ts` y decida GA + ledger en un solo lugar (ya empezamos con `trackValueEvent`/`emitValueBeacon`). Nombre GA = nombre ledger, siempre.
2. **Guard por acción, no por render:** helper `firedOnce(key, scope)` (session/local) que envuelva las impresiones (`*_view`) para no atarlas al mount/deps.
3. **Impresiones a nivel página**, no por componente (para `pro_prompt_view` y similares).
4. **Beacons con contrato de error** (no tragar silenciosamente).

## 5. Roadmap priorizado

| Fase | Qué | Esfuerzo | Estado |
|---|---|---|---|
| **0** | Fix pageview (A0) | XS | ✅ hecho |
| **1** | Guard de sesión en `SinceLastVisit` (A1) | XS | quick-win |
| **1** | Wire al ledger: `alert_create`, `newsletter_subscribe`, `signup` (A3) | S | quick-win |
| **1** | Beacons dejan de tragar errores (A5) | S | quick-win |
| **2** | Consolidar `pro_prompt_view` a impresión por página (A2) | M | plan |
| **2** | Handler único de WhatsApp (A4) | M | plan |
| **2** | Dedup `subscription_paid` en renovación (A6) | S | plan |
| **3** | Contrato único `track()` + migrar call sites (§4) | L | plan |

**Criterio de done:** el value-index refleja la demanda real (recurrencia/lead dejan de estar vacíos), el funnel de PRO tiene un denominador honesto, y ningún evento se dispara por render/filtro.
