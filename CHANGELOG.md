# Changelog

The complete build log of **consignatarias.com.ar** — from the first `npx create-next-app` to a live cattle auction platform covering 450+ remates across 12 Argentine provinces.

Built in 11 days (Feb 26 – Mar 8, 2026). 41 commits. One human, one AI.

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

**Why Next.js 15 + SSG + JSON?** Because the data changes once a day (auctions are scheduled weeks in advance), there's no user-generated content, and the entire dataset fits in memory. A static site on Vercel's CDN means TTFB < 50ms, zero hosting cost, and no database to manage. This architecture decision never changed — it was right from minute one.

The initial `package.json` had exactly 3 dependencies and 7 devDependencies:

```json
{
  "dependencies": { "next": "15.1.6", "react": "19.0.0", "react-dom": "19.0.0" },
  "devDependencies": { "tailwindcss": "^3.4.1", "postcss": "^8.4.24", "autoprefixer": "^10.4.14", "typescript": "^5" }
}
```

No state management. No ORM. No component library. No testing framework. Just Next.js, Tailwind, and TypeScript. This stack is still nearly identical 11 days later — we only added `sharp` (image optimization), `@vercel/analytics`, and `@vercel/speed-insights`.

---

## The numbers

| Metric | 0.0.0 (Feb 26) | 0.7.0 (Mar 8) | 0.8.1 (Mar 9) |
|--------|-----------------|-----------------|-----------------|
| Auctions | 0 → 92 → 414 | 450 | 366 |
| Consignatarias | 49 | 77 | 74 (verificables) |
| Profile pages | 0 | 70 | 74 + 74 verificar |
| Scraper sources | 0 → 6 | 9 | 9 |
| Provinces | 10 | 12 | 12 |
| Frigoríficos | 364 | 364 | 364 |
| Static HTML pages | ~10 | ~80 | ~164 |
| Dependencies | 3 | 5 | 8 |
| DevDependencies | 7 | 11 | 11 |
| Daily scrapes | 0 | 12 (and counting) | 13+ |
| Database | none | none | Supabase (2 tables) |
| Hosting cost | $0 | $0 | $0 |

---

## Contributors

- **Human** — product vision, market knowledge, data curation, manual auctions, business decisions
- **Claude** (Anthropic) — architecture, code, scraper, SEO, styling, this changelog

Built with `claude-opus-4-6` via Claude Code CLI.
