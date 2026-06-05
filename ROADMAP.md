# Roadmap

**Current:** v1.30.3 (June 4, 2026) — see [CHANGELOG.md](CHANGELOG.md) for the full per-version history.
**Strategic frame:** [docs/strategy/POSITIONING-THESIS.md](docs/strategy/POSITIONING-THESIS.md) — own the
category **"el precio de referencia del ganado argentino"** via three pillars (Index family ·
Institutional access · Online-auction flywheel) across three horizons.
**Versioning:** [docs/VERSIONING.md](docs/VERSIONING.md) — the Enterprise API contract (v1.0.0) is the
MAJOR boundary, so the product stays on 1.x.

> The original "v1.20 — First Revenue Milestone" target was met-and-surpassed as a *build* goal: the
> platform is no longer the bottleneck. **$0 revenue is still real** — but as of v1.30 the path to the
> first dollar is **unblocked** (email-first checkout live for both B2C and Enterprise, verified to
> reach a real Rebill payment link). The remaining gate is a real test payment + the institutional
> sales motion — not more code.

---

## Where we are now — v1.30.3 (June 2026)

The intelligence-infrastructure thesis is in execution. The train since v1.29:

- **Conversion unblocked (the $0 fight).** A multi-agent swarm diagnosis confirmed $0-ever was a
  *broken funnel*, not weak demand: payment sat behind a login wall (~10 accounts in 3 months despite
  +60%/wk organic traffic). Shipped **email-first checkout** (B2C `/upgrade` + Enterprise Starter):
  pay without creating an account first (user created server-side; post-payment access via magic-link).
  Also fixed the PRO-prompt copy (it sold B2B to producers), un-deadcoded the B2B $45k CTA (was gated
  on `verified` = 0 profiles), killed fabricated "47 ya lo hicieron" social proof, and added a real
  post-payment success state on `/cuenta`.
- **Pillar 2 launched + de-risked.** Institutional **access offering** on `/enterprise` — pay for the
  *access + service* (maintained, USD-normalized feed + bulk + support + our derived indices), NOT a
  license/redistribution of MAG's public series (Ley 11.723 protects compilations; redistribution
  would need MAG's authorization). The series-not-per-request model, minus the licensing claim.
  Discovery from `/metodologia`,
  `/mercado/inmag`, and the site-wide footer. Verified: returns a real `pay.rebill.com` link.
- **Pillar 1 hardened (citability).** Generated `/llms.txt` (live data, no more drift), INMAG
  `Dataset` schema freshness (`dateModified` + `variableMeasured` + distribution + publisher),
  methodology audited to v1.2 (removed fabricated figures; added the honest **~12% INMAG / ~71%
  dark-pool** coverage declaration — the credibility gate for institutional-access).
- **Reliability.** El Corredor pipeline repaired end-to-end (PDF 404 + blast-never-sent → fixed; blast
  broadened to market segments; Mayo edition sent 14/14). INMAG-$0 hydration hotfix (price now SSR'd,
  never depends solely on client JS). Mobile + desktop overflow fixes. Full cron observability
  (`/admin/ops`). Consignataria count unified to **104** everywhere. Build hotfix: an ESLint error had
  silently blocked **all** Vercel deploys since v1.29.14.

**State:** $0 revenue. Both checkout paths (B2C + Enterprise Starter) are **live and verified to reach
Rebill.** Open: the real test payment (confirms Rebill → webhook → activation end-to-end) + the
institutional sales motion.

---

## The thesis: 3 pillars × 3 horizons

| Pillar | What | Defensibility | Status |
|---|---|---|---|
| **1 — Proprietary Index Family** | Be the reference, own the series | Very High | **Largely built + citable** |
| **2 — Terminal & Institutional Access** | Data gravity, not features (the revenue engine) | High | **Offering live; sales motion pending** |
| **3 — Online-Auction Data Flywheel** | Own the data layer of price discovery (→ the 71% dark pool) | Highest (long) | **Wedge available; indicator pending** |

### Pillar 1 — Proprietary Index Family
**Done:** INMAG 2015→ (2,237 rows) + USD overlay, 16 MAG sub-cats, lote-level pipeline, named `/indices`
family, methodology v1.2 (honest coverage), `Dataset`/`DefinedTerm` schema, generated `llms.txt`,
citable in AI/Google.
**Next:** derivative indicators (Liquidation / Heaviness / Quality), the daily-index X/Twitter bot,
academic co-validation (Scoponi/UNS, FCV-UBA — outreach), `llms-full.txt` generated too.

### Pillar 2 — Terminal & Institutional Access  ← the revenue engine
**Done:** Enterprise API (`cnsg_live_*`, Bearer, 28-day billing, self-serve Starter via Rebill),
institutional **institutional-access offering** on `/enterprise` + discovery, email-first checkout (no login
wall), checkout verified to reach Rebill.
**Next:** the **sales motion** (outbound to banks / export frigoríficos / MATBA-ROFEX / fintech), a
**institutional-access one-pager PDF** + a **sample dataset** download (lower evaluation friction), the first
institutional dollar, `api.consignatarias.com.ar` + OpenAPI/SDKs + status page.

### Pillar 3 — Online-Auction Data Flywheel
**Available:** ~380 scraped remates as a cross-platform results layer.
**Next:** the **Online/Pantalla Cattle Indicator** (the AuctionsPlus→OYCI move) over Rosgan + scraped
remates; the **Acta-de-Cierre / self-load** feature (converts scraped → first-party auction data);
structured measurement of the **71% dark pool** (long arc). RWA / CD+W / tokenized collateral = Horizon 3.

---

## What's next — prioritized (post-v1.30)

1. **Verify revenue end-to-end (E)** — one real test payment (B2C *and* Enterprise Starter share the
   Rebill+webhook mechanism) confirming Rebill → webhook → `user_subscriptions.tier='pro'` with a
   `rebill_subscription_id`. The single gate between "can pay" and "converts." *(User action; I can't pay.)*
2. **Pillar 2 sales enablement** — institutional-access one-pager PDF + sample dataset download, then outbound.
3. **Conversion measurement** — `UpgradeConfirmTracker` (fire `pro_upgrade` only on DB confirmation,
   never on `?upgraded=true`), and the calculadora **blurred-number reveal** to lift the 3.7% prompt CTR.
4. **Pillar 1 deepening** — derivative indicators (Liquidation/Heaviness/Quality) + daily index bot;
   academic co-sign; generated `llms-full.txt`.
5. **Pillar 3 wedge** — the Online/Pantalla indicator on Rosgan + scraped remates.
6. **API ecosystem** — `api.consignatarias.com.ar`, OpenAPI/SDKs, public status page.
7. **Hygiene** — run `pnpm build` (not just `next dev` + `tsc`) before pushing JSX; a lint error blocked
   all deploys for hours (v1.29.14 → v1.30.2 were stuck).

---

## v2.0.0 Definition (the revenue milestone — still the goal)

**v2.0.0 = USD 2.000+ MRR across the product lines, sustained 30 days.**
- [ ] 5+ Enterprise customers paying (Starter/Growth/Scale or a institutional-access)
- [ ] 1+ PRO Consignataria paying
- [ ] 10+ PRO Usuario paying
- [ ] Total MRR ≥ USD 2.000 normalized at MEP
- [ ] ≥1 public case study / institutional reference

**The real bottleneck (updated):** not code, and no longer "the platform." The checkout paths are live.
What's missing is the **first verified dollar** (the test payment) and the **sales motion** for the
institutional-access (outbound to institutions — the highest-ACV path per both the thesis and the swarm).

---

## Backlog detail (Pillar-mapped — still-relevant future work)

> Carried from the v1.13→v1.20 plan; most build items shipped, these remain.

### Pillar 1 — Derivative indicators (was v1.16)
- [ ] `Liquidation Index` — % cabezas (VACAS Conserva Buena+Inferior) / total faenado → endpoint + chart
- [ ] `Heaviness Index` — Σ(kg_avg × head_count) / Σ(head_count)
- [ ] `Quality Premium` — Esp.Joven vs Regular novillo spread
- [ ] Each: API endpoint + landing + FAQ/Speakable schema; daily X bot ("MEMOLA Liquidation Index 67")

### Pillar 2 — API ecosystem (was v1.17) + pricing completeness (was v1.18)
- [ ] `api.consignatarias.com.ar` subdomain; OpenAPI 3.1 + Postman; Python + JS/TS SDKs (open-source the
      client, never the server); webhooks (new remate, INMAG change, alerts); public status page
- [ ] Optional "Lite" tier (USD 29) + Stripe for international cards (Argentina-only Rebill is a ceiling)
- [ ] Embeddable widgets "powered by consignatarias.com.ar" for Sociedades Rurales (distribution)

### Pillar 1/2 — Real reports + content moat (was v1.15)
- [ ] El Corredor monthly (pipeline now works) + Oráculo quarterly + INMAG historical archive zip
- [ ] PRO Usuario monthly digest by email; download-count A/B (free preview vs full lock)

### Marketing / GEO (ongoing, was v1.19)
- [ ] More `/precios/[X]` long-tail landings; press outreach (La Nación campo, Bichos de Campo, agritotal)
- [ ] Monthly citation-audit re-run; expand to institutional queries

---

## Post-revenue Horizon (v2.x — the operator path, Camino B)

Only **after** the reference is unassailable (thesis Horizon 3):
- **Transaction/operator layer** — ganado.com.ar, ALyC-ganadera exploration, escrow. *Sacrifice today:
  a referenced index cannot also be a counterparty (CEPEA is never a buyer).*
- **RWA / financing rails** — miganado.com.ar / CD+W (Decreto 640/2024), tokenized cattle as collateral.
  Real ($4–5T TAM by 2030) but capital/licence-heavy — the *reward* for owning the reference, not the route.
- **Forecasting** (EWMA/seasonal-naive first), **multi-market** (Uruguay/Brasil), **white-label** for
  Memola B2B clients, eventual **strategic exit** (Aleph / S&P Global / Reuters universe).

---

## The Journey So Far (historical record)

```
v0.x  (Feb 26 – Mar 9)    Genesis → Data → SEO Foundation
v1.0  (Mar 10)             Platform Launch — 385 auctions, 77 consignatarias
v1.1-1.7 (Mar 12-16)       Public API + content (video catalogs, email automation)
v1.9.x (Mar–May)           Market Intelligence — price oracle, MAG, conversion, En Vivo, daily rebuild
v1.10-1.12 (May 12)        Three-product pricing + Enterprise API + derivatives + lote-level pipeline
v1.13.x (May 13)           28-day billing + per-user quota; slug-hang fix; API auth gate; edge redirects
v1.14.x (May 13-14)        Observability foundation + email v2 + 2 P0/5 P1 security findings closed
─────────────────────────────────────────────────────────────────────────────
v1.20→v1.27 (May)          Market data-layer fix, PRO build-out + merchandising, GEO Phase 1,
                           SEO long-tail, named index family, legal layer
v1.28.x (May 31)           Cron observability + email-cron auth fix (silent-401) + fail-safe segmentation
v1.29.0-1 (May 31)         Docs/versioning/ops maturity pass + full cron-hook coverage
v1.29.2-7 (Jun 3-4)        Conversion surfaces, mobile/desktop overflow fixes, INMAG-$0 hotfix,
                           consignataria count unified (104)
v1.29.8-14 (Jun 4)         El Corredor lead-magnet + pipeline repair, post-payment success state,
                           conversion swarm quick wins, email-first B2C checkout, citability hardening
v1.30.0-3 (Jun 4)          Pillar 2 institutional-access offering + discovery, Enterprise email-first checkout
                           + stall fix, build hotfix (unblocked deploys)
```

**Posture:** shipped-clean (0 P0/P1 open), data pipeline runs unattended (GitHub Actions crons), all
checkout paths live. The bottleneck is commercial, not technical.

---

## What We Pivoted On (historical)

The original v2.0 roadmap targeted *"first PRO Consignataria payment."* Direction changed mid-May 2026:
points-gamification killed → answer-first SEO + Enterprise self-serve; API monetization shipped early as
the real revenue lever; the transaction layer (ganado.com.ar) pushed to v2.x. The current frame
(positioning thesis, May 31) sharpens this: **own "the reference price," monetize via institutional-access,
sacrifice the transaction** until the reference is unassailable.

---

## Open Strategic Questions

1. **Test payment first** — before any more conversion code, confirm the Rebill→webhook→PRO path with a
   real ARS 7.900 payment (deferred by owner; gates the whole revenue story).
2. **Institutional-access go-to-market** — bespoke/sales-led (current) vs a published institutional price.
   Outbound targets: banks (cattle-collateral), export frigoríficos, MATBA-ROFEX, fintech.
3. **Lite tier (USD 29) & Stripe** — capture global devs / international cards, or stay Argentina-Rebill
   and focus on institutions? (Thesis leans institutional > self-serve dev.)
4. **Open-source the SDKs** — yes, aggressively (distribution; the server is the moat, not the client).
5. **Newsletter** ("Argentina Cattle Weekly": INMAG-USD + indicators) as lead-gen for institutional-access.

---

*Roadmap rewritten: 4 June 2026 (v1.30.3), reframed around the positioning thesis.*
*Prior: 13 May 2026 (v1.13→v1.20 milestone plan, now historical).*
*Real bottleneck: the first verified dollar + institutional sales motion (owner-led).*
