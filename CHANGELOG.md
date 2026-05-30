# Changelog

All notable changes to consignatarias.com.ar are documented in this file.

Format: [Semantic Versioning](https://semver.org/) with feature descriptions focused on platform evolution.

---

## [1.20.0] — 2026-05-30

### Market data fix (was silently 5 years stale) + "INMAG en dólares" recent view + build hygiene

A correctness release. The headline bug: **every chart fed by the daily market series had been showing 2016–2020 data labelled as "hoy"**, because the Supabase fetchers hit PostgREST's default 1000-row cap. No API contract changes; no migrations.

**Data layer — page through the 1000-row cap (the real bug)**

- `fetchInmagSeries` / `fetchUsdSeries` (`src/lib/charts/data.ts`) had no `limit` and ordered ascending, so PostgREST returned only the **oldest 1000 rows**. A 10-year daily series is ~1.9k (INMAG) / ~3.6k (USD blue) rows, so the joined series silently ended at **2020-12-02** — the "hoy" value, the 5y/10y charts, and the percentiles were all frozen ~5 years in the past.
- Fix: both fetchers now **paginate via `.range()`** in 1000-row pages until drained. Verified against the live anon client: 1927 INMAG rows through 2026-05-29 (was 1000 through 2020).
- Corrects four consumers at once: `/mercado/inmag-dolares`, `/api/vender-ahora` (sell-timing percentiles), `YearOverYearBlock`, and `SeasonalityHeatmap`.

**`/mercado/inmag-dolares` — recent, month-to-month view (primary)**

The page was all long-term (10y stats + 5y monthly + since-2015), every chart zeroed on the Y axis, which flattens recent movement. Added a recent layer on top:

- **"Últimos 12 meses" stats strip**: today's USD/kg, change vs 30 days and vs 12 months (green up / red down), and the 12-month range.
- **"Últimos 12 meses — día por día" chart**: daily series scaled to the recent range (`yZero: false`) so month-to-month movement is actually visible.
- The historical charts (10y stats, 5y monthly, full history) moved below under a "Contexto histórico" heading. The "hoy" figure (H1 + FAQ + stats) now reflects the true latest trading day instead of the last monthly average.

**Build / deploy hygiene**

- `/api/top-followed` declared `revalidate` while reading `request.url` → a `DYNAMIC_SERVER_USAGE` error on every build. Switched to `export const dynamic = 'force-dynamic'` (CDN caching still via the response `Cache-Control` header).
- `vercel.json`: removed the per-function `memory` keys (ignored on Active CPU billing) and the `opengraph-image`/`twitter-image` function globs (only set the ignored memory + a `maxDuration` Vercel couldn't map to the hashed image routes). `maxDuration` for API/cron/webhook functions retained.
- Cleared all 17 ESLint warnings (unused vars/imports across 13 files; `useMemo` dependency fixes in `MiGanadoClient` and `InteractivePriceChart`). Production build is now warning- and error-free.

---

## [1.19.0] — 2026-05-29

### Detail-page enrichment + trial-end nudges + scraper accuracy

A SEO-depth + retention release driven by the v1.18.0 GSC pull (search lives in the frigorífico/market surfaces, not remates). No Enterprise API contract changes.

**Remate, consignataria & frigorífico detail enrichment**

- **Remate detail** (`remates/[slug]`): related-remates modules (same consignataria / same province), per-category reference price, and a breed reference block — turning a thin auction page into a navigable hub.
- **Consignataria & frigorífico detail**: added SENASA cattle-existence context **by province** (`existencias-bovinas.json`), plus richer profile copy on both surfaces.

**SEO indexing corrections**

- `noindex` applied to **thin consignataria profiles** (0–1 remates, no enhancement) so crawl budget concentrates on pages with real content.
- Dropped the bare-establishment `noindex` on frigoríficos — **all frigoríficos are now indexed** (the directory is the proven search entry point).

**Retention — trial-end nudges**

- New cron `trial-nudges` (`route.ts` + `trial-nudges.yml` + migration `20260529_trial_nudges.sql`): emails at **7 days and 3 days before trial end** (two new templates in `email.ts`).
- Home live counter fixed to show estimated streams instead of a misleading literal count.

**Scraper accuracy + brand wall**

- Added **HK Agro SRL** as a scraper source + logo (brand wall + auction coverage).
- Fixed **Colombo y Colombo** remates mislabelled CHUBUT → Buenos Aires (locality-province map + scraper guard).

---

## [1.18.0] — 2026-05-20

### "Mi Ganado" — herd-value tracker + nav simplification + SEO rank-lift

A regresabilidad (return-rate) release driven by a fresh read of the analytics. **No Enterprise API contract changes.** The new `user_ganado` table was applied to production via migration; everything else is metadata, content, and one new authenticated page.

**The evidence that drove this release**

Reconnected Google Search Console + GA4 (OAuth re-authorized, Search Console + Analytics Data/Admin APIs enabled) and pulled the real picture for the first time in months:

- Search traffic is **not** coming from remates (the architectural bet) — it comes from market data (`/mercado/inmag`, the query "inmag" = 992 impr at pos 7.4) and the frigorífico directory (province pages + by-CUIT + "habilitados senasa"). Remates barely register in search.
- Returning users are only ~10% of users but engage **2×** (346s vs 166s, 3.9 vs 2.3 pageviews). They are desktop professionals who **search** (88% of all on-site searches come from returning users) and monitor `/frigorificos` (418s, the #1 internal hub) + weekly prices.
- The leak: returning users **re-Google** the term (Organic returning 225 vs Direct 55 in 90d) — there was no product-native reason to come back on their own.

**"Mi Ganado" — the producer's herd, valued daily (free, login-gated)**

A return loop built on intrinsic value, not notifications: the producer sets his herd once and comes back to see what it's worth as the INMAG moves — *his* number, changing on its own.

- Migration `20260520_user_ganado.sql`: table `public.user_ganado`, one row per user (`UNIQUE(user_id)`), `items` JSONB (`[{categoria, cabezas, peso}]`), plus `last_seen_at` + `last_seen_value_ars` to compute "Δ desde tu última visita". RLS scoped to `auth.uid()` with the four own-row policies (select/insert/update/delete).
- `src/hooks/useGanado.ts`: load/save via the browser Supabase client + RLS — **no API route** (mirrors `useFavorites`). `saveGanado` upserts on `user_id`; `markSeen` stamps the value being viewed so the next visit can show the delta.
- `/mi-ganado` (`page.tsx` + `MiGanadoClient.tsx`): live valuation in ARS + USD (blue) at the per-category INMAG price, editable herd line-items (reuses the calculator's category model), and the **Δ-since-last-visit** badge color-coded green/red. Logged-out state is an invitation to sign in (free) with a fallback link to the public `/calculadora`; the page is `noindex` (personal/auth surface).
- Data lock-in by design: the herd composition is persisted server-side per user — a switching cost and a first-party dataset, not an email blast.

**Aha-moment flow + value history — "la libreta del campo"**

A second layer turns Mi Ganado from a flat form into a return loop with a payoff on every visit, around the single concept of the field ledger:

- **Reveal:** the herd value runs an animated count-up (`easeOutCubic`) on each visit, with an INMAG ticker and a pulsing live dot — the number *performs* the change instead of just printing it.
- **Welcome flow:** a first-time user (no herd yet) gets large category buttons and reaches the first valuation in a single tap — no empty form to fill.
- **30-day sparkline** derived from the real INMAG history (reuses `PriceSparkline`).
- **Value register:** a per-producer daily snapshot (new table `ganado_value_snapshots`, own RLS) builds the evolution curve of *his* herd over time — with one data point it shows explanatory copy, with two or more it draws the curve.
- **Weekly-alert opt-in:** new `alerts_opt_in` column on `user_ganado` (the Monday email send + the consignar/permission step are deferred to later phases).
- Additive migration `20260520_user_ganado_value_history.sql` (`CREATE TABLE` + `ADD COLUMN IF NOT EXISTS` + RLS), applied to production; security advisor clean.

**Navigation simplified — 8 → 6 items**

The top nav had grown overloaded. Trimmed to the core surfaces a producer actually needs, and surfaced the new tool:

- Removed: **DASHBOARD** (already reachable as "Mi Panel" in `AuthButton`), **MIS GUÍAS** (niche DT-e archive, reached from `/dte`), **PLANES** (lives in the footer).
- Added: **MI GANADO**, visible to everyone (not auth-gated in the nav) so anonymous users discover it and convert to a free account.
- Result: `INICIO · REMATES · CONSIGNATARIAS · FRIGORIFICOS · MERCADO · MI GANADO`.

**SEO — own "habilitados senasa", capture the INMAG featured snippet, lift CTR**

Grounded in the GSC pull; all on-page, all reversible:

- **`/frigorificos`** — title + H1 rewritten to exact-match the money query "listado de frigoríficos habilitados por senasa" (was pos ~6 with high impressions): H1 is now "Listado de Frigoríficos Habilitados por SENASA en Argentina".
- **`/mercado/inmag`** — added a `DefinedTerm` schema (entity-level definition, more precise than `Dataset` for "qué es el inmag") and moved a concise, self-contained definition lede high in the DOM, so the page can win the featured snippet (position 0) even while the organic listing sits at pos ~7.
- **`/mercado/arrendamiento`** — baked the live INMAG price into the title (CTR was ~0.9% at pos 8.7: page-1 impressions, almost no clicks), matching the self-answering pattern already used on `/mercado`.
- **Frigorífico province pages** — "Habilitados" + "SENASA" front-loaded in the title (e.g. "Frigoríficos Habilitados en Santa Fe · 124 Plantas SENASA/MAGYP") to lift CTR on province queries at pos 7-9.

**Tooling / hygiene**

- GSC + GA4 pull scripts run from the repo against the live OAuth token; the credential and token files under `scripts/archive/` are now covered by `.gitignore` (`scripts/**/oauth-*.json`, `client_secret_*`) so secrets can never be committed.

**Mi Ganado — progressive onboarding (wizard)**

The herd setup moved from "pick a category" (instant prefill) to a one-question-per-screen wizard, so a producer who has never used the page reaches a value with almost no friction:

- ¿Qué hacienda tenés? (category) → ¿Cuántas cabezas? (stepper + input) → ¿De qué peso aproximado? (input + ±kg chips, prefilled per category) → "Calculando…" → the value of *that* lot + "guardamos este valor en tu cuenta automáticamente".
- Each completed lot is appended and **auto-saved** (`saveGanado` + `markSeen` + snapshot) — the value shows instantly and persists. "Agregar otra categoría" loops the wizard; "Listo, ver mi hacienda" exits to the dashboard.
- The dashboard keeps **"+ Agregar (guiado)"** (reopens the wizard) and **"+ manual"** (direct per-row edit). Frontend-only; no schema change.
- The **sell flow** (partial lot → consignataria search/checklist → a request stored as a lead + emailed to the consignatarias.com.ar team) is deferred to a follow-up.

**Remates — province by event locality (georef) + new source (Entre Surcos)**

Fixes a real data-quality bug a power user surfaced: the `/remates/[provincia]` filter listed Buenos Aires auctions (Coronel Dorrego, Tres Lomas, Tornquist, Pehuajó…) under **"Corrientes"**, because province was derived from the feed/consignataria and `CITY_PROVINCE_MAP` only covered ~50 towns — every unmapped locality fell back to the wrong feed province.

- **`enrichProvinces()`** resolves province by the *event locality*, not the feed: `VENUE_FIX` → `CITY_PROVINCE_MAP` (curated, handles ambiguous names like Mercedes→Corrientes) → local cache → **georef API** (`apis.datos.gob.ar`) → feed fallback. Replaces the per-city `correctProvince`. Committed cache `scripts/data/locality-province.json` (124 localities pre-resolved) so CI doesn't hammer the API.
- **`VENUE_FIX` for La Rural:** CACG sends `building_name "PALERMO"` with `state_id=2` (Catamarca) → it was showing "PALERMO, CATAMARCA"; now "La Rural, Palermo / CAPITAL FEDERAL". Existing records corrected in `remates.json`.
- **New source — Entre Surcos y Corrales (source 9):** static-HTML cartelera with per-event province/locality/heads/time/logo. 94 remates parsed, 88 with consignataria resolved from the logo (manual `ENTRESURCOS_LOGO` map + heuristic). Dedups against CACG by `date + slug + locality`, filling head/time gaps. The data correction lands on the next scrape run.

**Remates — SSR of the listing (citability)**

`/remates` was serving only "Cargando remates…" to crawlers/bots: `RematesClient` used `useSearchParams()` (to read `?q=`), forcing a CSR bailout so the served HTML was the `<Suspense>` fallback — the calendar was invisible to search and LLMs.

- `?q=` is now read client-side from `window.location.search` in a `useEffect` (no `useSearchParams`), and the now-pointless `<Suspense>` wrapper + import are removed. The list renders SSR — verified: served HTML went from the fallback to **176 remates** with province/consignataria embedded. The page stays static (`revalidate = false`).

**What's next on the regresabilidad loop ("El Rodeo")**

Mi Ganado is move #1 of three. Still to ship: #2 an INMAG header that leads with the % delta vs ayer/7d/30d (color-coded, the dólar pattern), and #3 the watchlist (`FollowButton`) placed on the `/frigorificos/[slug]`, `/consignatarias/[slug]` and `/remates/[slug]` profiles where returning users actually live, with a "nuevo desde tu última visita" badge.

---

## [1.17.0] — 2026-05-19

### Productor reviews + home repositioning + top-20 persona seed

User-facing rollout of the consignatario-as-protagonist arc. **No Enterprise API contract changes.**

**Productor reviews on every consignataria profile**
- New table `public.consignataria_reviews` with check constraints (rating 1-5, body 30-2000 chars, status pending|approved|rejected) and unique `(slug, email)` so one reviewer = one review per consignataria; re-submits update the existing row.
- RLS policy: public reads only `status='approved'` rows. Writes go through service-role DAL — no anon insert path, avoids email-enumeration leaks via duplicate-key errors.
- Anti-abuse: `ip_hash` = SHA-256(ip + REVIEW_IP_PEPPER), never reversible; existing per-IP middleware rate-limit is the first guard.
- `POST /api/reviews/submit` — anonymous endpoint, logs every outcome (success / validation / server error) to `ops_events`.
- `<ReviewsPanel>` on every `/consignatarias/[slug]`: header with avg rating + count, list of approved reviews, inline form (name + email + role + provincia + 1-5 stars + comment). Empty state copy invites the first reviewer.
- `/admin/reviews` (RESEÑAS tab in admin nav): moderation queue with approve / reject buttons. Reject modal captures a reason for audit. All admin actions hit `POST /api/admin/reviews/[id]/{approve,reject}` behind `requireAdmin`.
- Email verification (magic link) deferred to a follow-up; admin moderation is the credibility filter for v1.

**Home repositioned around consignatarios**
- Hero rewritten: "Los consignatarios que mueven el mercado argentino" replaces the prior calendar-led headline.
- Primary CTA order: directorio completo → 🔴 en vivo → calendario.
- New regional grid between the stats strip and the conversion block: seven cattle-industry regions (Pampa Húmeda · Centro · Mesopotamia · NEA · NOA · Cuyo · Patagonia), each card listing the top 3 consignatarios for that region by upcoming-remate count then total. Region inferred from each consignataria's most-frequent province; falls back gracefully where `region_operativa` isn't populated yet.
- Price stats strip preserved as a secondary band — visible, no longer the protagonist.

**Top-20 persona seed (research session)**
- 20 consignatarias by remate volume filled with `referente_nombre`, `referente_cargo`, `especialidad`, `region_operativa`, `bio_referente`, plus `anos_oficio` where a primary source confirms it.
- Every entry carries `_source_urls` in `consignataria-persona-seed.json` as the editorial audit trail.
- 4 entries shipped without `referente_nombre` (sources don't attribute a single referente to the firm) — omission preferred over guess.
- Seed script extended to silently ignore underscore-prefixed metadata keys.

**Referente photos**
- 9 of 16 candidate referentes shipped with `foto_referente_url` (7 high-confidence + 2 low-confidence). All URLs verified `HTTP 200 + image/*` content-type at commit time.
- 7 candidates withheld where the photo could plausibly be a different family member, sibling, or unrelated person — wrong photo treated as the worse outcome than no photo.
- Hot-link strategy: photos point to the original publisher. Long-term: mirror to Supabase Storage with explicit per-consignataria permission.

**Coverage of the persona schema after this release**
- `referente_nombre`: 17 / 86 rows
- `bio_referente`: 20 / 86 rows
- `especialidad` + `region_operativa`: 21 / 86 rows each
- `anos_oficio`: 11 / 86 rows
- `foto_referente_url`: 9 / 86 rows

---

## [1.16.0] — 2026-05-19

### Consignatario protagonism (foundations) + SENASA verification + audit triplet

Three threads in one release: positioning shift toward the consignatario as the unit of value, three operational data-loop closures (GSC indexability triage, broken-link audit, SENASA cross-reference), and three reusable internal audits plus a daily-pipeline recovery. **No Enterprise API contract changes.** `/api/lots` begins returning real data on the first Tue/Wed/Fri after this release once the recovered pipeline first fires.

**Persona schema + profile page rewire (Sprint 1 + 2)**
- Migration `20260518_consignataria_persona_fields.sql`: 7 optional columns on `public.consignatarias` (`region_operativa`, `especialidad`, `anos_oficio`, `bio_referente`, `referente_nombre`, `referente_cargo`, `foto_referente_url`) + partial indexes on `especialidad` and `region_operativa` for the regional grid.
- `EnrichedProfile` extended; `getConsignatariaProfile` returns the new fields.
- Idempotent seed pipeline: `consignataria-persona-seed.json` + `scripts/seed-consignataria-persona.mjs` with strict `especialidad` vocabulary validation.
- `QUIÉN OPERA` panel on every profile: rich card when populated (photo + referente + especialidad / región / años + bio); discreet "Reclamar perfil →" prompt otherwise.
- `HISTORIAL VERIFICABLE` panel: 4-column grid (remates 90d + monthly rate · próximos confirmados · tipo dominante · plazas) + top-5 cities chip row. Computed client-side from existing auctions data; works for every consignataria today.

**MAG lots pipeline recovery**
- Root cause for empty `mag_consignataria_sales_lots`: the upstream `mag-lots-discover` workflow was manual-only and had never run, so the master table `mag_consignatarias` was empty → every `enqueue` returned 0 jobs → every `process` silently exited on iteration 1.
- Fix: triggered discover (max=200) → 64 active consignatarias upserted. Then wired discover as the first step of `mag-lots-pipeline.yml` so the master refreshes idempotently every scheduled run. Verified end-to-end: queue went from 0 → 128 pending in a single dispatch.

**SENASA habilitados verification**
- `scripts/scrape-senasa-habilitados.mjs` hits the public JSF registry at `aps2.senasa.gov.ar`, captures the JSF ViewState + JSESSIONID, POSTs `Exportar TODO` for each Ciclo (I matarife/frigorífico · II elaborador · III dador de frío), parses the XLS, normalizes CUIT to 11 digits, writes `senasa-habilitados.json` (~600 KB, ~860 distinct CUITs).
- `HABILITACION SENASA` panel on every `/frigorificos/[cuit]`: `VIGENTE` badge + snapshot date for free users; PRO Usuario sees the full registry detail (propietario, partido, localidad, Nº oficial, ciclos habilitados, full Actividades autorizadas list). `NO ENCONTRADA` rows carry a careful disclaimer.
- `scripts/merge-senasa-into-frigorificos.mjs`: stamps `senasaActive` + `senasaLastSeen` on every existing row, appends 728 SENASA-only CUITs absent from our static list. Directory grew from 364 → 1092 rows (860 SENASA-verified active + 232 unverified).
- `/frigorificos` banner: live counts ("860 habilitados activos · 232 sin verificación") + snapshot date. Each row renders a dim "sin SENASA" chip when `senasaActive === false`.
- Monthly cron `scrape-senasa-habilitados.yml` (1st of each month, 04:23 ART) regenerates the snapshot; commit message includes resulting counts.
- `/planes` aligned: new PRO Usuario bullet "Verificación SENASA del frigorífico (propietario, actividades, ciclos)".

**Audit triplet (3 reusable internal scripts)**
- `scripts/audit-data-integrity.mjs` — scraper drift + data sanity (no DB). Catches canonical-slug duplicates, unresolvable slugs, duplicate frigorifico CUITs, orphaned youtube-channel keys, market-prices staleness, zombie consignatarias. Exits non-zero on P0.
- `scripts/audit-api-health.mjs` — Supabase rollup of `ops_events` + `api_keys`: per-route P50/P95/P99 latency last 7d vs prior 7d (flags ≥2× regressions), error rates (≥5% triggers alert), zombie routes, top consumers vs plan quota.
- `scripts/audit-link-graph.mjs` — crawls the sitemap, builds the directed graph from `<main>` content (skips nav/footer), 25 iterations of PageRank, flags orphans / weak nodes / broken targets / anchor-text monocultures / outbound spam.
- `scripts/audit-content-quality.mjs` — full sitemap crawl, per-route boilerplate detection via 3-gram shingles, near-duplicate clustering via 5-shingle Jaccard ≥ 0.85. Used to triage the GSC "Discovered/Crawled, not indexed" bucket.

**6 link-graph fixes (audit findings)**
- New `consignatariaProfilePath()` helper resolves variant slugs to canonical and handles null gracefully. Applied across 6 calendar pages + remate detail + province/type aggregator. Eliminated 53 variant-slug links to `bressan-y-cia-srl`, 21 to `ivan-l-ofarrell-srl`, and 11 to `/consignatarias/null`.
- 18 external `href` occurrences rewrapped in `normalizeUrl()` so raw `www.x.com` strings no longer render as relative paths (80 inbound broken refs across 12 hosts → 0).
- `/precios` commercial-orphan fix: footer link + content-area teaser in `/mercado`.
- `/frigorificos/verificar` (noindex claim form) marked `rel="nofollow"` on the 3 CTA call-sites → Google stops wasting crawl budget on 363 inbound links.
- 9 duplicate auctions in `remates.json` collapsed: variant slug mappings added to `SLUG_DEDUP_MAP` in the scraper + one-shot cleanup of existing dupes (356 → 347 rows).
- Net: total broken targets 363 → 128 (−65%).

**Archived-remate 301 redirects**
- `scripts/audit-404-candidates.mjs` audit found 703 historical remate slugs that shipped at some point but have since been archived. With `dynamicParams = false` on `/remates/[slug]`, all of those 404 today.
- Middleware extended to intercept `/remates/<slug-YYYY-MM-DD>` when the slug matches the detail shape but isn't in the current set; parses the consignataria portion, resolves to canonical, 301s to `/consignatarias/<canonical>`. Sibling routes (`/en-vivo`, `/hoy`, `/ciudad/*`, `/mes/*`, `/tipo/*`) pass through unchanged.

**YouTube channel coverage (53% → 85% upcoming-stream matches)**
- `youtube-channels.json` rewritten to use canonical slugs (previous file mixed long descriptive keys that silently failed canonical matching).
- 5 channels added: `pedro-noel-irey`, `jauregui-lorda`, `hasenkamp`, `mondino`, `monasterio-tattersall`.
- `ivan-l-ofarrell-srl` and `ivan-l-o-farrell-s-r-l` added as aliases of canonical `ofarrell`.
- `scripts/check-missing-channels.mjs` audit script.

**Cron schedule corrections**
- `mag-detailed-prices`: `30 18 * * 1-5` → `37 22 * * 1-5` (15:30 → 19:37 ART). Captures same-day MAG closing data; non-round minute avoids GitHub Actions schedule-throttling.
- `mag-lots-pipeline`: `0 19 * * 2,3,5` → `42 22 * * 2,3,5` (16:00 → 19:42 ART, 5 min offset from mag-detailed-prices).

**Misc**
- Sitemap count corrected in `CLAUDE.md` (1554 → 1062). Shrink is by design — scraper archives old remates.
- `xlsx@^0.18.5` added as devDependency (SENASA scraper).

---

## [1.15.0] — 2026-05-17

### SEO sprint — title fix + foundations + structured data + programmatic OG

A full audit + 8-commit sprint focused on the biggest SERP/CTR levers and on
closing gaps the prior sessions had not noticed.

- **Title bug fixed across 45 files.** The root layout already appends
  `| Consignatarias.com.ar` via `title.template`, but most pages also included
  the brand suffix manually — so production was emitting it twice. The fix
  strips the manual suffix from 63 title fields and lets the template do its
  job once.
- **Live transmissions now actually populate.** `/remates/en-vivo` had always
  shown zero because the scraper only attaches a YouTube URL after the
  auction airs. A new `youtube-live` helper resolves any upcoming auction to
  the right channel `/streams` URL via canonical-slug matching against
  `youtube-channels.json` — ~80 upcoming auctions surface as probable streams,
  separately badged from the confirmed ones.
- **llms.txt** for AI crawlers (`robots.ts` already opted them in; this gives
  them structured context to cite from).
- **Footer site map** with 16 internal hub links — distributes PageRank from
  every page view to long-tail destinations.
- **Hub `/precios`** consolidating the six livestock categories into one
  navigable index with FAQ and breadcrumb schema.
- **Programmatic OG** for every individual remate (date hero, consignataria,
  type pill, estimated heads), plus a root-level OG image that any route can
  inherit by default. Fixes the empty `og:image` that several core pages
  were emitting.
- **Schema depth** improved: `BreadcrumbSchema` on `/remates/[slug]` now goes
  four levels deep instead of two; `SpeakableSchema` added to FAQ and
  Glosario for voice search.
- **H1 hygiene**: `/mercado` had none, `/consignatarias` had two. Both fixed.
- **Sitemap completeness**: `/remates/en-vivo` and `/precios` added.
- **Internal documentation**: full audit + roadmap at
  `docs/SEO-AUDIT-2026-05-17.md`. Internal-only PDF report produced via
  `scripts/seo-report/` (gitignored).

---

## [1.14.8] — 2026-05-15

### Repository hygiene — Batch 3 of consistency audit

- Removed orphaned components after verifying zero references across the codebase.
- Reconciled `reports.json` with the files actually shipped; one download surface, not four.

---

## [1.14.7] — 2026-05-15

### Repository hygiene — Batch 2 of consistency audit

- Archived stale pre-pivot documentation, one-shot bootstrap scripts, and cost-disabled workflows under dedicated `archive/` and `disabled/` paths.
- Fixed a 404 on a static asset that lived at the repo root instead of `public/`.

---

## [1.14.6] — 2026-05-14

### Repository hygiene — Batch 1 of consistency audit

- Rewrote `CLAUDE.md` as a one-screen briefing aligned with the current product state.
- Bumped `package.json` to match the shipped version.
- Merged a divergent migrations folder into the canonical Supabase location.
- Flagged superseded strategy docs and updated cross-references.

---

## [1.14.5] — 2026-05-14

### Observability — instrumentation reliability fix

- API request events now persist reliably across serverless function teardown.
- `/admin/ops` surfaces real data going forward on every authenticated request.

---

## [1.14.4] — 2026-05-13

### Security hardening — high-priority items

- Closed multiple high-severity items from the platform's integral security audit. No customer data was at risk.

---

## [1.14.3] — 2026-05-13

### Security hardening — critical items

- Closed all critical items from the platform's integral security audit. No customer data was at risk.

---

## [1.14.2] — 2026-05-13

### Email sender configuration

- Standardized the outbound sender domain across the codebase.

---

## [1.14.1] — 2026-05-13

### Outreach refinement

- Rebuilt outreach templates and added per-recipient rate-limiting.

---

## [1.14.0] — 2026-05-13

### Observability foundation

- New `ops_events` + `cron_runs` tables, plus a server-rendered `/admin/ops` dashboard for cron health, API activity, and recent errors.
- Request-level instrumentation on the public API endpoints with `X-Request-Id` response headers.

---

## [1.13.3] — 2026-05-13

### Performance — eliminated unnecessary SSR invocations

- Slug variants now redirect to canonical pages at the edge.
- Past-auction URLs return 404 at the edge without invoking server functions.

---

## [1.13.2] — 2026-05-13

### Public API behind authentication

- All public API endpoints now require an authenticated key.
- Conservative compute resource floors per route family.

---

## [1.13.1] — 2026-05-13

### Routing fix

- Resolved a Next.js dynamic-segment naming conflict that was preventing profile pages from rendering in production.

---

## [1.13.0] — 2026-05-13

### Billing-aligned quotas + self-serve upgrades + dev invite system + bugfixes

Multiple cycles of correctness work on the Enterprise stack. Quotas now align with Rebill billing periods (28-day cliff, not calendar month), aggregate per-user across all keys (closes a real revenue-leak bug), expose a self-serve Starter→Growth upgrade flow, and a pre-invite mechanism lets us elevate beta dev users on signup.

#### Quota system rework

- New `getUserCurrentPeriodUsage(userId)` aggregates `request_count` across ALL of a user's active keys within the current 28-day window anchored to `api_tier_activated_at`. Replaces per-key calendar-month counters. Closes a real bug: a user with 5 keys had 5×50K capacity, not 50K.
- `currentPeriod(activatedAt)` computes the active period deterministically without needing Rebill renewal webhooks: `[anchor + N×28d, anchor + (N+1)×28d)`.
- `authenticate()` uses the user-level count; 429 quota_exceeded response now includes `period_start`, `period_end`, `days_until_reset`, and `upgrade_url`.
- Response headers extended: `X-RateLimit-Period-End`, `X-RateLimit-Days-Until-Reset`.
- `/api/account` exposes period info instead of calendar-month resets_on. Includes `upgrade_url` when usage ≥ 80%.
- Cron `/api/cron/quota-alerts` switched to per-USER iteration (one alert per user per period, not per key). Dedup key is the period start ISO date.

#### Self-serve upgrade flow

- `createEnterpriseGrowthLink()` in `lib/rebill.ts` — generic factory for Enterprise plan payment links. Default Growth = ARS 700.000 (~USD 500 al blue), override via `REBILL_ENTERPRISE_GROWTH_AMOUNT`.
- New endpoint `POST /api/enterprise/upgrade?target=growth` — session-gated, returns Rebill checkout URL for Starter→Growth upgrade. Scale stays sales-led (mailto).
- New `UpgradeNudge` component on `/cuenta/api-keys`, visible when usage ≥ 80%. Shimmering gradient CTA (matches Enterprise tier card upgrade buttons), urgency indicator (medio/alto/crítico), days remaining. Self-serve checkout button for Growth; mailto for Scale.
- `EnterpriseTierCTA` component on `/enterprise` renders 5 states per tier: loading, current plan (glowy + pulse animation + "Tu plan actual · Dashboard"), upgrade target (shimmer + "Upgradearme a {Tier}"), downgrade (muted "Plan menor — ya tenés X"), default (existing CTA). One detection per page load, all three tier cards aware.

#### Dev invite system

- New `pending_api_invites` table — pre-approves `api_tier` by email before signup.
- Trigger `zz_redeem_api_invite_on_signup` fires AFTER `handle_new_user_subscription` on `auth.users` insert. Looks up unredeemed invite by email, applies `api_tier`, marks invite redeemed.
- Pre-loaded an external developer for first Starter validation.

#### Bug fixes + ops cleanups

- **Project clone bypass.** The local repo was linked to the wrong Vercel project (`consignatarias` clone) when env vars were initially set. Production serves from `consignatarias-next`. Re-linked + added `API_KEY_PEPPER` to the correct project. Clone is being archived (git disconnected) since it was duplicating builds.
- **`increment_api_usage` RPC** was missing from remote DB despite the original migration declaring it (cause unclear — possibly an MCP apply_migration race condition that dropped the function definition). Re-applied via `api_keys_increment_rpc_fix` migration.
- **Quota math inflation.** `authenticate()` was double-counting today's RPC return value plus the monthly aggregate. Fixed to `usedAfter = used + 1`.
- **Middleware Bearer detection.** Rate-limit middleware was looking for `sk_live_` prefix in `api_key`/`x-api-key` headers, but our Enterprise keys are `cnsg_live_` in the `Authorization: Bearer` header. Result: Enterprise calls were being throttled as anonymous (1 req/min) instead of getting their per-plan quota. Now: if `Authorization: Bearer cnsg_*` is present, middleware bypasses IP rate-limit and the route handler's `authenticate()` takes over with real quota enforcement.
- **Rate-limit message** updated from stale "Actualiza a PRO para 100 req/min" to reflect actual Enterprise tier matrix.
- **API keys client** now surfaces real server errors (HTTP code + body preview) instead of swallowing them as "Error de red".
- **Confidential testimonial removed** from `/enterprise` page (had used anonymized content from a private email, even with anonymization that was inappropriate).
- **Upgrade nudge button** Growth→Scale switched from mailto (didn't always open mail client) to deep-link `/enterprise?upgrade=scale&from=growth#calculadora`.

#### Sitemap additions

- `/el-corredor`, `/el-oraculo` (public landings, monthly priority)
- `/mercado/inmag-dolares` (priority 0.95, daily — the new INMAG-in-USD landing was missing from sitemap)
- `/mercado/arrendamiento`
- `/terminos`, `/privacidad` (priority 0.2, yearly)

#### Schema additions

- `pending_api_invites` (email PK, api_tier, note, redeemed_at, redeemed_user_id)
- `api_tier_activated_at` already existed, now used as the period anchor
- New RPC `redeem_api_invite_on_signup()` + trigger `zz_redeem_api_invite` on auth.users INSERT

#### Known issues — `/consignatarias/[slug]` profile pages hang (still open)

Profile slug pages (`/consignatarias/bressan-y-cia` etc.) hang 25+ seconds in production with no response. Province slugs (`/consignatarias/buenos-aires`), directory page, and all other routes work fine. **Discovered + partially mitigated this release; root cause not fully identified.**

What we tried:
- Merged `[provincia]` + `[slug]` sibling dynamic routes into a single `[slug]` (Next.js doesn't support two dynamic param names at the same path level, evidence in routes-manifest.json showing identical regex). Move correct architecturally but did NOT solve the hang.
- Aligned generateStaticParams across sibling files (page.tsx, opengraph-image.tsx, twitter-image.tsx, verificar/page.tsx) via shared `mergedSlugStaticParams` helper. Next was silently deduping mismatched lists.
- Added `dynamicParams = true` for safety fallback.
- Wrapped every Supabase fetch in the page handler with `Promise.race` timeout (3.5–4.5s each).
- Static-profile fallback when `getConsignatariaProfile` returns null so notFound() can't drop slugs from manifest.

What we did NOT identify yet:
- Why the build only materializes 13 prerendered HTML files for `/consignatarias/[slug]` despite generateStaticParams returning 93 entries (13 provinces + 80 profiles). Province slugs are the 13 that make it through.
- Why the function hangs at request time even after timeouts on every Supabase call. Possible: Supabase client connection deadlock, function maxDuration not enforcing, or Next.js render-pipeline issue with the page's heavy component tree (ConsignatariaProfileClient + MediosPagoSection + VideoGallery client components).

Production impact: 80 consignataria profile URLs return no response. SEO at risk if Google retries multiple times and marks pages dead. **High priority for next session.**

Next debug steps:
1. Reproduce locally with `next start` (production build, not dev) and curl against localhost. If it hangs locally → bug is in our code. If it works locally but breaks on Vercel → infra/edge issue.
2. Strip the page to bare minimum (just `getProfile + display name`) and verify it serves fast. Then re-add features one by one to isolate.
3. If supabase is the culprit, inspect the actual network call (Supabase logs, Vercel function logs with NODE_INSPECTOR).

---

## [1.12.0] — 2026-05-12

### Lote-level transactional pipeline + Self-serve Enterprise Starter via Rebill

Two features that together close the loop on Enterprise: (1) we now ingest the deepest publicly-available MAG data (per-pesada lote-level transactions across 44 consignatarias × FAENA/INVERNADA), and (2) a brand-new user can self-serve their way to an active Enterprise plan in under 5 minutes — no email back-and-forth.

#### Lote-level scraper pipeline (haciinfo000007)

Each pesada × remitente × categoría within a consignataria's day at MAG. ~88 jobs per remate day (44 consignatarias × 2 tipos), processed at MAG's agreed 1-req/min rate from the GH Actions runner. ~90 minutes per day, idempotent.

- **Schema** (applied to remote):
  - `mag_consignatarias` — master list (mag_id PK, name, slug, active, first/last_seen)
  - `mag_consignataria_sales_lots` — granular rows (pesada, remitente, localidad, provincia, head_count, category, total_kgs, kg_avg, price). Unique key `(date, consig, tipo, pesada, remitente, category)` for idempotent re-runs.
  - `mag_scrape_queue` — job queue with `(date, consig_id, tipo)` unique, status `pending|running|done|failed`, attempts counter, last_error

- **Worker route** `/api/cron/mag-lots-worker` with three actions:
  - `?action=discover&start=N&count=M` — scans an ID window (≤30 at a time to stay under Vercel's maxDuration), extracts name from "CONSIGNATARIO: ID NAME" header, upserts master.
  - `?action=enqueue&date=YYYY-MM-DD` — creates pending jobs for the date × all active consignatarias × {FAENA, INVERNADA}.
  - `?action=process` — pulls ONE pending job, fetches haciinfo000007 with the right params, parses the row table (skipping headers + totals), batch-upserts into `mag_consignataria_sales_lots`, marks the job done.

- **Orchestration via GH Actions** (the runner does the 1-req/min throttling):
  - `mag-lots-discover.yml` — workflow_dispatch, loops 20-ID windows with 5s sleep. ~3 min for IDs 1-200.
  - `mag-lots-pipeline.yml` — Mar/Mié/Vie 16:00 ART, calls enqueue then loops process with 65s sleep until queue empty. Hard cap 200 iterations safety.

- **Public API** `GET /api/lots` — date/range/consignataria/category/tipo/provincia filters, pagination up to 1000 rows/page, max 90-day window. Returns aggregates over the page (cabezas, kgs, weighted avg price). Enterprise-tracked when called with Bearer key.

#### Self-serve Enterprise Starter via Rebill

Cierra el gap de autonomía. Cualquier logged-in user clickea "Contratar Starter ahora" en `/enterprise` → Rebill checkout en ARS (default 139.900, equivalente USD 99 al blue) → webhook flips `api_tier='starter'` automáticamente → welcome email branded → user va a `/cuenta/api-keys` y empieza a operar. Cero intervención humana.

- **`createEnterpriseStarterLink()`** en `lib/rebill.ts` — sigue el patrón de `createUserSubscriptionLink`, metadata.kind=`enterprise_starter_subscription` + api_tier para que el webhook lo rutee correctamente.
- **Webhook handler extendido** (`/api/webhooks/rebill`): branch nueva detecta `kind === 'enterprise_starter_subscription'`, upsertea `api_tier` + `rebill_enterprise_subscription_id`, dispara welcome email. **Preserva el tier de PRO Usuario** si ya existía — un user puede tener PRO Usuario + Enterprise simultáneamente. Branches de cancellation/failure también separadas: cancelar Enterprise solo toca api_tier, no rompe PRO Usuario coexistente.
- **Schema** (applied to remote):
  - `user_subscriptions.rebill_enterprise_subscription_id TEXT` — separado del `rebill_subscription_id` (PRO Usuario), porque un user puede tener ambos
  - `user_subscriptions.api_tier_activated_at / api_tier_cancelled_at` — auditoría
- **POST `/api/enterprise/checkout`** — session-gated, devuelve Rebill payment URL. 401 si no logged-in. 502 si Rebill no responde URL.
- **`EnterpriseStarterButton` component** — auth-aware: anon → "Iniciar sesión para contratar", logged-in sin Enterprise → "Contratar Starter ahora", logged-in con Enterprise → "Ya sos Enterprise · Ir al dashboard". Reads `/api/me` y `/api/account` para discriminar.
- **`/enterprise` page Starter card** — reemplaza mailto por el self-serve button. Growth (USD 500) y Scale (USD 700+) **siguen sales-led** vía mailto, porque cada contrato grande requiere NDA + plan custom.
- **`sendEnterpriseWelcome(to, plan)`** en `lib/email.ts` — HTML brandeado con 3 next-steps: generar key en `/cuenta/api-keys`, guardar en `.env`, primer curl con Bearer. Link directo a docs.

#### Env vars

Opcional override del precio: `REBILL_ENTERPRISE_STARTER_AMOUNT` (default 139900 ARS). Rebill secret key + webhook secret ya estaban configurados desde el flujo PRO Usuario.

#### Pricing alignment

ARS 139.900 ≈ USD 99 al blue $1.413 (mediados may 2026). Si el blue se mueve mucho, ajustás la env. Para Growth y Scale, los pagos cross-border siguen vía transferencia/USDT/Stripe (sales-led, cero cambio en el flow).

**Impact:** la primera línea Enterprise (Starter USD 99) es ahora completamente self-serve. Desde que un desarrollador entra al sitio hasta que tiene su primera API key generada y un curl funcionando, son 4-5 clicks y 3-5 minutos. Antes era 24-48h de email + setup manual. Acompañado por el pipeline lote-level que arranca a llenar la tabla con la data más granular publicada por MAG, este release nos pone al frente del mercado en transparencia + speed-to-value.

---

## [1.11.0] — 2026-05-12

### Sprint 1+2+3: USD-deflactado, year-over-year, heatmap, calculator, MEMOLA Index

Three sprints in one push. The thesis: MAG publishes the day, we publish the series and the derivatives. This release turns 11 years of raw INMAG into visual + decision tools that MAG itself never builds.

#### Sprint 1 — Marketing pieces (public, SEO bait)

- `/mercado/inmag-dolares` — full-screen landing showing INMAG deflactado por dólar blue. Server-rendered SVG line chart (last 5 years + full history since 2015), big-number panel (hoy, promedio 10y, mínimo, máximo). Title interpolates today's USD value: *"Precio Kilo Vivo Novillo en Dólares Hoy: USD 3.03 | INMAG Histórico"*. FAQ verbatim long-tail: `cuanto vale el novillo en dolares`, `precio kilo vivo en dolares`, `carne en dolares argentina`. SSG with daily revalidate.
- `YearOverYearBlock` — embedded on `/mercado`, overlays last 6 years on the same Jan-Dec axis. Reveals seasonal patterns the daily INMAG hides.
- New table `usd_blue_history` (5.608 días desde 2011, source argentinadatos.com) backfilled via `/api/cron/backfill-usd` (workflow_dispatch `backfill-usd.yml`).
- `/api/cron/scrape-mag-detailed` extended to also fetch today's USD blue from dolarapi → keeps `usd_blue_history` current going forward.

#### Sprint 2 — PRO Usuario decision tools (gated)

- `SeasonalityHeatmap` on `/mercado` — mes × año grid colored by z-score per year (azul = sobre promedio anual, rosa = bajo). Strips inflation noise, reveals the real cycle. PRO-gated via client-side `ProOverlay` (reads `/api/me` to show/hide blur+CTA). Data is still in HTML for SEO.
- `/mercado/vender-ahora` — full calculator page. Server-redirect to `/upgrade` if non-PRO. Client form with 6 categorías + peso vivo input → `/api/vender-ahora` returns: valor cabeza ARS, valor cabeza USD blue, percentil últimos 30 días, percentil último año, mín/máx/promedio 5 años, statistically-reasoned recommendation in plain Spanish.
- The recommendation engine isn't ML — it's rule-based on the joint distribution of `pct30` and `pct365`. Honest tool: "percentil 80+ últimos 30 días con 60+ anual = momento de salida". Disclaimer obligatorio.

#### Sprint 3 — Enterprise differentiation (API)

- `GET /api/index/memola` — composite ponderado por kgs operados sobre las 16 sub-categorías MAG. Fórmula: `Σ(price_avg_i × total_kgs_i) / Σ(total_kgs_i)`. Pondera por mix real de faena, no novillos solos como el INMAG oficial. Params `?days=N` o `?from=&to=`. Devuelve serie + stats (latest/min/max/avg). Hoy responde vacío hasta que `mag_prices_detailed` acumule data (cron Mar/Mié/Vie comenzando esta semana).
- Honors Enterprise auth + quota tracking when called with `Authorization: Bearer`.

#### Infra: chart rendering

- `src/lib/charts/svg.ts` — server-rendered SVG primitives: `lineChartSvg`, `sparklineSvg`, `heatmapSvg`. Zero client JS. Inline content indexable por Google. Estética terminal (zinc-500/sky-400, monospaced labels).
- `src/lib/charts/data.ts` — data helpers (`fetchInmagSeries`, `fetchUsdSeries`, `fetchInmagUsdJoined` con forward-fill, `aggregateMonthly`, `withYearZScores`, `percentileOf`). Usa anon client (RLS public-read), funciona en SSG sin service key.

#### Schema additions

- `usd_blue_history` (date PK, compra, venta, source_url) — public read RLS

#### Migration / data ops applied to remote

- Migration `usd_blue_history` applied via MCP
- Backfill workflow `backfill-usd.yml` ready (workflow_dispatch) — disparalo una vez desde GH Actions UI para sembrar 5.608 días

#### New routes summary

| URL | Tipo | Acceso |
|---|---|---|
| `/mercado/inmag-dolares` | SSG | Público (SEO) |
| `/mercado/vender-ahora` | Dynamic | PRO Usuario only (redirect) |
| `/api/vender-ahora` | API | PRO Usuario (session) |
| `/api/index/memola` | API | Public + Enterprise tracked |
| `/api/cron/backfill-usd` | Cron | CRON_SECRET |

**Impact:** the platform now ships derivatives, not just the wrapper. INMAG en dólares es bait orgánico para Google. Heatmap + calculator son las dos features que justifican PRO Usuario $7.900 (antes el pitch era "medios de pago + descargas", débil). MEMOLA Index es la primera marca propia del data product Enterprise.

---

## [1.10.1] — 2026-05-12

### MAG Data Deepening — 16 sub-categories + 11 years of INMAG history

The headline INMAG number our existing scraper has been pulling is the tip of what MAG Cañuelas actually publishes. This release ingests the full detail: 16 official sub-categories with weight thresholds (Esp.Joven +430, Regular h430, Conserva Buena/Inferior, MEJ, etc.) and the complete daily INMAG series going back to 2015.

#### New persistent tables (RLS public-read, service-role write)

- `mag_inmag_history` — daily INMAG index series. **2.236 days backfilled** (2015-01-02 → 2026-05-12), **1.690 days with calculated INMAG** (the rest are days where novillo count <300, marked `inmag_calculated=false` per MAG methodology). Average INMAG by year: $18 (2015) → $642 (2023, hyperinflation) → $4.324 (2026 YTD).
- `mag_prices_detailed` — primary key `(date, subcategory)`. Carries `category_group`, `weight_threshold`, `price_{min,max,avg,median}`, `head_count`, `total_amount`, `total_kgs`, `kg_avg` per sub-category per day.

#### Scraping pipeline (additive, not replacing the existing daily scraper)

- `/api/cron/scrape-mag-detailed` — fetches both `haciinfo000502` (16 sub-cat) and `haciinfo000011` (headline INMAG) for today's date, upserts both tables in one invocation. Closes the gap where the JSON-driven scraper kept `market-prices.json` current but never wrote to DB.
- `/api/cron/backfill-inmag` — one-shot endpoint with `from`/`to`/`months` params. Fetches MAG in 6-month windows, throttles 2.5s between windows, upserts. `maxDuration=300s` covers ~12 years.
- GH Actions: `mag-detailed-prices.yml` runs Lun-Vie 15:30 ART (after MAG closes ~14:30 ART). No-op on non-trading days. `backfill-inmag.yml` is `workflow_dispatch`-only — manually triggered when expanding history range.

#### API surfaces

- `GET /api/precios?detallado=true` — returns the 16 sub-categories of the latest scraped date with full breakdown + source attribution to MAG haciinfo000502.
- `GET /api/precios?historico=N` — returns N days of INMAG history (7–3650) + aggregate stats (min/max/avg/count). Source: MAG haciinfo000011.
- Both endpoints honor the existing Enterprise auth + quota tracking when an `Authorization: Bearer` header is present.

#### /api-docs page rewrite

- Authentication section: removed stale `x-api-key` header doc, replaced with `Authorization: Bearer cnsg_live_...` matching the actual Enterprise key format. Links updated to `/cuenta/api-keys` for self-serve.
- Rate limits table replaced: was generic "100 req/min público / 1000 PRO" → now shows actual 4-tier matrix (Público / Starter 30/min / Growth 300/min / Scale 5000/min) with SLA per tier.
- New sections: "Precios detallados (16 sub-categorías)" and "Histórico INMAG (desde 2015)" with literal `curl` examples and sample JSON responses.

#### /enterprise page

- Coverage strip swaps `Fuentes scrapeadas: 8` and `Histórico INMAG: 2022→hoy` for `Sub-categorías MAG: 16` and `Histórico INMAG: 2015→hoy` — more honest about what's actually queryable.
- Starter tier feature list now leads with "INMAG diario + serie histórica completa (desde 2015)" and "16 sub-categorías oficiales MAG con corte por peso".
- Growth tier adds "Lote-level transactional data (próximamente)" — flags the next ingestion target (haciinfo000007).

#### Cron audit map

Six active workflows, no overlap with the new MAG layer:

| ART | Workflow | Scope |
|---|---|---|
| 10:00 Lun | `weekly-newsletter`, `quota-alerts` | Email, alerts |
| 11-19 hourly | `post-remate-outreach` | Auto-email post-remate |
| 14:00 daily | `scrape-auctions` | 8 fuentes → JSON → SSG rebuild |
| 15:30 Lun-Vie | `mag-detailed-prices` (new) | DB persistence MAG |
| 14:00 1º del mes | `el-corredor-publish` | PDF mensual |

The old `scrape-auctions.yml` keeps writing `market-prices.json` (which drives SSG pages like `/mercado`, `/precios/*`). The new `mag-detailed-prices.yml` writes to DB only (which drives the API endpoints). Two distinct write paths, zero duplication.

**Impact:** the API can now answer questions our old "6 generic ratios" couldn't: *"¿Cuánto vale el novillo Esp.Joven +430 hoy vs hace un año?"*, *"¿Qué peso promedio se está faenando este mes?"*, *"Dame el INMAG mes a mes desde 2018"*. Real differentiator vs any competitor that just republishes the headline number.

---

## [1.10.0] — 2026-05-12

### Three-Product Pricing + Enterprise API + SEO Pivot to Answer-First Snippets

Major release. Three concurrent shifts: (1) disambiguates the two consumer PRO tiers and adds a third Enterprise API product line, (2) rebuilds `/planes` with an audience toggle so productores and consignatarias see only their own pitch, (3) attacks the #1-rank-but-0-CTR SEO problem by making page titles and meta descriptions answer the user's query in the SERP itself — with seven new daily-rebuilt landing pages anchored on live INMAG prices.

#### New product: Enterprise API

Three tiers, billed in USD, gated by a new `user_subscriptions.api_tier` column (independent from `tier` so a user can be both PRO Usuario and Enterprise):

- **Starter** — USD 99/mes — 1.000 req/mes, 1 webhook, full endpoints, SLA 99.5%
- **Growth** — USD 500/mes — 50.000 req/mes, webhooks ilimitados, exports CSV/JSON, reportes semanales PDF+JSON, dashboards, analyst access, SLA 99.8%
- **Scale** — USD 700–7.500/mes via volume slider — 100K → 5M req/mes, multi-seat, ERP/BI integration, white-label opcional, CSM desde 500K req/mes, SLA 99.9%

Pricing anchored on real infra cost (~USD 50/mes at 1M req/mes, mostly Vercel Pro + Supabase Pro), not on speculative competitive value. Calculator at `/enterprise` interpolates price from anchor points with decreasing $/1K req as volume grows.

#### Authentication infrastructure for the API

- `api_keys` table — HMAC-SHA256 hash with server pepper, prefix-only display (`cnsg_live_a1b2…`), per-key environment (`live`/`test`), optional IP whitelist
- `api_usage_daily` table — atomic increment via `increment_api_usage` RPC, monthly quota enforced in `authenticate()` middleware
- `/cuenta/api-keys` dashboard — generate (one-time secret modal with copy + Escape close + focus management + `role="dialog"`), list with usage per key, revoke. Gated to `api_tier !== 'none'`
- `/api/internal/keys` — POST/GET/DELETE, session-authed, max 5 active keys per user
- `/api/precios` — opt-in auth: header present → must be valid + quota OK + tracked; no header → public legacy access. Sets `X-RateLimit-{Plan,Limit,Remaining}` headers
- Weekly cron `/api/cron/quota-alerts` (Mondays 10:00 ART) — sends 80% threshold email once per month per key, tracked via `api_keys.quota_alert_month`. Branded HTML in `sendQuotaAlert()`

#### Audience toggle on `/planes`

Single source of truth replaces the previous consignataria-only pitch. Toggle state lives in URL (`?audience=productor|consignataria`) so links from across the site can deep-link the right audience and `MobileStickyCTA` can read the same state.

- **Productor view (default)** — Free + PRO Usuario ARS $7.900/mes + Enterprise card. CTA → `/upgrade` (Rebill). Pitch focused on observatorio access.
- **Consignataria view** — Free directorio + PRO Consignataria ARS $45.000/mes + Enterprise card. Existing flow with `pln_f644261ffe68462497eeb78d4363f377`. Newsletter preview + "Why PRO" benefits only shown in this view.
- `MobileStickyCTA` is audience-aware — productor (sky #38bdf8, $7.900, `/api/subscribe/checkout`) vs consignataria (amber #fbbf24, $45.000, `/api/subscribe`). Hides automatically if the user already has the corresponding tier.

#### SEO: answer-first titles + 7 new landing pages

Audit found multiple high-volume queries ranking #1 with **0 CTR** because titles/descriptions didn't carry the answer. Examples: `kilo de novillo`, `precio kilo vivo novillo`, `cuanto esta el kilo vivo de novillo`, `hacienda en pie`, `carnes pampeanas cuit`.

- `/mercado` title and description now interpolate live INMAG + category prices at build time: `Precio Kilo Vivo Novillo Hoy: $4.428 (INMAG 2026-05-10) | Consignatarias.com.ar`. FAQ uses verbatim Google Search Console query strings.
- `/overview` title carries INMAG + change percentage
- `/frigorificos/[cuit]` title and description lead with CUIT and SENASA matrícula so brand+CUIT queries become self-answering snippets
- **New** `/precios/[categoria]` — six daily-rebuilt SSG pages (novillos, novillitos, vaquillonas, vacas, toros, terneros) with Product schema (`Offer.price` in ARS), Article schema (`datePublished`/`dateModified` for "Updated DD/MM" SERP badge), FAQ schema with verbatim GSC queries, big-number panels and per-cabeza calculations
- **New** `/precios/hacienda-en-pie` — hub page with all categories in one table, INMAG anchor, FAQ targeting `hacienda en pie` / `kg novillo` / `kilo de novillo` queries
- Sitemap: 7 new URLs with `priority: 0.9–0.95`, `changeFrequency: daily`

#### New product: Reports for PRO Usuario (and Enterprise)

PRO Usuario was promising "descargas premium" but had no actual reports page. Built it.

- `user_report_downloads` table — granular tracking, RLS owner-read, RPCs `get_user_report_stats` and `record_report_download`
- `/cuenta/reportes` — catalog from `src/lib/data/reports.json`, per-user stats (download count, last downloaded), CTA flips to "Descargar de nuevo" once consumed
- `/api/reportes/[slug]/download` — auth + tier gate (PRO Usuario OR any Enterprise tier), atomic count increment, 302 to file
- 4 placeholder reports shipped in `public/reports/` (El Corredor abr+mar, Oráculo Q1, archivo INMAG zip) — replace with real PDFs without code changes

#### Coherence fixes across the site

Audit found 23 incoherencies after the product split. Critical fixes:

- All consignataria-facing CTAs append `?audience=consignataria` (ConsignatariaProfileClient, DashboardClient ×2, homepage PRO section)
- Login redirects normalized to `?next=` everywhere (was a mix of `?redirect=` and `?next=`) and URL-encoded (was breaking when target contained `?`)
- `/auth/login` broken refs in FollowButton + mi-cuenta/favoritos rewritten to `/login`
- `/newsletter` href in RematesClient → `/alertas`
- FeatureGate default fallback rewritten to be audience-agnostic (was consignataria-only copy)
- Founder-pricing theatre stripped — `$65.000 luego` references removed from FounderSpotsRemaining + DashboardClient (the escalation was never going to ship)
- `analytics.trackCheckoutStart` differentiates `PRO_USER` (7900) from `PRO_CONSIGNATARIA` (45000)
- `/cuenta` now shows a Consignataria card when user has claimed an entity, with its current subscription_tier

#### Tech + UX polish

- `src/lib/platform-stats.ts` — single source of truth for headline counts (remates / consignatarias / frigoríficos / provincias) derived from JSON at import time. Eliminates the prior 82/74/392/366/12/14 drift across `/layout`, `/enterprise`, `PlatformStats`, FAQ strings.
- `PlanesToggle` mobile labels shortened (`Productor` / `Consignataria` instead of full phrases) below sm breakpoint, with `flex-wrap` so they don't overflow on <375px screens
- `.safe-area-inset-bottom` CSS utility added to `globals.css` (was referenced but undefined)
- Modal a11y in `ApiKeysClient`: `role="dialog"`, `aria-modal`, `aria-labelledby`, `<label htmlFor>`, Escape closes
- New legal stubs `/terminos` + `/privacidad` (login screen was 404-ing on these)
- `text-zinc-600 text-xxs` → `text-zinc-500 text-xxs` in new files for WCAG AA contrast

#### Database migrations

Applied to remote in this release:

- `20260511_user_subscriptions.sql` — was in repo but never applied; required by the entire PRO Usuario flow. Triggers backfill all existing `auth.users`
- `20260512_api_keys.sql` — keys + usage table + `increment_api_usage` RPC + RLS
- `20260512_api_tier_entitlement.sql` — adds `api_tier` column with CHECK constraint
- `20260512_user_report_downloads.sql` — tracking table + 2 RPCs
- `20260512_api_keys_quota_alert.sql` — adds `quota_alert_month` for cron dedup

#### Env

- `API_KEY_PEPPER` — required for HMAC-SHA256 of API key secrets. Provisioned in Vercel Production + Development. Preview env had to be set via dashboard (CLI 50.39.0 bug with non-interactive `vercel env add NAME preview`)

**Impact:** the pricing page no longer presents a single confusing PRO to all visitors; SEO surfaces should start converting #1 rankings into clicks once Google recrawls (typically 1–2 weeks); Enterprise can be sold with a real product page, real API, real onboarding, and real billing — not just a contact form.

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
