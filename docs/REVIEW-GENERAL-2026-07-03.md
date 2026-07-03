# Review general de la base de código — 2026-07-03

> Auditoría estructural en 3 ejes (backend, frontend, datos) + review de los cambios de la sesión.
> Escala: 110 rutas API, ~209 `.tsx` (144 con `'use client'`), 44 migraciones, 38 tablas, 1.8 MB de JSON estático.

## Veredicto de conjunto

**El código tiene islas de excelencia rodeadas de código que las reimplementa peor.** El riesgo dominante no es un bug puntual: es **entropía de patrón** + **falta de fuentes de verdad únicas**. Por cada helper bien hecho hay 3-5 lugares que lo rehacen a mano y divergen. El trabajo de mayor ROI hoy es **convergencia** (un service client, un cron-auth, un DAL, una fuente de esquema, un set de primitivos UI), no features nuevas.

Las **islas buenas** (a replicar como plantilla): el webhook de Rebill (`api/webhooks/rebill`), la capa de API-keys (`lib/api-auth.ts` + `api-keys.ts`), `cron-auth.ts`, el contrato `value-events.ts`, y la migración `20260629_security_hardening.sql` (la única que trata el drift repo↔prod como un hecho).

---

## 🔴 Hallazgo crítico transversal: no hay fuente de verdad del esquema

- **No hay tipos generados** (`database.types.ts`). Todos los `.from('tabla')` son strings sin tipar → nada valida que una tabla/columna exista en compile-time.
- **16 tablas se usan en código sin migración en el repo** (`mag_*`, `auction_results`, `usd_blue_history`, `cron_runs`, `cron_state`, `ops_events`, `processed_webhook_events`, `market_price_snapshots`, `users`, `consignataria_followers`, …). Viven **solo en prod**. `market_price_snapshots` (precios INMAG, tabla central) no tiene migración de creación.
- **Bug en producción por naming-drift:** `src/components/dte/ActivationChecklist.tsx:41,49` consulta `.from('alerts')` y `.from('saved_remates')` — **esas tablas no existen** (los nombres reales son `alertas` y `remate_favorites`/`user_favorites`). El checklist de activación falla en silencio. *(Un tipo generado lo habría cazado en CI.)*
- **Riesgo:** nadie puede reproducir prod desde el repo (staging, branch de Supabase, DR, dev nuevo obtienen un esquema distinto). El hardening de seguridad vive en **una** migración tardía: si no se aplica a un entorno nuevo, vuelven las vulnerabilidades (anon leyendo `api_key` de `alertas`, IDOR).

**Fix #1 (el más importante de todo el review):** hacer que **prod sea la fuente de verdad** → `supabase db pull` a un baseline `00000000_baseline_from_prod.sql`, `supabase gen types typescript` a `src/lib/database.types.ts`, tipar los clients, y un check de CI (`supabase db diff`) que falle ante divergencia.

---

## Backend (110 rutas)

**Fortalezas:** webhook Rebill ejemplar (firma fail-closed, idempotencia, `plan_id` como verdad, dedup de renovación); api-keys serio (hash + cuota + IP allowlist); `cron-auth` header-only + constant-time; beacons defensivos (peso server-side, allowlists, cap de meta).

**Concerns:**
- **🔴 Esquema de API-key paralelo con keys en texto plano** — `api/alertas/route.ts` + `[alerta_id]` ignoran `api-auth.ts` y hacen `.from('users').eq('api_key', ...)` (texto plano, tabla `users` distinta de la `api_keys` hasheada). Dos sistemas de auth de API, uno más débil.
- **🔴 5 crons reintroducen el canal `?secret=`** — `monthly-metrics`, `backfill-usd`, `backfill-inmag`, `trial-nudges`, `quota-alerts` hacen su check inline (aceptan `?secret=` en la URL — filtra a logs — y comparan con `!==` no-constant-time). El helper `authorizeCron` ya existe y cierra esto; no lo usan. (`monthly-metrics` además usa `ADMIN_SECRET` vs `CRON_SECRET` del resto.)
- **🟠 DAL sin usar** — `lib/dal/` (558 líneas) lo importan **4 de 110 rutas**; **73 hacen `.from()` ad-hoc** con service_role. Con 66/110 bypaseando RLS, cada check de ownership es artesanal y por copy-paste. No hay choke point.
- **🟠 Dos service clients** — `supabase.ts` (`requireServiceClient`, singleton, soft-fail) vs `supabase-server.ts` (`createAdminClient`, non-null `!` que tira en preview sin envs). Comportamiento divergente.
- **🟠 zod inconsistente** — `lib/validators/` (7 schemas) lo usan 11 rutas; ~35 POST validan a mano con `typeof`.
- **🟡 500 genéricos** — 66 rutas con try/catch artesanal + `console.error`; sin error handler ni logging estructurado central (no hay Sentry visible).

## Frontend (~209 tsx, design system "terminal")

**Fortalezas:** boundary server/client bien resuelto (de 78 `page.tsx`, solo 5 son client — todas admin; el resto son server-fetch → client-island). `value-events.ts` es un contrato tipado real. **Los fixes de esta sesión funcionaron:** `trackWhatsAppClick` unificó las 3 superficies, `ProPromptView` dedup a 1 impresión/página, la capa de analytics quedó coherente y mantenible. Hay design system real (tokens en tailwind, nav/footer data-driven).

**Concerns:**
- **🟠 God-components** — `DashboardClient.tsx` (1535 líneas, 8 ramas de tab en un archivo) y `ConsignatariaProfileClient.tsx` (1344). Cada tab/sección debería ser su subcomponente co-localizado (habilita code-splitting).
- **🟡 Fragmentación de trackers nuevos** — `TrackOnMount.tsx` quedó **huérfano** (0 usos; `ProPromptView` lo reemplazó) = dead code. `ValueLink` se usa 2 veces. 3 abstracciones casi iguales para "trackear al montar/click".
- **🟡 Sprawl de WhatsApp** — 6 componentes; `WhatsAppShare.tsx` (top-level) **sin importar** (dup de `share/WhatsAppShare.tsx`); el SVG de WhatsApp inlineado en varios; `wa.me` armado a mano en **16 archivos** (falta `waUrl()` + `<WhatsAppIcon/>`).
- **🟡 Faltan primitivos** — el botón CTA emerald y los inputs se repiten literal en varios forms; no hay `<Button variant>` ni `<Input>`. Con los forms de lead/suscripción multiplicándose, va a divergir.
- **🟡 Shell pesado** — `(terminal)/layout.tsx` es 614 líneas todo `'use client'`; footer/nav-render estáticos podrían ser server. Bloque de stats comentado + `void isAuthenticated` = dead code.

## Datos (44 migraciones, 1.8 MB JSON)

**Fortalezas:** las tablas de analytics nuevas (`value_events`, `ai_referrals`, `whatsapp_clicks`, `consignataria_leads`) están bien diseñadas (índices compuestos correctos, RLS on, service_role-only, vistas de reporte con hora AR). Provenance del scraping auditable (`scrape-auctions.yml` → DB + commit de JSON + `last-build-trigger.json` + `data-freshness-alert.yml`).

**Concerns:**
- **🔴 Drift de esquema** (ver hallazgo crítico arriba).
- **🟠 Migraciones no idempotentes** — la mayoría de `CREATE POLICY` sin `DROP POLICY IF EXISTS`/guard → re-correr falla. Patrón inconsistente (solo `security_hardening*`, `api_keys`, `live_remate`, `reviews` guardan bien).
- **🟠 `whatsapp_clicks` duplicada** — `20260410` (BIGSERIAL, RPC, **sin RLS**, INSERT a authenticated) vs `20260702` (IDENTITY, RLS on, sin anon). Definiciones incompatibles del mismo nombre.
- **🟠 JSON grande en el bundle del cliente** — `remates.json` (450 KB) importado en `RematesClient.tsx` y `favoritos/page.tsx` (client) → ~450 KB de JS por carga. `market-prices.json` (43 KB) en 4 client components. Deberían llegar como props (slice) desde el server.
- **🟡 Nombres de fecha inconsistentes** entre tablas de eventos (`viewed_at`/`clicked_at`/`created_at`) → complica reporting unificado. `subscriptions` vs `user_subscriptions` coexisten (definir el vigente).
- **🟡 Scraper sin validación de esquema** — los validators zod cubren claims/profiles/webhooks pero **no** el output del scraper de remates/precios; un cambio en el HTML de la fuente rompe en silencio.

---

## Review de los cambios de esta sesión

**Balance: positivo y bien integrados en general.** La seguridad (webhooks fail-closed, RLS, cron-auth) y la instrumentación (contrato value-events, whatsapp único, dedup pro-prompt) **cumplieron su objetivo** — la capa de analytics quedó coherente. Las features de retención (HerramientasCTA, ContactlessLeadForm, bandeja de leads) están bien resueltas.

**Deuda que dejaron / a limpiar:**
- `TrackOnMount.tsx` quedó huérfano tras introducir `ProPromptView` → borrar.
- Los forms nuevos (`ContactlessLeadForm`, signups) repiten clases de input/botón → candidatos a los primitivos faltantes.
- La bandeja de leads es read-only (sin estado nuevo/contactado) — v2 pendiente.

---

## Roadmap priorizado (convergencia > features)

| # | Acción | Eje | ROI |
|---|---|---|---|
| 1 | **Fuente de verdad del esquema**: baseline desde prod + tipos generados + CI `db diff` | datos | 🔥 máximo |
| 2 | Arreglar bug `ActivationChecklist` (`alerts`→`alertas`, `saved_remates`→`remate_favorites`) + auditar `.from('users')` | datos | alto, trivial |
| 3 | Migrar los 5 crons a `authorizeCron` (cierra `?secret=` residual) | backend | alto, trivial |
| 4 | Deprecar el API-key en texto plano de `alertas/*` → `authenticate()` | backend | alto |
| 5 | Un solo service client + DAL como choke point de mutaciones + zod en todo POST | backend | alto, gradual |
| 6 | Partir los 2 god-components (`DashboardClient`, `ConsignatariaProfileClient`) en subcomponentes | frontend | medio |
| 7 | Primitivos `<Button>`/`<Input>`/`<WhatsAppIcon>` + `waUrl()`; borrar huérfanos (`TrackOnMount`, `WhatsAppShare` top-level) | frontend | medio |
| 8 | Sacar `remates.json`/`market-prices.json` del bundle cliente (props desde server) | datos/perf | medio |
| 9 | Unificar migración `whatsapp_clicks` + estándar de idempotencia (plantilla = `security_hardening.sql`) | datos | medio |
| 10 | Error handler + logging estructurado central (`withApiHandler`) | backend | medio |
| 11 | Validar con zod el output del scraper antes de commitear | datos | medio |

**Lectura final:** la base está sana en lo que importa (seguridad cerrada, analytics coherente, features que convierten), pero acumuló entropía. Los ítems 1-5 son de bajo esfuerzo y alto retorno — convertir las islas de excelencia en el estándar y matar los caminos divergentes.
