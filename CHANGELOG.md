# Changelog

All notable changes to consignatarias.com.ar are documented in this file.

Format: [Semantic Versioning](https://semver.org/) with feature descriptions focused on platform evolution.

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
