# consignatarias.com.ar

A cattle auction directory, market intelligence platform, and public API for Argentina's livestock industry. Think Bloomberg Terminal meets MercadoLibre — but for the $15B+ cattle market that still runs on WhatsApp groups and PDF calendars.

**Three product lines** (PRO Usuario · PRO Consignataria · Enterprise API · Self-serve) • **30+ API endpoints with auth + quotas** • **Lote-level transactional data** (haciinfo000007) • **MAG deep integration (16 sub-categorías + 11 años de INMAG)** • **USD blue desde 2011** • **366 remates** • **74 consignatarias canonical** • **44 MAG consignatarios** • **364 frigoríficos** • **12 provincias** • **24 YouTube channels** • **1550+ sitemap URLs** • **100% schema coverage** • **7 daily-rebuilt price landings** • **Reports system** • **🔴 En Vivo streaming focus** • **Observability (`/admin/ops`)** • **P0/P1 security closed**

**Current:** v1.14.5 (2026-05-14) — see [CHANGELOG.md](./CHANGELOG.md) for the v1.13.1 → v1.14.5 release train (slug-hang fix, public API auth gate, slug-variant 308 redirects, observability foundation, email outreach v2, 2 P0 + 5 P1 security findings closed).

**Live:** [www.consignatarias.com.ar](https://www.consignatarias.com.ar)

---

## The Problem

Argentina's cattle auction market is massive but fragmented. A cattle rancher in Chaco who wants to buy 500 calves has to:

1. Follow 20+ consignatarias on WhatsApp for auction announcements
2. Cross-reference PDF calendars from different auction houses
3. Call around for market prices
4. Hope they don't miss an auction because the PDF was outdated

There is no single place to see all upcoming auctions, compare prices, or browse auction houses by region.

## What We Built

**consignatarias.com.ar** aggregates data from 74 consignatarias (cattle auction houses) across 12 provinces into a unified, real-time interface. A rancher can see every upcoming auction in the country, filter by province or type, check market prices, and find frigorificos — all in one screen.

### Current UX (v1.9.13)

**For cattle ranchers (buyers):**
- Open the site → see all upcoming auctions nationwide in a terminal-style feed
- Filter by province (Buenos Aires, Chaco, Cordoba...), type (invernada, cria, general), or time period
- Browse `/remates/en-vivo` for live streaming auctions with YouTube integration
- Browse `/remates/tipo/invernada` (and cria, general, especial, reproductores) for type-specific landing pages
- Click any consignataria name → see their full annual calendar with heatmap, type distribution, and chronological auction list
- View YouTube videos and livestreams directly on consignataria profiles (auto-matched from 24 channels)
- Discover related consignatarias on each profile (same province + type)
- Share any auction via WhatsApp with one click
- Check `/mercado` for live INMAG index ($/kg vivo), category prices, corn FOB, USD rates
- Browse `/frigorificos` for the 364 registered slaughterhouses with SENASA data

**For consignatarias (auction houses) — trust-first onboarding:**
- Find your profile at `/consignatarias/[your-name]` with your complete auction calendar
- Click "Verificar y acceder" → enter your email → profile is verified instantly + magic link sent
- Log in → tabbed dashboard with: auction CRUD, profile editing, results upload, subscription management
- Create, edit, and delete your own auctions — they appear on your public profile within 5 minutes (ISR)
- Edit contact info (phone, email, website, WhatsApp, description, CUIT) reflected on public profile
- Upload logo — shows immediately on public profile (ISR, 5 min max)
- Monthly metrics email (1st of each month) with profile view stats

**For frigorificos (slaughterhouses):**
- Find your listing at `/frigorificos` in the SENASA directory
- Click "Reclamar" on your row → submit registration form → get verified
- Or click "REGISTRAR FRIGORIFICO" in the sidebar to browse and select your plant

**For the market:**
- Daily scraped prices: INMAG index, 6 cattle categories, corn FOB, USD blue/oficial
- Province landing pages with localized content and auction listings
- 77 consignataria profile pages with structured data for Google rich results
- Source badges (CACG, CYC, OFAR, etc.) and freshness labels on auctions
- `/glosario` — 17 livestock industry terms with DefinedTermSet schema
- `/calidad` — data quality methodology, sources, SLA
- "Reportar error" link on every consignataria profile

---

## How It Works

### Architecture

```
[GitHub Actions] ─ 14:00 ART, 7 days ─→ scrape 9 sources + write build-trigger ─→ JSON files
                                                                    │
                                                              [git push]
                                                                    │
                                                           [Vercel rebuild]
                                                                    │
                                                    SSG: ~170+ static HTML pages
                                                                    │
                                                          CDN edge (Vercel)
                                                                    │
                                                        Supabase (PostgreSQL)
                                                        ├── consignatarias (77 profiles)
                                                        ├── consignataria_claims
                                                        ├── consignataria_auctions (owner CRUD)
                                                        ├── frigorifico_claims
                                                        ├── frigorifico_profiles
                                                        ├── user_roles (auth)
                                                        ├── subscriptions (Rebill)
                                                        ├── auction_results
                                                        ├── profile_views
                                                        └── market_price_snapshots
```

**Hybrid static + dynamic:** The read-heavy public data (auctions, frigorificos, market prices) lives in JSON files and is statically generated at build time — TTFB < 50ms, zero compute cost. Profile pages use ISR (`revalidate = 300`) so owner edits reflect within 5 minutes. The interactive parts (claims, authentication, auction CRUD, subscriptions, admin) use Supabase PostgreSQL and API routes. Middleware is scoped to auth/API routes only — public pages bypass it entirely and serve from CDN edge with zero function invocations.

### Data Pipeline

Every day at 14:00 ART (17:00 UTC), 7 days a week, the scraper:

1. Fetches from 9 sources in parallel (CACG API, Colombo y Colombo, O'Farrell, Lehmann, Madelan, UMC Haciendas, dolarapi, mercadoagroganadero, MAGYP)
2. Normalizes and deduplicates auctions
3. Corrects province misassignments using `CITY_PROVINCE_MAP` (~70 cities)
4. Merges with curated entries from non-scrapable sources
5. Writes `remates.json` and `market-prices.json`
6. **Always writes** `last-build-trigger.json` (timestamp + run id) so quiet days (no MAG publish, weekends, holidays) still produce a diff
7. Git commits and pushes → triggers Vercel rebuild → site updated

**Why the build trigger exists.** ~13 pages snapshot `new Date()` at SSG time (`/remates/manana`, `/remates/hoy`, all `>= today` filters in directories, profile "upcoming" counts). If a day passes without a Vercel rebuild, those filters freeze. The trigger file guarantees a daily commit-and-rebuild even when no auction data changed, keeping every "today/tomorrow" page current. See [CHANGELOG v1.9.13](./CHANGELOG.md) for the incident this prevents.

### Data Sources

**Scraped daily (9 sources):**

| Source | Data |
|--------|------|
| [CACG API](https://cacg.org.ar/remates) | ~128 auctions from Camara Argentina de Consignatarios |
| [Colombo y Colombo](https://www.colomboycolombo.com.ar/remates) | Buenos Aires, Santa Fe, Corrientes |
| [O'Farrell](https://www.ivanofarrell.com.ar/remates) | Chaco, Santiago del Estero |
| [Madelan](https://www.madelan.com.ar/proximos) | NEA streaming |
| [Coop. Lehmann](https://www.cooperativalehmann.coop/hacienda/remates) | Santa Fe |
| [UMC Haciendas](https://umchv.ar) | Entre Rios, Corrientes |
| [dolarapi.com](https://dolarapi.com/) | USD blue/oficial |
| [mercadoagroganadero.com.ar](https://www.mercadoagroganadero.com.ar) | INMAG index ($/kg vivo) |
| [MAGYP](https://www.magyp.gob.ar) | Corn FOB (USD/tn) |

**Curated (manual):** IderCor, Etchevehere Rural, Coop. La Ganadera, Tradicion Ganadera, Nangapiry SA, Reggi y Cia, Nestor Hugo Fuentes, Ganaderos de Formosa, expo events (Expoagro, Agroactiva, Expo Rural).

**Static datasets:**

| Dataset | Records | Source |
|---------|---------|--------|
| Auctions | 385 | Scraper + curated |
| Consignatarias | 77 profiles | Registry + research |
| Frigorificos | 364 (126 enriched) | SENASA/MAGYP + web research |
| Market prices | INMAG + 6 categories | Scraped daily |

---

## Features

### Auction Feed (`/remates`)

Chronological feed of all upcoming auctions with filters:
- **Province** — Buenos Aires, Chaco, Cordoba, Corrientes, Entre Rios, Formosa, La Pampa, Misiones, San Luis, Santa Fe
- **Type** — Invernada, Cria, General, Especial
- **Time period** — tabs for different date ranges
- **Remates PRO** — featured auctions with amber/gold visual treatment (badge, accent bar, expanded layout). Chronological order preserved — PRO listings are highlighted, not pinned

### Consignataria Profiles (`/consignatarias/[slug]`)

77 static profile pages, each with:
- 12-month calendar heatmap (ENE–DIC)
- Type distribution bar chart
- Complete auction chronogram grouped by month
- Stats: total auctions, estimated heads, upcoming count, provinces, main plazas
- "Verificar este perfil" CTA for owners
- JSON-LD structured data (BreadcrumbList, LocalBusiness, Event)

**Canonical slug system:** 109 raw slugs from auction data → 77 canonical entities. Handles duplicates like `bressan` + `bressan-y-cia-s-r-l` → `bressan-y-cia`. Non-canonical slugs get 301 redirects.

### Frigorifico Directory (`/frigorificos`)

364 SENASA-registered slaughterhouses with:
- Sortable table (matricula, name, province, stage)
- Filters: search, province, stage (E1 faena+desposte, E2 desposte, E3 deposito)
- Stage and province distribution charts
- "Reclamar" link on each row
- "REGISTRAR FRIGORIFICO" CTA in sidebar

### Video Catalogs (v1.7.0)

Automated YouTube video matching system that links auction livestreams and videos to consignataria profiles.

**Architecture:**

```
Daily Scraper (14:00 ART)
        │
        ▼
YouTube Video Matcher
        │
        ├── Load remates for TODAY
        ├── Filter consignatarias with mapped channels
        ├── Search YouTube Data API v3 for each
        ├── Match by: live status > location > date
        └── Update remates.json with youtubeUrl
        │
        ▼
Vercel Deploy (auto-triggered)
```

**24 YouTube Channels Mapped:**

| Consignataria | Channel ID | Subscribers |
|---------------|------------|-------------|
| La Ganadera Ramírez | UCrAG-793MFmRqqlVzEHQJwg | 4,100 |
| Rosgan BCR | UCvO_FXYeiyj5QYqL9cWOUeQ | 3,000 |
| AFA SCL | UC1XGF4vhAKosCWHR-74C-Ng | 2,930 |
| Reggi y Cia | UCDp9jvg607ey7p6sHowOjYw | 1,260 |
| UMC Haciendas | UCPzo8IxRDGZcI5rH9IS9fhA | 1,190 |
| + 10 more | — | ~1,900 |

**Total reach:** ~14,500+ subscribers

**Components:**
- `scripts/match-youtube-videos.ts` — Matcher script (runs in GitHub Actions)
- `src/components/video/VideoGallery.tsx` — Profile video gallery component
- `src/app/api/consignatarias/[slug]/videos/route.ts` — Videos API endpoint
- `src/lib/data/youtube-channels.json` — Channel mapping with resolved UCxxxxxxx IDs
- `supabase/migrations/20260315_consignataria_videos.sql` — Database schema

**Third-party Platforms** (consignatarias without own channels):
- Canal Rural (@canalrural)
- ClicRural (@clicruralar5804)
- Entre Surcos y Corrales (@entresurcosycorrales2456)
- De Frente al Campo (@DeFrentealCampo)

**Enriched data:** 126 frigorificos (all Stage 1) enriched with contact info, location, export classification via automated web research. Stored in `frigorificos-enriched.json`.

### Market Prices (`/mercado`)

- INMAG index ($/kg vivo) with trend chart
- 6 cattle category prices: novillos, novillitos, vaquillonas, vacas, toros, terneros
- Corn FOB (USD/tn)
- USD blue and oficial rates
- Updated daily by scraper

### Post-Remate Outreach System (v1.7.2)

Automated email outreach to consignatarias after their auctions, requesting official results:

**How it works:**
```
Auction ends (we have the schedule)
        ↓
Cron detects (+3-5h after)
        ↓
Automated email sent (signed by José Barnetche)
        ↓
Reply-to: agro@memola.com.ar
        ↓
Consignataria responds with averages
        ↓
Published with their official data
```

**Email database:** 71 of 86 consignatarias (83% coverage) — scraped from websites, social media, and public directories using parallel sub-agents.

**Components:**
- `src/lib/email.ts` — `sendPostRemateResultsRequest()` function
- `src/app/api/cron/post-remate-outreach/route.ts` — hourly cron endpoint
- `supabase/migrations/20260316_outreach_log.sql` — tracking table
- `vercel.json` — cron schedule

**Tracking:** `outreach_log` table prevents duplicate emails and tracks response rates.

---

### Email Marketing Automatizado (v1.5.0)

Sistema de promoción por email para consignatarias PRO:

**Para suscriptores:**
- Newsletter semanal con resumen de remates próximos
- Remates PRO destacados con tratamiento visual especial
- Alertas personalizadas por provincia/tipo (próximamente)

**Para consignatarias PRO:**
- Cada remate publicado se promociona por email a toda la base
- Emails transaccionales via Resend (dominio verificado: consignatarias.com)
- Templates HTML estilo terminal con branding consistente

**Cron jobs (GitHub Actions):**
- `remate-reminders` — diario 8 AM ART, recordatorios pre-remate
- `weekly-newsletter` — lunes 10 AM ART, resumen semanal

**Endpoints:**
- `POST /api/cron/weekly-newsletter` — trigger manual de newsletter
- `GET /api/cron/remate-reminders` — trigger manual de recordatorios
- `POST /api/newsletter` — suscripción a newsletter

### Onboarding & Dashboard UX (v1.9.3)

**BATTLE #3 audit** identified and fixed 25+ UX friction points:

**Claim Flow:**
- Real-time CUIT validation (modulo 11 algorithm with ✓/✗ visual feedback)
- Improved success state: "SOLICITUD ENVIADA" with email guidance + spam folder reminder
- 409 conflict handling with login recovery path

**Empty Dashboard Wizard:**
- New users see "PRIMEROS PASOS" 3-step visual guide instead of blank screen
- Step 1 (active): Verificar perfil with CTAs
- Steps 2-3 (greyed): Completar información, Publicar remates
- Value prop footer explaining verified benefits

**Empty States Pattern:**
- All empty states now follow DTEHistory gold standard
- Icon + headline + actionable guidance + CTAs
- Applied to: Remates, Consignatarias, Frigoríficos, Comparar, Resultados

**Components:**
- `src/components/onboarding/WelcomeChecklist.tsx` — Post-claim checklist with scroll-to-edit
- `src/app/(terminal)/dashboard/DashboardClient.tsx` — Empty dashboard wizard (lines 561-615)

### Profile Verification (Trust-First)

**Consignatarias:** Click "Verificar y acceder" → enter email → profile auto-approved instantly → magic link sent → log in to tabbed dashboard. Admin notified, can revoke if needed.

**Frigorificos:** Click "Reclamar" on any row or "REGISTRAR FRIGORIFICO" in sidebar → select plant → fill form → admin reviews → email confirmation.

Both flows use Supabase for persistence, Zod for validation, Resend for transactional emails.

### Owner Dashboard (`/dashboard`)

Tabbed interface for verified owners:
- **Resumen** — quick stats, profile views (30 days), quick actions
- **Remates** — full CRUD: create, edit, delete auctions (merged with scraped data on public profile)
- **Editar perfil** — phone, email, website, WhatsApp, description
- **Resultados** — upload auction results (heads sold, prices, categories)
- **Mi plan** — subscription status, upgrade to PRO via Rebill
- **Frigorífico** — frigorifico claim status (if applicable)

### Province Landing Pages (`/remates/[provincia]`)

10 static pages targeting "remates hacienda [provincia]" keywords. Each with 150-250 words of unique SEO copy mentioning local cities, consignatarias, and auction patterns. BreadcrumbList + ItemList JSON-LD.

### Subasto API (`/api/*`)

Public REST API for the Argentine cattle market. 20 endpoints, free tier with rate limiting.

**Auction Endpoints:**
| Endpoint | Description |
|----------|-------------|
| `GET /api/remates/proximos` | Next 7 days of auctions |
| `GET /api/remates/hoy` | Today's auctions |
| `GET /api/remates/stats` | Aggregate statistics |
| `GET /api/remates/buscar` | Full-text search with filters |
| `GET /api/remates/calendario` | 7-day calendar view |
| `GET /api/remates/top` | Highlighted auctions |

**Market Endpoints:**
| Endpoint | Description |
|----------|-------------|
| `GET /api/precios` | INMAG prices by category |
| `GET /api/status` | API health check |
| `GET /api/health` | Simple health probe |

**Consignataria Endpoints:**
| Endpoint | Description |
|----------|-------------|
| `GET /api/consignataria/[slug]` | Profile with auction history |
| `GET /api/consignatarias/ranking` | Leaderboard by auction count |

**Integration Endpoints:**
| Endpoint | Description |
|----------|-------------|
| `POST /api/webhooks/register` | Register webhooks |
| `GET/POST/DELETE /api/alertas` | Persistent alert subscriptions |
| `GET /api/alertas/[id]` | Alert details |

**Documentation:** `/api-docs` page with full documentation, `/api/openapi.json` for OpenAPI spec.

### Lead Magnets (`/herramientas`)

5 free tools for lead capture:
- **Calculadora de Hacienda** — estimate lot value by category and weight
- **Calendario de Remates** — weekly/monthly auction calendar
- **Reporte Semanal** — downloadable PDF market summary
- **Comparador de Precios** — compare prices by category and date
- **Exportar Datos** — download auctions as CSV/JSON

All tools include newsletter signup CTA.

### SEO & AI Search Optimization

- Dynamic sitemap (~100 URLs)
- JSON-LD: Organization, WebSite, Dataset, Event, LocalBusiness, BreadcrumbList, ItemList, FAQPage, DefinedTermSet
- Open Graph + Twitter Cards on all pages
- `noindex` on thin pages (`/verificar`, `/login`)
- `/quienes-somos` for E-E-A-T signals
- `/glosario` — 17 terms with DefinedTermSet JSON-LD for AI definitional queries
- `/calidad` — data methodology page for trust signals
- FAQ section on landing page with FAQPage schema (10 Q&As)
- AI bot access in robots.txt: GPTBot, ChatGPT-User, PerplexityBot, ClaudeBot, anthropic-ai, Google-Extended
- Server-rendered intro text on all sections
- `next/font/google` (no render-blocking CDN links)
- Canonical URLs with non-www → www redirect (301)

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router, SSG + API routes) |
| Styling | Tailwind CSS 3.4 (terminal dark theme) |
| Language | TypeScript (strict mode) |
| Database | Supabase PostgreSQL (10 tables + auth) |
| Email | Resend (transactional) |
| Payments | Rebill (LATAM-native, ARS + USD) |
| Validation | Zod |
| Hosting | Vercel (Hobby plan, $0) |
| CI/CD | GitHub Actions (daily scraper) |
| Analytics | GA4 (G-6CZMZH9S6Y) |

**Dependencies:** Next.js, React 19, Tailwind, `@supabase/supabase-js`, `@supabase/ssr`, `resend`, `zod`, `sharp`, `@vercel/analytics`, `@vercel/speed-insights`.

---

## Pages & Routes

| Route | Type | Description |
|-------|------|-------------|
| `/` | Static | Landing page — problem/solution, live stats, CTA |
| `/overview` | Static | Dashboard overview — market summary, upcoming events |
| `/remates` | Static | Auction feed with filters (province, type, period) |
| `/remates/[provincia]` | SSG (10) | Province landing pages with SEO copy |
| `/consignatarias` | Static | Directory of 77 consignatarias |
| `/consignatarias/[slug]` | SSG (77) | Profile pages with calendar, heatmap, stats |
| `/consignatarias/[slug]/verificar` | SSG (77) | Claim form (noindex) |
| `/frigorificos` | Static | Directory of 364 frigorificos with search/filters |
| `/frigorificos/verificar` | Dynamic | Frigorifico registration form (noindex) |
| `/mercado` | Static | Market prices — INMAG, categories, USD, corn |
| `/quienes-somos` | Static | Institutional page (E-E-A-T) |
| `/glosario` | Static | 17 livestock terms with DefinedTermSet schema |
| `/calidad` | Static | Data quality methodology and SLA |
| `/planes` | Static | Pricing tiers (Free / PRO / Enterprise) |
| `/login` | Static | Magic link authentication (noindex) |
| `/dashboard` | Dynamic | Owner dashboard (authenticated) |
| `/admin/claims` | Dynamic | Admin claim review panel |
| `/herramientas` | Static | 5 lead magnet tools |
| `/api-docs` | Static | API documentation page |
| `/api/*` | Dynamic | 20 REST API endpoints |

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                            # Landing page
│   ├── layout.tsx                          # Root layout + GA4 + next/font
│   ├── middleware.ts                       # Supabase Auth + API rate limiting (scoped to /api, /admin, /dashboard, /login, /mi-cuenta, /auth only)
│   ├── sitemap.ts                          # Dynamic sitemap (~100 URLs)
│   ├── robots.ts                           # robots.txt
│   ├── globals.css                         # Terminal + landing styles
│   ├── api/
│   │   ├── claims/route.ts                # POST claims (auto-approve + magic link)
│   │   ├── consignatarias/[slug]/
│   │   │   ├── route.ts                  # PATCH profile
│   │   │   ├── logo/route.ts            # POST logo upload
│   │   │   └── auctions/                 # GET/POST + [id] PATCH/DELETE
│   │   ├── frigorifico-claims/route.ts    # POST frigorifico claims
│   │   ├── subscribe/route.ts             # POST Rebill payment link
│   │   ├── webhooks/rebill/route.ts       # Rebill webhook handler
│   │   ├── profile-views/route.ts         # POST view tracking
│   │   ├── auction-results/route.ts       # POST/GET results
│   │   ├── cron/monthly-metrics/route.ts  # Monthly owner metrics email
│   │   └── admin/                         # Claims + frigo claims review
│   └── (terminal)/                         # Route group — dashboard
│       ├── layout.tsx                      # Terminal chrome (nav, clock, footer)
│       ├── overview/                       # Dashboard overview
│       ├── remates/
│       │   ├── page.tsx                   # Auction feed (server)
│       │   ├── RematesClient.tsx          # Filters, rows, tabs (client)
│       │   └── [provincia]/page.tsx       # Province landing pages (10)
│       ├── consignatarias/
│       │   ├── page.tsx                   # Directory listing
│       │   └── [slug]/
│       │       ├── page.tsx               # Profile page (SSG)
│       │       ├── ConsignatariaProfileClient.tsx
│       │       └── verificar/page.tsx     # Claim form (noindex)
│       ├── frigorificos/
│       │   ├── page.tsx                   # Directory page (server)
│       │   ├── FrigorificosClient.tsx     # Table, filters, charts (client)
│       │   └── verificar/page.tsx         # Registration form (noindex)
│       ├── mercado/                        # Market prices
│       ├── quienes-somos/                  # E-E-A-T page
│       ├── glosario/                       # Livestock glossary (17 terms)
│       ├── calidad/                        # Data quality methodology
│       ├── planes/                         # Pricing page (Free/PRO/Enterprise)
│       ├── login/                          # Magic link auth
│       ├── dashboard/                      # Owner dashboard
│       └── admin/claims/                   # Admin claim review
├── components/
│   ├── claims/
│   │   ├── ClaimForm.tsx                  # Consignataria claim form
│   │   └── FrigorificoClaimForm.tsx       # Frigorifico claim form
│   ├── onboarding/WelcomeChecklist.tsx    # Post-claim onboarding checklist
│   ├── seo/JsonLd.tsx                     # Schema.org components
│   └── AnalyticsProvider.tsx              # GA4
└── lib/
    ├── data/
    │   ├── remates.json                   # 385 auctions
    │   ├── consignataria-slugs.ts         # Canonical slug map (109 → 77)
    │   ├── frigorificos.json              # 364 frigorificos (SENASA base)
    │   ├── frigorificos-enriched.json     # 364 frigorificos (enriched)
    │   ├── consignatarias.json            # 56 consignatarias
    │   ├── market-prices.json             # INMAG, categories, USD, corn
    │   └── featured-links.json            # Curated resource links
    ├── dal/consignatarias.ts              # DAL: merge static JSON + Supabase
    ├── db/
    │   ├── schema.ts                      # TypeScript interfaces
    │   └── seed.ts                        # Data access functions
    ├── validators/
    │   ├── claim.ts                       # Zod schemas (consignataria + frigorifico)
    │   ├── consignataria-profile.ts       # Profile edit validation
    │   └── auction-result.ts              # Auction result validation
    ├── rebill.ts                          # Rebill payment link helper
    ├── features.ts                        # Feature gating (free/pro/enterprise)
    ├── email.ts                           # Resend transactional emails
    ├── analytics.ts                       # GA4 event tracking
    ├── supabase.ts                        # Service role client
    ├── supabase-browser.ts                # Anon client
    ├── supabase-server.ts                 # Server client
    └── utils/url.ts                       # URL normalization

scripts/
├── scrape-auctions.mjs                    # Daily scraper (live in workflow)
├── match-youtube-videos.ts                # Live in workflow
├── ignore-build.sh                        # Vercel ignoreCommand
├── el-oraculo/                            # Oráculo report skill
├── monthly-report/                        # El Corredor monthly publish
└── archive/                               # 26 one-shot scripts from earlier eras (RLS bootstrap, GSC auth, enrichment one-offs, results dumps, og generator, etc.)

supabase/migrations/
├── 20260309_consignatarias_claims.sql     # consignatarias + claims tables
├── 20260310_auth_user_roles.sql           # Auth + user roles
├── 20260310_frigorifico_claims.sql        # frigorifico_claims table
├── 20260311_consignataria_profile_fields.sql  # description, logo_url, whatsapp
├── 20260311_subscriptions.sql             # Rebill subscriptions
├── 20260311_profile_views.sql             # Profile view tracking
├── 20260311_market_price_history.sql      # Market price snapshots
└── 20260312_consignataria_auctions.sql    # Owner-managed auctions

.github/workflows/
├── scrape-auctions.yml                    # Cron: 14:00 ART daily
└── monthly-metrics.yml                    # Cron: 1st of month, 10:00 ART
```

---

## Development

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm build        # Generates ~552 static pages
pnpm start        # Serve production locally
```

### Environment Variables

Required in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
RESEND_API_KEY=re_xxx
ADMIN_SECRET=your-admin-secret
ADMIN_EMAIL=admin@example.com
REBILL_SECRET_KEY=sk_xxx
NEXT_PUBLIC_REBILL_PUBLIC_KEY=pk_xxx
```

Public data (auctions, frigorificos, market prices) works without any env vars — it reads from JSON files.

### Scraper

```bash
# Run manually
node scripts/scrape-auctions.mjs
```

Runs daily via GitHub Actions at 14:00 ART (17:00 UTC). Flow: scrape → normalize → deduplicate → correct provinces → commit → Vercel rebuild.

The scraper includes a `CITY_PROVINCE_MAP` (~70 cities) that corrects province misassignments from the CACG API and curated entries.

### Enrichment Scripts (archived)

The frigorificos enrichment pipeline shipped in v0.9.x and froze; the static
JSON files (`src/lib/data/frigorificos*.json`) are still served. The original
scripts live in `scripts/archive/enrich-frigorificos.mjs` +
`scripts/archive/merge-enrichment.mjs` for reference, but no longer run as
part of any workflow.

---

## Business Model

Three distinct product lines, three audiences, three price points:

1. **PRO Usuario** — ARS $7.900/mes — for productores, asesores, contadores, brokers. Acceso ilimitado al observatorio (filtros, medios de pago, detalle, descargas premium, archivo histórico INMAG). Flow: `/upgrade` via Rebill. Entitlement: `user_subscriptions.tier = 'pro'`.
2. **PRO Consignataria** — ARS $45.000/mes — for consignatarias and frigoríficos that want to be featured. Promoción de remates por email a +500 productores, badge dorado, perfil verificado, analytics, landing personalizada, QR para catálogos. Flow: `/api/subscribe` via Rebill (`pln_f644261ffe68462497eeb78d4363f377`). Entitlement: `consignatarias.subscription_tier`.
3. **Enterprise API** — USD 99 / 500 / 700–7.500 — for apps, frigoríficos, bancos, traders. Starter (1K req/mes), Growth (50K req/mes + reports + dashboards), Scale (volume slider 100K–5M req/mes + white-label + CSM). Calculator at `/enterprise`. Entitlement: `user_subscriptions.api_tier`. Independent from PRO Usuario — a single user can hold both.
4. **FrigoConnect** — frigorífico-side directory listing (registration + enriched profiles)

---

## Provinces Covered

Buenos Aires, Chaco, Cordoba, Corrientes, Entre Rios, Formosa, La Pampa, Misiones, San Luis, Santa Fe.

---

## Development Timeline

| Version | Date | Milestone |
|---------|------|-----------|
| 0.0.0 | Feb 26 | Genesis — `npx create-next-app`, data collection |
| 0.1.0 | Feb 26 | First commit — 92 auctions, 364 frigorificos, full dashboard |
| 0.2.0 | Feb 26 | Data expansion — 277 auctions from 15+ sources |
| 0.3.0 | Feb 26 | Automation — daily scraper, live market data, identity |
| 0.4.0 | Mar 6 | Monetization — PRO auction system |
| 0.5.0 | Mar 7 | Consignataria profiles — 70 pages, canonical slug system, GA4 |
| 0.6.0 | Mar 7 | Terminal redesign — live visual language, glass panels |
| 0.7.0 | Mar 8 | SEO — JSON-LD, sitemap, OG images, 9th scraper source |
| 0.8.1 | Mar 9 | Verification — Supabase, claims, admin dashboard, Resend emails |
| 0.8.3 | Mar 9 | Province fix — CITY_PROVINCE_MAP, 100% accuracy |
| 0.9.0 | Mar 9 | SEO overhaul — homepage rewrite, 10 province pages, E-E-A-T |
| 0.9.1 | Mar 10 | FrigoConnect — frigorifico claims + 126 enriched profiles |
| 0.9.2 | Mar 10 | Frigorifico detail pages (364) + auction results backend |
| 0.9.5 | Mar 10 | SaaS foundation — Rebill, DAL, profile editing, analytics, onboarding |
| 0.9.7 | Mar 10 | Trust-first onboarding — auto-approve claims, auction CRUD, dashboard tabs |
| 0.9.8 | Mar 10 | Q2 blueprint close — logo upload, /calidad, reportar error, monthly metrics |
| 0.9.9 | Mar 10 | AI SEO — robots.txt AI bots, FAQ schema, /glosario with DefinedTermSet |
| **1.0.0** | **Mar 10** | **Full platform — navigation, subscribe flow, all pages discoverable** |
| 1.0.1 | Mar 11 | Post-payment flow — Rebill fix, success page with polling, celebration panel |
| 1.0.2 | Mar 11 | Contrast fix — eliminate text-zinc-600 sitewide, WCAG AA compliance |
| 1.0.3 | Mar 11 | Real-time status — countdown timer, YouTube integration, admin KPIs |
| **1.1.0** | **Mar 12** | **Subasto API — 11 public endpoints, webhooks, alertas, documentation** |
| 1.2.0 | Mar 13 | Lead magnets — 5 tools, newsletter signup, glosario 38 terms, API docs page |
| **1.3.0** | **Mar 14** | **API complete — 20 endpoints, ranking, PDF reports, B2B SEO schemas** |
| 1.7.0 | Mar 15 | Video catalogs — 24 YouTube Channels, automated matching, VideoGallery component |
| 1.7.1 | Mar 15 | SEO expansion — 35 province+type combo pages, dynamic OG images, external resources |
| **1.7.2** | **Mar 16** | **Post-remate outreach — automated emails, 83% email coverage (71/86 consignatarias)** |
| 1.9.0 | Mar 18 | Price Oracle — MAG integration, category prices, onboarding stack |
| 1.9.1 | Mar 19 | Internal linking, dynamic scarcity, DTE export, WhatsApp analytics |
| 1.9.2 | Mar 19 | DTE Period Comparison — lock-in analytics (month/quarter/year) |
| **1.9.3** | **Mar 20** | **BATTLE #3 — Onboarding UX overhaul (25+ improvements, empty states, CUIT validation)** |
| 1.9.10 | Apr 7 | Frigorífico monetization — claim CTAs, lead gen, PRO upsell |
| **1.9.11** | **Apr 10** | **En Vivo focus — streaming prominence, /remates/en-vivo, /mercado/arrendamiento, Market Decision Infrastructure strategy** |
| 1.9.12 | Apr 11 | YouTube channel expansion — 24 channels, improved slug matching, 3x video coverage |
| **1.9.13** | **May 8** | **Daily rebuild guarantee — build-trigger file, 7-day cron, INMAG backfill (Apr 11→May 6), drop deprecated edge runtime on /api/health** |
| **1.10.0** | **May 12** | **Three-product pricing — `/planes` audience toggle (Productor vs Consignataria), Enterprise API (Starter/Growth/Scale) with HMAC-SHA256 keys + quota tracking + weekly 80% alert, 7 new daily-rebuilt `/precios/*` landings answer-first against GSC queries, Reports system at `/cuenta/reportes` with per-user download tracking, 5 new Supabase migrations** |
| **1.10.1** | **May 12** | **MAG data deepening — backfill 11 años de INMAG diario (2.236 días, 2015→hoy), 16 sub-categorías oficiales con corte por peso (haciinfo000502), nuevos endpoints `/api/precios?detallado=true` y `?historico=N`, cron daily Lun-Vie 15:30 ART, `/api-docs` reescrito con auth Bearer correcto y matriz real de rate limits por plan** |
| **1.11.0** | **May 12** | **Derivatives layer — `/mercado/inmag-dolares` (INMAG deflactado por USD blue, SEO público), `YearOverYearBlock` en /mercado, Seasonality Heatmap PRO-gated, `/mercado/vender-ahora` calculator (percentiles 30+365d), `/api/index/memola` composite ponderado, USD blue history table backfilleable (5.608 días desde 2011), server-rendered SVG charts sin client JS** |
| **1.12.0** | **May 12** | **Lote-level pipeline (haciinfo000007) — scraper 44 consignatarios × FAENA/INVERNADA, queue-driven workflow, `/api/lots` endpoint. Self-serve Enterprise Starter via Rebill — checkout ARS 139.900 (~USD 99), webhook activa `api_tier='starter'` automático, welcome email, coexistencia con PRO Usuario** |
| **1.13.0** | **May 13** | **Quota 28-day billing period (no calendar month) + per-user aggregation across all keys + self-serve Starter→Growth upgrade flow (Rebill + UpgradeNudge ≥80% usage) + dev invite system (`pending_api_invites` table + signup trigger) + 6 sitemap additions (`/el-corredor`, `/el-oraculo`, `/mercado/inmag-dolares`, `/mercado/arrendamiento`, `/terminos`, `/privacidad`) + middleware Bearer detection bugfix + project-clone env-var cleanup. ⚠ Known issue: `/consignatarias/[slug]` profile pages still hang in production — partial mitigations shipped, root cause TBD.** |

Built in 76 days. One human, one AI. $0 hosting cost. 22+ Supabase tables. 33 API endpoints. See [CHANGELOG.md](CHANGELOG.md) for full details.

---

## Roadmap: Market Decision Infrastructure

The platform is evolving from a data directory into the **decision infrastructure** where Argentina's cattle market operates. The goal: users don't just access information — they make decisions inside the platform.

### Strategic Vision

```
CURRENT:  Usuario → Busca información → Se va → Decide afuera
FUTURE:   Usuario → Entra al sistema → Toma decisiones adentro → No puede irse
```

### Phase 1: Statefulness (Q2 2026) 🔄

**Making the platform remember users**

| Feature | Status | Description |
|---------|--------|-------------|
| Follow system | 🔜 Next | Follow consignatarias, provinces, remate types |
| Personalized feed | 🔜 Next | Homepage adapts to what you follow |
| Activity history | 🔜 Next | Remates vistos, catálogos descargados |
| Watchlist | 🔜 Next | Save remates for later, export to calendar |

**Switching cost:** Once you configure 15+ follows, rebuilding that elsewhere is work.

### Phase 2: Intelligent Alerts (Q2-Q3 2026) 🔔

**The system works for you**

| Alert Type | Trigger | Channels |
|------------|---------|----------|
| Nuevo remate | Consignataria seguida publica | Email, Push, WhatsApp |
| Precio objetivo | INMAG cruza umbral definido | Push, SMS |
| Oportunidad | Remate match con criterios | Email digest |
| Mercado | Cambio significativo volumen/precios | Weekly report |

**Switching cost:** 10+ configured alerts with specific criteria = migration pain.

### Phase 3: Dynamic Rankings (Q3 2026) 🏆

**Visible competition drives behavior**

| Metric | Weight | Effect |
|--------|--------|--------|
| Volume (cabezas) | 30% | Consignatarias compete for position |
| Frequency | 25% | More remates → better ranking |
| Engagement | 20% | Users discover top performers |
| Completeness | 15% | Verified profiles rank higher |
| Streaming | 10% | En vivo presence matters |

**Feedback loop:** Rankings create behavior → consignatarias publish more → more data → better rankings.

### Phase 4: Comparatives (Q3-Q4 2026) ⚖️

**Decision-making tools**

- **Comparador de Consignatarias** — Side-by-side: remates/año, provincias, cabezas, streaming, verificación
- **Comparador de Remates** — Multiple auctions same day: hora, ubicación, cabezas, distancia
- **Historical analysis** — Performance trends over time

**Data gravity:** Only we have the data to make these comparisons.

### Phase 5: Direct Actions (Q4 2026) 📞

**Transaction happens inside the platform**

- **Structured contact forms** — Motivo, remate de interés, canal preferido
- **Lead tracking for PRO** — Consignatarias see their inquiry pipeline
- **WhatsApp integration** — Pre-filled messages with remate context
- **Request callbacks** — Schedule calls through the platform

**Lock-in:** Contact history and lead analytics live in the platform.

### Phase 6: Portfolios & State (2027) 📊

**Persistent user value**

- **Purchase portfolio** — Register compras, track spending patterns
- **Price benchmarking** — Your avg price vs market
- **Seller portfolio** — Remitentes track their consignment history
- **Recommendations** — ML-powered auction suggestions

**Switching cost:** 12+ months of purchase history = impossible to leave.

### Phase 7: Network Effects (2027) 🌐

**More users = more value**

| Actor A Action | → | Benefit for Actor B |
|----------------|---|---------------------|
| Buyer follows consignataria | → | Consignataria sees follower count |
| Consignataria publishes catalog | → | Buyer has more info |
| User compares | → | System learns what to compare |
| PRO pays | → | Platform improves for all |

**Data network effects:** Every search teaches the system what users want.

### Phase 8: Operational Standard (2027+) 🔒

**The platform becomes infrastructure**

- **API & Embeds** — Other systems depend on us
- **Workflow integration** — Daily operations run through the platform
- **Industry standard** — "Check consignatarias.com.ar" becomes the norm

**Lock-in metrics:**
| Metric | Target | Indicates |
|--------|--------|-----------|
| DAU/MAU ratio | > 40% | Habitual use |
| Alerts per user | > 5 | Dependency |
| Session time | > 5 min | Engagement |
| Follows per user | > 10 | Personalization |
| % decisions in platform | > 50% | Operational standard |

### Implementation Priority

```
Q2 2026: Follows + Alerts + Watchlist
Q3 2026: Feed + Rankings + Comparator
Q4 2026: Smart Alerts + Contact + API
2027:    Portfolio + Predictions + Marketplace
```

**North Star:** When a user has 15 follows + 10 alerts + 6 months of history → switching cost is prohibitive.

See [`docs/EL-ORACULO-FRAMEWORK.md`](docs/EL-ORACULO-FRAMEWORK.md) + [`ROADMAP.md`](./ROADMAP.md) for the current strategic anchor. (An earlier `MARKET-DECISION-INFRASTRUCTURE.md` exists in the repo for archival reasons; it predates the April 2026 data-layer pivot and should not be treated as current.)

---

## License

Property of Memola Medios SAS. All rights reserved.
