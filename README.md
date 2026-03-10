# consignatarias.com.ar

A cattle auction directory and market intelligence platform for Argentina's livestock industry. Think Bloomberg Terminal meets MercadoLibre — but for the $15B+ cattle market that still runs on WhatsApp groups and PDF calendars.

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

**consignatarias.com.ar** aggregates data from 77+ consignatarias (cattle auction houses) across 10 provinces into a unified, real-time interface. A rancher can see every upcoming auction in the country, filter by province or type, check market prices, and find frigorificos — all in one screen.

### Current UX (v0.9.1)

**For cattle ranchers (buyers):**
- Open the site → see all upcoming auctions nationwide in a terminal-style feed
- Filter by province (Buenos Aires, Chaco, Cordoba...), type (invernada, cria, general), or time period
- Click any consignataria name → see their full annual calendar with heatmap, type distribution, and chronological auction list
- Check `/mercado` for live INMAG index ($/kg vivo), category prices, corn FOB, USD rates
- Browse `/frigorificos` for the 364 registered slaughterhouses with SENASA data

**For consignatarias (auction houses):**
- Find your profile at `/consignatarias/[your-name]` with your complete auction calendar
- Click "Verificar este perfil" → submit your email and role → get verified by admin
- Once verified, manage your profile and access the owner dashboard

**For frigorificos (slaughterhouses):**
- Find your listing at `/frigorificos` in the SENASA directory
- Click "Reclamar" on your row → submit registration form → get verified
- Or click "REGISTRAR FRIGORIFICO" in the sidebar to browse and select your plant

**For the market:**
- Daily scraped prices: INMAG index, 6 cattle categories, corn FOB, USD blue/oficial
- Province landing pages with localized content and auction listings
- 77 consignataria profile pages with structured data for Google rich results

---

## How It Works

### Architecture

```
[GitHub Actions] ─ 14:00 ART daily ─→ scrape 9 sources ─→ remates.json + market-prices.json
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
                                                        ├── frigorifico_claims
                                                        └── user_roles (auth)
```

**Hybrid static + dynamic:** The read-heavy public data (auctions, frigorificos, market prices) lives in JSON files and is statically generated at build time — TTFB < 50ms, zero compute cost. The interactive parts (profile claims, authentication, admin) use Supabase PostgreSQL and API routes.

### Data Pipeline

Every day at 14:00 ART, the scraper:

1. Fetches from 9 sources in parallel (CACG API, Colombo y Colombo, O'Farrell, Lehmann, Madelan, UMC Haciendas, dolarapi, mercadoagroganadero, MAGYP)
2. Normalizes and deduplicates auctions
3. Corrects province misassignments using `CITY_PROVINCE_MAP` (~70 cities)
4. Merges with curated entries from non-scrapable sources
5. Writes `remates.json` and `market-prices.json`
6. Git commits and pushes → triggers Vercel rebuild → site updated

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

**Enriched data:** 126 frigorificos (all Stage 1) enriched with contact info, location, export classification via automated web research. Stored in `frigorificos-enriched.json`.

### Market Prices (`/mercado`)

- INMAG index ($/kg vivo) with trend chart
- 6 cattle category prices: novillos, novillitos, vaquillonas, vacas, toros, terneros
- Corn FOB (USD/tn)
- USD blue and oficial rates
- Updated daily by scraper

### Profile Verification

**Consignatarias:** Click "Verificar este perfil" on any profile → fill form (email, name, CUIT, phone, role) → admin reviews in `/admin/claims` → approved/rejected with email notification.

**Frigorificos:** Click "Reclamar" on any row or "REGISTRAR FRIGORIFICO" in sidebar → select plant → fill form → admin reviews → email confirmation.

Both flows use Supabase for persistence, Zod for validation, Resend for transactional emails.

### Province Landing Pages (`/remates/[provincia]`)

10 static pages targeting "remates hacienda [provincia]" keywords. Each with 150-250 words of unique SEO copy mentioning local cities, consignatarias, and auction patterns. BreadcrumbList + ItemList JSON-LD.

### SEO

- Dynamic sitemap (~100 URLs)
- JSON-LD: Organization, WebSite, Dataset, Event, LocalBusiness, BreadcrumbList, ItemList
- Open Graph + Twitter Cards on all pages
- `noindex` on thin pages (`/verificar`, `/login`)
- `/quienes-somos` for E-E-A-T signals
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
| Database | Supabase PostgreSQL (4 tables + auth) |
| Email | Resend (transactional) |
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
| `/login` | Static | Magic link authentication (noindex) |
| `/dashboard` | Dynamic | Owner dashboard (authenticated) |
| `/admin/claims` | Dynamic | Admin claim review panel |

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                            # Landing page
│   ├── layout.tsx                          # Root layout + GA4 + next/font
│   ├── middleware.ts                       # Supabase Auth session refresh
│   ├── sitemap.ts                          # Dynamic sitemap (~100 URLs)
│   ├── robots.ts                           # robots.txt
│   ├── globals.css                         # Terminal + landing styles
│   ├── api/
│   │   ├── claims/route.ts                # POST consignataria claims
│   │   ├── frigorifico-claims/route.ts    # POST frigorifico claims
│   │   └── admin/claims/                  # GET/PATCH admin review
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
│       ├── login/                          # Magic link auth
│       ├── dashboard/                      # Owner dashboard
│       └── admin/claims/                   # Admin claim review
├── components/
│   ├── claims/
│   │   ├── ClaimForm.tsx                  # Consignataria claim form
│   │   └── FrigorificoClaimForm.tsx       # Frigorifico claim form
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
    ├── db/
    │   ├── schema.ts                      # TypeScript interfaces
    │   └── seed.ts                        # Data access functions
    ├── validators/claim.ts                # Zod schemas (consignataria + frigorifico)
    ├── email.ts                           # Resend transactional emails
    ├── analytics.ts                       # GA4 event tracking
    ├── supabase.ts                        # Service role client
    ├── supabase-browser.ts                # Anon client
    ├── supabase-server.ts                 # Server client
    └── utils/url.ts                       # URL normalization

scripts/
├── scrape-auctions.mjs                    # Daily scraper (9 sources)
├── enrich-frigorificos.mjs                # CSV + JSON merge for enrichment
└── merge-enrichment.mjs                   # Agent results merger

supabase/migrations/
├── 20260309_consignatarias_claims.sql     # consignatarias + claims tables
├── 20260310_auth_user_roles.sql           # Auth + user roles
└── 20260310_frigorifico_claims.sql        # frigorifico_claims table

.github/workflows/
└── scrape-auctions.yml                    # Cron: 14:00 ART daily
```

---

## Development

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm build        # Generates ~170+ static pages
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
```

Public data (auctions, frigorificos, market prices) works without any env vars — it reads from JSON files.

### Scraper

```bash
# Run manually
node scripts/scrape-auctions.mjs
```

Runs daily via GitHub Actions at 14:00 ART (17:00 UTC). Flow: scrape → normalize → deduplicate → correct provinces → commit → Vercel rebuild.

The scraper includes a `CITY_PROVINCE_MAP` (~70 cities) that corrects province misassignments from the CACG API and curated entries.

### Enrichment Scripts

```bash
# Merge CSV target with JSON base (produces frigorificos-enriched.json)
node scripts/enrich-frigorificos.mjs

# Merge agent research results into enriched file
node scripts/merge-enrichment.mjs
```

---

## Business Model

1. **Remates PRO** — featured auction listings with amber/gold visual treatment (paid placement)
2. **FrigoConnect** — connecting frigorificos with consignatarias (registration + enriched profiles)
3. **Data subscriptions** — premium API access for market intelligence
4. **Directory listings** — enhanced consignataria/frigorifico profiles

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

Built in 13 days. One human, one AI. $0 hosting cost. See [CHANGELOG.md](CHANGELOG.md) for full details.

---

## License

Property of Memola Medios SAS. All rights reserved.
