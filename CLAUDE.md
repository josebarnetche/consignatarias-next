# CLAUDE.md — Consignatarias.com.ar

## Project Overview

**Consignatarias.com.ar** is a cattle auction directory and market intelligence platform for Argentina's livestock industry. It aggregates data from 77+ consignatarias (auction houses) across 12 provinces into a unified Bloomberg Terminal-style interface.

**Live:** https://www.consignatarias.com.ar

### What it does

- **Unified auction calendar** — 366+ remates (cattle auctions) searchable by province, type, date
- **Consignataria profiles** — 74 dedicated pages with annual calendars, heatmaps, auction history
- **Frigorifico directory** — 364 slaughterhouses from SENASA/MAGYP data
- **Market prices** — INMAG index ($/kg vivo), category prices, corn FOB, USD rates
- **Daily scraping** — Automated data collection at 14:00 ART via GitHub Actions

### Business Model

1. **Remates PRO** — Featured auction listings with amber/gold visual treatment (paid placement)
2. **Data subscriptions** — Premium API access for market data
3. **Directory listings** — Enhanced consignataria/frigorifico profiles

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router, SSG) |
| Styling | Tailwind CSS 3.4 (terminal dark theme) |
| Language | TypeScript (strict mode) |
| Database | Supabase (project: `nyqkgorazkwcufkzxmhd`) — migration target for v0.8.0 |
| Hosting | Vercel (Hobby plan, zero serverless) |
| CI/CD | GitHub Actions (daily scraper) |
| Analytics | GA4 (G-6CZMZH9S6Y) |
| MCP | Supabase MCP connected for DB management |

### Architecture

```
[GitHub Actions] → scrape → remates.json → [git push] → [Vercel rebuild]
                                                              ↓
                                               SSG: ~80 static HTML pages
                                                              ↓
                                                    CDN edge (Vercel)
```

**Current state (v0.7.0):** No database yet — all data lives in JSON files. Build generates static HTML. TTFB < 50ms. Cost: $0. Supabase project provisioned for v0.8.0 migration.

---

## Data Schema

### Auction (`src/lib/db/schema.ts`)

```typescript
interface Auction {
  id: number
  title: string
  consignatariaName: string
  consignatariaSlug: string
  date: string                    // "YYYY-MM-DD"
  time: string | null             // "HH:MM" or null
  location: string                // "Ciudad, Provincia"
  province: string                // uppercase, no accents
  type: 'invernada' | 'cria' | 'general' | 'especial'
  mainCategory: 'terneros' | 'novillos' | 'vaca_gorda' | 'vaquillonas' | 'toros' | 'mixto'
  estimatedHeads: number | null
  description: string
  youtubeUrl: string | null
  catalogUrl: string | null
  source: 'web' | 'social' | 'tv' | 'manual'
  sourceUrl: string | null
  status: 'scheduled' | 'live' | 'completed'
  featured?: boolean              // PRO listing
}
```

### Market Prices (`src/lib/data/market-prices.json`)

```json
{
  "inmag": { "current": 4392.35, "prev": 4720.94, "change": -7, "unit": "$/kg vivo", "series": [...] },
  "categories": {
    "novillos": { "current": 4392, "prev": 4721, "change": -7 },
    "novillitos": { "current": 4173, ... },
    "vaquillonas": { "current": 3953, ... },
    "vacas": { "current": 3162, ... },
    "toros": { "current": 2855, ... },
    "terneros": { "current": 4832, ... }
  },
  "corn": { "current": 227.5, "unit": "USD/tn" },
  "usdBlue": { "current": 1415, "unit": "ARS" },
  "usdOficial": { "current": 1435, "unit": "ARS" },
  "lastUpdate": "2026-03-07"
}
```

### Consignataria Profile (`src/lib/data/consignataria-slugs.ts`)

```typescript
interface ConsignatariaProfile {
  canonicalSlug: string       // URL-safe identifier
  displayName: string         // Human-readable name
  allSlugs: string[]          // All variants that map to this entity
}
```

**Slug system:** 109 raw slugs → 70 canonical entities. Handles duplicates like `bressan` + `bressan-y-cia-s-r-l` → `bressan-y-cia`.

---

## Data Sources

### Scraped Daily (14:00 ART)

| Source | Data | Notes |
|--------|------|-------|
| [CACG API](https://cacg.org.ar/iapi/auctions) | ~128 auctions | Cámara Argentina de Consignatarios |
| [Colombo y Colombo](https://colomboycolombo.com.ar/remates) | Buenos Aires, Santa Fe, Corrientes | HTML scrape |
| [O'Farrell](https://ivanofarrell.com.ar/remates) | Chaco, Santiago del Estero | HTML scrape |
| [Coop. Lehmann](https://cooperativalehmann.coop/hacienda/remates) | Santa Fe | HTML scrape |
| [Madelan](https://madelan.com.ar/proximos) | NEA streaming | HTML scrape |
| [dolarapi.com](https://dolarapi.com/) | USD blue/oficial | JSON API |
| [mercadoagroganadero.com.ar](https://mercadoagroganadero.com.ar) | INMAG index | HTML scrape |
| [MAGYP](https://magyp.gob.ar) | Corn FOB prices | JSON API |

### Curated (Manual)

IderCor, Etchevehere Rural, Coop. La Ganadera, Tradición Ganadera, Nangapiry SA, Reggi y Cia, Nestor Hugo Fuentes, Ganaderos de Formosa, Expo events (Expoagro, Agroactiva, Expo Rural, etc.)

### Static Datasets

| File | Records | Source |
|------|---------|--------|
| `remates.json` | 366 auctions | Scraper + curated |
| `frigorificos.json` | 364 | SENASA/MAGYP |
| `consignatarias.json` | 56 | Registro público + research |
| `market-prices.json` | INMAG + 6 categories | Scraped daily |

---

## Scraper

**Location:** `scripts/scrape-auctions.mjs`

**Schedule:** GitHub Actions at 17:00 UTC (14:00 ART) — see `.github/workflows/scrape-auctions.yml`

### Run Manually

```bash
node scripts/scrape-auctions.mjs
```

### Flow

1. Fetch from 8 sources in parallel
2. Parse/normalize auction data
3. Merge with curated entries (non-scrapable sources preserved)
4. Deduplicate by date + slug + location
5. Validate dates, normalize provinces
6. Write to `src/lib/data/remates.json` and `market-prices.json`
7. Git commit + push (triggers Vercel rebuild)

### Adding a New Source

1. Add scraping function in `scrape-auctions.mjs`
2. Add slug to `PROFILES` array in `consignataria-slugs.ts` if new consignataria
3. Test locally: `node scripts/scrape-auctions.mjs`
4. Commit and push — GitHub Actions handles the rest

---

## Project Structure

```
consignatarias/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Landing page
│   │   ├── layout.tsx                  # Root layout + GA4
│   │   ├── sitemap.ts                  # Dynamic sitemap (~80 URLs)
│   │   ├── robots.ts                   # robots.txt
│   │   ├── globals.css                 # Terminal + landing styles
│   │   └── (terminal)/                 # Route group — dashboard
│   │       ├── layout.tsx              # Terminal chrome (nav, clock)
│   │       ├── overview/               # Dashboard overview
│   │       ├── remates/                # Auction feed + filters
│   │       │   ├── page.tsx            # Server: metadata, data fetching
│   │       │   └── RematesClient.tsx   # Client: filters, rows, tabs
│   │       ├── consignatarias/
│   │       │   ├── page.tsx            # Directory listing
│   │       │   └── [slug]/             # Profile pages (~70)
│   │       │       ├── page.tsx        # Server: SSG, redirects, JSON-LD
│   │       │       └── ConsignatariaProfileClient.tsx
│   │       ├── frigorificos/           # Frigorifico directory
│   │       └── mercado/                # Market prices
│   ├── components/
│   │   ├── seo/JsonLd.tsx              # Schema.org structured data
│   │   └── AnalyticsProvider.tsx       # GA4
│   └── lib/
│       ├── data/                       # JSON data files
│       │   ├── remates.json            # 366 auctions
│       │   ├── consignataria-slugs.ts  # Canonical slug map
│       │   ├── frigorificos.json       # 364 frigorificos
│       │   ├── consignatarias.json     # 56 consignatarias
│       │   ├── market-prices.json      # INMAG, USD, corn
│       │   └── featured-links.json     # Curated links
│       ├── db/
│       │   ├── schema.ts               # TypeScript interfaces
│       │   └── seed.ts                 # Data access functions
│       └── utils/
│           └── url.ts                  # URL normalization
├── scripts/
│   ├── scrape-auctions.mjs             # Daily scraper
│   └── extract-auction-prices.mjs      # Historical price extraction
├── public/                             # Static assets
├── .github/workflows/
│   └── scrape-auctions.yml             # Cron: 14:00 ART daily
├── .eslintrc.json                      # ESLint config (next/core-web-vitals)
├── vercel.json                         # Redirects, cache headers (single source of truth)
├── package.json
├── tailwind.config.js
└── next.config.js                      # Security headers only (no redirects)
```

---

## Pages & Routes

| Route | Type | Description |
|-------|------|-------------|
| `/` | Landing | Feature previews, stats, CTA |
| `/overview` | Dashboard | General overview, upcoming events |
| `/remates` | Dashboard | Auction feed with filters (province, type, period) |
| `/remates?provincia=CHACO` | Dashboard | Filtered by province |
| `/consignatarias` | Dashboard | Directory of all consignatarias |
| `/consignatarias/[slug]` | Dashboard | Profile page (~70 static pages) |
| `/frigorificos` | Dashboard | Directory of 364 frigorificos |
| `/mercado` | Dashboard | Market prices, INMAG chart |

---

## Remates PRO (Premium Listings)

Featured auctions get special treatment:

- `★ PRO` badge with amber/gold styling
- Chronological order (NOT pinned to top), just visually highlighted
- 3-line expanded layout with description
- Left accent bar in amber

**Implementation:** `featured: true` in auction schema. Sort is purely chronological — PRO listings are visually distinct but not reordered.

---

## SEO

- **Sitemap:** Dynamic, ~80 URLs (static pages + consignataria profiles)
- **JSON-LD:** Organization, WebSite, Dataset, Event, LocalBusiness, Breadcrumb
- **Open Graph / Twitter Cards:** All pages
- **Canonical URLs:** non-www → www redirect (301)
- **robots.txt:** Standard allow

---

## Development

```bash
# Install
pnpm install

# Dev server
pnpm dev          # http://localhost:3000

# Build
pnpm build        # Generates ~80 static pages

# Run production locally
pnpm start

# Run scraper
node scripts/scrape-auctions.mjs
```

**No database yet.** All data from JSON files. Supabase migration planned for v0.8.0.

---

## Deployment

- **Platform:** Vercel (Hobby tier, $0)
- **Domain:** www.consignatarias.com.ar
- **Deploy trigger:** Git push to main (automatic Vercel rebuild)
- **Daily update:** GitHub Actions scraper → git push → Vercel rebuild

### Environment

No secrets required. Scraper runs without authentication (all public APIs).

---

## Common Workflows

### Add a new auction manually

1. Edit `src/lib/data/remates.json`
2. Add entry with all required fields
3. If new consignataria, add to `src/lib/data/consignataria-slugs.ts`
4. Commit and push

### Add a new consignataria profile

1. Add entry to `PROFILES` array in `src/lib/data/consignataria-slugs.ts`
2. Include `canonicalSlug`, `displayName`, and `allSlugs` (all variants)
3. Ensure auctions exist with matching `consignatariaSlug`
4. Build generates the profile page automatically

### Debug scraper

```bash
# Run with verbose output
node scripts/scrape-auctions.mjs

# Check generated data
cat src/lib/data/remates.json | jq '.[-5:]'   # Last 5 auctions
cat src/lib/data/market-prices.json | jq '.'   # Market data
```

### Fix a broken scrape source

1. Check if source site is down or changed
2. Update regex/parsing in `scripts/scrape-auctions.mjs`
3. Test: `node scripts/scrape-auctions.mjs`
4. Commit fix

### Update market price ratios

Category prices are derived from INMAG using ratios in `scrape-auctions.mjs`:

```javascript
const ratios = {
  novillos: 1.0,      // INMAG is novillos base
  novillitos: 0.95,
  vaquillonas: 0.90,
  vacas: 0.72,
  toros: 0.65,
  terneros: 1.10,
}
```

Adjust ratios based on market conditions.

---

## Provinces Covered

Buenos Aires, Chaco, Córdoba, Corrientes, Entre Ríos, Formosa, La Pampa, Misiones, Neuquén, San Luis, Santa Fe, Santiago del Estero

---

## Owner

**Memola Medios S.A.S.** — All rights reserved.

Part of the MEMOLA DAO asset portfolio. Revenue target: contribute to $1M collected.
