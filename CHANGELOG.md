## [1.9.3] — 2026-03-20

### BATTLE #3 — Onboarding & Dashboard UX Overhaul

> feat: v1.9.3 — Complete UX audit implementation (6 generals, 25+ improvements)

**Focus:** Reduce user confusion, improve empty states, streamline onboarding flow.

**Trigger:** José reported dashboard "feels confusing" — spawned 6-agent battle audit.

---

### 🎯 Day 1 — Quick Wins

**CUIT Validation (`6a899ad`):**

| Feature | Implementation |
|---------|----------------|
| Real-time validation | Modulo 11 algorithm in `ClaimForm.tsx` |
| Visual feedback | ✓/✗ indicator in input field |
| Inline errors | "CUIT inválido" message |

**Success State Improvement (`6a899ad`):**

| Before | After |
|--------|-------|
| "PERFIL VERIFICADO" | "SOLICITUD ENVIADA" |
| No email guidance | "Revisá tu bandeja (y spam). Expira en 1 hora." |
| Dead-end | "Ya tengo cuenta →" button |

**Admin Dashboard (`09c69d1`):**

- Added animated loading spinner (Loader2)
- Added "Reintentar" button on error state

---

### 🎯 Day 2 — Empty States & Onboarding

**Empty Dashboard Wizard (`ecd16d6`):**

| Component | `DashboardClient.tsx` lines 561-615 |
|-----------|-------------------------------------|
| Problem | New users saw "No tenes perfil verificado" with no guidance |
| Solution | 3-step "PRIMEROS PASOS" wizard |
| Step 1 | Verificar perfil (active, with CTAs) |
| Step 2 | Completar información (greyed) |
| Step 3 | Publicar remates (greyed) |
| Footer | Value prop explaining verified benefits |

**Remates Empty State (`eb19204`):**

| Before | After |
|--------|-------|
| Plain text | Calendar icon + improved copy |
| Single CTA | "Limpiar filtros" + "Recibir alertas" CTAs |

**Consignatarias Directory (`6247093`):**

| Feature | Search icon, dynamic message showing query, clear search button |
|---------|----------------------------------------------------------------|

**Frigorificos Table (`6247093`):**

| Feature | Building icon, "Limpiar filtros" clears all 3 filters |
|---------|-------------------------------------------------------|

**Comparar (`23b796a`):**

| Before | After |
|--------|-------|
| "Seleccioná al menos una" | Chart icon + "Comparador listo" + arrow pointing left |

**Dashboard Resultados (`23b796a`):**

| Feature | Analytics icon + 3-column benefits grid (precios, tendencias, comparativas) |
|---------|-----------------------------------------------------------------------------|

---

### 📋 BATTLE #3 Audit Source

Full findings documented in `docs/BATTLE-3-ONBOARDING-UX.md`:
- PULSO: WhatsApp verification patterns
- HUNTER: Claim flow code improvements
- ARCHITECT: Navigation fragmentation
- CLOSER: Onboarding friction points
- NEXO: Empty/loading states audit
- VIGIL: Points system design (4500 pts = 1 month PRO)

**WelcomeChecklist Fix (`24bbaab`):**

| Before | After |
|--------|-------|
| Link that didn't scroll | Button with router.push + scroll to top |
| "Editar perfil →" | "Completar perfil →" (action-oriented) |

**Remaining (Day 3-5):**
- [ ] Points system implementation (4-6h)
- [ ] Unify /mi-cuenta with /dashboard

---

## [1.9.2] — 2026-03-19

### DTE Period Comparison — Lock-in Analytics

> feat: v1.9.2 — Compare DTE activity across periods (month/quarter/year)

**Focus:** User data lock-in through analytics that show accumulated value.

---

### 📊 Period Comparison (`90447bf`)

**DTEPeriodCompare Component:**

| Feature | Description |
|---------|-------------|
| Time periods | Monthly, quarterly, yearly comparisons |
| Metrics | Guías, cabezas, avg per DTE |
| Change indicators | Visual +/-% with color coding |
| Category breakdown | Side-by-side by livestock type |
| Insight messages | Natural language summaries |

**Lock-in mechanism:**
- Users see unique value in accumulated data
- "Your February was +45% vs January" creates emotional investment
- Encourages continued uploads to track progress
- Collapsible UI reduces noise for new users

**Phase 2 Complete:**
- [x] Personal Insights card
- [x] Period Comparison
- [ ] Phase 3: PRO insights (price tracking, market comparison)

---

## [1.9.1] — 2026-03-19

### Internal Linking + Analytics + Conversion + Lock-in

> feat: v1.9.1 — Enhanced internal navigation, dynamic scarcity, DTE export, WhatsApp analytics

**Focus:** SEO internal linking, conversion psychology, user trust, operational efficiency.

---

### 🎯 Conversion Psychology

**Dynamic Founder Spots (`5ad38a6`):**

| Component | Purpose |
|-----------|---------|
| `/api/stats/pro-spots` | Real PRO subscriber count from Supabase |
| `FounderSpotsRemaining` | Visual progress bar + urgency messaging |
| `MobileStickyCTA` | Shows remaining spots when < 15 |

**Urgency levels:**
- Critical (<5): "¡Quedan 5 lugares!"
- High (<15): Mobile sticky shows spots
- Low (>30): "48 lugares disponibles"

**Psychology:** Real scarcity > claimed scarcity. Expected +15-25% conversion lift.

---

### 🔐 Trust & Lock-in

**DTE CSV Export (`48e5770`, `b438913`):**

Paradox: Easy export → more trust → more usage → deeper lock-in.

| Feature | Details |
|---------|---------|
| Export button | Added to DTE History table |
| Format | CSV with BOM (Excel-compatible Spanish chars) |
| Fields | fecha, DT-e, origen/destino, RENSPA, cabezas, peso, motivo, categorías, notas |

Users who can export their data trust more → recommend → upload more guías.

---

### 🔗 Internal Linking Expansion

**Quick Filters on /remates:**

| Type | Links Added | Commit |
|------|-------------|--------|
| Time-based | Hoy, Mañana, Semana | `177d029` |
| Province | BA, Córdoba, SF, ER, Corrientes | `177d029` |
| Type | Invernada, Cría, General, Reproductores, Especial | `18a90ee` |

**New Landing Pages:**

| Page | Purpose | Commit |
|------|---------|--------|
| `/remates/semana` | Weekly auction calendar | `f47cdcf` |
| `/remates/categoria/[cat]` | Category price landings | `67a62d3` |

---

### 📊 Analytics & Tracking

| Feature | Description | Commit |
|---------|-------------|--------|
| WhatsApp CTA tracking | Track /go page → WhatsApp clicks | `ee10653` |
| Dynamic pricing cards | Status-aware CTA (logged in vs guest) | `e3d65b5` |
| YoY price comparison | CategoryComparison component | `10a5170` |

---

### ⚡ Performance & Operations

| Change | Before | After | Commit |
|--------|--------|-------|--------|
| Post-remate cron | 5:00 AM ART | 18:00 ART | `b211e10` |
| Lint cleanup | 3 warnings | 0 | `3718250` |

---

### Commits (v1.9.1)

```
b438913 docs: update DTE-UPLOAD.md - mark CSV export complete
48e5770 feat(dte): add CSV export for history - trust-building lock-in
5ad38a6 feat(conversion): Dynamic founder spots remaining indicator
ef231ee docs: v1.9.1 changelog + update README stats
18a90ee feat(seo): type quick links on /remates (#131)
d497ef1 feat(seo): province quick links on /remates (#130)
177d029 feat(seo): internal links to /remates/hoy, /manana, /semana (#129)
b211e10 chore: optimize cron timing - post-remate at 18:00 ART (#124)
3718250 fix: lint errors - use Link component and prefix unused vars
ee10653 feat(analytics): WhatsApp CTA tracking on /go pages (#123)
67a62d3 feat(seo): add category price landing pages
e3d65b5 feat(conversion): dynamic pricing card status based on user state
b05a564 fix: remove unused TrendingUp import from semana page
10a5170 feat(market): add CategoryComparison component for YoY price analysis
f47cdcf feat(seo): add /remates/semana landing page for weekly auctions
```

---

## [1.9.0] — 2026-03-18

### Price Oracle Foundation + MAG Integration + Onboarding Stack

> feat: v1.9.0 — Mercado Agroganadero integration, real-time auction data, institutional credibility layer, complete activation funnel

**Milestone:** 132 commits in 4 days. Platform transformed from directory to market intelligence infrastructure. Foundation for Price Reporting Agency (PRA) model laid. First PRO prospect (SVB) in pipeline.

---

### 🏛️ 1. PRICE ORACLE — MAG Integration

The biggest architectural shift since launch. Direct integration with Mercado Agroganadero S.A. (Argentina's official livestock market).

**New Data Sources:**

| Endpoint | Data | Use Case |
|----------|------|----------|
| `haciinfo000002` | Real category prices | Novillos, novillitos, vaquillonas, vacas, toros |
| `haciinfo000003` | Entry by province | Market share: BA 79%, SF 9%, ER 6%... |
| `haciinfo000006` | Entry by consignatario | Per-auction activity data |
| `haciinfo000502` | Detailed subcategories | 19 price points (Esp.Joven, Regular, etc.) |
| `haciinfo000011` | INMAG + volume | Daily index with cabezas traded |

**Auto-Query for Auctions:**

When a consignataria has an auction today AND has a MAG ID mapped:
1. Scraper queries `haciinfo000006` with their MAG ID
2. Returns last 30 days of cattle entries
3. Shows remitente, localidad, provincia, cabezas
4. Displayed on profile: "431 cabezas | 14 remitentes"

**MAG ID Mapping:** 15 consignatarias linked (of 44 MAG registered):
- colombo-y-colombo, colombo-y-magliano
- saenz-valiente-bullrich, campos-y-ganados
- jauregui-lorda, madelan, monasterio-tattersall
- daniel-blanco, gananor-pujol, hourcade-albelo
- martin-g-lalor, s-l-ledesma, umc-haciendas-villaguay
- wallace-hnos, alzaga-unzue

**Commits:** `f472a38`, `3ea3b5c`, `c1eb02b`, `a1e3cfc`, `a0edb62`

---

### 📊 2. Price Index Methodology

Institutional credibility layer for the price oracle.

**`/metodologia` Page:**
- Data sources documented (MAG, MAGYP, DolarAPI)
- Calculation methodology
- Category breakdown with volume weights
- Update frequency (14:00 ART daily)
- Data governance (corrections, historical)
- Contact for institutional inquiries

**Real vs Synthetic Prices:**
- Before: Synthetic ratios (novillitos = 0.95 × INMAG)
- After: Real observed prices from MAG (novillitos = $4,884 actual)
- Variance: +12.7% for novillitos (real > synthetic)

**Commits:** `b8eb5d9`, `4163008` (security audit)

---

### 🎯 3. Onboarding & Activation Stack

Complete user activation funnel from signup to first value.

**Email Sequence:**

| Email | Trigger | CTA |
|-------|---------|-----|
| Welcome | user.created webhook | Go to dashboard |
| DTE Reminder | 24-48h, no DTE upload | Upload first DTE |
| DTE Success | First DTE uploaded | View stats |
| Weekly Digest | 7 days active | Check new remates |

**Activation Components:**

| Component | Purpose | Commit |
|-----------|---------|--------|
| `ActivationChecklist` | Gamified progress (0→100%) | `2ca2d03` |
| `DTEStats` | Personal stats dashboard | `#92-98` |
| `MilestoneShare` | WhatsApp viral loop | `843c731` |
| Demo mode | Try before signup | `#96` |

**Auth Webhook:**
- Supabase → `/api/webhooks/auth`
- Signature verification (HMAC-SHA256)
- Idempotent (checks outreach_log)
- Triggers welcome email instantly

**Bug Fixed:** `/mi-cuenta/guias` didn't exist → now links to `/dashboard`

**Commits:** `31f4c8f`, `2ca2d03`, `843c731`, `c5813d3`

---

### 📈 4. Market Intelligence Features

**Seasonal Patterns:**
- `SeasonalPattern` component on /mercado
- Shows best months to buy/sell (historical)
- 3 years of IGMAG data by month

**Spread Index:**
- Invernada/Maíz ratio (14.1:1 current)
- Profitability threshold: 12:1
- Link from /mercado to /mercado/spread

**365-Day History:**
- Extended from 56 days
- Enables trend analysis
- Foundation for financial products

**Volume Data:**
- Cabezas traded per day
- Period volume totals
- VWAP calculations possible

**Commits:** `047bde8`, `dc31532`

---

### 🔍 5. SEO Expansion

**Province × Type Combo Pages:**
- 34 new landing pages
- `/consignatarias/buenos-aires/invernada`
- Dynamic metadata, schema
- Internal linking mesh

**Individual Remate Pages:**
- 345+ `/remates/[slug]` pages
- EventSchema per auction
- PRO conversion prompts

**Schema Coverage:** 100%
- All pages have structured data
- LocalBusiness for frigoríficos (364)
- VideoObject for live auctions
- FAQ schema on key pages

**AI Crawler Access:**
- GPTBot, ClaudeBot, PerplexityBot allowed
- robots.txt optimized

**Commits:** `52e59aa`, `c639956`, `14db357`

---

### 🎨 6. Profile Enhancements

**MAG Entry Display:**
```
┌─ ACTIVIDAD EN MAG ──────────────────────────┐
│ 431 cabezas ingresadas | 14 remitentes      │
│ BLASFER S.A. | GRAL. BELGRANO BUE    63 cab │
│ LA GLORIA AGROPECUARIA | LAPRIDA     60 cab │
│ Fuente: Mercado Agroganadero S.A.           │
└──────────────────────────────────────────────┘
```

**Related Consignatarias:**
- Cross-links on profiles
- Same province + type matching
- Internal linking for SEO

**External Resources:**
- Curated links per profile
- News, videos, social

**Dynamic OG Images:**
- GitHub-style cards
- Real logos for 9 profiles
- Social sharing optimized

**Commits:** `a1e3cfc`, `07b4b05`, `9daebc1`, `8d84639`

---

### 🛡️ 7. Security & Infrastructure

**Webhook Signature Verification:**
- HMAC-SHA256 for Supabase webhooks
- Timing-safe comparison
- Prevents replay attacks

**Code Cleanup:**
- Bloat removal (analytics-test, test-*)
- ESLint v9 flat config
- 0 lint warnings, 0 type errors

**Commits:** `4163008`, `a2c3ece`

---

### 📧 8. Email Infrastructure

**Resend Integration:**
- 5 email templates
- HTML emails with terminal aesthetic
- From: consignatarias.com.ar domain

**Post-Remate Outreach:**
- 83% email coverage
- Automated follow-up system
- Results collection funnel

**Commits:** `a6bb165`, `c5813d3`

---

### 📱 9. Conversion & Growth

**PRO Conversion Stack:**
- `/planes` with trust badges
- Early adopter pricing ($10K → $15K)
- ROI anchoring ("Un comprador = inversión del año")
- Mobile sticky CTA
- Loss aversion ("Solo primeras 50")

**WhatsApp Integration:**
- Share buttons on all cards
- Milestone sharing for viral loop
- FAB on profiles with WhatsApp

**Commits:** `b26e809`, `8387307`

---

### 📊 Stats Update

| Metric | v1.7.3 | v1.9.0 | Change |
|--------|--------|--------|--------|
| Remates | 270 | 290+ | +7% |
| Consignatarias | 80 | 86 | +7.5% |
| API Endpoints | 21 | 24 | +14% |
| Data Sources | 9 | 13 | +44% |
| MAG Integration | ❌ | ✅ | NEW |
| Email Templates | 2 | 5 | +150% |
| Schema Coverage | 95% | 100% | +5% |
| Static Pages | 170 | 400+ | +135% |

---

### Breaking Changes

None. All changes are additive.

---

### Migration Notes

**For Supabase webhook:**
1. Dashboard → Settings → Auth → Webhooks
2. URL: `https://www.consignatarias.com.ar/api/webhooks/auth`
3. Events: `user.created`
4. Set `SUPABASE_AUTH_WEBHOOK_SECRET` env var

---

### Contributors

- **JARVIS** (CEO, MEMOLA DAO) — 132 commits, system design
- **José Barnetche** — Direction, PRO sales

---

*"From directory to price oracle. 132 commits. 4 days. Almost 2.0."*
# Changelog

Registro completo de **consignatarias.com.ar** — desde el primer `npx create-next-app` hasta una plataforma SaaS de remates ganaderos con 21 API endpoints, 290+ remates en 13 provincias argentinas, auth, pagos, perfiles verificados, AI SEO, lead magnets, PRO tier con features premium, email marketing automatizado y documentación completa.

---

## [1.7.3] — 2026-03-17

### Revenue Conversion Stack + Individual Remate Pages + Calendar Export

> feat: v1.7.3 — PRO conversion funnel completo, 345 páginas individuales de remates, descarga de calendarios ICS

**Milestone:** El stack de conversión a PRO está 100% operativo. Full funnel tracking desde prompt hasta checkout. 981 páginas estáticas totales.

**1. PRO Conversion Funnel (Insights #55-57, #59, #61-64)**

Stack completo de conversión para el tier PRO:

| Componente | Ubicación | Commit |
|------------|-----------|--------|
| PRO prompts | /comparar, /calculadora, /exportar | `71206ff`, `a039e57` |
| Remate detail prompts | 345 páginas /remates/[slug] | `c868c39` |
| Conversion tracking | prompt_view → click → planes → checkout | `8ba690d` |
| WhatsApp FAB | Todos los perfiles con WhatsApp | `06293e9` |
| Social proof | "70+ consignatarias confían..." | `0072c54` |
| Trust badges | Rebill secured, SSL, Cancel anytime | `c9654b9` |
| Why PRO benefits | Grid de 3 columnas en /planes | `c9654b9` |
| Mobile sticky CTA | Botón fijo en mobile para /planes | `b239916` |
| Dynamic social proof | API real-time stats | `d000112` |

**Funnel tracking events:**
```
prompt_view → prompt_click → planes_view → checkout_start → pro_upgrade
```

**2. Individual Remate Detail Pages (Insight #48)**

345 páginas únicas para cada remate programado:

- **URL pattern:** `/remates/[slug]` (ej: `/remates/rosgan-invernada-corrientes-2026-03-20`)
- **SEO optimizado:** Title, description, EventSchema únicos por remate
- **Contenido:** Fecha, hora, ubicación, consignataria, link a YouTube/WhatsApp
- **PRO prompt:** Incluido en cada página para conversión

**Commit:** `115972f`

**3. ICS Calendar Export (Insights #67-68)**

Descarga de calendarios para agregar remates a Google Calendar / Outlook:

| Feature | Ubicación | Commit |
|---------|-----------|--------|
| Single event download | /go/[slug], /remates/[slug] | `b6578c0` |
| Bulk export | /remates (todos los remates) | `0a845e1` |

**ICS incluye:**
- Título con nombre de consignataria y tipo
- Fecha/hora exacta del remate
- Ubicación (provincia, localidad)
- Descripción con link al perfil
- Reminder 1 hora antes

**4. Schema Expansion (Insights #46, #49, #56)**

100% de páginas públicas con structured data:

| Página | Schema | Commit |
|--------|--------|--------|
| /comparar | WebApplication + Breadcrumb | `2b06430` |
| /api-docs | TechArticle + Organization | `cdeb90a` |
| /calidad | TechArticle | `e323294` |
| /reporte-semanal | WebApplication | `e323294` |
| /exportar | WebApplication | `9e5f40f` |
| /overview, /quienes-somos | Organization | `5294c6a` |
| /go/[slug] | JSON-LD complete | `dd183a6` |
| Frigoríficos + Calendario | Breadcrumb | `e7ad411` |

**5. Price Sparkline Chart (Insight #45)**

Gráfico visual de tendencia de precios en /mercado/inmag:

- SVG-based (zero external deps)
- Muestra últimas 8 semanas
- Hover para ver valores exactos
- Responsive

**Commit:** `78e183a`

**6. URL Search Params (Insight #52)**

Soporte para `?q=` en /remates para deep linking:

```
/remates?q=rosgan → Filtra remates de Rosgan
/remates?q=cordoba → Filtra remates en Córdoba
```

**Commit:** `16fcaed`

**7. Asset Cleanup**

Removed unused `og-image-old.png` (339KB savings).

**Commit:** `f41a1c4`

**Stats del día:**
- 24 commits
- 78 actions ejecutadas
- 71 insights shipped (total acumulado)
- 981 páginas estáticas
- 0 lint errors, 0 warnings

---

## [1.7.2] — 2026-03-16

### Post-Remate Outreach + Email Database

> feat: v1.7.2 — automated email outreach asking consignatarias for results + 83% email coverage

**Milestone:** Sistema completo de outreach post-remate. Cada remate que termina dispara un email automático a la consignataria pidiéndole los promedios. Las respuestas llegan a agro@memola.com.ar (IMAP conectado). De 9 emails (10%) a 71 emails (83% coverage) en una sesión.

**1. Post-Remate Email Outreach**

Sistema automatizado que contacta consignatarias 3-5 horas después de cada remate:

```
Remate termina (tenemos horario)
        ↓
Cron detecta (+3-5h después)
        ↓
Email automático firmado por José
        ↓
Reply-to: agro@memola.com.ar
        ↓
Consignataria responde con promedios
        ↓
Se publica con su data oficial
```

**Email template incluye:**
- Introducción a Memola Medios SAS y consignatarias.com.ar
- Link al perfil de la consignataria
- CTA claro pidiendo promedios (imagen o números)
- Firma profesional: José Barnetche, Director, +54 3773 418130

**Archivos creados:**
- `src/lib/email.ts` — función `sendPostRemateResultsRequest()`
- `src/app/api/cron/post-remate-outreach/route.ts` — cron endpoint (hourly)
- `supabase/migrations/20260316_outreach_log.sql` — tracking table

**Cron features:**
- Detecta remates del día que terminaron hace ~3-5 horas
- Busca email de la consignataria en Supabase
- Evita duplicados (no envía 2 veces al mismo slug por día)
- Logging en tabla `outreach_log`
- Auth via `CRON_SECRET` header

**2. Email Database Expansion**

Scraping masivo de emails de consignatarias usando sub-agentes paralelos:

| Métrica | Antes | Después |
|---------|-------|---------|
| Emails | 9 | **71** |
| Coverage | 10% | **83%** |
| Método | Manual | Web scraping + redes sociales |

**Pipeline de scraping:**
- 7 sub-agentes en paralelo buscando en Google, sitios web, Facebook, Instagram
- Actualización directa a Supabase via REST API
- Fuentes: sitios oficiales, ClicRural, páginas de contacto, redes sociales

**Consignatarias sin email encontrado (15):**
- Sin presencia web: lesiukhnos, j-s-russo, h-nieva, nangapiry, s-l-ledesma
- Solo redes sociales: idercor, javier-bardin, rural-misiones
- Eventos (no consignatarias): las-nacionales
- Web sin email visible: oregui, kofman-y-lissarrague, lanser
- Individuos: marcos-matteucci, javier-ulises-avalos, travaglia

**Commits:** `a6bb165` (outreach system)

---

## [1.7.1] — 2026-03-15

### Province+Type Combo Pages + Dynamic OG + External Resources

> feat: v1.7.1 — SEO long-tail pages, profile OG images, external resources section

**Deployed:** 2026-03-15 (commits: `52e59aa`, `9daebc1`, `d600b3c`)

**1. Province + Type Combo Landing Pages (35 pages)**

New route `/remates/[provincia]/[tipo]` for long-tail SEO:
- Examples: `/remates/cordoba/invernada`, `/remates/buenos-aires/cria`
- Only generates pages for combos that have auctions (35 total)
- Sitemap priority 0.6 (lower than standalone province/type pages)
- Unique SEO title/description per combo

**2. Dynamic OG Images for Consignataria Profiles**

Each profile now generates custom Open Graph images:
- `opengraph-image.tsx` and `twitter-image.tsx` in `[slug]/` folder
- Shows consignataria name, province, and stats
- 1200x630 terminal-style design

**3. External Resources Section**

New section on consignataria profiles linking to:
- Rosgan catalog if available
- AFA (Agricultores Federados) info
- Cooperativa Lehmann resources
- Data stored in `consignataria-resources.json`

**Files created:**
- `src/app/(terminal)/remates/[provincia]/[tipo]/page.tsx`
- `src/app/(terminal)/consignatarias/[slug]/opengraph-image.tsx`
- `src/app/(terminal)/consignatarias/[slug]/twitter-image.tsx`
- `src/lib/data/consignataria-resources.json`

---

## [1.7.0] — 2026-03-15

### Video Catalogs + SEO Expansion + WhatsApp Share

> feat: v1.7.0 — Automated YouTube video matching, type landing pages, related consignatarias, WhatsApp sharing

**Deployed:** 2026-03-16 00:00 ART (33 commits, daily record)

**Highlights:**
- **Video Catalogs** — Auto-match YouTube videos/livestreams to auctions (15 channels, ~14k subs)
- **Type Landing Pages** — `/remates/tipo/invernada`, `/cria`, `/general`, `/especial`, `/reproductores`
- **Related Consignatarias** — SEO internal linking on every profile page
- **WhatsApp Share** — One-click share buttons on all auction cards
- **Slug Normalization** — Cleaned 84 → 63 unique slugs for consistency
- **DB Cleanup** — Merged duplicates (reggi-y-cia → reggi)

---

### Video Catalogs Infrastructure — Complete Pipeline

> feat: Automated YouTube video matching for consignataria profiles

**Overview**

Full video catalog system that automatically matches YouTube videos/livestreams to auctions. When a consignataria with a mapped YouTube channel has a remate, the system searches their channel for matching content and links it to the auction.

---

#### 1. Database Schema

New `consignataria_videos` table for storing video metadata:

```sql
CREATE TABLE consignataria_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consignataria_id UUID NOT NULL REFERENCES consignatarias(id),
  youtube_video_id VARCHAR(11) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  remate_id UUID REFERENCES remates(id),
  video_type VARCHAR(20) CHECK (video_type IN ('remate', 'lote', 'institucional', 'tour')),
  published_at TIMESTAMP WITH TIME ZONE,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  view_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  UNIQUE(consignataria_id, youtube_video_id)
);
```

**Indexes:**
- `idx_videos_consignataria` — Profile galleries (featured first, then by date)
- `idx_videos_remate` — Auction video lookup

**RLS:** Public read, writes via service role only.

**Migration:** `supabase/migrations/20260315_consignataria_videos.sql`

---

#### 2. YouTube Video Matcher Script

Automated matching script that runs post-scraper in GitHub Actions:

```typescript
// scripts/match-youtube-videos.ts
// Flow:
// 1. Load remates for TODAY
// 2. Filter to consignatarias with mapped YouTube channels
// 3. Search each channel for videos published today
// 4. Match by: live/upcoming status > location in title > most recent
// 5. Update remates.json with youtubeUrl field
```

**Matching Priority:**
1. Live or upcoming livestream (highest priority)
2. Video title contains auction location
3. Most recent video from the day (fallback)

**Rate Limiting:** 1 request/second to respect YouTube API quotas.

**File:** `scripts/match-youtube-videos.ts`

---

#### 3. Channel ID Resolution

YouTube Data API v3 requires channel IDs (`UCxxxxxxx`), not handles (`@username`). Implemented automatic resolution:

```javascript
// @LaGanaderaRamirez → UCrAG-793MFmRqqlVzEHQJwg
fetch(`https://www.googleapis.com/youtube/v3/channels?forHandle=${handle}&key=${API_KEY}`)
```

All 15 channels now have resolved UCxxxxxxx IDs stored in `youtube-channels.json`.

---

#### 4. GitHub Actions Integration

Updated `scrape-auctions.yml` workflow:

```yaml
- name: Run scraper
  run: node scripts/scrape-auctions.mjs

- name: Match YouTube videos  # NEW
  run: npx tsx scripts/match-youtube-videos.ts
  env:
    YOUTUBE_API_KEY: ${{ secrets.YOUTUBE_API_KEY }}

- name: Commit and push
  run: git add src/lib/data/ && git commit -m "data: update auctions + match videos"
```

**Schedule:** Daily at 14:00 ART (17:00 UTC)

---

#### 5. VideoGallery Component

React component for displaying video galleries on consignataria profiles:

```typescript
// src/components/video/VideoGallery.tsx
interface VideoGalleryProps {
  videos: ConsignatariaVideo[];
  maxVideos?: number;
}

// Features:
// - Responsive grid layout (1-3 columns)
// - YouTube thumbnail display
// - Video type badges (remate, institucional, etc.)
// - View count display
// - Featured video highlighting
```

---

#### 6. Videos API Endpoint

```typescript
// GET /api/consignatarias/[slug]/videos
// Returns: { videos: ConsignatariaVideo[], total: number }

// Query params:
// - limit: number (default 10)
// - type: 'remate' | 'lote' | 'institucional' | 'tour'
// - featured: boolean
```

**File:** `src/app/api/consignatarias/[slug]/videos/route.ts`

---

#### 7. YouTube Channels Mapped (15 total)

| Consignataria | Channel ID | Subscribers |
|---------------|------------|-------------|
| La Ganadera Ramírez | UCrAG-793MFmRqqlVzEHQJwg | 4,100 |
| Rosgan BCR | UCvO_FXYeiyj5QYqL9cWOUeQ | 3,000 |
| AFA SCL | UC1XGF4vhAKosCWHR-74C-Ng | 2,930 |
| Reggi y Cia | UCDp9jvg607ey7p6sHowOjYw | 1,260 |
| UMC Haciendas | UCPzo8IxRDGZcI5rH9IS9fhA | 1,190 |
| Tradición Ganadera | UCUrUHr8QbQizYer2kI20mhA | 739 |
| Cooperativa Lehmann | UCIHhaaYzJSCAfqnUEAW4ZpQ | 737 |
| Bressan y Cia | UCVCtVthepYltxxUbuf14fLw | 316 |
| Iván L. O'farrell | UCR4g7aa2EyXDafHQnqvA8vw | 170 |
| Vicar Ganadera | UCE1_4Ki_lzvLhxFcYu4ZGpA | 65 |
| SVB Rematenet | UCaarhFa2peyJOG-tMqbsByw | — |
| Eduardo Travaglia | UCfPvgVUfTzGOuups_EN6J3Q | — |
| Colombo y Magliano | UCre8ZZIykhnEFbK0R8nFdEg | — |
| Ferias Rauch | UCggQXhO2mIzIoKfVGCxIkpg | — |
| Colombo y Colombo | UCW3SRpohecSX8TXOwZ17cZw | — |

**Total reach:** ~14,500+ subscribers

---

#### Environment Variables Required

```bash
# Vercel
YOUTUBE_API_KEY=AIzaSy...

# GitHub Secrets
YOUTUBE_API_KEY=AIzaSy...
```

---

#### Commits

| Hash | Description |
|------|-------------|
| `01fa667` | feat: YouTube video matcher script |
| `d574848` | fix: resolve @handles to UCxxxxxxx channel IDs |
| `59a583f` | feat: VideoGallery component + videos API endpoint |
| `342050a` | fix: correct migration (UUID types, RLS policies) |
| `b004b10` | feat: add matcher to GitHub Actions workflow |
| `ee6499a` | fix: use npm install in workflow |
| `ec4056c` | feat: add Reggi y Cia channel (15 total) |

---

## [1.6.1] — 2026-03-15 (superseded by 1.7.0)

### YouTube Channels Mapping for v1.7.0 Video Catalogs

> feat: 14 official YouTube channels mapped for video catalog integration

**YouTube Channel Discovery**

Mapped official YouTube channels for consignatarias with own streaming:

| Consignataria | Canal | Suscriptores |
|---------------|-------|--------------|
| La Ganadera Ramirez | @LaGanaderaRamirez | 4,100 |
| Rosgan | @RosganBCR | 3,000 |
| AFA | @AFACooperativa | 2,930 |
| UMC Haciendas Villaguay | @UMCSA-HVILLAGUAY | 1,190 |
| Tradición Ganadera | @TRADICIONGANADERAENVIVO | 739 |
| Cooperativa Lehmann | @cooperativaguillermolehmann | 737 |
| Bressan y Cia | @bressanycia | 316 |
| Iván L. O'farrell | @ivanlofarrellsrloficial7544 | 170 |
| Vicar Ganadera | @vicarganadera | 65 |
| Sáenz Valiente Bullrich | @SVBREMATENET | — |
| Eduardo Travaglia | @travagliaycia | — |
| Colombo y Magliano | @ColomboyMaglianosa | — |
| Ferias Rauch | @feriasrauch374 | — |
| Colombo y Colombo | @ColomboyColomboConsignataria | — |

**Total reach:** ~13,000+ subscribers

**Consignatarias sin canal propio** (usan plataformas):
- Canal Rural (@canalrural)
- ClicRural (@clicruralar5804, etc.)
- Entre Surcos y Corrales (@entresurcosycorrales2456)
- De Frente al Campo (@DeFrentealCampo)
- Remates Pampeanos DFC (@RematesPampeanosDFC)

**Files:**
- `src/lib/data/youtube-channels.json` — Channel mapping data

**Commits:** `6436fe0`, `6897776`, `005b690`, `98be315`

---

## [1.6.0] — 2026-03-15

### PRO PDF Reports + v1.6.0 Milestone

> feat: v1.6.0 — PRO-branded PDF reports

**Feature: Branded PDF Reports for Consignatarias**

New PDF generator with PRO/FREE differentiation:
- **PRO users** get gold accent bars, PRO badge, and contact info section
- Stats: total remates, upcoming, cabezas, provinces
- Upcoming remates table (max 15 remates)
- Dynamic branding based on subscription status
- Download from dashboard → "Reporte PDF" button

**Files:**
- `src/lib/pdf/generateConsignatariaPDF.ts` — New PRO-aware PDF generator
- `src/app/api/consignatarias/[slug]/report/route.ts` — Updated endpoint

**Commit:** `e54168b`

---

## [1.5.1] — 2026-03-15

### SEO Blitz + Date Format Fix

> seo: optimize key pages for search rankings + fix date format

**1. SEO Optimizations**

**`/frigorificos` (pos 13 → target top 5):**
- Title: "Frigoríficos Habilitados Argentina 2026 | Directorio MAGYP Completo (364)"
- H1 semántico en intro section
- H2 para secciones de filtros y distribución
- Schema ItemList con top 10 frigoríficos
- Keywords expandidas: 10 términos de alta intención
- Meta description optimizada con conteo dinámico

**`/consignatarias` (mantener pos 4):**
- Title: "Consignatarias de Hacienda Argentina 2026 | Directorio Completo"
- H1 con keyword principal
- Schema ItemList Organization
- Stats dinámicas en intro (total remates, próximos)
- Keywords: 10 términos incluyendo "consignatario de hacienda"

**`/mercado/inmag` (NUEVA página):**
- Landing dedicada para keyword "inmag" (12 imp, pos 6.33)
- Precio INMAG actual con variación
- Tabla histórica últimos 15 días
- Sección "¿Qué es el INMAG?" para long-tail
- Schema Dataset para rich snippets
- Breadcrumbs y CTA a /mercado completo

**2. Bug Fixes**

**Homepage date format:**
- Antes: `03/15` (MM/DD - formato US)
- Ahora: `15/03` (DD/MM - formato Argentina)

**Error reporting email:**
- Cambiado `datos@consignatarias.com` → `agro@memola.com.ar`
- Resend solo envía, no recibe emails

**3. Files Changed**
- `src/app/(terminal)/frigorificos/page.tsx` — SEO metadata + ItemList schema
- `src/app/(terminal)/frigorificos/FrigorificosClient.tsx` — H2 semánticos
- `src/app/(terminal)/consignatarias/page.tsx` — SEO metadata + ItemList schema
- `src/app/(terminal)/mercado/inmag/page.tsx` — NEW landing page
- `src/app/page.tsx` — Date format fix (DD/MM)
- `src/app/(terminal)/consignatarias/[slug]/ConsignatariaProfileClient.tsx` — Email fix
- `src/app/(terminal)/calidad/page.tsx` — Email fix

---

## [1.5.0] — 2026-03-15

### Email Marketing Automatizado — Promoción de Remates PRO

> feat: v1.5.0 — automated email promotion for PRO consignatarias

**Milestone:** Sistema completo de email marketing. Cada remate de consignatarias PRO se promociona automáticamente por email a todos los suscriptores del newsletter. La propuesta de valor principal del tier PRO.

**1. Promoción por Email como Feature Principal PRO**

Nuevo copy en landing y /planes:
- **Landing (sección PRO):** "Cada remate que publiques lo promocionamos por email a todos nuestros suscriptores. Todo el año."
- **Feature card:** 📧 Promoción por Email (primera posición, badge "NUEVO")
- **Página /planes:** 9 features PRO listadas, promoción por email como #1

**Implementación en `src/app/page.tsx`:**
- Nuevo feature card con borde amber destacado
- Badge "NUEVO" absoluto en esquina superior derecha
- Copy enfocado en beneficio: "Cada remate que publiques llega directo al inbox"

**Implementación en `src/app/(terminal)/planes/page.tsx`:**
- `PRO_FEATURES` array expandido de 5 a 9 items
- Descripción actualizada: foco en email marketing
- Schema SEO actualizado con nuevos features

**2. Sistema de Alertas (Supabase)**

Nueva tabla `alertas` para suscripciones de notificaciones:

```sql
CREATE TABLE alertas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  api_key TEXT NOT NULL,
  name TEXT NOT NULL,
  webhook_url TEXT NOT NULL,
  filters JSONB DEFAULT '{}',
  events TEXT[] DEFAULT ARRAY['remate.created'],
  frequency TEXT DEFAULT 'immediate',
  status TEXT DEFAULT 'active',
  triggers_count INT DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**RLS habilitado** con política de service role.

**Archivos modificados:**
- `src/app/page.tsx` — nuevo feature card, copy actualizado
- `src/app/(terminal)/planes/page.tsx` — PRO features expandido

---

## [1.4.5] — 2026-03-15

### Fix PRO Badge Mobile + UX Planes

> fix: v1.4.5 — PRO badge visibility on mobile, planes page UX

**El problema:** En mobile, el badge "RECOMENDADO" del plan PRO era tapado por el card del plan gratuito arriba.

**Solución:**
- **margin-top mobile:** `mt-6 md:mt-0` en card PRO para separación del card anterior
- **z-index:** `z-10` en badge para asegurar visibilidad sobre otros elementos
- **Fondo sólido:** Badge cambiado de `rgba(245, 158, 11, 0.15)` a `rgba(245, 158, 11, 0.9)` con texto negro para mayor contraste
- **overflow-visible:** Agregado al card FREE para no clipear elementos adyacentes

**Archivos modificados:**
- `src/app/(terminal)/planes/page.tsx` — CSS fixes para mobile

---

## [1.4.4] — 2026-03-15

### GitHub Actions Cron — Recordatorios y Newsletter

> feat: v1.4.4 — GitHub Actions cron jobs for remate reminders and weekly newsletter

**1. Workflow Remate Reminders**

Archivo `.github/workflows/remate-reminders.yml`:
- **Schedule:** Diario a las 8 AM Argentina (11:00 UTC)
- **Endpoint:** `GET /api/cron/remate-reminders`
- **Auth:** Header `x-cron-secret` con `CRON_SECRET`
- **Fallback:** Manual dispatch disponible

**2. Workflow Weekly Newsletter**

Archivo `.github/workflows/weekly-newsletter.yml`:
- **Schedule:** Lunes 10 AM Argentina (13:00 UTC)
- **Endpoint:** `POST /api/cron/weekly-newsletter`
- **Auth:** Bearer token con `ADMIN_SECRET`

**3. Fix URL Redirect**

- URLs cambiadas de `consignatarias.com.ar` a `www.consignatarias.com.ar`
- El dominio sin www redirige (307), causaba fallo en cron
- Flag `-L` (follow redirects) agregado como backup

**4. Graceful Handling de Tabla Faltante**

En `/api/cron/remate-reminders/route.ts`:
- Si tabla `alertas` no existe, retorna 200 con mensaje "table not configured"
- Evita fallo del cron antes de setup de Supabase

**Archivos creados:**
- `.github/workflows/remate-reminders.yml`
- `.github/workflows/weekly-newsletter.yml`

**Archivos modificados:**
- `src/app/api/cron/remate-reminders/route.ts` — graceful handling

---

## [1.4.3] — 2026-03-15

### Fix Email Domain — Resend Verificado

> fix: v1.4.3 — use verified domain for transactional emails

**El problema:** Los emails se enviaban desde `@consignatarias.com.ar` (no verificado en Resend), causando fallo silencioso.

**Solución:**
- **FROM email:** `noreply@consignatarias.com` (dominio verificado)
- **Contact email:** `datos@consignatarias.com`
- El dominio `.com` tiene Resend verificado; `.com.ar` redirige al sitio

**Test enviado exitosamente** desde `noreply@consignatarias.com`.

**Archivos modificados:**
- `src/lib/email.ts` — FROM email
- `src/app/(terminal)/calidad/page.tsx` — contact email
- `src/app/(terminal)/consignatarias/[slug]/ConsignatariaProfileClient.tsx` — report error email

---

## [1.4.2] — 2026-03-14

### Nueva OG Image — Estilo App

> feat: v1.4.2 — new OG image with app-style design

**Diseño nuevo:**
- **Layout:** Logo "C" prominente a la izquierda, texto a la derecha
- **Título:** `consignatarias.com.ar` en una línea, `.com.ar` en cyan
- **Subtítulo:** "Inteligencia del mercado ganadero argentino"
- **Stats:** Remates, Frigoríficos, Precios INMAG en verde
- **Acento:** Línea cyan en la parte inferior
- **Fondo:** Gradiente dark con grid sutil

**Generación:**
- Script `scripts/generate-og-image.js` genera SVG
- Conversión a PNG con `sharp-cli`
- Dimensiones: 1200x630 (estándar OG)

**Archivos creados:**
- `scripts/generate-og-image.js`
- `public/og-image.png` (reemplazado)
- `public/og-image-new.svg`

---

## [1.4.1] — 2026-03-14

### Phase 5 PRO Features — Calendario, PDF, Alertas

> feat: v1.4.1 — Phase 5 PRO features (calendar, PDF reports, alerts cron)

**1. Calendario ICS Sincronizable**

- **Página:** `/calendario/[slug]` — página user-friendly para suscribir calendario
- **API:** `/api/calendario/[slug]` — endpoint ICS con eventos de remates
- **Compatibilidad:** Google Calendar, Apple Calendar, Outlook
- Botones de un click para cada plataforma

**2. Reporte PDF Mensual**

- **API:** `/api/consignatarias/[slug]/report`
- PDF profesional con jsPDF
- Secciones: header con logo, stats, lista de remates, precios INMAG

**3. Badge "Destacado del Mes"**

- **API:** `/api/featured/check` — verifica si consignataria califica
- **Componente:** `FeaturedBadge.tsx` — badge dorado animado
- Criterio: top 3 por cantidad de remates en el mes

**4. Widget Embebible**

- **API:** `/api/widget/[slug]` — HTML/JS widget para sitios externos
- Muestra próximos 5 remates de la consignataria
- Estilo terminal dark, responsive

**5. QR Code para Catálogos**

- **Componente:** `QRCode.tsx` — genera QR con URL del perfil
- Descargable en PNG y SVG
- Para imprimir en catálogos físicos

**6. Landing Personalizada**

- **Página:** `/go/[slug]` — landing optimizada para compartir
- Open Graph optimizado para WhatsApp/redes
- CTA directo a perfil completo

**7. Recordatorios Pre-Remate (Cron)**

- **API:** `/api/cron/remate-reminders`
- Notifica suscriptores 24h y 1h antes de remates PRO
- Matching contra tabla `alertas`

**Archivos creados:**
- `src/app/calendario/[slug]/page.tsx`
- `src/app/api/calendario/[slug]/route.ts`
- `src/app/api/consignatarias/[slug]/report/route.ts`
- `src/app/api/featured/check/route.ts`
- `src/app/api/widget/[slug]/route.ts`
- `src/app/go/[slug]/page.tsx`
- `src/app/api/cron/remate-reminders/route.ts`
- `src/components/QRCode.tsx`
- `src/components/badges/FeaturedBadge.tsx`

---

## [1.4.0] — 2026-03-14

### PRO Irresistible — Features premium para consignatarias

> feat: v1.4.0 — PRO tier features to maximize conversion

**Milestone:** Sistema completo de diferenciación PRO vs FREE. Badges visuales, estadísticas mejoradas, WhatsApp share, newsletter con PROs destacados. Diseñado para consignatarios no-técnicos que buscan visibilidad.

**1. Sistema de Badges PRO**

Nuevos componentes en `src/components/badges/`:

- `ProBadge.tsx` — Badge PRO con estrella, glow animation, checkmark verificado opcional
  - Props: `verified`, `size` (sm/md/lg), `animated`
  - CSS animation: `pro-badge-glow` con keyframes (box-shadow pulsante amber)
  - Gradiente: `from-amber-500/20 to-amber-600/10`
- `VerifiedBadge.tsx` — Checkmark standalone para consignatarias verificadas
  - SVG badge con tooltip "Consignataria verificada"
  - Color `amber-400` para consistencia con PRO

**Integración:**
- `RematesClient.tsx` — ProBadge reemplaza inline badge en filas PRO
- `ConsignatariaProfileClient.tsx` — ProBadge/VerifiedBadge en header de perfil

**2. Logo Prominente para PRO**

En `ConsignatariaProfileClient.tsx`:
- FREE: `w-8 h-8` (32px) con borde `terminal-border`
- PRO: `w-16 h-16` (64px) con borde `amber-500/30` + `shadow-amber-500/10`
- Condicional basado en `tier === 'pro' || tier === 'enterprise'`

**3. Dashboard "TU IMPACTO" Mejorado**

En `DashboardClient.tsx`, reemplazo de sección Analytics:

- Número de vistas en `text-3xl font-bold` (prominencia visual)
- Subtítulo: "personas vieron tu perfil"
- PRO users ven grid adicional:
  - Visitas/día promedio (viewCount / 30)
  - Percentil vs rubro ("Top 20%" hardcoded, TODO: calcular real)
- FREE users ven panel bloqueado con:
  - Mensaje: "🔒 Con PRO verás: visitas diarias, comparación con el rubro..."
  - CTA: "★ Ver planes PRO" → `/planes`

**4. WhatsApp Share en Dashboard**

Nuevo componente `src/components/share/WhatsAppShare.tsx`:

- `WhatsAppShare` — Botón completo con label
  - Props: `title`, `date`, `time`, `location`, `heads`, `consignataria`, `url`, `size`, `showLabel`
  - Genera URL: `https://wa.me/?text=...` con mensaje formateado
  - Emojis: 🐄 título, 📅 fecha, 📍 ubicación, 🔢 cabezas, 🏢 consignataria, 👉 URL
- `WhatsAppIconButton` — Versión compacta (solo icono)

**Integración en `DashboardClient.tsx`:**
- `AuctionManagerProps` extendido con `displayName`
- WhatsAppIconButton en cada fila de remate (owner + scraped)
- Mensaje pre-formateado listo para compartir en grupos

**5. Newsletter Semanal con PROs Destacados**

Nueva función en `src/lib/email.ts`:
- `sendWeeklyNewsletter(email, featuredRemates, totalRemates, weekRange)`
- Template HTML estilo terminal con:
  - Remates PRO: borde amber-left 3px + estrella ★
  - Remates regulares: borde gris
  - Sección promocional: "Los remates destacados son de consignatarias PRO"
  - Footer con unsubscribe link

Nuevo endpoint `src/app/api/cron/weekly-newsletter/route.ts`:
- Auth: `ADMIN_SECRET` (Bearer o query param)
- Query: próximos 7 días de remates
- Prioridad: PRO primero (featured OR subscription activa), luego por fecha
- Máximo 10 remates por email
- Envío a todos los suscriptores de `newsletter_subscribers` con status 'active'
- Rate limiting: 100ms delay entre envíos

**6. Rate Limiting para API**

Nuevo archivo `src/lib/rate-limit.ts`:
- `checkRateLimit(identifier, tier)` — Sliding window rate limiter
- `getClientId(request)` — Extrae IP de headers (x-forwarded-for, x-real-ip)
- `addRateLimitHeaders(headers, result)` — Agrega X-RateLimit-* headers

Configuración:
- FREE tier: **1 req/min** (99% reducción vs anterior 100 req/min)
- PRO tier: 100 req/min
- Enterprise: unlimited

Middleware actualizado (`src/middleware.ts`):
- Rate limiting aplicado a rutas públicas de API
- Rutas excluidas: webhooks, admin, auth
- Response 429 con `RATE_LIMIT_EXCEEDED` y `retryAfter`

**7. Planes Actualizados**

En `/api/planes/route.ts`:
- `api_rate_limit` agregado a cada tier:
  - Gratuito: "1 req/min"
  - PRO: "100 req/min"
  - Enterprise: "unlimited"

**Archivos creados:**
- `src/components/badges/ProBadge.tsx`
- `src/components/share/WhatsAppShare.tsx`
- `src/lib/rate-limit.ts`
- `src/app/api/cron/weekly-newsletter/route.ts`

**Archivos modificados:**
- `src/app/globals.css` — Keyframes `pro-badge-glow`
- `src/app/(terminal)/remates/RematesClient.tsx` — Import ProBadge
- `src/app/(terminal)/consignatarias/[slug]/ConsignatariaProfileClient.tsx` — Logo PRO, badges
- `src/app/(terminal)/dashboard/DashboardClient.tsx` — TU IMPACTO, WhatsApp buttons
- `src/middleware.ts` — Rate limiting
- `src/lib/email.ts` — sendWeeklyNewsletter
- `src/app/api/planes/route.ts` — api_rate_limit field

---

## [1.3.0] — 2026-03-14

### Subasto API completa — 20 endpoints públicos

> feat: v1.3.0 — Subasto API complete with 20 public endpoints

**Milestone:** API pública completa para el mercado ganadero argentino. De 0 a 20 endpoints en 48 horas. Documentación OpenAPI, PDF profesional, y ranking de consignatarias.

**1. Endpoints de Ranking y Top**

- `/api/consignatarias/ranking` — Leaderboard de consignatarias por cantidad de remates
  - Soporta `periodo` (historico/mes/semana) y paginación
  - Powers leaderboards, B2B outreach, Remotion compositions
- `/api/remates/top` — Remates destacados para content highlights
  - Usa JSON data source para performance

**2. PDF Profesional para Reportes**

- Generación de PDF con jspdf para reporte semanal
- Layout compacto que cabe en A4
- Secciones: REMATES HOY, destacados, precios INMAG
- Fix colores Maíz box, truncado de texto

**3. SEO B2B**

- `ConsignatariaProfileSchema` — JSON-LD para rich snippets B2B en perfiles
- Mejora visibilidad en búsquedas de consignatarias específicas

**4. Monitoreo**

- `/api/health` — Health check endpoint (18→20 endpoints)
- `/api/status` actualizado con conteo total de endpoints

**Archivos creados:** `src/app/api/consignatarias/ranking/route.ts`, `src/app/api/remates/top/route.ts`, `src/app/api/health/route.ts`
**Archivos modificados:** `src/components/seo/JsonLd.tsx`, `src/app/api/status/route.ts`

---

## [1.2.0] — 2026-03-13

### Lead Magnets y Newsletter — 5 herramientas de captura

> feat: v1.2.0 — lead magnets, newsletter signup, API docs, SEO expansion

**Milestone:** Sistema completo de lead generation. 5 herramientas interactivas, newsletter con Supabase, documentación API pública, y glosario expandido a 38 términos.

**1. Newsletter Signup**

- Formulario de suscripción en homepage y páginas de herramientas
- Storage en Supabase tabla `newsletter_subscribers`
- Validación de email con Zod
- Mensaje de confirmación inline

**2. 5 Lead Magnets (Herramientas Gratuitas)**

| Herramienta | Descripción |
|-------------|-------------|
| Calculadora de Hacienda | Estimar valor de lote por categoría y peso |
| Calendario de Remates | Vista semanal/mensual de próximos remates |
| Reporte Semanal | PDF descargable con resumen del mercado |
| Comparador de Precios | Comparar precios por categoría y fecha |
| Exportar Datos | Descargar remates en CSV/JSON |

- Todas las herramientas incluyen CTA de newsletter
- Sección "Herramientas" agregada a homepage
- WhatsApp share en footer y herramientas

**3. Documentación API Pública**

- Página `/api-docs` con documentación completa de Subasto API
- Especificación OpenAPI 3.0 en `/api/openapi.json`
- Endpoint `/api/planes` para metadata de planes

**4. Expansión SEO**

- Glosario expandido de 17 a 38 términos ganaderos
- Organization y WebSite schema en homepage
- SEO schemas para página de planes

**Archivos creados:** `src/app/(terminal)/herramientas/`, `src/app/(terminal)/api-docs/page.tsx`, `src/app/api/openapi.json/route.ts`, `src/app/api/planes/route.ts`
**Archivos modificados:** `src/app/page.tsx`, `src/app/(terminal)/glosario/page.tsx`

---

## [1.1.0] — 2026-03-12

### Subasto API — 11 endpoints públicos

> feat: v1.1.0 — Subasto API foundation with 11 public endpoints

**Milestone:** Lanzamiento de Subasto API — la primera API pública de remates ganaderos de Argentina. 11 endpoints RESTful con documentación.

**1. Endpoints de Remates**

| Endpoint | Descripción |
|----------|-------------|
| `GET /api/remates/proximos` | Próximos 7 días de remates |
| `GET /api/remates/hoy` | Remates del día |
| `GET /api/remates/stats` | Estadísticas agregadas (total, por provincia, por tipo) |
| `GET /api/remates/buscar` | Búsqueda full-text con filtros |
| `GET /api/remates/calendario` | Vista calendario 7 días (ICS-ready) |

**2. Endpoints de Consignatarias**

| Endpoint | Descripción |
|----------|-------------|
| `GET /api/consignataria/[slug]` | Perfil con historial de remates |

**3. Endpoints de Mercado**

| Endpoint | Descripción |
|----------|-------------|
| `GET /api/precios` | Precios INMAG por categoría |
| `GET /api/status` | Health check con conteo de endpoints |

**4. Integraciones**

| Endpoint | Descripción |
|----------|-------------|
| `POST /api/webhooks/register` | Registro de webhooks para notificaciones |
| `GET/POST/DELETE /api/alertas` | CRUD de alertas persistentes |
| `GET /api/alertas/[id]` | Detalle de alerta específica |

**5. Documentación**

- `docs/SUBASTO-API.md` — Guía completa con ejemplos curl
- Rate limiting documentado (100 req/min free, 1000 req/min PRO)

**6. Nuevos Perfiles de Consignatarias**

- Ildarraz Hnos, Alfredo Smondino (merged → Mondino), Cooperativa Lehmann
- AJ Mendizábal
- Normalización de slugs: colombo, ildarraz, lehmann

**7. Scripts de Outreach**

- `scripts/outreach-consignatarias.ts` — Script para contactar consignatarias sin verificar
- FrigoConnect pitch deck para módulo frigoríficos

**Archivos creados:** `src/app/api/remates/proximos/route.ts`, `src/app/api/remates/hoy/route.ts`, `src/app/api/remates/stats/route.ts`, `src/app/api/remates/buscar/route.ts`, `src/app/api/remates/calendario/route.ts`, `src/app/api/consignataria/[slug]/route.ts`, `src/app/api/precios/route.ts`, `src/app/api/webhooks/register/route.ts`, `src/app/api/alertas/route.ts`, `src/app/api/alertas/[id]/route.ts`, `src/app/api/status/route.ts`, `docs/SUBASTO-API.md`

---

## [1.0.3] — 2026-03-11

### Real-time Auction Status y Countdown Timer

> feat: v1.0.3 — real-time status transitions, countdown timer, YouTube integration

**1. Transiciones de Estado en Tiempo Real**

Sistema de estados dinámicos para remates basado en hora actual (ART):
- `scheduled` → antes de la hora de inicio
- `live` → durante el remate (ventana de 3 horas desde inicio)
- `completed` → después de la ventana

Función `getEffectiveStatus()` calcula estado en tiempo real sin depender de datos estáticos.

**2. Countdown Timer**

Componente `CountdownBadge` para remates del día:
- Muestra countdown "EN MM:SS" cuando faltan ≤30 minutos
- Actualización cada segundo con `setInterval`
- Fallback a badge "HOY" fuera de la ventana de 30 min
- Timezone-aware (ART)

**3. YouTube Channel Integration**

- Badge de YouTube en remates con transmisión en vivo
- Link directo al stream desde el feed de remates

**4. Admin KPI Dashboard**

- Panel de métricas para administradores
- Estadísticas de perfiles verificados, claims pendientes, suscripciones

**5. Unificación PRO/Featured**

- Remates PRO = suscripción activa OR admin-featured
- Simplifica lógica de highlighting visual

**Archivos creados:** `src/components/CountdownBadge.tsx`
**Archivos modificados:** `src/app/(terminal)/remates/RematesClient.tsx`, `src/lib/ui/tokens.ts`

---

## [1.0.2] — 2026-03-11

### Accesibilidad — Contraste WCAG AA

> fix: v1.0.2 — improve text contrast sitewide, eliminate zinc-600

Auditoría de contraste reveló que `text-zinc-600` fallaba WCAG AA en fondos oscuros. Corregido sitewide:

- Table headers: `zinc-600` → `zinc-400`
- Navigation labels: `zinc-600` → `zinc-400`
- Form labels: `zinc-600` → `zinc-400`
- Helper text: `zinc-600` → `zinc-500`

Todas las combinaciones ahora pasan WCAG AA (ratio ≥4.5:1).

**Archivos modificados:** `src/app/(terminal)/remates/RematesClient.tsx`, `src/app/(terminal)/frigorificos/FrigorificosClient.tsx`, `src/app/(terminal)/consignatarias/[slug]/page.tsx`, múltiples componentes

---

## [1.0.1] — 2026-03-11

### Post-Payment Flow y Rebill Fix

> fix: v1.0.1 — Rebill API endpoint, post-payment success flow

**1. Fix Rebill API Endpoint**

- Corregido endpoint de Rebill API para generación de payment links
- Validación de respuesta mejorada

**2. Post-Payment Success Flow**

- Página de éxito con polling para confirmar suscripción
- Panel de celebración con confetti
- Redirect automático a dashboard después de confirmación

**3. Refactor Overview**

- Removido frigoríficos de overview para focus en mercado + remates
- Simplificación de la página principal del dashboard

**Archivos modificados:** `src/app/api/subscribe/route.ts`, `src/app/(terminal)/planes/success/page.tsx`, `src/app/(terminal)/overview/page.tsx`

---

## [1.0.0] — 2026-03-10

### v1.0 — Plataforma completa con navegación, suscripciones y AI SEO

> feat: v1.0.0 — full platform release

**Milestone:** Primera versión completa de la plataforma. Desde directorio estático hasta SaaS funcional con auth, pagos, perfiles verificados, dashboard de owner, AI SEO y navegación 100% descubrible. 13 días de desarrollo, $0 de hosting.

**1. Navegabilidad — resolver páginas huérfanas**

Auditoría UX completa reveló que `/planes`, `/glosario` y `/calidad` tenían 0 links entrantes (solo accesibles por URL directa). Corregido:

- `PLANES` agregado al nav principal del terminal (6to item, desktop + mobile)
- Footer del terminal expandido: Planes | Glosario | Calidad | Quiénes Somos | email
- Landing page navbar: link "Planes" junto a Remates/Frigoríficos/Mercado
- Landing page footer: nueva fila institucional (Planes, Glosario, Calidad de datos, Quiénes somos)
- Cross-links al pie de `/glosario` y `/calidad` (enlaces entre sí + planes + remates)

**2. Suscripción PRO funcional desde /planes**

El botón "Suscribirse a PRO" redirigía siempre a `/login`, incluso para usuarios logueados. Reemplazado con `SubscribeButton` (client component):

- Detecta estado de auth via Supabase
- Si logueado → `POST /api/subscribe` → redirect a checkout de Rebill
- Si no logueado → redirect a `/login?redirect=/planes`
- Busca automáticamente el slug de la consignataria del owner

**3. Fix ESLint para deploy**

- Reemplazados `<a href>` por `<Link>` de Next.js en links internos de `/calidad` y `/glosario`
- Build Vercel pasa limpio

**Archivos creados:** `src/app/(terminal)/planes/SubscribeButton.tsx`
**Archivos modificados:** `src/app/(terminal)/layout.tsx`, `src/app/page.tsx`, `src/app/(terminal)/planes/page.tsx`, `src/app/(terminal)/glosario/page.tsx`, `src/app/(terminal)/calidad/page.tsx`

---

## [0.9.9] — 2026-03-10

### Optimización AI SEO — estructura, autoridad y presencia

> feat: v0.9.9 — AI SEO optimization (robots, FAQ, glossary, schema)

Optimización completa para motores de búsqueda con IA (ChatGPT, Perplexity, Claude, Copilot, Google AI Overviews). Implementa los tres pilares del AI SEO: estructura extraíble, autoridad citable y presencia donde buscan las IAs.

**1. robots.txt — acceso para crawlers de IA**

- Reglas explícitas `Allow: /` para 6 user agents: GPTBot, ChatGPT-User, PerplexityBot, ClaudeBot, anthropic-ai, Google-Extended
- Bloqueo selectivo de rutas internas (`/api/`, `/_next/`, `/admin/`) para todos los bots de IA
- Mantiene reglas existentes para Googlebot y wildcard

**2. FAQ con schema FAQPage (landing page)**

- 10 preguntas frecuentes sobre el mercado ganadero argentino en la landing page
- Componente `FAQPageSchema` en `JsonLd.tsx` que genera JSON-LD `FAQPage` con pares Question/AcceptedAnswer
- Elementos `<details>` colapsables con estilo terminal dark theme
- Preguntas redactadas en formato natural para voice search y AI extraction

**3. Glosario ganadero (`/glosario`)**

- 17 términos clave: Cabeza, Consignataria, Cría, CUIT, Frigorífico, Hacienda, INMAG, Invernada, Matrícula, Novillo, Novillito, Plaza, Remate, SENASA, Ternero, Vaca, Vaquillona
- JSON-LD `DefinedTermSet` con cada término como `DefinedTerm`
- HTML semántico con `<dl>/<dt>/<dd>` para máxima extractabilidad
- Breadcrumb schema via `SectionBreadcrumbSchema`
- Agregado al sitemap (prioridad 0.3, frecuencia monthly)

**4. Skill AI SEO instalado**

- `npx skills add` con skill `ai-seo` — referencia de patrones de contenido y factores de ranking por plataforma
- Disponible en `.claude/skills/ai-seo/` para futuras optimizaciones

**Archivos creados:** `src/app/(terminal)/glosario/page.tsx`
**Archivos modificados:** `src/app/robots.ts`, `src/app/page.tsx`, `src/components/seo/JsonLd.tsx`, `src/app/sitemap.ts`

---

## [0.9.8] — 2026-03-10

### Cierre Q2 blueprint — logo, calidad, reportar error, métricas mensuales

> feat: v0.9.8 — complete Q2 blueprint: logo upload, /calidad, reportar error, monthly metrics

Completa todos los ítems pendientes del roadmap Q2 del blueprint de producto.

**1. Upload de logo para consignatarias**

- Endpoint `POST /api/consignatarias/[slug]/logo` — acepta multipart/form-data
- Validación: JPG/PNG/WebP/SVG, máximo 2 MB, verifica ownership
- Almacenamiento en Supabase Storage bucket `consignataria-assets`
- El logo se refleja inmediatamente en el perfil público (ISR revalidate 300s)
- UI de upload con preview en el formulario de edición del dashboard

**2. Campo CUIT en edición de perfil**

- Nuevo campo `cuit` en el formulario de edición de perfil del owner
- Validación Zod: string max 20 caracteres, opcional
- Se muestra en el perfil público si está cargado

**3. Página `/calidad` — metodología y calidad de datos**

- 6 secciones: fuentes, metodología, frescura, cobertura, reporte de errores, SLA
- Explica de dónde vienen los datos, cómo se procesan y con qué frecuencia se actualizan
- Agregada al sitemap

**4. Botón "Reportar error" en perfiles**

- Link `mailto:agro@memola.com.ar` al pie de cada perfil de consignataria
- Subject pre-rellenado con el nombre de la consignataria

**5. Email mensual de métricas a owners**

- Cron job mensual (1ro de cada mes, 10:00 ART) via GitHub Actions
- API route `POST /api/cron/monthly-metrics` autenticada con ADMIN_SECRET
- Consulta `profile_views` del mes anterior para cada consignataria claimed
- Email HTML con estilo terminal: vistas del mes, mensajes condicionales según volumen
- Enviado via Resend

**6. Fix WhatsApp y link de edición**

- Número de WhatsApp de soporte corregido a `+5493773418130` en WelcomeChecklist
- Link "Editar perfil" corregido: ahora va a `/dashboard?tab=editar` en vez del perfil público

**Archivos creados:** `src/app/api/consignatarias/[slug]/logo/route.ts`, `src/app/api/cron/monthly-metrics/route.ts`, `.github/workflows/monthly-metrics.yml`, `src/app/(terminal)/calidad/page.tsx`
**Archivos modificados:** `src/app/(terminal)/dashboard/DashboardClient.tsx`, `src/app/(terminal)/dashboard/page.tsx`, `src/app/(terminal)/consignatarias/[slug]/ConsignatariaProfileClient.tsx`, `src/components/onboarding/WelcomeChecklist.tsx`, `src/lib/email.ts`, `src/lib/validators/consignataria-profile.ts`, `src/app/sitemap.ts`

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
