# Changelog

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
- Provinces expanded from 11 → 12 (added Neuquén)
- Market prices auto-update from dolarapi.com

### Fixed
- Next.js upgraded 15.1.6 → 15.5.12 (CVE-2025-66478 security fix)
- Invalid date filtering (removed malformed entries from CACG)
- Province normalization: `ENTRE RÍOS` → `ENTRE RIOS` (accent removal)

## [0.2.0] — 2026-02-26

### Added
- 63 new auctions from 15+ regional sources:
  - Ivan L. O'Farrell (19 auctions, Chaco: Machagai, Gral. San Martín, Santa Sylvina)
  - IderCor small producer auctions (6, Corrientes: Mercedes, Ituzaingó, Caa Catí, Bella Vista, Sauce)
  - Nangapiry SA / Asoc. Ganadera Alto Paraná (Misiones: Fiesta del Ternero Misionero)
  - Ganaderos de Formosa (Comandante Fontana, additional dates)
  - Horacio Rodriguez Egaña (Curuzú Cuatiá, Corrientes)
  - Nestor Hugo Fuentes (La Pampa: Victorica, Gral. Acha, Algarrobo del Águila, Bernasconi)
  - Tradición Ganadera / Porro (Villa Ángela, Chaco: monthly)
  - Coop. La Ganadera (Entre Ríos: La Paz, Villaguay, María Grande)
  - Etchevehere Rural (Entre Ríos: Federal, Gral. Ramírez special events)
  - Bressan y Cía (Chajarí, Entre Ríos)
  - CRIPCO Oberá (Misiones: Expo Agro Industrial)
  - Gananor Pujol (Goya, Corrientes: Expo Ternero)
  - Las Nacionales de Corrientes (multi-consignataria week, 53,000+ cabezas)
  - Ministerio de Producción del Chaco (small producer program)
  - Expo events: Agroactiva, Expo Rural Rafaela, Expo Gualeguaychú, Expo Rural Misiones, Expo Rural Chaco, Expo Rural Corrientes
- Misiones province added (now 11 provinces)
- Total: 277 auctions, 64 consignatarias

### Changed
- Auctions expanded from 92 → 277
- Consignatarias expanded from 49 → 64

## [0.1.0] — 2026-02-26

### Added
- Landing page with live data previews from JSON files
  - Zinc palette, Inter font, subtle animations
  - 3 feature sections: Calendario de Remates, Directorio de Frigoríficos, Precios de Mercado
  - Live stat cards: INMAG, remate count, frigorífico count, USD blue
  - All content in Spanish
- Terminal-style dashboard (Bloomberg Terminal aesthetic)
  - `/overview` — General dashboard with auction stats, upcoming events, market data
  - `/remates` — Auction feed with filters (province, type, category, time period)
  - `/frigorificos` — Directory of 364 frigoríficos with search and province filters
  - `/mercado` — Market prices, INMAG index, category breakdowns, USD rates
- Route groups: `(terminal)` for dashboard pages, root for landing
- Auction card component with type badges, status indicators, catalog/YouTube links
- Time tabs (Hoy / Próximos 7 días / Pasados)
- Remates filters (province, consignataria, type, category)
- Market dashboard (4 indicator cards)
- Community block (featured links)
- Data files:
  - `remates.json` — 92 auctions (15 sample + 18 Colombo y Colombo + CACG + others)
  - `frigorificos.json` — 364 frigoríficos from SENASA/MAGYP
  - `consignatarias.json` — 56 consignatarias with CUIT, matrícula, contact info
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
