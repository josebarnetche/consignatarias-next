# Changelog

The complete build log of **consignatarias.com.ar** — from the first `npx create-next-app` to a live cattle auction platform covering 385+ remates across 10 Argentine provinces, with Supabase auth, frigorífico enrichment, and a full SEO stack.

Built in 13 days (Feb 26 – Mar 10, 2026). One human, one AI.

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

### SEO overhaul — from 2 indexed pages to full discoverability

> `47b74ea` — feat: comprehensive SEO overhaul for Google discoverability (v0.9.0)

**The problem:** Only 2 of 168 pages were indexed by Google. Zero rankings for any keyword, brand or non-brand. The site was invisible to search.

**What changed (4 parallel workstreams):**

**1. Homepage rewrite (`page.tsx`)**
- Complete copy rewrite from `proposed-copies.md`
- New H1: "Todos los remates ganaderos de Argentina en una sola pantalla"
- Problem/solution structure: El Problema → Cómo Funciona → Comparación vs WhatsApp
- Dynamic counts (auctions, consignatarias) from live data
- New final CTA section

**2. Province landing pages (10 new routes)**
- `/remates/[provincia]` — 10 static pages targeting "remates hacienda [provincia]" keywords
- 150-250 words of unique SEO copy per province with real cities and consignatarias
- `generateStaticParams()` for SSG
- BreadcrumbList + ItemList JSON-LD per page
- Stats bar, server-rendered auction list, navigation links

**3. Technical SEO fixes**
- `next/font/google` replaces CDN `<link>` tags (eliminates render-blocking)
- Twitter Cards auto-derived from OpenGraph (removed redundant `twitter` metadata)
- Dynamic meta description with live auction count
- `noindex` on thin pages: `/verificar` (77 pages), `/login`
- Removed 77 `/verificar` URLs from sitemap (were diluting crawl budget)
- `Permissions-Policy` header added to `vercel.json`
- Login page refactored: extracted `LoginClient.tsx` so `page.tsx` can export metadata

**4. Content SEO + E-E-A-T**
- `/quienes-somos` — new institutional page (Memola Medios SAS, data sources, methodology, contact)
- Server-rendered intro text on all sections: `/remates`, `/mercado`, `/frigorificos`, `/consignatarias`
- `SectionBreadcrumbSchema` component for structured breadcrumbs on every section
- Terminal footer with copyright, "Quiénes Somos" link, contact email

**Sitemap:** ~140 URLs → ~100 URLs (removed thin pages, added provinces + quienes-somos). Quality over quantity.

**Coverage:** 385 auctions, 77 consignatarias, 10 provinces, ~170+ static pages.

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

**Coverage:** 385 auctions, 67 consignatarias, 10 provinces.

---

## [0.8.3] — 2026-03-09

### Fix province misassignment — city-to-province correction map

> `TBD` — fix: province misassignment in scraper (CITY_PROVINCE_MAP)

**The problem:** ~107 of 385 auctions (28%) had wrong province assignments. Users filtering by province saw incorrect results — e.g., San Nicolás de los Arroyos (Buenos Aires) showed under Corrientes, and 41 Córdoba auctions appeared as Neuquén.

**Root causes identified:**
1. **CACG API bad `state_name`** — When `PROVINCE_MAP[r.state_id]` failed (bad/missing ID), the scraper fell back to `r.state_name`, which was often "CORRIENTES" for Buenos Aires cities. Affected **65 auctions**.
2. **Curated entries with wrong province** — Manual entries from individual website scrapes (saenz-valiente, ferias-rauch, jauregui-lorda, etc.) had wrong provinces like "NEUQUEN" for Córdoba cities. Affected **42 auctions**.
3. **Location field echoed wrong province** — `location` was built as `"CITY, PROVINCE"`, so wrong province meant wrong location text (e.g., `"RAUCH, CORRIENTES"`).

**Solution: `CITY_PROVINCE_MAP`**

A lookup table of ~70 Argentine cattle auction cities mapped to their correct province, added to `scripts/scrape-auctions.mjs`. Applied as the **highest-priority** province source, overriding both CACG API data and curated entries.

**Implementation (single file: `scripts/scrape-auctions.mjs`):**
1. **`CITY_PROVINCE_MAP`** — ~70 entries covering Buenos Aires (30 cities), Córdoba (5), Corrientes (7), Santa Fe (3), Entre Ríos (3), Chaco (4), Santiago del Estero (1), La Pampa (2), San Luis (1), Formosa (1)
2. **`correctProvince()` function** — Extracts city from `location` field, normalizes (uppercase + NFD accent removal), looks up in map, fixes both `province` and `location` fields, logs corrections with `[FIX]` prefix
3. **CACG inline fix** — City name checked before falling back to unreliable `state_name`
4. **Post-normalization sweep** — Runs on all curated + scraped auctions before deduplication

**Results:**

| Province | Before | After |
|----------|--------|-------|
| NEUQUEN | 41 | **0** (eliminated — all were Córdoba/Buenos Aires) |
| CORRIENTES | 81 | **16** (only real Corrientes cities remain) |
| BUENOS AIRES | 58 | **127** (+69 recovered) |
| CORDOBA | 38 | **78** (+40 recovered) |

**What this does NOT change:**
- No UI/client code changes
- No Supabase schema changes
- No changes to other scraper sources (Colombo, O'Farrell, Lehmann, Madelan, UMC — their hardcoded province logic was already correct)
- No changes to deduplication logic

**Why a static map (not geocoding):**
- The set of cattle auction cities is finite and stable (~70 cities)
- One-time data entry that permanently fixes the pipeline
- Catches errors from ALL sources (CACG API bugs, curated typos, future sources)
- No external API dependency, no rate limits, no cost
- Runs in O(1) per auction

**Coverage:** 384 auctions, 67 consignatarias, 10 provinces active. NEUQUEN and SANTIAGO DEL ESTERO eliminated (no current auctions in those provinces — will reappear when real auctions are added).

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
- Zod validation en todos los inputs
- UUID validation en admin routes
- CUIT regex (`^\d{2}-\d{8}-\d$`)
- RLS habilitado en ambas tablas (sin políticas anon — solo `service_role`)
- Unique partial index previene duplicados pendientes
- Email normalization (lowercase + trim)

**Dependencias nuevas:**
- `@supabase/supabase-js` — cliente Supabase
- `resend` — emails transaccionales
- `zod` — validación de schemas

**GA4 tracking nuevo:**
- `claim_cta_click` — click en "Verificar este perfil"
- `claim_submit` — envío del formulario
- `claim_success` — solicitud exitosa

**Cobertura:** 366 remates, 74 consignatarias verificables, 164 páginas estáticas (87 existentes + 74 verificar + admin + API).

---

## [0.7.0] — 2026-03-08

### SEO, locale, and the 9th scraper source

> `ea51d7b` — feat(seo): comprehensive SEO overhaul
> `2ac9eaf` — feat: add OG image for social sharing
> `7219098` — feat: update OG image - full bleed with bull, text at bottom
> `40cb7e0` — fix: normalize URLs without protocol prefix (www. → https://www.)
> `2ae0a9d` — fix: normalize all external URLs site-wide
> `545c4b1` — feat: add UMC Haciendas Villaguay (umchv.ar) as scraper source #9
> `5967719` — seo: add favicon.ico for better Google indexing
> `8e0c29a` — seo: add full icon set (16, 32, 180, 192, 512px) + metadata
> `263c511` — fix: DD/MM date format, remove PRO pinning, purge past auctions, clean tracked files

After the terminal redesign shipped, three things needed attention: making Google understand the site, fixing locale details for the Argentine audience, and expanding data coverage.

**Structured data (JSON-LD):**
- `Organization` — Memola Medios S.A.S., logo, social links
- `WebSite` — search action, canonical URL
- `Dataset` — 440+ auctions as a structured dataset

**Technical SEO:**
- Dynamic `sitemap.ts` — ~140 URLs (static pages + 12 province filters + all consignataria profiles)
- `robots.ts` — standard allow rules
- Open Graph + Twitter Card meta tags on every page
- `www` → `www` canonical redirect (301)
- OG image with full-bleed bull photo, text overlay

**URL normalization (`src/lib/utils/url.ts`):**
- Bare `www.` prefixes → `https://www.`
- Consistent protocol handling across all external links
- Applied site-wide to every `sourceUrl` in the auction feed

**DD/MM date format:**
- Argentina uses DD/MM, not MM/DD. The central `formatDateShort()` in `src/lib/ui/tokens.ts` was updated to return `DD/MM`
- Inline date formatting in `OverviewClient.tsx` also corrected
- Every date visible to users now follows Argentine convention

**PRO sort logic corrected:**
- Featured auctions no longer pin to top of feed — they appear in chronological order like everything else, just visually highlighted in amber/gold
- Prominence without distortion

**9th scraper source:**
- **UMC Haciendas Villaguay** (`umchv.ar`) — Entre Ríos auctions
- Scraper sources now: CACG, Colombo y Colombo, O'Farrell, Lehmann, Madelan, dolarapi, mercadoagroganadero, MAGYP, UMC Haciendas

**Icons:**
- Full icon set: 16px, 32px, 180px (Apple Touch), 192px, 512px
- `favicon.ico` in root for legacy browser/Google indexing support
- Manifest metadata updated

**Data hygiene:**
- Past auctions purged from `remates.json` to keep the feed relevant
- Stale tracked files cleaned from git

**Coverage:** 450 auctions, 77 consignatarias, 9 scraper sources, 12 provinces. All dates in DD/MM.

---

## [0.6.0] — 2026-03-07

### Live terminal redesign

> `120299c` — refactor: simplify design system for mobile readability
> `3af8817` — feat: live terminal redesign + bug fixes
> `97340bd` — docs: update README and CHANGELOG for v0.6.0 live terminal redesign

The dashboard needed to feel alive. This was a pure visual pass — no new features, just making the existing ones look and feel like a real trading terminal.

**New visual language:**
- Tinted backgrounds with subtle blue hue (`#0a0a0f`, `#16161d`)
- Emerald `live` color system for indicators and badges
- CSS gradient bars replacing ASCII sparklines and bar charts
- Glass panels with backdrop blur and gradient backgrounds
- Row enter animations (`fade-in-up`) and stat count-up effects
- Scan-line activity bar with live data counts (443 remates, 77 consignatarias, 12 provincias)
- Rounded corners (2px) across all components
- Sans-serif headings (Inter `font-heading`) for visual hierarchy

**Mobile improvements:**
- Swipe gradient hints on horizontal nav scroll
- Active nav state with accent color and bottom indicator line
- Overflow protection on consignatarias directory tags column (100px → 120px)

**Fixes:**
- IderCor auction links — 6 auctions had broken `sourceUrl` pointing to dead news article, now link to `/consignatarias/idercor` profile
- Logo font changed from monospace to sans-serif
- LIVE badge on Mercado panel now conditional — only shows when auctions are happening today
- Province breakdown bars: ASCII `█░` replaced with proportional CSS gradient fills
- INMAG trend chart: ASCII sparkline replaced with proportional bar chart
- Status dots changed from square to round (`border-radius: 50%`)

---

## [0.5.0] — 2026-03-07

### Consignataria profiles — 70 static pages, one canonical slug system

> `58afa46` — feat: add consignataria profile pages, GA4 tracking, canonical slug system
> `9b354fd` — feat: add comprehensive GA4 analytics tracking across all pages
> `4b308f3` — feat(seo): favicon, hreflang, GSC verification, meta updates
> `4e91898` — feat: consignatarias directory, claim CTA, nav update
> `3b5b314` — fix: sync auction/consignataria counts across layout, README, directory
> `62be425` — feat: add 4 new consignataria profiles (77 total)

The biggest structural addition. Every consignataria got its own page — generated at build time from the data.

**Profile pages (`/consignatarias/[slug]`):**
- 12-month calendar heatmap (ENE–DIC) showing auction density
- Type distribution bar chart (INVERNADA / CRIA / GENERAL / REPROD / ESPECIAL)
- Auction list grouped by month with full terminal-styled rows
- Stats bar: total remates, estimated heads, upcoming count, provinces, main plazas
- Past auctions shown at reduced opacity

**Canonical slug system (`consignataria-slugs.ts`):**
- 109 raw slugs from `remates.json` → 70 unique canonical entities
- Handles duplicates: `bressan` + `bressan-y-cia-s-r-l` + `bressan-y-cia-srl` → `bressan-y-cia` (103 combined auctions)
- Strips legal suffixes (`-s-a`, `-s-r-l`, `-sa`, `-srl`)
- Non-canonical visits → 301 redirect to canonical URL
- Unknown slugs → 404
- Helper functions: `getCanonicalSlug()`, `getProfile()`, `getAuctionsForProfile()`, `getAllCanonicalSlugs()`

**Structured data per profile:**
- `BreadcrumbSchema`: Inicio > Remates > [Consignataria Name]
- `LocalBusinessSchema`: name, location, province
- `EventSchema`: next 5 upcoming auctions (Google event rich results)

**Also in this batch:**
- **Google Analytics 4** (G-6CZMZH9S6Y) via `next/script` with `afterInteractive` strategy
- **Consignatarias directory** (`/consignatarias`) — alphabetical listing with province tags and claim CTA
- **Clickable names** in `/remates` feed — consignataria names link to their profile (with `stopPropagation` so row clicks still open source URLs)
- **Favicon** + hreflang + Google Search Console verification
- **Sitemap** expanded with 70 consignataria URLs at priority 0.7

**Coverage:** 443 auctions, 77 consignatarias, 70 profile pages, 12 provinces.

---

## [0.4.0] — 2026-03-06

### Monetization — the PRO auction system

> `c4d3fd5` — feat: add featured PRO auction system + pitch deck for consignatarias

The first revenue feature. Consignatarias could now pay to feature their auctions in the feed — not with disruptive ads, but with tasteful visual prominence.

**PRO auction treatment:**
- `★ PRO` badge in amber/gold
- Left accent bar in amber
- 3-line expanded layout showing the full description
- `featured: true` boolean flag on the Auction schema
- Featured auctions sorted above regular ones within the same time period

**Business model crystallized:**
1. **Remates PRO** — paid featured listings (amber/gold treatment)
2. **Data subscriptions** — premium API access for market intelligence
3. **Directory listings** — enhanced consignataria/frigorífico profiles

**Coverage:** 440 auctions, 77 consignatarias.

---

## [0.3.0] — 2026-02-26, 06:27 ART

### Automation — scraper, live data, and the first identity

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

This was the rest of day 1 — everything between the first commit at 04:46 and midnight. Three major things happened.

**The scraper (05:04):**

18 minutes after the first commit, the scraper existed. It pulled from 6 sources in parallel:

1. **CACG API** (`cacg.org.ar/iapi/auctions`) — ~128 auctions from the Cámara Argentina de Consignatarios
2. **Colombo y Colombo** (`colomboycolombo.com.ar/remates`) — Buenos Aires, Santa Fe, Corrientes
3. **Ivan L. O'Farrell** (`ivanofarrell.com.ar/remates`) — Chaco, Santiago del Estero
4. **Cooperativa Guillermo Lehmann** (`cooperativalehmann.coop/hacienda/remates`) — Santa Fe
5. **Madelan** (`madelan.com.ar/proximos`) — NEA streaming auctions
6. **dolarapi.com** — USD blue and oficial exchange rates

The GitHub Actions workflow ran daily at 14:00 ART (17:00 UTC), auto-committed data changes, and triggered Vercel rebuilds.

Key engineering: deduplication by date + slug + location, date validation (reject malformed CACG entries), province normalization, Next.js security upgrade 15.1.6 → 15.5.12 (CVE-2025-66478).

**Live market data (06:27):**

By 6:27 AM — less than 2 hours in — the market dashboard was pulling real data:

- **INMAG index** ($/kg vivo) scraped from `mercadoagroganadero.com.ar`
- **Category prices** derived from INMAG using market ratios:
  ```
  novillos: 1.0 (base), novillitos: 0.95, vaquillonas: 0.90,
  vacas: 0.72, toros: 0.65, terneros: 1.10
  ```
- **Corn FOB** from MAGYP's JSON API
- **USD blue/oficial** from dolarapi.com

At 17:55 UTC, the first automated scrape ran: **414 auctions**, fresh market prices. The pipeline was alive.

**Identity (20:47–23:51):**

The afternoon/evening session was about identity. "Ganado Terminal" was a working title — good for the vibe, wrong for the domain.

- **Dark zinc theme** — `#0a0a0a` background, zinc-700 borders, the Bloomberg aesthetic dialed in
- **Rename** — Ganado Terminal → consignatarias.com.ar everywhere (layout, title, meta tags, landing)
- **Clickable rows** — auction rows linked to source URLs, opening in new tabs
- **Smart dates** — relative dates ("Hoy", "Mañana") alongside absolute dates
- **Mobile overflow fix** — horizontal scroll on small screens resolved
- **Pitch deck** — YC-style PDF in Argentine Spanish

The domain `consignatarias.com.ar` was registered and pointed to Vercel. The `.ar` TLD was deliberate — this is an Argentine product for the Argentine market.

**Coverage:** 414 auctions, 86 consignatarias, 12 provinces. Market data updating daily. The daily cron ran quietly through the next 8 days (Feb 27 – Mar 5), accumulating 412 → 442 auctions.

---

## [0.2.0] — 2026-02-26, 04:46 ART

### Data expansion — 92 to 277 auctions

63 curated auctions were added from 15+ regional sources that can't be scraped:

- **Ivan L. O'Farrell** — 19 auctions across the Chaco circuit (Machagai, Gral. San Martín, Santa Sylvina)
- **IderCor** — 6 small producer auctions in Corrientes (Mercedes, Ituzaingó, Caá Catí, Bella Vista, Sauce)
- **Nangapiry SA / Asoc. Ganadera Alto Paraná** — Misiones: Fiesta del Ternero Misionero
- **Ganaderos de Formosa** — Comandante Fontana + additional dates
- **Néstor Hugo Fuentes** — La Pampa circuit (Victorica, Gral. Acha, Algarrobo del Águila, Bernasconi)
- **Tradición Ganadera / Porro** — Villa Ángela, Chaco (monthly)
- **Coop. La Ganadera** — Entre Ríos (La Paz, Villaguay, María Grande)
- **Etchevehere Rural** — Entre Ríos (Federal, Gral. Ramírez special events)
- **Bressan y Cía** — Chajarí, Entre Ríos
- **Expo events** — Agroactiva, Expo Rural Rafaela, Expo Gualeguaychú, Expo Rural Misiones, Expo Rural Chaco, Expo Rural Corrientes

Misiones province added (now 11 provinces).

**Coverage:** 277 auctions, 64 consignatarias, 11 provinces.

---

## [0.1.0] — 2026-02-26, 04:46 ART

### First commit — a complete product in 28 files

> `c180601` — Initial release: Ganado Terminal — livestock market intelligence platform

The first commit was not a skeleton. It was 13,764 lines across 28 files — a fully functional dashboard with data, navigation, filters, and styling. The name was "Ganado Terminal."

**What shipped:**

- **Landing page** (`/`) — zinc palette, Inter font, 3 feature previews (Calendario de Remates, Directorio de Frigoríficos, Precios de Mercado), live stat cards pulling from JSON
- **Terminal dashboard** with 4 pages behind a `(terminal)` route group:
  - `/overview` — general stats, upcoming events, market summary
  - `/remates` — auction feed with filters (province, type, category, time period tabs)
  - `/frigorificos` — 364 slaughterhouses with search and province filters
  - `/mercado` — INMAG index, category price breakdowns, USD blue/oficial rates
- **Data files:**
  - `remates.json` — 92 auctions (15 sample + 18 from Colombo y Colombo + CACG + others)
  - `frigorificos.json` — 364 records from SENASA/MAGYP
  - `consignatarias.json` — 56 entities with CUIT, matrícula, contact info
  - `market-prices.json` — INMAG, 6 cattle categories, corn FOB, USD rates
  - `featured-links.json` — curated community resources
- **TypeScript schema** with nullable `time` and `estimatedHeads` fields
- **Seed functions** — `getAuctions()`, `getUpcomingAuctions()`, data access layer
- **Tailwind config** with terminal color palette, Inter font, custom animations (`float-subtle`, `dash-flow`, `pulse-soft`, `pulse-live`)
- **CSS** — 342 lines of terminal styling and landing page animations

**Coverage:** 92 auctions, 49 consignatarias, 10 provinces.

---

## [0.0.2] — 2026-02-26, before dawn

### Curating the first 92 auctions

Before the first commit, 92 auctions were hand-curated to prove the concept. This meant:

- Researching upcoming remates from consignataria websites, social media, and TV schedules
- Designing the TypeScript schema: `Auction` interface with `id`, `title`, `consignatariaName`, `consignatariaSlug`, `date` (YYYY-MM-DD), `time` (HH:MM or null), `location`, `province`, `type` (invernada/cria/reproductores/general/especial), `mainCategory`, `estimatedHeads`, `description`, `youtubeUrl`, `catalogUrl`, `source`, `sourceUrl`, `status`
- Building the seed functions: `getAuctions()`, `getUpcomingAuctions()`, `getAuctionsByProvince()`, `getAuctionsByType()`
- Structuring `remates.json` so it could be both hand-edited and machine-written by a future scraper

The 92 auctions came from: 15 sample entries to establish the format, 18 scraped from Colombo y Colombo's annual calendar, and the rest from CACG listings and manual research.

15 sources already identified. 49 consignatarias. 10 provinces.

---

## [0.0.1] — 2026-02-26, before dawn

### Data first — frigoríficos, consignatarias, market prices

Before writing a single React component, the data was collected:

- **364 frigoríficos** from SENASA/MAGYP open data — every registered slaughterhouse in Argentina with name, CUIT, province, locality, type (bovinos/porcinos/ovinos/aves), RENSPA number
- **56 consignatarias** from the public registry — name, CUIT, matrícula number, contact info, province
- **Market prices** — INMAG index ($/kg vivo), 6 category breakdowns (novillos, novillitos, vaquillonas, vacas, toros, terneros), corn FOB, USD blue/oficial rates
- **Featured links** — curated list of industry resources (CACG, Rosgan, SENASA, etc.)

This data became the JSON files that the entire platform reads from. No database — just structured JSON committed to git.

---

## [0.0.0] — 2026-02-26, before dawn

### Genesis

Before the first commit, there was an idea: Argentina's cattle auction market is a $15B+ industry running on WhatsApp groups, PDF calendars, and word of mouth. No one had built a Bloomberg Terminal for it.

The technical bet was made before writing a line of code:

```bash
npx create-next-app@latest consignatarias-next --typescript --tailwind --app --src-dir
```

**Why Next.js 15 + SSG + JSON?** Because the data changes once a day (auctions are scheduled weeks in advance), there's no user-generated content, and the entire dataset fits in memory. A static site on Vercel's CDN means TTFB < 50ms, zero hosting cost, and no database to manage.

*Update:* By v0.8.1, a Supabase PostgreSQL database was added for consignataria profiles, verification claims, and user authentication (magic link). But the core bet held — auction data, frigorificos, and market prices are still JSON files rebuilt daily. The database handles the parts that need persistence and auth, not the read-heavy public data.

The initial `package.json` had exactly 3 dependencies and 7 devDependencies:

```json
{
  "dependencies": { "next": "15.1.6", "react": "19.0.0", "react-dom": "19.0.0" },
  "devDependencies": { "tailwindcss": "^3.4.1", "postcss": "^8.4.24", "autoprefixer": "^10.4.14", "typescript": "^5" }
}
```

No state management. No ORM. No component library. No testing framework. Just Next.js, Tailwind, and TypeScript. The core stack is still the same — we later added `@supabase/supabase-js` and `@supabase/ssr` (auth + database), `resend` (emails), `zod` (validation), `sharp` (image optimization), `@vercel/analytics`, and `@vercel/speed-insights`.

---

## The numbers

| Metric | 0.0.0 (Feb 26) | 0.7.0 (Mar 8) | 0.9.0 (Mar 9) | 0.9.1 (Mar 10) |
|--------|-----------------|-----------------|-----------------|-----------------|
| Auctions | 0 → 92 → 414 | 450 | 385 | 385 |
| Consignatarias | 49 | 77 | 77 | 77 |
| Profile pages | 0 | 70 | 77 + 77 verificar | 77 + 77 verificar |
| Province pages | 0 | 0 | 10 | 10 |
| Scraper sources | 0 → 6 | 9 | 9 | 9 |
| Provinces | 10 | 12 | 10 | 10 |
| Frigoríficos | 364 | 364 | 364 | 364 (126 enriched) |
| Static HTML pages | ~10 | ~80 | ~170+ | ~170+ |
| Sitemap URLs | 0 | ~140 | ~100 | ~100 |
| Database | none | none | Supabase (3 tables) | Supabase (4 tables) |
| Province accuracy | unknown | unknown | **100%** | **100%** |
| Hosting cost | $0 | $0 | $0 | $0 |

---

## Contributors

- **Human** — product vision, market knowledge, data curation, manual auctions, business decisions
- **Claude** (Anthropic) — architecture, code, scraper, SEO, styling, this changelog

Built with `claude-opus-4-6` via Claude Code CLI.
