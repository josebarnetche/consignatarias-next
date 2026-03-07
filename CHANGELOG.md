# Changelog

## [0.5.0] — 2026-03-07

### Added
- **Consignataria Profile Pages** — 70 dedicated profile pages at `/consignatarias/[slug]`
  - Each consignataria gets a full-page profile with their complete annual auction calendar
  - 12-month calendar heatmap showing auction density per month (ENE–DIC)
  - Type distribution panel with visual bar chart (INVERNADA/CRIA/GENERAL/REPROD/ESPECIAL breakdown)
  - Auction list grouped by month with terminal-styled rows (date, time, title, location, province, type badge, category, estimated heads, status)
  - Stats bar: total remates, estimated heads, upcoming count, provinces, main plazas
  - Past auctions displayed with reduced opacity
  - Back navigation to `/remates` feed
- **Canonical Slug System** (`src/lib/data/consignataria-slugs.ts`)
  - Maps 109 raw slugs from `remates.json` to 70 unique canonical entities
  - Merges duplicates (e.g., `bressan` + `bressan-y-cia-s-r-l` + `bressan-y-cia-srl` → `bressan-y-cia` with 103 combined auctions)
  - Cleans legal suffixes from URLs (removes `-s-a`, `-s-r-l`, `-sa`, `-srl`)
  - `getCanonicalSlug()`, `getProfile()`, `getAuctionsForProfile()`, `getAllCanonicalSlugs()` helpers
  - Non-canonical slug visits → 301 permanent redirect to canonical URL
  - Unknown slugs → 404
- **Structured Data (JSON-LD)** on each profile page
  - `BreadcrumbSchema`: Inicio > Remates > [Consignataria Name]
  - `LocalBusinessSchema`: name, location, province
  - `EventSchema`: next 5 upcoming auctions (Google event rich results)
- **Sitemap** updated with 70 consignataria profile URLs at priority 0.7, weekly change frequency
- **Clickable consignataria names** in `/remates` feed
  - Both regular and PRO/featured auction rows now have clickable consignataria names
  - `stopPropagation` prevents name clicks from triggering the row's external link navigation
  - Links resolve to canonical profile URLs via `getCanonicalSlug()`
- **Google Analytics 4** tracking (G-6CZMZH9S6Y) added to root layout via `next/script` with `afterInteractive` strategy
- New auction: Javier Ulises Avalos — 10 ABR 2026, Mercedes, Corrientes, ~1.500 cab., general

### Technical
- 70 static HTML pages generated at build time via `generateStaticParams()`
- Server component handles slug resolution, redirects, 404s, metadata, and structured data
- Client component handles interactive rendering (effective today calculation, auction row clicks, calendar heatmap)
- Graceful handling of unknown auction types (e.g., `tv` type in data doesn't crash the build)
- Null-safe location/province parsing across all components

## [0.4.0] — 2026-03-06

### Added
- **Featured PRO Auction System** — consignatarias can pin auctions to the top of the feed
  - Amber/gold visual treatment with left accent bar, `★ PRO` badge, and distinct color scheme
  - Featured auctions sort above regular auctions within the same time period
  - `featured?: boolean` flag on Auction schema
  - 3-line layout for featured rows: PRO badge + date/time/name/location, title, type/category/heads/status/description
- **Pitch Deck** — `pitch-deck consignatarias.com.pdf` for investor/partner outreach
  - YC-style presentation in Argentine Spanish
  - Revenue model: PRO listings, data subscriptions, API access
  - Market sizing: 60K+ annual auctions, $15B+ market

### Changed
- Auction count: 440 → 442 (scraped + curated)
- AuctionRow component refactored to support both regular and featured display modes

## [0.3.0] — 2026-02-26

### Added
- Daily auction scraper (`scripts/scrape-auctions.mjs`) pulling from 6 sources:
  - CACG API (Cámara Argentina de Consignatarios de Ganado) — ~128 auctions
  - Colombo y Colombo — annual calendar
  - Ivan L. O'Farrell — Chaco/Santiago del Estero circuit
  - Cooperativa Guillermo Lehmann — Santa Fe
  - Madelan — NEA streaming auctions
  - dolarapi.com — USD blue and oficial exchange rates
- GitHub Actions workflow (`.github/workflows/scrape-auctions.yml`)
  - Runs daily at 14:00 ART (17:00 UTC)
  - Auto-commits data changes, triggers Vercel rebuild
  - Manual trigger via `workflow_dispatch`
- Deduplication logic: merges by date + consignataria + location
- Date validation and province name normalization

### Changed
- Auctions expanded from 277 → 412 (scraped + curated)
- Consignatarias expanded from 64 → 86
- Provinces expanded from 11 → 12 (added Neuquen)
- Market prices auto-update from dolarapi.com

### Fixed
- Next.js upgraded 15.1.6 → 15.5.12 (CVE-2025-66478 security fix)
- Invalid date filtering (removed malformed entries from CACG)
- Province normalization: `ENTRE RIOS` → `ENTRE RIOS` (accent removal)

## [0.2.0] — 2026-02-26

### Added
- 63 new auctions from 15+ regional sources:
  - Ivan L. O'Farrell (19 auctions, Chaco: Machagai, Gral. San Martin, Santa Sylvina)
  - IderCor small producer auctions (6, Corrientes: Mercedes, Ituzaingo, Caa Cati, Bella Vista, Sauce)
  - Nangapiry SA / Asoc. Ganadera Alto Parana (Misiones: Fiesta del Ternero Misionero)
  - Ganaderos de Formosa (Comandante Fontana, additional dates)
  - Horacio Rodriguez Egana (Curuzu Cuatia, Corrientes)
  - Nestor Hugo Fuentes (La Pampa: Victorica, Gral. Acha, Algarrobo del Aguila, Bernasconi)
  - Tradicion Ganadera / Porro (Villa Angela, Chaco: monthly)
  - Coop. La Ganadera (Entre Rios: La Paz, Villaguay, Maria Grande)
  - Etchevehere Rural (Entre Rios: Federal, Gral. Ramirez special events)
  - Bressan y Cia (Chajari, Entre Rios)
  - CRIPCO Obera (Misiones: Expo Agro Industrial)
  - Gananor Pujol (Goya, Corrientes: Expo Ternero)
  - Las Nacionales de Corrientes (multi-consignataria week, 53,000+ cabezas)
  - Ministerio de Produccion del Chaco (small producer program)
  - Expo events: Agroactiva, Expo Rural Rafaela, Expo Gualeguaychu, Expo Rural Misiones, Expo Rural Chaco, Expo Rural Corrientes
- Misiones province added (now 11 provinces)
- Total: 277 auctions, 64 consignatarias

### Changed
- Auctions expanded from 92 → 277
- Consignatarias expanded from 49 → 64

## [0.1.0] — 2026-02-26

### Added
- Landing page with live data previews from JSON files
  - Zinc palette, Inter font, subtle animations
  - 3 feature sections: Calendario de Remates, Directorio de Frigorificos, Precios de Mercado
  - Live stat cards: INMAG, remate count, frigorifico count, USD blue
  - All content in Spanish
- Terminal-style dashboard (Bloomberg Terminal aesthetic)
  - `/overview` — General dashboard with auction stats, upcoming events, market data
  - `/remates` — Auction feed with filters (province, type, category, time period)
  - `/frigorificos` — Directory of 364 frigorificos with search and province filters
  - `/mercado` — Market prices, INMAG index, category breakdowns, USD rates
- Route groups: `(terminal)` for dashboard pages, root for landing
- Auction card component with type badges, status indicators, catalog/YouTube links
- Time tabs (Hoy / Proximos 7 dias / Pasados)
- Remates filters (province, consignataria, type, category)
- Market dashboard (4 indicator cards)
- Community block (featured links)
- Data files:
  - `remates.json` — 92 auctions (15 sample + 18 Colombo y Colombo + CACG + others)
  - `frigorificos.json` — 364 frigorificos from SENASA/MAGYP
  - `consignatarias.json` — 56 consignatarias with CUIT, matricula, contact info
  - `market-prices.json` — INMAG index, category prices, corn, USD blue/oficial
  - `featured-links.json` — Curated resource links
- Schema types for auctions with nullable `time` and `estimatedHeads`
- Seed functions for data access (getAuctions, getUpcomingAuctions, etc.)
- USD blue rate updated to $1,445 from dolarapi.com (was $1,285)
- Colombo y Colombo: 18 auctions scraped from colomboycolombo.com.ar (Mar–Nov 2026)
- Tailwind config with terminal colors, Inter font, custom shadows
- CSS animations: float-subtle, dash-flow, pulse-soft, pulse-live

### Technical
- Next.js 15 with App Router
- Tailwind CSS 3.4
- TypeScript strict mode
- All static generation (no API routes, no database)
- Vercel Hobby-compatible (zero serverless functions)
