# consignatarias.com.ar — technical reference

Engineering documentation. For the product-side overview see the [README](../README.md). For release history see [CHANGELOG.md](../CHANGELOG.md).

---

## Architecture

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
                                                        ├── consignatarias (86 profiles)
                                                        ├── consignataria_claims
                                                        ├── consignataria_auctions (owner CRUD)
                                                        ├── consignataria_reviews (v1.17)
                                                        ├── frigorifico_claims
                                                        ├── frigorifico_profiles
                                                        ├── user_roles (auth)
                                                        ├── user_subscriptions (Rebill)
                                                        ├── auction_results
                                                        ├── profile_views
                                                        ├── ops_events (observability)
                                                        ├── mag_consignatarias (master)
                                                        ├── mag_consignataria_sales_lots
                                                        ├── mag_inmag_history
                                                        ├── mag_prices_detailed
                                                        └── usd_blue_history
```

**Hybrid static + dynamic.** Read-heavy public data (auctions, frigorificos, market prices) lives in JSON files and is statically generated at build time — TTFB < 50ms, zero compute cost. Profile pages use ISR (`revalidate = 300`) so owner edits reflect within 5 minutes. Interactive paths (claims, auth, auction CRUD, subscriptions, reviews, admin) use Supabase PostgreSQL + Next.js route handlers. Middleware is scoped to auth/API routes plus variant-slug 308 redirects and archived-remate 301 redirects — public pages bypass it entirely and serve from CDN edge with zero function invocations.

---

## Data pipeline

Every day at 14:00 ART (17:00 UTC), 7 days a week, the scraper:

1. Fetches from 9 sources in parallel (CACG API, Colombo y Colombo, O'Farrell, Lehmann, Madelan, UMC Haciendas, dolarapi, mercadoagroganadero, MAGYP).
2. Normalizes and deduplicates auctions (including canonical-slug collapsing per `SLUG_DEDUP_MAP`).
3. Corrects province misassignments using `CITY_PROVINCE_MAP` (~70 cities).
4. Merges with curated entries from non-scrapable sources.
5. Writes `remates.json` and `market-prices.json`.
6. Always writes `last-build-trigger.json` (timestamp + run id) so quiet days (no MAG publish, weekends, holidays) still produce a diff.
7. Git-commits and pushes → triggers Vercel rebuild → site updated.

**Why the build trigger exists.** Around 13 pages snapshot `new Date()` at SSG time (`/remates/manana`, `/remates/hoy`, all `>= today` filters in directories, profile "upcoming" counts). If a day passes without a Vercel rebuild, those filters freeze. The trigger file guarantees a daily commit-and-rebuild even when no auction data changed.

**Secondary pipelines:**

| Workflow | Cadence (ART) | What it does |
|---|---|---|
| `scrape-auctions` | daily 14:00 | Main auction + market-prices scrape |
| `mag-detailed-prices` | Lun–Vie 19:37 | MAG 16 sub-categorías + INMAG daily, USD blue |
| `mag-lots-pipeline` | Mar/Mié/Vie 19:42 | Lote-level scraper, refreshes `mag_consignatarias` master + populates `mag_consignataria_sales_lots` |
| `scrape-senasa-habilitados` | monthly, 1st 04:23 | SENASA registry snapshot (Ciclo I/II/III) + merge into `frigorificos.json` |
| `quota-alerts` | Mon 10:00 | API consumers at ≥ 80% monthly quota |
| `weekly-newsletter` | Mon 10:00 | Subscriber digest |
| `post-remate-outreach` | hourly | Email outreach to consignatarias after their auctions (rate-limit 30d per recipient) |

---

## Data sources

**Scraped daily (9 sources):**

| Source | Data |
|--------|------|
| [CACG API](https://cacg.org.ar/remates) | ~128 auctions from Cámara Argentina de Consignatarios |
| [Colombo y Colombo](https://www.colomboycolombo.com.ar/remates) | Buenos Aires, Santa Fe, Corrientes |
| [O'Farrell](https://www.ivanofarrell.com.ar/remates) | Chaco, Santiago del Estero |
| [Madelan](https://www.madelan.com.ar/proximos) | NEA streaming |
| [Coop. Lehmann](https://www.cooperativalehmann.coop/hacienda/remates) | Santa Fe |
| [UMC Haciendas](https://umchv.ar) | Entre Ríos, Corrientes |
| [dolarapi.com](https://dolarapi.com/) | USD blue / oficial |
| [mercadoagroganadero.com.ar](https://www.mercadoagroganadero.com.ar) | INMAG index (ARS/kg vivo) |
| [MAGYP](https://www.magyp.gob.ar) | Corn FOB (USD/tn) |

**Curated (manual):** IderCor, Etchevehere Rural, Coop. La Ganadera, Tradición Ganadera, Nangapiry SA, Reggi y Cía, Néstor Hugo Fuentes, Ganaderos de Formosa, expo events (Expoagro, Agroactiva, Expo Rural).

**Authoritative cross-reference (monthly):**
- `aps2.senasa.gov.ar` — SENASA registry of habilitated establishments (Ciclo I/II/III). 860 distinct CUITs at last snapshot.

**Static datasets:**

| Dataset | Records | Source |
|---|---|---|
| Auctions | 347 | Scraper + curated, daily refresh |
| Consignatarias | 80 canonical / 86 profiles | Registry + research + persona schema (v1.16) |
| Frigoríficos | 1092 (860 SENASA-verified · 232 sin verificación · 126 enriched) | SENASA monthly snapshot + MAGYP + web research |
| Market prices | INMAG + 6 categories + 16 sub-categorías | Scraped daily (19:37 ART) |
| MAG consignatarios | 64 active in master | Pipeline recovered v1.16 |
| INMAG history | 2.237 días (2015 → today) | Backfill v1.10.1 |
| USD blue history | 5.609 días (2011 → today) | dolarapi + backfill |

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, strict TS) |
| Hosting | Vercel (Hobby) |
| Database | Supabase PostgreSQL (~24 tables, RLS 42/42 policies) |
| Email | Resend (only `consignatarias.com` verified) |
| Payments | Rebill (HMAC + idempotency) |
| Auth | Supabase magic-link |
| Styling | Tailwind CSS 3.4 (terminal dark theme) |
| Analytics | GA4 (`G-6CZMZH9S6Y`) + `profile_views` table |
| Observability | `ops_events` + `cron_runs` + `/admin/ops` |
| CI/CD | GitHub Actions (10 active workflows + 4 disabled) |
| Package manager | pnpm 10.30.2 |

**Dependencies:** Next.js 15 · React 19 · Tailwind · `@supabase/supabase-js` · `@supabase/ssr` · `resend` · `zod` · `sharp` · `@vercel/analytics` · `@vercel/speed-insights` · `xlsx` (devDep, SENASA scraper).

---

## Pages & routes

| Route | Type | Description |
|---|---|---|
| `/` | Static | Landing — hero + regional consignatario grid + stats strip |
| `/overview` | Static | Dashboard overview — market summary, upcoming events |
| `/remates` | Static | Auction feed (filters: province, type, period) |
| `/remates/[provincia]` | SSG (10) | Province landing pages with SEO copy |
| `/remates/[slug]` | SSG (~347) | Individual auction detail |
| `/remates/en-vivo` | Static | Live streaming auctions (YouTube channel-match) |
| `/remates/hoy` · `/manana` · `/semana` · `/fin-de-semana` · `/anteriores` | Static | Time-window views |
| `/remates/tipo/[tipo]` | SSG (5) | Invernada · Cría · General · Especial · Reproductores |
| `/remates/mes/[mes]` | SSG (12) | Monthly views |
| `/remates/ciudad/[ciudad]` | SSG (~120) | Cities with auctions |
| `/consignatarias` | Static | Directory of 80 consignatarias |
| `/consignatarias/[slug]` | SSG (80) | Profile — Quién Opera + Historial Verificable + Reseñas + calendar + heatmap + videos |
| `/consignatarias/[slug]/verificar` | SSG | Claim form (noindex) |
| `/consignatarias/[provincia]` | SSG (13) | Consignatarias by province |
| `/frigorificos` | Static | Directory of 1092 frigoríficos (SENASA cross-referenced) |
| `/frigorificos/[cuit]` | SSG (364) | Frigorífico detail with HABILITACION SENASA panel |
| `/frigorificos/[provincia]` | SSG (22) | Frigoríficos by province |
| `/frigorificos/verificar` | Dynamic | Registration form (noindex) |
| `/mercado` | Static | Market prices hub |
| `/mercado/inmag` · `/inmag-dolares` · `/spread` · `/arrendamiento` · `/liniers` · `/vender-ahora` | Static | Market sub-pages |
| `/mercado/[categoria]` | SSG (6) | Per-category landing (toros / novillos / vacas / etc.) |
| `/precios` | Static | Price hub + 6 category landings + `/hacienda-en-pie` |
| `/enterprise` | Static | Enterprise API pricing |
| `/planes` | Static | Three-product pricing toggle |
| `/api-docs` | Static | Public API documentation |
| `/quienes-somos` · `/glosario` · `/calidad` · `/metodologia` · `/preguntas-frecuentes` · `/dte` | Static | E-E-A-T pages |
| `/dashboard` | Dynamic | Owner dashboard (auth) |
| `/admin/{dashboard,claims,consignatarias,reviews,suscriptores,ops}` | Dynamic | Admin tools (role=admin) |
| `/api/*` | Dynamic | 33 route handlers |

---

## Public API (Enterprise tier)

Three auth-gated endpoints. Bearer `cnsg_live_*` keys. Per-plan rate limits enforced by `authenticate()` plus per-key 28-day quota.

| Endpoint | Source | Notes |
|---|---|---|
| `/api/precios` | `mag_prices_detailed` + `mag_inmag_history` | 6 categories base or 16 sub-cats with `?detallado=true`; `?historico=N` for history |
| `/api/lots` | `mag_consignataria_sales_lots` | Lote-level data; 90-day max window per query |

Quota tiers (`PLANS` in `src/lib/api-keys.ts`):

| Plan | Monthly cap | Rate limit |
|---|---:|---:|
| Starter | 1.000 req | 30 / min |
| Growth | 50.000 req | 300 / min |
| Scale | 5.000.000 req | 5.000 / min |

Observability: every authenticated request writes to `ops_events`. View at `/admin/ops`. Rollup via `scripts/audit-api-health.mjs`.

---

## Project structure

```
src/
├── app/
│   ├── page.tsx                            # Landing
│   ├── layout.tsx                          # Root layout + GA4 + next/font
│   ├── middleware.ts                       # Auth + rate-limit + variant-slug 308s + archived-remate 301s
│   ├── sitemap.ts                          # Dynamic sitemap (~1062 URLs)
│   ├── robots.ts                           # robots.txt (AI bots opt-in)
│   ├── globals.css                         # Terminal theme + landing styles
│   ├── api/                                # 33 route handlers (see /api-docs)
│   └── (terminal)/                         # Route group with terminal chrome
│       ├── layout.tsx                      # Top nav + footer with site map
│       ├── remates/                        # Auction feed + variants
│       ├── consignatarias/[slug]/          # Profile + ReviewsPanel + Quién Opera + Historial
│       ├── frigorificos/                   # SENASA-verified directory
│       ├── mercado/                        # Price hub + sub-pages
│       ├── precios/                        # Price landing pages
│       ├── enterprise/                     # Enterprise API checkout
│       ├── planes/                         # Three-product pricing
│       ├── admin/                          # Admin tools (claims, reviews, ops, consignatarias, suscriptores)
│       ├── dashboard/                      # Owner dashboard
│       └── …
├── components/
│   ├── seo/JsonLd.tsx                      # Schema.org emitters
│   ├── Paywall.tsx · FeatureGate.tsx · RequirePro.tsx
│   └── …
└── lib/
    ├── data/
    │   ├── remates.json                    # 347 auctions
    │   ├── consignataria-slugs.ts          # 149 raw → 80 canonical map
    │   ├── frigorificos.json               # 1092 frigoríficos (SENASA cross-ref)
    │   ├── senasa-habilitados.json         # Monthly SENASA snapshot (~860 CUITs)
    │   ├── consignataria-persona-seed.json # Persona-detrás seed
    │   ├── market-prices.json              # INMAG + 6 cats + USD
    │   └── youtube-channels.json           # 30 channels mapped
    ├── dal/
    │   ├── consignatarias.ts               # Profile DAL (static + Supabase)
    │   └── reviews.ts                      # Reviews DAL (v1.17)
    ├── api-auth.ts · api-keys.ts           # Enterprise API auth + quota
    ├── ops.ts                              # logEvent + cron run helpers
    ├── user-tier.ts · features.ts          # Tier + entity-level gating
    ├── email.ts                            # Resend
    └── …

scripts/
├── scrape-auctions.mjs                     # Daily scraper
├── scrape-senasa-habilitados.mjs           # Monthly SENASA scrape
├── merge-senasa-into-frigorificos.mjs      # Reconciles SENASA snapshot ↔ frigorificos.json
├── seed-consignataria-persona.mjs          # Persona seed pipeline
├── audit-{data-integrity,api-health,link-graph,content-quality,404-candidates}.mjs
├── match-youtube-videos.ts                 # YouTube channel matcher
└── archive/                                # Legacy one-shots

.github/workflows/                          # 10 active + 4 disabled cron workflows
supabase/migrations/                        # YYYYMMDD_<slug>.sql
```

---

## Development

```bash
pnpm install
pnpm dev                     # http://localhost:3000
pnpm build                   # SSG (~1062 routes)
pnpm start                   # serve production locally

# manual data refresh
node scripts/scrape-auctions.mjs
node scripts/scrape-senasa-habilitados.mjs
node scripts/merge-senasa-into-frigorificos.mjs

# audits (no DB needed)
node scripts/audit-data-integrity.mjs
node scripts/audit-link-graph.mjs            # needs dev server running
node scripts/audit-content-quality.mjs       # needs dev server running

# audits (Supabase env required)
node scripts/audit-api-health.mjs

# typecheck before commit
npx tsc --noEmit
```

### Environment variables

Required in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...        # required for DAL reads in dev
RESEND_API_KEY=re_xxx
ADMIN_SECRET=…
ADMIN_EMAIL=admin@example.com
REBILL_SECRET_KEY=sk_…
NEXT_PUBLIC_REBILL_PUBLIC_KEY=pk_…
API_KEY_PEPPER=…                         # never rotate without invalidating all keys
REVIEW_IP_PEPPER=…                       # for v1.17 review ip_hash
CRON_SECRET=…                            # for cron route handlers
YOUTUBE_API_KEY=…                        # match-youtube-videos.ts
```

Public data (auctions, frigorificos, market prices) works without any env vars — it reads from JSON files.

### Conventions

- **Static data files in `src/lib/data/`** are partially shadowed by Supabase tables but several remain the source of truth (e.g. `mag-consignatarios.json` because the `mag_consignatarias` table is owned by the lots pipeline). Verify per case.
- **Sitemap source** is `src/app/sitemap.ts`. Adding a route or slug? Make sure it's emitted.
- **Migrations** live in `supabase/migrations/` only. Format: `YYYYMMDD_<slug>.sql`. Never edit applied migrations — add a new one.
- **API keys (`cnsg_live_*`)** require `API_KEY_PEPPER` env var. Never rotate the pepper without invalidating all keys.
- **Webhook secrets** are env vars; HMAC verification uses `crypto.timingSafeEqual`.
- **Admin gate** = `user_roles.role = 'admin'`. Owner email (`agro@memola.com.ar`) has admin.

---

## Roadmap: Market Decision Infrastructure

The platform is evolving from a data directory into the decision infrastructure where Argentina's cattle market operates. Users don't just access information — they make decisions inside the platform.

```
CURRENT:  Usuario → Busca información → Se va → Decide afuera
FUTURE:   Usuario → Entra al sistema → Toma decisiones adentro → No puede irse
```

| Phase | When | Headline |
|---|---|---|
| 1 — Statefulness | Q2 2026 | Follow system, personalized feed, watchlist, activity history |
| 2 — Intelligent alerts | Q2-Q3 2026 | Email/Push/WhatsApp triggers on followed consignatarias, price targets, opportunities |
| 3 — Dynamic rankings | Q3 2026 | Volume / frequency / engagement / completeness / streaming = visible competition |
| 4 — Comparatives | Q3-Q4 2026 | Side-by-side consignatarias and remates |
| 5 — Direct actions | Q4 2026 | Structured contact forms, lead tracking for PRO, WhatsApp integration |
| 6 — Portfolios & state | 2027 | Purchase portfolio, price benchmarking, seller portfolio, ML recommendations |
| 7 — Network effects | 2027 | Buyer follows → consignataria sees count; PRO pays → platform improves for all |
| 8 — Operational standard | 2027+ | API & embeds, "check consignatarias.com.ar" becomes the norm |

**North star:** when a user has 15 follows + 10 alerts + 6 months of history, switching cost is prohibitive.

See [`EL-ORACULO-FRAMEWORK.md`](./EL-ORACULO-FRAMEWORK.md) for the current strategic anchor.

---

## Where to look when

| Question | File |
|---|---|
| "What changed in version X?" | [`CHANGELOG.md`](../CHANGELOG.md) |
| "What's planned?" | [`../ROADMAP.md`](../ROADMAP.md) |
| "How do I add a new auction source?" | `scripts/scrape-auctions.mjs` |
| "Where's the API contract?" | [`/api-docs`](https://www.consignatarias.com.ar/api-docs) + route handlers |
| "Is this slug variant or canonical?" | `src/lib/data/consignataria-slugs.ts` |
| "What's broken right now?" | `/admin/ops` dashboard |

---

## License

Property of Memola Medios SAS. All rights reserved.
