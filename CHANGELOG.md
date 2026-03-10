# Changelog

Registro completo de **consignatarias.com.ar** — desde el primer `npx create-next-app` hasta una plataforma de remates ganaderos con 385+ remates en 10 provincias argentinas, auth con Supabase, enriquecimiento de frigoríficos y SEO completo.

---

## [0.9.7] — 2026-03-10

### Trust-first onboarding + gestión de remates por owner

> feat: v0.9.7 — auto-approve claims, magic link auto-send, auction CRUD, dashboard tabs

**Cambio fundamental de flujo:** El onboarding pasa de "admin aprueba primero" a "trust-first" — el claim se auto-aprueba, el owner recibe un magic link instantáneo, y el admin puede revocar después. Esto elimina la fricción del primer contacto.

**1. Auto-aprobación de claims**

- El endpoint `POST /api/claims` ahora auto-aprueba la solicitud inmediatamente
- Crea usuario en Supabase Auth (`auth.admin.createUser`)
- Asigna rol `owner` en `user_roles`
- Envía magic link vía `signInWithOtp` automáticamente
- Notifica al admin por email (el admin puede revocar si es necesario)
- La tabla `consignatarias` se marca `verified: true` y `claimed_by_email` al instante

**2. Formulario de claim actualizado**

- Botón cambia de "Solicitar verificación" a "Verificar y acceder"
- Mensaje de éxito cambia de "SOLICITUD ENVIADA" a "PERFIL VERIFICADO"
- Muestra "Te enviamos un enlace de acceso a tu email" con link a `/login`
- Descripción del formulario actualizada: "Te enviaremos un enlace de acceso a tu email"

**3. Gestión de remates por owner (CRUD completo)**

Owners pueden crear, editar y eliminar sus propios remates desde el dashboard:

- **Tabla `consignataria_auctions`** — nueva tabla en Supabase para remates creados por owners (separada del scraper)
- **`GET/POST /api/consignatarias/[slug]/auctions`** — listar y crear remates (POST requiere auth + ownership)
- **`PATCH/DELETE /api/consignatarias/[slug]/auctions/[id]`** — editar y eliminar (auth + ownership)
- **Formulario completo** en dashboard: título, fecha, hora, ubicación, provincia, tipo, categoría, cabezas, descripción, URL catálogo, URL YouTube
- **Edición inline** de remates existentes
- **Eliminación con confirmación**
- Validación de ownership via `claimed_by_email` en todas las operaciones

**4. Merge de remates en perfil público**

- Los perfiles públicos ahora muestran remates del scraper + remates del owner combinados
- Deduplicación por `${date}|${title.toLowerCase()}` para evitar duplicados
- ISR con `revalidate = 300` (5 min) para que los cambios del owner se reflejen rápidamente

**5. Dashboard con navegación por tabs**

El dashboard pasa de una página larga a tabs navegables:

- **Resumen** — quick stats + acciones rápidas (agregar remate, editar perfil, cargar resultados)
- **Remates (N)** — gestor de remates con CRUD, separando remates propios (editables) de scrapeados (read-only)
- **Editar perfil** — formulario de edición de teléfono, email, web, WhatsApp, descripción
- **Resultados** — carga de resultados de remates completados
- **Mi plan** — estado de suscripción y upgrade
- **Frigorífico** — estado del frigorífico (si aplica)

**6. Mejoras de navegación**

- **AuthButton** muestra "Mi Panel" con link a `/dashboard` cuando el usuario está logueado
- **Auth callback** redirige a `/dashboard` en vez de `/overview`
- **Dashboard page** redirige a `/login` si no hay sesión (antes retornaba null)

**Migración Supabase aplicada:**
- `20260312_consignataria_auctions.sql` — tabla de remates de owners con RLS

**Archivos nuevos (3):**
- `src/app/api/consignatarias/[slug]/auctions/route.ts`
- `src/app/api/consignatarias/[slug]/auctions/[id]/route.ts`
- `supabase/migrations/20260312_consignataria_auctions.sql`

**Archivos modificados (7):**
- `src/app/api/claims/route.ts` — auto-approve + magic link
- `src/components/claims/ClaimForm.tsx` — nuevo mensaje de éxito
- `src/components/auth/AuthButton.tsx` — link "Mi Panel"
- `src/app/auth/callback/route.ts` — redirect a /dashboard
- `src/app/(terminal)/consignatarias/[slug]/page.tsx` — ISR + merge owner auctions
- `src/app/(terminal)/dashboard/DashboardClient.tsx` — tabs + auction manager
- `src/app/(terminal)/dashboard/page.tsx` — force-dynamic + fetch owner auctions

---

## [0.9.5] — 2026-03-10

### Blueprint SaaS — revenue foundation, Rebill, DAL, analytics, onboarding

> feat: v0.9.5 — SaaS revenue foundation (Rebill, DAL, profile editing, analytics, onboarding, freshness badges)

**La transformación de directorio estático a plataforma SaaS con revenue.** 10 acciones del blueprint ejecutadas en paralelo por 5 agentes.

**1. Data Access Layer (DAL)**

Los perfiles públicos ahora reflejan datos editados por el owner en tiempo real:

- **`src/lib/dal/consignatarias.ts`** — merge de datos estáticos (JSON) + dinámicos (Supabase)
- Campos Supabase prevalecen: teléfono, email, sitio web, descripción, WhatsApp, logo
- Fallback gracioso a datos estáticos si Supabase no responde
- Badge **VERIFICADA** en header del perfil cuando está claimed
- Panel **CONTACTO** con teléfono, email, web, WhatsApp (solo si hay datos)

**2. Edición de perfil por owner**

- **API `PATCH /api/consignatarias/[slug]`** — validación Zod, ownership check via `claimed_by_email`
- **Formulario en dashboard** — teléfono, email, sitio web, WhatsApp, descripción (1000 chars)
- Feedback inline de éxito/error
- Campos vacíos se convierten a `null`

**3. Barra de completitud dinámica**

- Reemplaza el 30% hardcodeado por cálculo real basado en 8 campos del perfil
- Color verde (>=75%) o ámbar (<75%)
- Lista dinámica de campos faltantes
- CTA "Verificar este perfil" oculto si ya está claimed

**4. Rebill — gateway de pagos LATAM**

- **Rebill** reemplaza Stripe/MercadoPago — LATAM-native (Y Combinator), ARS + USD, tarjetas + transferencias + wallets
- **Plan PRO Consignataria**: ARS $45.000/mes (`pln_f644261ffe68462497eeb78d4363f377`)
- **Plan Portal Profesional Frigorífico**: ARS $35.000/mes (`pln_6d0f5e9726844b44b8f37822120f0b2d`)
- **`src/lib/rebill.ts`** — helper API (createPaymentLink)
- **`POST /api/subscribe`** — genera link de checkout Rebill (requiere auth)
- **`POST /api/webhooks/rebill`** — handler de eventos: subscription.created, payment.success, payment.failure, subscription.cancelled
- Actualiza tabla `subscriptions` + flag `featured` en consignatarias

**5. Página de precios `/planes`**

- 3 tiers: Gratuito ($0), PRO ($45.000/mes, tratamiento amber/gold), Enterprise (Contactar)
- Feature list detallada por tier
- FAQ section con 5 preguntas frecuentes
- Metadata SEO completa

**6. Feature gating**

- **`src/lib/features.ts`** — `getEntityTier()` retorna 'free' | 'pro' | 'enterprise'
- Consulta tabla `subscriptions` con status 'active' y período vigente

**7. Source badges + freshness labels en remates**

- **Badges de fuente**: CACG, CYC, OFAR, LEHM, MADL, UMCHV, MAN, WEB
- **Indicadores de frescura** (solo en tab "pasados"): HOY, AYER, HACE N DÍAS
- Estilo 9px con borde sutil, amber para PRO

**8. Onboarding post-claim**

- **`WelcomeChecklist.tsx`** — checklist de 5 items (teléfono, email, web, descripción, WhatsApp)
- Barra de progreso, link a editar perfil, link de soporte WhatsApp
- Se oculta cuando los 5 campos están completos
- Aparece en dashboard antes de "MI CONSIGNATARIA"

**9. Analytics de perfil**

- **`POST /api/profile-views`** — registra vistas con filtro de bots por user-agent
- Tabla `profile_views` con referrer y timestamp
- **Widget en dashboard**: "Vistas últimos 30 días" con conteo real
- Upsell: "Los perfiles PRO tienen analytics avanzados"

**10. Scraper → Supabase**

- `writeMarketToSupabase()` en `scrape-auctions.mjs` — escribe snapshot diario a `market_price_snapshots`
- Usa REST API nativa de Supabase (sin dependencia npm)
- Upsert con `Prefer: resolution=merge-duplicates` (sin duplicados)
- Graceful skip si no hay env vars (desarrollo local sigue funcionando)
- GitHub Actions actualizado con `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`

**Migraciones Supabase aplicadas:**
- `20260311_consignataria_profile_fields.sql` — columnas description, logo_url, whatsapp
- `20260311_subscriptions.sql` — tabla de suscripciones con RLS
- `20260311_profile_views.sql` — tabla de vistas de perfil
- `20260311_market_price_history.sql` — tabla de snapshots de mercado

**Archivos nuevos (12):**
- `src/lib/dal/consignatarias.ts`
- `src/lib/rebill.ts`
- `src/lib/features.ts`
- `src/lib/validators/consignataria-profile.ts`
- `src/app/api/consignatarias/[slug]/route.ts`
- `src/app/api/subscribe/route.ts`
- `src/app/api/webhooks/rebill/route.ts`
- `src/app/api/profile-views/route.ts`
- `src/app/(terminal)/planes/page.tsx`
- `src/components/onboarding/WelcomeChecklist.tsx`
- `supabase/migrations/20260311_*.sql` (4 archivos)

**Archivos modificados (8):**
- `scripts/scrape-auctions.mjs` — writeMarketToSupabase()
- `.github/workflows/scrape-auctions.yml` — Supabase env vars
- `src/app/(terminal)/consignatarias/[slug]/page.tsx` — usa DAL
- `src/app/(terminal)/consignatarias/[slug]/ConsignatariaProfileClient.tsx` — contacto, verificada, completitud, views
- `src/app/(terminal)/dashboard/page.tsx` — views count, completedFields
- `src/app/(terminal)/dashboard/DashboardClient.tsx` — form, checklist, analytics
- `src/app/(terminal)/remates/RematesClient.tsx` — source badges, freshness
- `src/app/sitemap.ts` — /planes

**Cobertura:** 385 remates, 77 consignatarias, 364 frigoríficos, 10 provincias. 552 páginas estáticas. Supabase: 9 tablas. Sitemap: ~460 URLs.

**PENDIENTE para go-live:** Habilitar Magic Link en Supabase Dashboard, setear env vars de Rebill en Vercel, agregar GitHub secrets (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY), seed admin role.

---

## [0.9.2] — 2026-03-10

### Fichas de frigoríficos + carga de resultados de remates

> feat: frigorifico detail pages (364) + auction results backend + owner upload form

**Dos bloques de trabajo:**

**1. Fichas de frigoríficos — 364 páginas nuevas**

Cada frigorífico del directorio ahora tiene su propia página en `/frigorificos/[cuit]`:

- **Datos registrales:** CUIT (formateado XX-XXXXXXXX-X), matrícula, provincia, etapa
- **Descripción de habilitación:** texto explicativo por etapa (Faena + Desposte / Desposte / Depósito)
- **Botón "Reclamar este perfil"** — link directo a `/frigorificos/verificar?cuit=...`
- **SEO:** metadata, Open Graph, canonical URL por página
- **SSG:** `generateStaticParams()` genera 362+ páginas estáticas
- **Tabla clickeable:** nombre y matrícula en el directorio ahora linkan a la ficha
- **Sitemap:** 364 URLs de frigoríficos agregadas (priority 0.5, monthly)

**2. Carga de resultados de remates — backend completo**

Consignatarias verificadas pueden cargar resultados de sus remates completados:

- **Migration Supabase:** tabla `auction_results` (reemplaza tabla vacía anterior) con RLS — owners CRUD sus propios resultados, público lee todo
- **API `POST|GET /api/auction-results`** — submit con verificación de ownership (`claimed_by_email`), fetch propios resultados
- **Validator Zod** (`auction-result.ts`) — fecha, título, cabezas ofrecidas/vendidas, precios min/prom/máx, desglose por categoría (array JSONB)
- **Formulario `/dashboard/resultados/nuevo`** — fecha, título, ubicación, cabezas, precios, categorías dinámicas (agregar/quitar filas), observaciones
- **Dashboard actualizado** — sección RESULTADOS entre "Próximos Remates" y "Mis Solicitudes" con lista de resultados cargados y link "Cargar resultado →"

**Archivos nuevos:**
- `src/app/(terminal)/frigorificos/[cuit]/page.tsx`
- `src/app/(terminal)/dashboard/resultados/nuevo/page.tsx`
- `src/app/(terminal)/dashboard/resultados/nuevo/ResultadoForm.tsx`
- `src/app/api/auction-results/route.ts`
- `src/lib/validators/auction-result.ts`

**Archivos modificados:**
- `src/app/(terminal)/frigorificos/FrigorificosClient.tsx` — filas clickeables
- `src/app/(terminal)/dashboard/page.tsx` — fetch de auction results
- `src/app/(terminal)/dashboard/DashboardClient.tsx` — sección RESULTADOS
- `src/app/sitemap.ts` — 364 URLs de frigoríficos

**Cobertura:** 385 remates, 77 consignatarias, 364 frigoríficos (con ficha), 10 provincias. Supabase: 5 tablas. ~530+ páginas estáticas. Sitemap: ~460 URLs.

---

## [0.9.1] — 2026-03-10

### FrigoConnect — registro de frigoríficos + enriquecimiento de datos

> feat: add frigorifico claim flow + enrich 364 frigoríficos with web research

**Dos bloques de trabajo en una sesión:**

**1. Enriquecimiento masivo de datos de frigoríficos**

Los 364 frigoríficos de SENASA solo tenían 5 campos básicos (CUIT, nombre, matrícula, provincia, etapa). Se creó un pipeline de enriquecimiento:

- **Script de merge** (`scripts/enrich-frigorificos.mjs`) — fuzzy-match entre `frigorificos.json` (364 entries) y `frigorificos_target.csv` (40 entries investigados manualmente). Normalización: strip acentos, sufijos legales (SA/SRL/SAS/SAIC), colapso de letras espaciadas ("F R I A R" → "FRIAR")
- **4 agentes de investigación en paralelo** — cada uno investigó ~27 frigoríficos Stage 1 usando web search. Resultado: 107 frigoríficos investigados
- **Script de merge final** (`scripts/merge-enrichment.mjs`) — combina resultados de agentes con datos CSV y base

**Cobertura final del dataset enriquecido (`frigorificos-enriched.json`):**

| Campo | Encontrados | Cobertura |
|-------|-------------|-----------|
| Teléfono | 89 | 24.5% |
| Email | 42 | 11.5% |
| Sitio web | 79 | 21.7% |
| Localidad | 123 | 33.8% |
| Dirección | 117 | 32.1% |
| Tipo (export/consumo) | 126 | 34.6% |
| **Stage 1 (compradores de hacienda)** | **124/124** | **100%** |

**Hallazgos notables:**
- FRIDEVI (Viedma) — único frigorífico argentino habilitado para exportar carne con hueso a Japón
- Ganadera San Roque (Morón) — cerrado definitivamente Feb/Mar 2026
- La Muralla China (Corrientes) — cerrado 2023, nunca obtuvo habilitación SENASA para exportar a China
- Don Raúl (Vera) — concurso preventivo Nov 2025
- LOGROS SA — primera empresa argentina con Declaración Ambiental de Producto para carne

**2. Registro de frigoríficos — reclamar perfil**

Replicación del flujo de verificación de consignatarias para frigoríficos:

- **Botón "REGISTRAR FRIGORIFICO"** en sidebar del directorio (pulsing green dot, mismo estilo que consignatarias)
- **Link "Reclamar"** en cada fila de la tabla de frigoríficos
- **Página `/frigorificos/verificar`** — formulario de registro con selector de frigorífico por CUIT (query param) o listado completo
- **`FrigorificoClaimForm`** — componente dedicado (email requerido, nombre/tel/rol opcionales)
- **API `POST /api/frigorifico-claims`** — inserta en Supabase `frigorifico_claims`, envía emails de confirmación y notificación admin
- **Validator `frigorificoClaimSchema`** (Zod) — validación de CUIT, nombre, email
- **Emails** — `sendFrigorificoClaimConfirmation` + `sendFrigorificoClaimNotificationToAdmin`
- **Migration** — `20260310_frigorifico_claims.sql` (tabla, índices, RLS, unique partial index para dedup pendientes)

**Archivos nuevos:**
- `src/components/claims/FrigorificoClaimForm.tsx`
- `src/app/(terminal)/frigorificos/verificar/page.tsx`
- `src/app/api/frigorifico-claims/route.ts`
- `src/lib/data/frigorificos-enriched.json`
- `scripts/enrich-frigorificos.mjs`
- `scripts/merge-enrichment.mjs`
- `scripts/results-{1,2,3,4}.json` (raw agent research)
- `supabase/migrations/20260310_frigorifico_claims.sql`

**Archivos modificados:**
- `src/app/(terminal)/frigorificos/FrigorificosClient.tsx` — CTA sidebar + link "Reclamar" por fila
- `src/lib/validators/claim.ts` — agregado `frigorificoClaimSchema`
- `src/lib/email.ts` — funciones de email para claims de frigoríficos

**Cobertura:** 385 remates, 77 consignatarias, 364 frigoríficos (126 enriquecidos), 10 provincias. Supabase: 4 tablas (consignatarias, consignataria_claims, frigorifico_claims, user_roles).

---

## [0.9.0] — 2026-03-09

### Revisión SEO completa — de 2 páginas indexadas a descubrimiento total

> `47b74ea` — feat: comprehensive SEO overhaul for Google discoverability (v0.9.0)

**El problema:** Solo 2 de 168 páginas estaban indexadas en Google. Cero rankings para cualquier keyword, de marca o genérica. El sitio era invisible para búsquedas.

**Cambios (4 líneas de trabajo en paralelo):**

**1. Reescritura del homepage (`page.tsx`)**
- Reescritura completa del copy desde `proposed-copies.md`
- Nuevo H1: "Todos los remates ganaderos de Argentina en una sola pantalla"
- Estructura problema/solución: El Problema → Cómo Funciona → Comparación vs WhatsApp
- Conteos dinámicos (remates, consignatarias) desde datos en vivo
- Nueva sección CTA final

**2. Landing pages por provincia (10 rutas nuevas)**
- `/remates/[provincia]` — 10 páginas estáticas apuntando a keywords "remates hacienda [provincia]"
- 150-250 palabras de copy SEO único por provincia con ciudades y consignatarias reales
- `generateStaticParams()` para SSG
- BreadcrumbList + ItemList JSON-LD por página
- Barra de stats, lista de remates server-rendered, links de navegación

**3. Fixes técnicos de SEO**
- `next/font/google` reemplaza tags CDN `<link>` (elimina render-blocking)
- Twitter Cards derivadas automáticamente de OpenGraph (eliminado `twitter` metadata redundante)
- Meta description dinámica con conteo de remates en vivo
- `noindex` en páginas thin: `/verificar` (77 páginas), `/login`
- Eliminadas 77 URLs `/verificar` del sitemap (diluían el crawl budget)
- Header `Permissions-Policy` agregado en `vercel.json`
- Login page refactorizada: extraído `LoginClient.tsx` para que `page.tsx` exporte metadata

**4. Content SEO + E-E-A-T**
- `/quienes-somos` — nueva página institucional (Memola Medios SAS, fuentes de datos, metodología, contacto)
- Texto introductorio server-rendered en todas las secciones: `/remates`, `/mercado`, `/frigorificos`, `/consignatarias`
- Componente `SectionBreadcrumbSchema` para breadcrumbs estructurados en cada sección
- Footer terminal con copyright, link "Quiénes Somos", email de contacto

**Sitemap:** ~140 URLs → ~100 URLs (eliminadas páginas thin, agregadas provincias + quienes-somos). Calidad sobre cantidad.

**Cobertura:** 385 remates, 77 consignatarias, 10 provincias, ~170+ páginas estáticas.

---

## [0.8.3.1] — 2026-03-09

### Remate Estancia Palmita + Trade Food confirmado

> `eb39e36` — data: add Estancia Palmita auction (Colombo y Magliano, 16/04, Mercedes)

**Nuevo remate curado:**
- **Estancia Palmita** — 16 de abril, Sociedad Rural de Mercedes, Corrientes
- 900 cabezas: 450 vacas y vaquillas preñadas + 450 vaquillonas para entorar
- Remata: Colombo y Magliano SA
- Tipo: cría, categoría principal: vaquillonas

**Trade Food SA** — verificado que ya existía en los datos (35° Remate Virtual, 18/03, Parera, La Pampa). Su sitio no publica calendario de remates (opera por consignación directa productor→frigorífico), así que queda como entrada manual.

**Cobertura:** 385 remates, 67 consignatarias, 10 provincias.

---

## [0.8.3] — 2026-03-09

### Fix de asignación de provincias — mapa de corrección ciudad-provincia

> `TBD` — fix: province misassignment in scraper (CITY_PROVINCE_MAP)

**El problema:** ~107 de 385 remates (28%) tenían provincias mal asignadas. Los usuarios filtrando por provincia veían resultados incorrectos — ej: San Nicolás de los Arroyos (Buenos Aires) aparecía en Corrientes, y 41 remates de Córdoba aparecían como Neuquén.

**Causas raíz identificadas:**
1. **API CACG con `state_name` incorrecto** — Cuando `PROVINCE_MAP[r.state_id]` fallaba (ID malo/faltante), el scraper usaba `r.state_name` como fallback, que frecuentemente era "CORRIENTES" para ciudades de Buenos Aires. Afectados: **65 remates**.
2. **Entradas curadas con provincia incorrecta** — Entradas manuales de scrapes individuales (saenz-valiente, ferias-rauch, jauregui-lorda, etc.) tenían provincias como "NEUQUEN" para ciudades de Córdoba. Afectados: **42 remates**.
3. **Campo location con provincia incorrecta** — `location` se construía como `"CIUDAD, PROVINCIA"`, provincia incorrecta significaba location incorrecto (ej: `"RAUCH, CORRIENTES"`).

**Solución: `CITY_PROVINCE_MAP`**

Una tabla de lookup de ~70 ciudades argentinas de remates ganaderos mapeadas a su provincia correcta, agregada a `scripts/scrape-auctions.mjs`. Se aplica con la **mayor prioridad**, sobreescribiendo datos de la API CACG y entradas curadas.

**Implementación (archivo único: `scripts/scrape-auctions.mjs`):**
1. **`CITY_PROVINCE_MAP`** — ~70 entradas cubriendo Buenos Aires (30 ciudades), Córdoba (5), Corrientes (7), Santa Fe (3), Entre Ríos (3), Chaco (4), Santiago del Estero (1), La Pampa (2), San Luis (1), Formosa (1)
2. **Función `correctProvince()`** — Extrae ciudad del campo `location`, normaliza (mayúsculas + NFD para acentos), busca en mapa, corrige campos `province` y `location`, loguea correcciones con prefijo `[FIX]`
3. **Fix inline CACG** — Se verifica nombre de ciudad antes de usar el fallback poco confiable `state_name`
4. **Barrido post-normalización** — Se ejecuta sobre todos los remates curados + scrapeados antes de deduplicación

**Resultados:**

| Provincia | Antes | Después |
|-----------|-------|---------|
| NEUQUEN | 41 | **0** (eliminada — todos eran Córdoba/Buenos Aires) |
| CORRIENTES | 81 | **16** (solo ciudades reales de Corrientes) |
| BUENOS AIRES | 58 | **127** (+69 recuperados) |
| CORDOBA | 38 | **78** (+40 recuperados) |

**Lo que NO cambia:**
- Sin cambios en UI/código cliente
- Sin cambios en schema de Supabase
- Sin cambios en otras fuentes del scraper (Colombo, O'Farrell, Lehmann, Madelan, UMC — su lógica de provincia hardcodeada ya era correcta)
- Sin cambios en lógica de deduplicación

**Por qué un mapa estático (no geocoding):**
- El conjunto de ciudades de remates ganaderos es finito y estable (~70 ciudades)
- Carga de datos única que corrige el pipeline permanentemente
- Detecta errores de TODAS las fuentes (bugs de API CACG, typos curados, fuentes futuras)
- Sin dependencia de API externa, sin rate limits, sin costo
- Ejecuta en O(1) por remate

**Cobertura:** 384 remates, 67 consignatarias, 10 provincias activas. NEUQUEN y SANTIAGO DEL ESTERO eliminadas (sin remates actuales en esas provincias — reaparecerán cuando se agreguen remates reales).

---

## [0.8.1] — 2026-03-09

### Verificación de perfiles — Supabase, Resend, admin dashboard

> `68e47bd` — feat: v0.8.1 claim flow — Supabase + Resend + admin dashboard
> `b86071e` — refactor: rename reclamar → verificar across claim flow

La primera feature que conecta la plataforma con los dueños reales de las consignatarias. Cualquier persona puede solicitar la verificación de un perfil — sin necesidad de cuenta.

**Flujo de verificación:**
1. El usuario visita `/consignatarias/[slug]` y ve el botón "Verificar este perfil"
2. Completa el formulario en `/consignatarias/[slug]/verificar` (email, nombre, CUIT, teléfono, rol)
3. Recibe email de confirmación vía Resend
4. Admin recibe notificación por email
5. Admin revisa en `/admin/claims` — aprueba o rechaza
6. Al aprobar: perfil marcado como verificado, otros reclamos pendientes auto-rechazados
7. El solicitante recibe email de aprobación/rechazo

**Arquitectura híbrida:**
- Supabase para `consignatarias` (74 registros) y `consignataria_claims` (nuevas solicitudes)
- JSON files sin cambios — remates, frigoríficos, precios de mercado siguen estáticos
- Scraper diario no fue tocado
- API routes: `POST /api/claims` (público), `GET /api/admin/claims`, `PATCH /api/admin/claims/[id]`

**Admin dashboard (`/admin/claims`):**
- Autenticación por Bearer token (`ADMIN_SECRET` env var) — sin sistema de auth completo
- Tabs: Pendientes / Aprobados / Rechazados / Todos
- Aprobar/Rechazar con nota opcional
- Terminal dark theme consistente con el resto del sitio

**Emails transaccionales (Resend):**
- Confirmación de solicitud al solicitante
- Notificación al admin (`agro@memola.com.ar`)
- Aprobación con link al perfil
- Rechazo con motivo opcional
- Lazy init del SDK (no rompe el build sin API key)
- `escapeHtml()` en todos los inputs de usuario

**Seguridad:**
- Validación Zod en todos los inputs
- Validación UUID en rutas admin
- CUIT regex (`^\d{2}-\d{8}-\d$`)
- RLS habilitado en ambas tablas (sin políticas anon — solo `service_role`)
- Unique partial index previene duplicados pendientes
- Normalización de email (lowercase + trim)

**Dependencias nuevas:**
- `@supabase/supabase-js` — cliente Supabase
- `resend` — emails transaccionales
- `zod` — validación de schemas

**Tracking GA4 nuevo:**
- `claim_cta_click` — click en "Verificar este perfil"
- `claim_submit` — envío del formulario
- `claim_success` — solicitud exitosa

**Cobertura:** 366 remates, 74 consignatarias verificables, 164 páginas estáticas (87 existentes + 74 verificar + admin + API).

---

## [0.7.0] — 2026-03-08

### SEO, locale y la 9° fuente del scraper

> `ea51d7b` — feat(seo): comprehensive SEO overhaul
> `2ac9eaf` — feat: add OG image for social sharing
> `7219098` — feat: update OG image - full bleed with bull, text at bottom
> `40cb7e0` — fix: normalize URLs without protocol prefix (www. → https://www.)
> `2ae0a9d` — fix: normalize all external URLs site-wide
> `545c4b1` — feat: add UMC Haciendas Villaguay (umchv.ar) as scraper source #9
> `5967719` — seo: add favicon.ico for better Google indexing
> `8e0c29a` — seo: add full icon set (16, 32, 180, 192, 512px) + metadata
> `263c511` — fix: DD/MM date format, remove PRO pinning, purge past auctions, clean tracked files

Después del rediseño terminal, había tres cosas pendientes: hacer que Google entienda el sitio, corregir detalles de locale para el público argentino, y expandir la cobertura de datos.

**Datos estructurados (JSON-LD):**
- `Organization` — Memola Medios S.A.S., logo, links sociales
- `WebSite` — search action, URL canónica
- `Dataset` — 440+ remates como dataset estructurado

**SEO técnico:**
- Sitemap dinámico `sitemap.ts` — ~140 URLs (páginas estáticas + 12 filtros por provincia + todos los perfiles de consignatarias)
- `robots.ts` — reglas estándar de allow
- Meta tags Open Graph + Twitter Card en cada página
- Redirección canónica `www` → `www` (301)
- Imagen OG con foto de toro a sangre completa, texto superpuesto

**Normalización de URLs (`src/lib/utils/url.ts`):**
- Prefijos `www.` sin protocolo → `https://www.`
- Manejo consistente de protocolo en todos los links externos
- Aplicado a todos los `sourceUrl` del feed de remates

**Formato de fecha DD/MM:**
- Argentina usa DD/MM, no MM/DD. Se actualizó `formatDateShort()` en `src/lib/ui/tokens.ts` para devolver `DD/MM`
- Formato inline en `OverviewClient.tsx` también corregido
- Todas las fechas visibles al usuario siguen la convención argentina

**Lógica de ordenamiento PRO corregida:**
- Los remates destacados ya no se fijan arriba del feed — aparecen en orden cronológico como todo, solo con destaque visual en ámbar/dorado
- Prominencia sin distorsión

**9° fuente del scraper:**
- **UMC Haciendas Villaguay** (`umchv.ar`) — remates de Entre Ríos
- Fuentes del scraper: CACG, Colombo y Colombo, O'Farrell, Lehmann, Madelan, dolarapi, mercadoagroganadero, MAGYP, UMC Haciendas

**Íconos:**
- Set completo: 16px, 32px, 180px (Apple Touch), 192px, 512px
- `favicon.ico` en raíz para soporte de browsers legacy / indexación Google
- Metadata de manifest actualizada

**Limpieza de datos:**
- Remates pasados purgados de `remates.json` para mantener el feed relevante
- Archivos trackeados obsoletos limpiados de git

**Cobertura:** 450 remates, 77 consignatarias, 9 fuentes de scraping, 12 provincias. Todas las fechas en DD/MM.

---

## [0.6.0] — 2026-03-07

### Rediseño terminal en vivo

> `120299c` — refactor: simplify design system for mobile readability
> `3af8817` — feat: live terminal redesign + bug fixes
> `97340bd` — docs: update README and CHANGELOG for v0.6.0 live terminal redesign

El dashboard necesitaba sentirse vivo. Fue una pasada puramente visual — sin features nuevas, solo hacer que las existentes se vean y se sientan como una terminal de trading real.

**Nuevo lenguaje visual:**
- Fondos tintados con tono azul sutil (`#0a0a0f`, `#16161d`)
- Sistema de color emerald `live` para indicadores y badges
- Barras con gradiente CSS reemplazando sparklines y barras ASCII
- Paneles glass con backdrop blur y fondos con gradiente
- Animaciones de entrada de fila (`fade-in-up`) y efectos de conteo de stats
- Barra de actividad scan-line con conteos en vivo (443 remates, 77 consignatarias, 12 provincias)
- Bordes redondeados (2px) en todos los componentes
- Headings sans-serif (Inter `font-heading`) para jerarquía visual

**Mejoras mobile:**
- Hints de gradiente swipe en scroll horizontal de nav
- Estado activo de nav con color accent y línea indicadora inferior
- Protección de overflow en columna de tags del directorio de consignatarias (100px → 120px)

**Fixes:**
- Links de remates IderCor — 6 remates tenían `sourceUrl` roto apuntando a artículo de noticias muerto, ahora linkan al perfil `/consignatarias/idercor`
- Font del logo cambiada de monospace a sans-serif
- Badge LIVE en panel Mercado ahora condicional — solo se muestra cuando hay remates hoy
- Barras de distribución por provincia: ASCII `█░` reemplazado con fills CSS proporcionales con gradiente
- Gráfico de tendencia INMAG: sparkline ASCII reemplazado con gráfico de barras proporcional
- Dots de estado cambiados de cuadrados a redondos (`border-radius: 50%`)

---

## [0.5.0] — 2026-03-07

### Perfiles de consignatarias — 70 páginas estáticas, un sistema de slugs canónicos

> `58afa46` — feat: add consignataria profile pages, GA4 tracking, canonical slug system
> `9b354fd` — feat: add comprehensive GA4 analytics tracking across all pages
> `4b308f3` — feat(seo): favicon, hreflang, GSC verification, meta updates
> `4e91898` — feat: consignatarias directory, claim CTA, nav update
> `3b5b314` — fix: sync auction/consignataria counts across layout, README, directory
> `62be425` — feat: add 4 new consignataria profiles (77 total)

La adición estructural más grande. Cada consignataria recibió su propia página — generada en build time desde los datos.

**Páginas de perfil (`/consignatarias/[slug]`):**
- Heatmap de calendario 12 meses (ENE–DIC) mostrando densidad de remates
- Gráfico de barras de distribución por tipo (INVERNADA / CRIA / GENERAL / REPROD / ESPECIAL)
- Lista de remates agrupada por mes con filas estilo terminal
- Barra de stats: total remates, cabezas estimadas, próximos, provincias, plazas principales
- Remates pasados mostrados con opacidad reducida

**Sistema de slugs canónicos (`consignataria-slugs.ts`):**
- 109 slugs raw de `remates.json` → 70 entidades canónicas únicas
- Maneja duplicados: `bressan` + `bressan-y-cia-s-r-l` + `bressan-y-cia-srl` → `bressan-y-cia` (103 remates combinados)
- Elimina sufijos legales (`-s-a`, `-s-r-l`, `-sa`, `-srl`)
- Visitas a slugs no canónicos → redirect 301 a URL canónica
- Slugs desconocidos → 404
- Funciones helper: `getCanonicalSlug()`, `getProfile()`, `getAuctionsForProfile()`, `getAllCanonicalSlugs()`

**Datos estructurados por perfil:**
- `BreadcrumbSchema`: Inicio > Remates > [Nombre de Consignataria]
- `LocalBusinessSchema`: nombre, ubicación, provincia
- `EventSchema`: próximos 5 remates (rich results de eventos de Google)

**También en este lote:**
- **Google Analytics 4** (G-6CZMZH9S6Y) vía `next/script` con estrategia `afterInteractive`
- **Directorio de consignatarias** (`/consignatarias`) — listado alfabético con tags de provincia y CTA de reclamo
- **Nombres clickeables** en feed `/remates` — nombres de consignatarias linkan a su perfil (con `stopPropagation` para que clicks en la fila sigan abriendo URLs fuente)
- **Favicon** + hreflang + verificación de Google Search Console
- **Sitemap** expandido con 70 URLs de consignatarias a priority 0.7

**Cobertura:** 443 remates, 77 consignatarias, 70 páginas de perfil, 12 provincias.

---

## [0.4.0] — 2026-03-06

### Monetización — el sistema de remates PRO

> `c4d3fd5` — feat: add featured PRO auction system + pitch deck for consignatarias

La primera feature de revenue. Las consignatarias ahora podían pagar para destacar sus remates en el feed — no con publicidades disruptivas, sino con prominencia visual de buen gusto.

**Tratamiento de remate PRO:**
- Badge `★ PRO` en ámbar/dorado
- Barra de acento izquierda en ámbar
- Layout expandido de 3 líneas mostrando la descripción completa
- Flag booleano `featured: true` en el schema de Auction
- Remates destacados ordenados por encima de los regulares dentro del mismo período

**Modelo de negocio cristalizado:**
1. **Remates PRO** — listados destacados pagos (tratamiento ámbar/dorado)
2. **Suscripciones de datos** — acceso premium a API de inteligencia de mercado
3. **Listados de directorio** — perfiles mejorados de consignatarias/frigoríficos

**Cobertura:** 440 remates, 77 consignatarias.

---

## [0.3.0] — 2026-02-26, 06:27 ART

### Automatización — scraper, datos en vivo y la primera identidad

> `94b9887` — feat: add daily auction scraper + GitHub Actions workflow
> `da864b3` — fix: upgrade Next.js 15.1.6 → 15.5.12 (CVE-2025-66478)
> `d426cfb` — docs: add README and CHANGELOG
> `e6f55f0` — feat: replace sample market data with real live data
> `28ac240` — data: update auctions (414) and market prices — 2026-02-26
> `401138f` — fix: redeploy Bloomberg terminal design
> `0a06dfe` — feat: terminal dark grey theme + clickable remates + smart date
> `ac833ef` — fix: rename to consignatarias.com.ar + mobile overflow + clickable rows
> `e8f9e6a` — fix: rename Ganado Terminal → consignatarias.com.ar on home + title
> `c7aa30a` — feat: add YC-style pitch deck in Argentine Spanish

El resto del día 1 — todo entre el primer commit a las 04:46 y la medianoche. Pasaron tres cosas importantes.

**El scraper (05:04):**

18 minutos después del primer commit, el scraper existía. Consultaba 6 fuentes en paralelo:

1. **CACG API** (`cacg.org.ar/iapi/auctions`) — ~128 remates de la Cámara Argentina de Consignatarios
2. **Colombo y Colombo** (`colomboycolombo.com.ar/remates`) — Buenos Aires, Santa Fe, Corrientes
3. **Ivan L. O'Farrell** (`ivanofarrell.com.ar/remates`) — Chaco, Santiago del Estero
4. **Cooperativa Guillermo Lehmann** (`cooperativalehmann.coop/hacienda/remates`) — Santa Fe
5. **Madelan** (`madelan.com.ar/proximos`) — remates streaming NEA
6. **dolarapi.com** — USD blue y oficial

El workflow de GitHub Actions corría diariamente a las 14:00 ART (17:00 UTC), auto-commiteaba cambios de datos, y disparaba rebuilds de Vercel.

Ingeniería clave: deduplicación por fecha + slug + ubicación, validación de fechas (rechazar entradas CACG malformadas), normalización de provincias, upgrade de seguridad Next.js 15.1.6 → 15.5.12 (CVE-2025-66478).

**Datos de mercado en vivo (06:27):**

A las 6:27 AM — menos de 2 horas desde el inicio — el dashboard de mercado estaba consultando datos reales:

- **Índice INMAG** ($/kg vivo) scrapeado de `mercadoagroganadero.com.ar`
- **Precios por categoría** derivados de INMAG usando ratios de mercado:
  ```
  novillos: 1.0 (base), novillitos: 0.95, vaquillonas: 0.90,
  vacas: 0.72, toros: 0.65, terneros: 1.10
  ```
- **Maíz FOB** de la API JSON de MAGYP
- **USD blue/oficial** de dolarapi.com

A las 17:55 UTC, corrió el primer scrape automatizado: **414 remates**, precios de mercado frescos. El pipeline estaba vivo.

**Identidad (20:47–23:51):**

La sesión de tarde/noche fue sobre identidad. "Ganado Terminal" era un nombre de trabajo — bueno para la vibra, incorrecto para el dominio.

- **Tema dark zinc** — background `#0a0a0a`, bordes zinc-700, la estética Bloomberg ajustada
- **Rename** — Ganado Terminal → consignatarias.com.ar en todas partes (layout, título, meta tags, landing)
- **Filas clickeables** — las filas de remates linkan a URLs fuente, abriendo en nueva pestaña
- **Fechas inteligentes** — fechas relativas ("Hoy", "Mañana") junto a fechas absolutas
- **Fix de overflow mobile** — scroll horizontal en pantallas chicas resuelto
- **Pitch deck** — PDF estilo YC en español argentino

Se registró el dominio `consignatarias.com.ar` y se apuntó a Vercel. El TLD `.ar` fue deliberado — es un producto argentino para el mercado argentino.

**Cobertura:** 414 remates, 86 consignatarias, 12 provincias. Datos de mercado actualizándose diariamente. El cron diario corrió silenciosamente durante los siguientes 8 días (Feb 27 – Mar 5), acumulando 412 → 442 remates.

---

## [0.2.0] — 2026-02-26, 04:46 ART

### Expansión de datos — 92 a 277 remates

63 remates curados fueron agregados de 15+ fuentes regionales que no se pueden scrapear:

- **Ivan L. O'Farrell** — 19 remates en el circuito chaqueño (Machagai, Gral. San Martín, Santa Sylvina)
- **IderCor** — 6 remates de pequeños productores en Corrientes (Mercedes, Ituzaingó, Caá Catí, Bella Vista, Sauce)
- **Nangapiry SA / Asoc. Ganadera Alto Paraná** — Misiones: Fiesta del Ternero Misionero
- **Ganaderos de Formosa** — Comandante Fontana + fechas adicionales
- **Néstor Hugo Fuentes** — circuito pampeano (Victorica, Gral. Acha, Algarrobo del Águila, Bernasconi)
- **Tradición Ganadera / Porro** — Villa Ángela, Chaco (mensual)
- **Coop. La Ganadera** — Entre Ríos (La Paz, Villaguay, María Grande)
- **Etchevehere Rural** — Entre Ríos (Federal, Gral. Ramírez eventos especiales)
- **Bressan y Cía** — Chajarí, Entre Ríos
- **Eventos Expo** — Agroactiva, Expo Rural Rafaela, Expo Gualeguaychú, Expo Rural Misiones, Expo Rural Chaco, Expo Rural Corrientes

Se agregó la provincia de Misiones (ahora 11 provincias).

**Cobertura:** 277 remates, 64 consignatarias, 11 provincias.

---

## [0.1.0] — 2026-02-26, 04:46 ART

### Primer commit — un producto completo en 28 archivos

> `c180601` — Initial release: Ganado Terminal — livestock market intelligence platform

El primer commit no fue un esqueleto. Fueron 13.764 líneas en 28 archivos — un dashboard completamente funcional con datos, navegación, filtros y estilos. El nombre era "Ganado Terminal".

**Lo que se shippeó:**

- **Landing page** (`/`) — paleta zinc, fuente Inter, 3 previews de features (Calendario de Remates, Directorio de Frigoríficos, Precios de Mercado), cards de stats en vivo desde JSON
- **Dashboard terminal** con 4 páginas detrás de un route group `(terminal)`:
  - `/overview` — stats generales, próximos eventos, resumen de mercado
  - `/remates` — feed de remates con filtros (provincia, tipo, categoría, tabs de período)
  - `/frigorificos` — 364 plantas frigoríficas con búsqueda y filtros por provincia
  - `/mercado` — índice INMAG, desglose de precios por categoría, cotización USD blue/oficial
- **Archivos de datos:**
  - `remates.json` — 92 remates (15 de muestra + 18 de Colombo y Colombo + CACG + otros)
  - `frigorificos.json` — 364 registros de SENASA/MAGYP
  - `consignatarias.json` — 56 entidades con CUIT, matrícula, info de contacto
  - `market-prices.json` — INMAG, 6 categorías ganaderas, maíz FOB, cotización USD
  - `featured-links.json` — recursos de la industria curados
- **Schema TypeScript** con campos `time` y `estimatedHeads` nullable
- **Funciones seed** — `getAuctions()`, `getUpcomingAuctions()`, capa de acceso a datos
- **Config Tailwind** con paleta de colores terminal, fuente Inter, animaciones custom (`float-subtle`, `dash-flow`, `pulse-soft`, `pulse-live`)
- **CSS** — 342 líneas de estilos terminal y animaciones de landing page

**Cobertura:** 92 remates, 49 consignatarias, 10 provincias.

---

## [0.0.2] — 2026-02-26, antes del amanecer

### Curación de los primeros 92 remates

Antes del primer commit, se curaron 92 remates a mano para probar el concepto. Esto significó:

- Investigar próximos remates desde sitios web de consignatarias, redes sociales y grillas de TV
- Diseñar el schema TypeScript: interfaz `Auction` con `id`, `title`, `consignatariaName`, `consignatariaSlug`, `date` (YYYY-MM-DD), `time` (HH:MM o null), `location`, `province`, `type` (invernada/cria/reproductores/general/especial), `mainCategory`, `estimatedHeads`, `description`, `youtubeUrl`, `catalogUrl`, `source`, `sourceUrl`, `status`
- Construir las funciones seed: `getAuctions()`, `getUpcomingAuctions()`, `getAuctionsByProvince()`, `getAuctionsByType()`
- Estructurar `remates.json` para que pueda ser editado a mano y escrito por máquina con un futuro scraper

Los 92 remates vinieron de: 15 entradas de muestra para establecer el formato, 18 scrapeadas del calendario anual de Colombo y Colombo, y el resto de listados CACG e investigación manual.

15 fuentes ya identificadas. 49 consignatarias. 10 provincias.

---

## [0.0.1] — 2026-02-26, antes del amanecer

### Primero los datos — frigoríficos, consignatarias, precios de mercado

Antes de escribir un solo componente React, se recolectaron los datos:

- **364 frigoríficos** de datos abiertos SENASA/MAGYP — cada planta frigorífica registrada en Argentina con nombre, CUIT, provincia, localidad, tipo (bovinos/porcinos/ovinos/aves), número RENSPA
- **56 consignatarias** del registro público — nombre, CUIT, número de matrícula, info de contacto, provincia
- **Precios de mercado** — índice INMAG ($/kg vivo), 6 categorías (novillos, novillitos, vaquillonas, vacas, toros, terneros), maíz FOB, cotización USD blue/oficial
- **Links destacados** — lista curada de recursos de la industria (CACG, Rosgan, SENASA, etc.)

Estos datos se convirtieron en los archivos JSON que toda la plataforma lee. Sin base de datos — solo JSON estructurado commiteado a git.

---

## [0.0.0] — 2026-02-26, antes del amanecer

### Génesis

Antes del primer commit, hubo una idea: el mercado de remates ganaderos de Argentina es una industria de USD 15B+ que funciona con grupos de WhatsApp, calendarios PDF y boca a boca. Nadie había construido una Bloomberg Terminal para eso.

La apuesta técnica se hizo antes de escribir una línea de código:

```bash
npx create-next-app@latest consignatarias-next --typescript --tailwind --app --src-dir
```

**¿Por qué Next.js 15 + SSG + JSON?** Porque los datos cambian una vez al día (los remates se programan con semanas de anticipación), no hay contenido generado por usuarios, y todo el dataset entra en memoria. Un sitio estático en el CDN de Vercel significa TTFB < 50ms, cero costo de hosting, y sin base de datos que administrar.

*Actualización:* En v0.8.1 se agregó una base de datos PostgreSQL en Supabase para perfiles de consignatarias, reclamos de verificación y autenticación (magic link). Pero la apuesta core se mantuvo — datos de remates, frigoríficos y precios de mercado siguen siendo archivos JSON rebuildeados diariamente. La base de datos maneja las partes que necesitan persistencia y auth, no los datos públicos de alta lectura.

El `package.json` inicial tenía exactamente 3 dependencias y 7 devDependencies:

```json
{
  "dependencies": { "next": "15.1.6", "react": "19.0.0", "react-dom": "19.0.0" },
  "devDependencies": { "tailwindcss": "^3.4.1", "postcss": "^8.4.24", "autoprefixer": "^10.4.14", "typescript": "^5" }
}
```

Sin state management. Sin ORM. Sin librería de componentes. Sin framework de testing. Solo Next.js, Tailwind y TypeScript. El stack core sigue siendo el mismo — después se agregaron `@supabase/supabase-js` y `@supabase/ssr` (auth + base de datos), `resend` (emails), `zod` (validación), `sharp` (optimización de imágenes), `@vercel/analytics` y `@vercel/speed-insights`.

---

## Los números

| Métrica | 0.0.0 (Feb 26) | 0.7.0 (Mar 8) | 0.9.0 (Mar 9) | 0.9.5 (Mar 10) | 0.9.7 (Mar 10) |
|---------|-----------------|-----------------|-----------------|-----------------|-----------------|
| Remates | 0 → 92 → 414 | 450 | 385 | 385 | 385 + owner CRUD |
| Consignatarias | 49 | 77 | 77 | 77 | 77 |
| Páginas de perfil | 0 | 70 | 77 + 77 verificar | 77 + 77 verificar | 77 + 77 verificar |
| Páginas de frigoríficos | 0 | 0 | 0 | 364 | 364 |
| Páginas por provincia | 0 | 0 | 10 | 10 | 10 |
| Fuentes del scraper | 0 → 6 | 9 | 9 | 9 | 9 |
| Provincias | 10 | 12 | 10 | 10 | 10 |
| Frigoríficos | 364 | 364 | 364 | 364 (126 enriq.) | 364 (126 enriq.) |
| Páginas estáticas | ~10 | ~80 | ~170+ | **552** | **552** |
| URLs en sitemap | 0 | ~140 | ~100 | **~460** | **~460** |
| Base de datos | ninguna | ninguna | Supabase (3 tablas) | **Supabase (9 tablas)** | **Supabase (10 tablas)** |
| Revenue | $0 | $0 | $0 | **Rebill integrado** | **Rebill integrado** |
| Onboarding | — | — | manual | admin-first | **trust-first** |
| Costo de hosting | $0 | $0 | $0 | $0 | $0 |

---

## Contribuyentes

- **Humano** — visión de producto, conocimiento de mercado, curación de datos, remates manuales, decisiones de negocio
- **Claude** (Anthropic) — arquitectura, código, scraper, SEO, estilos, este changelog

Construido con `claude-opus-4-6` vía Claude Code CLI.
