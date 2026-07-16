# CLAUDE.md — consignatarias.com.ar

> **For AI agents and new contributors.** This file is the *single one-screen briefing*. For depth, read in order:
> [`README.md`](./README.md) → [`CHANGELOG.md`](./CHANGELOG.md) → [`ROADMAP.md`](./ROADMAP.md).

**Current version:** v1.178.3 (2026-07-16). See [CHANGELOG.md](CHANGELOG.md) for the full history. Latest train (v1.88–1.96): **identidad v2.0 aplicada a todo el sitio** — isotipo/favicons/OGs (helper `src/lib/og/brand.tsx`), consolidación de acentos (cielo único acento de marca; emerald/amber solo semánticos — doctrina de `src/lib/ui/tokens.ts`), El Corredor manifest-driven, universo gráfico dentro de las páginas (`public/marca/`: glifos e íconos COLOR en chips hueso, martillazo animado, hero-pampa) y terminal/overview bajo el manual. El sistema de marca fuente vive en `marca/` (gitignorado; manual navegable en `marca/manual/index.html`). Versioning policy: [docs/VERSIONING.md](docs/VERSIONING.md) — the Enterprise API contract (still v1.0.0) is the MAJOR boundary, so the product stays on 1.x.

---

## What this product is

**The market-intelligence infrastructure of the Argentine cattle market** — aiming to be *the
reference price* (`el precio de referencia del ganado argentino`). The spine is the data + index
layer (INMAG since 2015 in ARS and USD, category panel, derivatives, methodology); the directory
of consignatarias/frigoríficos and the auction calendar are surfaces on top of it, not the product.
Positioning thesis: [`docs/strategy/POSITIONING-THESIS.md`](docs/strategy/POSITIONING-THESIS.md).

Two revenue lines coexist on top of the free, indexable, citable data layer. **The producer pays
nothing** — PRO Usuario (ARS 7.900) was retired in July 2026; all producer tools (¿vendo ahora?,
neto en mano, comparador, spread, seasonality, INMAG history) are free. The producer IS the value:

1. **Enterprise API/MCP + institutional access** — `cnsg_live_*` keys, Bearer auth, 28-day billing
   periods, three tiers (Starter ARS 74.000 / Growth ARS 451.000 / Scale a medida — todo en ARS,
   Rebill factura en ARS), MCP server (`ar.com.consignatarias/cattle-market`). Institutions pay for
   **access + service** (maintained USD-normalized feed, bulk delivery, support, our derived
   indices) — *not* a license/redistribution of MAG's public series
2. **PRO Consignataria** (sales-led B2B, **ARS 45.000/mes**) — featured listings, claimed profile,
   leads, email reach. Producto DISTINTO del API (en /planes va en ámbar, el color de su badge;
   el API va en cielo) — no mezclar precios ni copy entre ambos

**Live:** https://www.consignatarias.com.ar
**Owner:** Memola Medios SAS (`agro@memola.com.ar`)
**Operations:** [`docs/RUNBOOK.md`](docs/RUNBOOK.md) · **Versioning:** [`docs/VERSIONING.md`](docs/VERSIONING.md)

---

## Tech stack

| Layer | Tech | Notes |
|---|---|---|
| Framework | Next.js 15 (App Router) | Strict TS, mostly SSG + selective Fluid Compute |
| Hosting | Vercel | Project `consignatarias-next` (NOT the `consignatarias` clone) |
| Database | Supabase (`nyqkgorazkwcufkzxmhd`) | 24 tables, RLS 42/42, service-role for writes |
| Email | Resend | Only `consignatarias.com` is verified — see `src/lib/email.ts` |
| Payments | Rebill | Webhook with HMAC + idempotency table `processed_webhook_events` |
| Auth | Supabase magic-link | `user_roles` table for admin gating |
| Styling | Tailwind CSS 3.4 | Terminal dark theme |
| Analytics | GA4 (G-6CZMZH9S6Y) + `profile_views` table | |
| Observability | `ops_events` + `cron_runs` + `/admin/ops` | v1.14.0 |
| CI/CD | GitHub Actions (14 workflows) | 10 active, 4 disabled (in `.github/workflows/disabled/`) |
| MCP | Supabase MCP wired for DB management | |

---

## Surface counts (live)

| Thing | Count | Source of truth |
|---|---|---|
| Sitemap URLs | 1062 | `src/app/sitemap.ts` (shrinks as scraper archives remates) |
| API endpoints | 32 under `src/app/api/` | route handlers |
| Public Enterprise endpoints (auth-gated) | 2 — `/api/precios`, `/api/lots` | |
| Consignatarias (canonical) | 107 | `src/lib/data/consignataria-slugs.ts` (`getAllProfiles().length` — the public count) |
| Consignatarias (DB row count) | 111 | `consignatarias` table |
| Frigorificos | 1.102 | SENASA/MAGYP data |
| Remates indexed | ~380 active | `src/lib/data/remates.json` (daily scrape) |
| Provincias | 12 | |
| MAG consignatarias (master list) | 44 | `mag_consignatarias` table |
| INMAG daily series | 2237 rows (2015→today) | `mag_inmag_history` table |
| MAG sub-categorías diarias | 16 | `mag_prices_detailed` table |
| USD blue series | 5609 rows (2011→today) | `usd_blue_history` table |

---

## Daily data flow

```
14:00 ART  scrape-auctions.yml         → remates.json + market-prices.json (git commit → Vercel rebuild)
15:30 ART  mag-detailed-prices.yml     → mag_prices_detailed (16 sub-cats per day, Lun-Vie)
16:00 ART  mag-lots-pipeline.yml       → mag_consignataria_sales_lots (lote-level, Mar/Mié/Vie)
+ hourly   post-remate-outreach.yml    → outreach to consignatarias after their auction (rate-limit 30d per recipient)
Mon 10 ART quota-alerts.yml            → email at 80%+ usage
Mon 10 ART weekly-newsletter.yml       → newsletter to subscribed users
```

All workflows live in `.github/workflows/`. Disabled ones (cost optimization) live in `.github/workflows/disabled/`.

---

## Project structure (skeleton)

```
src/
  app/
    page.tsx                          Landing
    (terminal)/                       Logged-in dashboard route group
      layout.tsx                      Top nav (INICIO / REMATES / CONSIGNATARIAS / FRIGORIFICOS / MERCADO / MIS GUÍAS / DASHBOARD / PLANES)
      cuenta/                         Account + API keys + reports
      admin/                          Admin-only — role='admin' in user_roles
        ops/page.tsx                  Observability dashboard (v1.14.0)
      consignatarias/[slug]/          Profile pages — SSG + 308 redirect for variant slugs (v1.13.3)
      frigorificos/[slug]/            Frigorificos profiles + province views
      remates/[slug]/                 Auction detail + province views, dynamicParams=false
      mercado/                        Market intelligence — INMAG, USD, derivatives
      enterprise/                     Enterprise API pricing + checkout
    api/
      precios/route.ts                Auth-gated v1.13.2 — 6 cats base or 16 with ?detallado
      lots/route.ts                   Auth-gated — lote-level data
      webhooks/                       rebill (HMAC + idempotency), auth, register (auth-gated v1.14.3)
      cron/                           14 internal cron route handlers
      admin/                          Admin-gated endpoints
      internal/                       cron-hook for workflow → ops_events bridge
  lib/
    api-auth.ts                       authenticate() — Bearer + 28-day quota
    api-keys.ts                       HMAC-SHA256 + pepper + timing-safe compare
    ops.ts                            logEvent + cron run helpers (uses waitUntil)
    rate-limit.ts                     In-memory IP rate-limit (P2: doesn't survive Fluid Compute cold start)
    email.ts                          Resend — FROM = noreply@consignatarias.com (transactional), FROM_PERSONAL = hola@consignatarias.com (outreach)
    data/
      remates.json                    Live (updated daily)
      market-prices.json              Live (updated daily)
      consignataria-slugs.ts          Canonical slug map + variant redirects
      [other .json files]             Static; some shadowed by Supabase tables, see audit
  components/                         Server + client; terminal-themed
  middleware.ts                       IP rate-limit + variant slug 308 redirects (v1.13.3)
scripts/
  scrape-auctions.mjs                 Daily scraper (live, in workflow)
  monthly-report/                     El Corredor monthly publish
  el-oraculo/                         Oráculo report skill
  archive/                            One-shot scripts from earlier eras (legacy)
supabase/migrations/                  Canonical migrations (one folder, no /migrations/ duplicate)
.github/workflows/                    14 workflows: 10 active, 4 in disabled/
docs/                                 Current strategic docs (Oráculo, Corredor, Brand). Pre-pivot stuff in docs/archive/
```

---

## Working conventions

- **Static data files in `src/lib/data/`** are partially shadowed by Supabase tables but several are still the *source of truth* (e.g. `mag-consignatarios.json` because `mag_consignatarias` table is empty). Verify before assuming DB is canonical.
- **Sitemap source** is `src/app/sitemap.ts`. Adding a route or slug? Make sure it gets emitted.
- **Migrations** are in `supabase/migrations/` only. Format: `YYYYMMDD_<slug>.sql`. Never edit applied migrations — add a new one.
- **API keys (`cnsg_live_*`)** require `API_KEY_PEPPER` env var set in Vercel. Never rotate the pepper without invalidating all keys.
- **Webhook secrets** are env vars; HMAC verification uses `crypto.timingSafeEqual`.
- **Admin gate** = `user_roles.role='admin'`. The owner email (`agro@memola.com.ar`) AND the founder personal (`jose.barnetche19@gmail.com`) both have admin.
- **Observability**: every authenticated request to `/api/precios`, `/api/lots` writes a row to `ops_events`. Visible at `/admin/ops`.
- **No secrets in mailto: links** — `mailto:agro@memola.com.ar` is correct; it's a real inbox. The Resend sender must use `@consignatarias.com` (only verified domain).

---

## Common commands

```bash
pnpm install
pnpm dev                     # http://localhost:3000
pnpm build                   # SSG generation (~1062 routes)
pnpm start                   # production server

# manual data refresh
node scripts/scrape-auctions.mjs       # update remates + market prices
gh workflow run mag-detailed-prices.yml # trigger MAG cron manually

# typecheck before commit
npx tsc --noEmit
```

---

## Where to look when

| Question | File |
|---|---|
| "What changed in version X?" | `CHANGELOG.md` |
| "What's planned for vX.Y?" | `ROADMAP.md` |
| "How do I add a new auction source?" | `scripts/scrape-auctions.mjs` + relevant scraper function |
| "Where's the API contract?" | `/api-docs` (live page) + route handlers |
| "Is this slug variant or canonical?" | `src/lib/data/consignataria-slugs.ts` |
| "Why is X being throttled?" | `src/lib/rate-limit.ts` + `src/middleware.ts` |
| "What's broken right now?" | `/admin/ops` dashboard (live) |
| "What's the strategic direction?" | `docs/EL-ORACULO-FRAMEWORK.md` + `ROADMAP.md` (post-2026-04-29 data-layer thesis) |
