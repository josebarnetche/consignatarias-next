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
| **Fuente PRO duplicada**: `getFeaturedSlugs` (featured OR sub) vs `getEntityTier` (solo sub) → firma featured=true se ve PRO en directorio, FREE en /go. Ninguno valida `current_period_end`. | ✅ REAL, alto impacto | **PENDIENTE — decisión** (ver abajo) |
| Cancelación instantánea vs fin de período (webhook apaga status+featured al instante) | ⚠️ A CONFIRMAR | **PENDIENTE — falta semántica Rebill** |
| "Probá gratis" engañoso en CTA visible | ❌ MAL LEÍDO | El "gratis" del CTA es la cuenta de PRODUCTOR (correcto). (El trial stale estaba en el schema, ya arreglado.) |
| "Moneda inconsistente, unificar a ARS" | ❌ MATIZADO | El USD era solo del schema (stale), no de la UI. "Unificar productos" habría roto. Ya arreglado el schema. |
| Lead tracking sobrepromete identidad (click WhatsApp ≠ lead) | ✅ REAL (no verificado a fondo) | PENDIENTE (P0/P1) — separar clicks anónimos de leads en dashboard |

## Decisiones pendientes (bloquean 2 P0)

**1. Helper único `getConsignatariaPlanStatus(slug)`** — el de mayor impacto. Decisión: **¿`featured=true` (destaque manual) = PRO completo?** Recomendación: **SÍ** (es como el directorio ya lo trata; `getFeaturedSlugs` está documentado como "unified source of truth"). Build: helper único = `featured=true OR sub status='active' con current_period_end vigente`; enchufarlo en `/go` (getEntityTier), reporte PDF, y donde haya decisión comercial. Reemplazar llamadas directas. Tests: active / past_due / cancelled-con-período-vigente / expired / featured-manual.

**2. Cancelación** — falta saber: **¿Rebill dispara el webhook `cancelled` al pedir la baja o al fin del período?** Si al pedir la baja → el fix es soportar `cancel_at_period_end` (mantener PRO hasta `current_period_end`). Si al vencimiento → ya está bien. José: confirmar comportamiento Rebill.

## Builds grandes pendientes (Epics del audit — Etapa 3, "producto repetible")

- **Epic B — Remates mergeados (corazón de "cargá tu remate y lo distribuimos"):** DAL `getMergedAuctionsForConsignataria(slug)` que una `remates.json` (scrapeado) + `consignataria_auctions` (owner), normalice campos, y lo usen perfil, `/go`, widget, iCal, PDF, dashboard. Hoy el remate owner-created NO propaga a todas las superficies. Revalidar tras POST/PATCH/DELETE.
- **Epic C — Leads y atribución:** llevar `SmartWhatsAppCTA` al WhatsApp principal del perfil PRO (hoy usa wa.me directo, se pierde el lead identificable); ampliar `source` (+UTM/campaign/remate); PATCH de lead (status/notas); export CSV; mostrar contactos anónimos por canal (phone/email/web ya se emiten pero el dashboard no los consulta). Separar clicks anónimos de leads.
- **Epic D — Distribución auditable:** tabla `promotion_campaigns` (slug/remate/canal/sent/clicked/lead) para responder "¿a cuántos llegó mi remate?". Hoy no hay log por remate/campaña.
- **Epic E — Reporte mensual como performance:** cambiar el PDF de "ficha institucional" a "performance del mes" (vistas, contactos, leads, remates, distribución, vs período anterior, top remate, recomendaciones). Reenviar/descargar desde dashboard.

## P1/P2 sueltos (del audit, no verificados)
Videos PRO usan `slug` no `canonical_slug`; `remates/hoy` usa UTC (no ART); `Mis reportes` vs download con reglas de acceso opuestas; "Destacado del Mes" se confunde con destaque PRO pago; ranking provincial ignora remates propios; promesa de citas IA no está en dashboard por firma. **Verificar cada uno antes de tocar.**

## Próximo paso sugerido (post-compactado)
Arrancar por el **helper único de plan (decisión 1, con featured=PRO)** — cierra el P0 de mayor impacto y es self-contained — O por el **DAL de remates mergeados (Epic B)** que es el corazón de la promesa de distribución. Pedir a José la semántica de Rebill para cerrar la cancelación. Todo lo hecho hasta acá: commit **397e265** (3 P0). Verificar deploy Vercel del 397e265 antes de seguir.
