# PRO Consignataria — plan de trabajo (verificado) · para retomar

**Fecha:** 2026-07-11 · **Contexto:** PRO Consignataria = **Motor 1** del plan de negocios (`PLAN-DE-NEGOCIOS-2026.md`) — la cuña de caja. José pegó un **audit consolidado de 3 sprints** (base: `REPORTE-PRO-CONSIGNATARIA-VENDIBLE-2026-07-11.md`) sobre qué hace vendible el producto. Este doc = **mi verificación de ese audit contra el código real + qué se arregló + qué falta.**

> **Regla aprendida esta sesión:** los "hallazgos" de un audit por lectura de código pueden estar stale (ej. DefinedTermSet /glosario y cluster /precios figuraban pendientes y ya estaban hechos). **VERIFICAR contra el código antes de arreglar** — el propio audit aclara que no consultó prod en vivo.

## Frame comercial (del audit, válido)
Vender **PRO Fundador ARS 45.000/mes (o 120.000/90d prepago), máx 5-10 pilotos asistidos.** NO self-serve, NO CRM completo, NO marketplace, NO "garantizamos leads". Vender **presencia + distribución + medición**, no un badge. Subir a ARS 75.000/mes recién con reporte automático + distribución auditable + leads accionables. El one-pager y guión de venta ya están en `docs/strategy/ventas/`.

## P0 — estado VERIFICADO (contra código real, 11-jul)

| P0 | Veredicto | Acción |
|---|---|---|
| **Reporte PDF con columna muerta** (`subscriptions.consignataria_slug`) → isPro siempre false | ✅ REAL | **ARREGLADO** (usa entity_type/entity_slug). commit 397e265 |
| **Schema /planes USD stale + "Prueba gratis"** (SaaSPricingSchema lee `currency` no `priceCurrency` → renderizaba "ARS 49") | ✅ REAL | **ARREGLADO** (ARS reales 74k/451k/45k, sin trial, FAQ→ARS). commit 397e265 |
| **`/go` no revalida** tras pago/baja (webhook revalidaba perfil, no /go) | ✅ REAL | **ARREGLADO** (revalida /go en alta y cancelación). commit 397e265 |
| **Fuente PRO duplicada**: `getFeaturedSlugs` (featured OR sub) vs `getEntityTier` (solo sub) → firma featured=true se ve PRO en directorio, FREE en /go. Ninguno valida `current_period_end`. | ✅ REAL, alto impacto | **ARREGLADO** — fuente única `getConsignatariaPlanStatus` (featured=PRO permanente OR sub activa con período vigente); getEntityTier delega, reporte PDF y getFeaturedSlugs usan la misma regla. commit 899edef |
| Cancelación instantánea vs fin de período (webhook apaga status+featured al instante) | ⚠️ A CONFIRMAR | **PENDIENTE — falta semántica Rebill.** El helper ya es period-aware, así que si se decide honrar hasta `current_period_end` alcanza con NO apagar `featured`/`status` en el webhook y setear el período. Hoy el cancel de consignataria baja status=cancelled + featured=false al instante. |
| "Probá gratis" engañoso en CTA visible | ❌ MAL LEÍDO | El "gratis" del CTA es la cuenta de PRODUCTOR (correcto). (El trial stale estaba en el schema, ya arreglado.) |
| "Moneda inconsistente, unificar a ARS" | ❌ MATIZADO | El USD era solo del schema (stale), no de la UI. "Unificar productos" habría roto. Ya arreglado el schema. |
| Lead tracking sobrepromete identidad (click WhatsApp ≠ lead) | ✅ REAL (no verificado a fondo) | PENDIENTE (P0/P1) — separar clicks anónimos de leads en dashboard |

## Decisiones pendientes (bloquean 2 P0)

**1. ✅ RESUELTO (commit 899edef).** Helper único `getConsignatariaPlanStatus(slug)` en `src/lib/features.ts`: `featured=true` (permanente, sin período) OR sub `status='active'` con `current_period_end` vigente/null → `{isPro, tier, source, periodEnd}`. `getEntityTier` delega para consignatarias (ahora honra featured + valida período); reporte PDF usa el helper; `getFeaturedSlugs` valida período en batch. Decisión tomada: **featured=true SÍ = PRO** (como ya lo trataba el directorio). Typecheck limpio, deploy Ready. Pendiente opcional: tests unitarios de los 5 casos (active/past_due/cancelled-con-período/expired/featured).

**2. Cancelación — RESUELTO EN LA DOC (11-jul, `docs.rebill.com/products/subscriptions`).** Rebill NO tiene concepto de `cancel_at_period_end`, "churn" ni gracia — eso es de **Rebilly** (otra empresa, no confundir). En Rebill, `Cancelled` es un estado **manual** (se setea en el dashboard), **inmediato y terminal** (sin reactivación, sin más cobros). ⇒ el webhook `subscription.cancelled` dispara **al pedir la baja**, no al fin del período. Además Rebill NO nos manda un "period_end" — nuestro `current_period_end = now+30d` lo estampamos nosotros en cada `payment.success`. **Conclusión:** si queremos honrar el mes pagado, la gracia la implementamos NOSOTROS (Rebill no lo hace). Precedente: el path PRO Usuario ya honra hasta `current_period_end` (comentario en el webhook, líneas 384-386). Caveat: /go y perfil son estáticos (revalidate=false) y Rebill no manda evento al vencer la gracia → el flip a FREE lo hace el rebuild diario del scrape (~24h). **Decisión de producto pendiente (de José): gracia hasta fin de mes vs corte inmediato.**

## Builds grandes pendientes (Epics del audit — Etapa 3, "producto repetible")

- **Epic B — Remates mergeados (corazón de "cargá tu remate y lo distribuimos"):** DAL `getMergedAuctionsForConsignataria(slug)` que una `remates.json` (scrapeado) + `consignataria_auctions` (owner), normalice campos, y lo usen perfil, `/go`, widget, iCal, PDF, dashboard. Hoy el remate owner-created NO propaga a todas las superficies. Revalidar tras POST/PATCH/DELETE.
- **Epic C — Leads y atribución:** llevar `SmartWhatsAppCTA` al WhatsApp principal del perfil PRO (hoy usa wa.me directo, se pierde el lead identificable); ampliar `source` (+UTM/campaign/remate); PATCH de lead (status/notas); export CSV; mostrar contactos anónimos por canal (phone/email/web ya se emiten pero el dashboard no los consulta). Separar clicks anónimos de leads.
- **Epic D — Distribución auditable:** tabla `promotion_campaigns` (slug/remate/canal/sent/clicked/lead) para responder "¿a cuántos llegó mi remate?". Hoy no hay log por remate/campaña.
- **Epic E — Reporte mensual como performance:** cambiar el PDF de "ficha institucional" a "performance del mes" (vistas, contactos, leads, remates, distribución, vs período anterior, top remate, recomendaciones). Reenviar/descargar desde dashboard.

## P1/P2 sueltos — VERIFICADOS (11-jul) · el audit NO define P3/P4, corta en P2
- ✅ **Videos PRO (P1) — ARREGLADO (commit 00578f1).** `videos/route.ts` consultaba `consignatarias.slug`, columna que NO existe en prod (solo `canonical_slug`, verificado por information_schema) → GET y POST daban 404 siempre, feature muerta. Ahora resuelve canónico + `canonical_slug`.
- ✅ **remates/hoy UTC (P2) — ARREGLADO (commit 00578f1).** La API usaba `toISOString()` (UTC); de noche mostraba el día equivocado. Ahora `Intl.DateTimeFormat en-CA` timeZone Buenos_Aires. La página ya estaba bien.
- ✅ **PRO por puntos vencido activo (P1) — YA CUBIERTO (899edef).** `redeem-points` escribe `subscriptions(status=active, current_period_end)`; el helper period-aware ya lo expira. Sin trabajo extra.
- ⏳ **Ranking provincial ignora owner-remates (P2) — REAL, atado a Epic B.** `ranking/route.ts` lee solo `remates.json`. Se arregla al enchufar el DAL mergeado (Epic B), no antes.
- 🔵 **NO tocados (no son bugs, son decisiones):** "Destacado del Mes" naming (`api/featured/check`) = renombre cosmético; "Mis reportes" vs descarga = política de acceso a definir; módulo de citas IA por firma = feature nueva, requiere que `ai_referrals` sea atribuible por firma. Pedir criterio a José si se quieren abordar.

**El resto de P1 = Epics C/D/E (leads, distribución, reporte-performance).**

## Próximo paso sugerido
Decisión 1 (helper único) **cerrada** — commit **899edef**, deploy Ready. Siguiente:
1. **Epic B — DAL de remates mergeados** (corazón de "cargá tu remate y lo distribuimos"): el remate owner-created no propaga a /go/widget/iCal/PDF. Es el de mayor valor de producto y self-contained.
2. **Decisión 2 (cancelación)** — necesita respuesta de José: ¿Rebill dispara `subscription.cancelled` al pedir la baja o al fin del período? El helper ya es period-aware; si es al pedir la baja, el fix es no apagar featured/status al instante y honrar hasta `current_period_end`.

Commits del audit: **397e265** (3 P0) + **899edef** (fuente única de plan).
