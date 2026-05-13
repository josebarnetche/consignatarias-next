# Roadmap to v1.20.0

**Current:** v1.13.0 (May 13, 2026)
**Target:** v1.20.0 — First Revenue Milestone (Enterprise API + B2B)
**Timeline:** 8-12 weeks

---

## The Journey So Far

```
v0.x  (Feb 26 – Mar 9)    Genesis → Data → SEO Foundation
v1.0  (Mar 10)             Platform Launch — 385 auctions, 77 consignatarias
v1.1-1.3 (Mar 12-14)       Public API — 20 endpoints, lead magnets
v1.5-1.7 (Mar 14-16)       Content — Video catalogs, email automation
v1.9.0-1.9.5 (Mar 18-20)   Market Intelligence — Price oracle, MAG, onboarding
v1.9.6-1.9.7 (Apr 4-7)     Conversion Optimization — Form recovery, PRO copy
v1.9.10-1.9.13 (Apr-May)   En Vivo focus, daily rebuild guarantee, MAG backfill
─────────────────────────────────────────────────────────────────────────────
v1.10.0 (May 12)           Three-product pricing + Enterprise API + answer-first SEO
v1.10.1 (May 12)           MAG deepening (16 sub-cat + 11 años INMAG)
v1.11.0 (May 12)           Derivatives — INMAG en dólares, YoY, heatmap, calculator, MEMOLA Index
v1.12.0 (May 12)           Lote-level pipeline + Self-serve Enterprise Starter via Rebill
v1.13.0 (May 13)           28-day billing + per-user quota + self-serve upgrade + dev invites
```

**76 days. 1554 static pages. 33 API endpoints. 22 Supabase tables. $0 revenue still — but the platform is no longer the bottleneck.**

---

## What We Pivoted On

The original v2.0 roadmap targeted *"first PRO Consignataria payment"*. We changed direction in mid-May 2026 once the answer to "what's the highest-margin product line for this codebase?" became clear:

| Original v2.0 plan | What we shipped instead | Why |
|---|---|---|
| PRO Consignataria $45K/mes activation as primary goal | PRO Consignataria stays (sales-led), but now coexists with PRO Usuario ARS 7.900 and Enterprise API USD 99-700+ | PRO Consig is high-touch B2B with long sales cycle. Enterprise API is self-serve with global TAM. Both products coexist. |
| "Points system" gamification (v1.9.8) | Killed. Replaced with answer-first SEO + Enterprise self-serve. | Points adds complexity for marginal conversion lift. Enterprise pays USD, not in-game tokens. |
| Watchlist / Favorites (v1.9.11) | Partial — `/mi-cuenta/favoritos` exists, no notifications yet | Lower priority once the Enterprise pitch became dominant |
| Recovery email campaigns (v1.9.12) | Postponed | Form recovery infra exists; we'll wire when SEO traffic justifies retargeting |
| Auction Results Database (v2.3) | Already shipping via daily MAG lote-level scraper (v1.12.0+) | The cattle market told us this WAS the data product |
| API monetization (v2.4) | **Shipped as v1.10.0+** — Bearer auth, quotas, 28-day billing, self-serve Rebill checkout, /api/account introspection | The actual revenue lever |
| Transaction layer / ganado.com.ar (v2.5) | Still planned but pushed to v2.x | Not the first dollar — we'll earn via data + API first |

**Net:** v2.0.0 (first revenue) is still the goal. The path now goes through the Enterprise API funnel, not the PRO Consignataria-only funnel.

---

## v2.0.0 Definition (Updated)

**v2.0.0 = USD 2.000+ MRR across the three product lines, sustained 30 days.**

Concretely:
- [ ] 5+ Enterprise customers paying (Starter or above)
- [ ] 1+ PRO Consignataria paying
- [ ] 10+ PRO Usuario paying
- [ ] Total MRR ≥ USD 2.000 normalized at MEP
- [ ] Public case study from at least 1 customer

Until then, every release optimizes for moving the funnel.

---

## v1.13 → v1.20 Milestones

### v1.13.1 — Slug page hang (BLOCKER) ⚠
**Effort:** 1-3 hours | **Impact:** Critical

`/consignatarias/[slug]` profile pages hang 25s+ in production. Province + directory work. 80 SEO pages currently broken.

- [ ] Reproduce with `next start` local + curl
- [ ] If local hang → strip page to bare minimum, re-add piece by piece
- [ ] If local works → compare Vercel runtime config (region, maxDuration, Supabase pool)
- [ ] Ship fix; verify 80 profile URLs return 200 in <2s

---

### v1.14.0 — Lote-level data activation
**Effort:** 4-6 hours | **Impact:** High (B2B differentiator)

The pipeline is built (v1.12.0) but `mag_consignatarias` master is empty and `mag_consignataria_sales_lots` has 0 rows.

- [ ] Trigger `mag-lots-discover.yml` (workflow_dispatch) — populates 44 consignatarias
- [ ] Run `mag-lots-pipeline.yml` for current week (88 jobs × 65s = ~95 min)
- [ ] Accumulate 2-4 weeks of lote-level data
- [ ] `/api/lots` endpoint already exists — surface in `/api-docs` as Enterprise differentiator
- [ ] Bonus: vientres preñadas scraper from remates calendar with catálogo público
- [ ] New SEO landing `/mercado/vientres` if vientres data lands

---

### v1.15.0 — Real reports + content moat
**Effort:** 6-10 hours | **Impact:** Medium-High (PRO Usuario conversion)

Reports system shipped (v1.10.0) but `public/reports/*.pdf` are placeholders. Real content drives PRO Usuario value.

- [ ] El Corredor Mayo 2026 — real PDF, monthly cadence going forward
- [ ] Oráculo Q2 2026 snapshot — quarterly
- [ ] INMAG historical archive — auto-generated zip from `mag_inmag_history` (2015→hoy)
- [ ] Newsletter integration: PRO Usuario receives monthly digest by email (Resend)
- [ ] Track download counts in dashboard (already wired in DB)
- [ ] A/B test: free preview vs full lock — see what converts

---

### v1.16.0 — Derivative indicators (MEMOLA Index family)
**Effort:** 8-12 hours | **Impact:** High (marketing + data product moat)

We have all 16 sub-cats × historical. Build the derivatives that MAG itself doesn't publish.

- [ ] `Liquidation Index` — % cabezas (VACAS Conserva Buena+Inferior) / total faenado. Endpoint + chart on `/mercado/indicadores`
- [ ] `Heaviness Index` — Σ(kg_avg × head_count) / Σ(head_count). Termómetro de mercado.
- [ ] `Quality Premium` — Esp.Joven vs Regular novillo spread
- [ ] `MEMOLA Index` — composite ponderado (already exists, promote)
- [ ] Each gets: API endpoint + landing page + FAQ schema + Speakable
- [ ] Twitter bot post diario: "Hoy: Liquidation Index 67 — presión moderada"
- [ ] Press kit: "Según el MEMOLA Liquidation Index..." citable en notas

---

### v1.17.0 — API ecosystem maturation
**Effort:** 10-15 hours | **Impact:** Medium-High (developer adoption)

Turn the API into a real product, not just a feature.

- [ ] Subdomain `api.consignatarias.com.ar` (clean separation prod/docs)
- [ ] OpenAPI 3.1 spec at `/openapi.json` — auto-generated, downloadable as Postman collection
- [ ] Python SDK (`pip install consignatarias`) + JS/TS SDK (`@memola/consignatarias`) — open source on GitHub
- [ ] Webhook system fully wired: new remate, INMAG change, alert thresholds
- [ ] Status page (UptimeRobot or similar) — public, transparent
- [ ] Migration: `/api-docs` becomes interactive playground (try requests with your key)
- [ ] Discord o GitHub Discussions para devs

---

### v1.18.0 — Pricing + checkout self-serve completeness
**Effort:** 4-6 hours | **Impact:** Medium-High (conversion)

Today: Starter self-serve via Rebill, Growth self-serve via /api/enterprise/upgrade, Scale sales-led. International users have no path.

- [ ] **"Lite" tier USD 29/mes** between free and Starter (captures Martin-segment: 200 req/mes, no SLA, ideal for early-stage devs)
- [ ] Self-serve Growth (already wired, polish UI flows in `/enterprise`)
- [ ] Stripe integration para tarjetas internacionales USD (Argentina-only Rebill no alcanza para global)
- [ ] Volume calculator transparente en `/enterprise` (ya existe, agregar comparativa "vs build your own scraper")
- [ ] Annual prepay con 15% descuento real (no solo en docs)
- [ ] Refund policy explícita

---

### v1.19.0 — Marketing + traffic capture
**Effort:** Ongoing | **Impact:** High (organic growth)

The product is built. Now drive demand.

- [ ] Content series: "INMAG en dólares — análisis 2026" en LinkedIn + Twitter, basado en /mercado/inmag-dolares
- [ ] 6 más `/precios/[X]` landings: `precio-de-la-carne`, `cuanto-cuesta-un-novillo`, `valorizar-rodeo`, etc.
- [ ] Embed widget público para Sociedades Rurales: iframe con últimos precios + branding "powered by consignatarias.com.ar"
- [ ] AI search optimization: `llms.txt`, `robots.txt` para GPTBot, ClaudeBot, PerplexityBot, GoogleAI
- [ ] Founder profiles editorial (`/nini-editorial` template adaptado)
- [ ] Press outreach: La Nación campo, Clarín rural, Bichos de Campo, agritotal
- [ ] Twitter bot diario: precios + INMAG + 1 indicador derivado
- [ ] Newsletter dev: pitch a /r/agtech, /r/Argentina, IndieHackers

---

### v1.20.0 — First Revenue Milestone

**Trigger:** USD 2.000+ MRR sostenido 30 días across tiers

**Most likely paths to first dollars:**
1. **Martin Apesteguia** convertido de Starter trial → Growth pago (USD 500/mes) si su app crece
2. **Frigorífico o banco** vía Enterprise Sales (cold outreach con MEMOLA Index pitch)
3. **Agtech startup** descubre `/api-docs` vía Google → checkout Starter
4. **Roxom TV / NINI clients** indirect: vienen del network Jose
5. **Consignataria** convertida desde el directorio (PRO Consignataria $45K)

**Celebración:**
- Tag `v1.20.0` con full changelog
- Case study público + testimonial
- Update README hero stats
- Foto del primer pago en Rebill dashboard

---

## Post-v1.20 Horizon (v2.x and beyond)

### v2.0 — Transaction Layer Foundation
- Inicial: ganado.com.ar subdomain
- P2P marketplace consignataria ↔ comprador
- Transaction fees 1-2%
- Escrow integrado

### v2.1 — PWA + Mobile-first
- Service worker para offline
- Push notifications: new remates, INMAG changes, quota alerts
- "Add to home screen" prompt
- App store equivalent via TWA (Trusted Web Activity)

### v2.2 — Forecasting + ML
- Predicción INMAG (statistical, not ML al principio: EWMA + seasonal naive)
- Forecast volume per consignataria
- Anomaly detection: "esta semana es atípica porque..."

### v2.3 — Multi-market expansion
- Uruguay (similar mercado, datos públicos)
- Paraguay (entrada market intelligence)
- Brasil (Mato Grosso do Sul para Mercosur)

### v2.4 — Vertical integration con Memola Medios
- Suizo Argentina, Lossada, Urunday casos: data behind their content
- White-label dashboards for Memola B2B clients

### v2.5 — Acquisition / strategic exit
- Aleph, S&P Global, IHS Markit, Reuters — el universo de data infra ag
- Valuation: 5-10x ARR si llegamos a USD 50K MRR

---

## Priority Matrix (v1.13 → v1.20)

```
                       HIGH IMPACT
                            │
   ┌────────────────────────┼─────────────────────────┐
   │                        │                         │
   │ 1.13.1 Slug fix        │ 1.16 Indicators         │
   │ (1-3h, blocker)        │ (8-12h)                 │
   │                        │                         │
   │ 1.18 Pricing/checkout  │ 1.17 API ecosystem      │
   │ completeness (4-6h)    │ (10-15h)                │
   │                        │                         │
LOW│                        │                         │HIGH
EFFORT ─────────────────────┼─────────────────────────EFFORT
   │                        │                         │
   │ 1.15 Real reports      │ 1.14 Lote-level         │
   │ (6-10h)                │ activation (4-6h)       │
   │                        │                         │
   │                        │ 1.19 Marketing          │
   │                        │ (ongoing)               │
   └────────────────────────┼─────────────────────────┘
                            │
                       LOW IMPACT
```

**Recommended sequence:**
1. **v1.13.1** — unblock slug pages (production hygiene, can't ship anything else credibly until this)
2. **v1.14.0** — lote-level activation (cheap, immediate B2B differentiator)
3. **v1.16.0** — indicators (marketing fuel + data product moat)
4. **v1.18.0** — pricing completeness (closes Martin-segment + international)
5. **v1.17.0** — API ecosystem (scales developer adoption)
6. **v1.15.0** — real reports (PRO Usuario value retention)
7. **v1.19.0** — marketing (continuous, runs in parallel from v1.14)
8. **v1.20.0** — revenue milestone

Marketing (1.19) is the only one that runs *concurrently* with everything else, not sequentially.

---

## Success Metrics for v1.20.0

| Metric | v1.13.0 (now) | v1.20.0 (target) |
|---|---|---|
| MRR (USD) | $0 | $2.000+ |
| Enterprise customers | 1 (Jose, comp) | 5+ paying |
| PRO Usuario customers | 0 paying | 10+ paying |
| PRO Consignataria customers | 0 paying | 1+ paying |
| API requests/mes (auth'd) | ~50 (testing) | 100K+ |
| Lote-level rows persisted | 0 | 50K+ |
| /mercado/inmag-dolares CTR (Google) | TBD | 5%+ from #1 rankings |
| Public GitHub stars (SDK) | 0 | 50+ |
| Twitter followers (bot) | 0 | 500+ |
| Self-serve checkout conversion rate | unmeasured | 8%+ |
| Days to first dollar | 0 | <60 from v1.13.1 ship |

---

## Timeline Estimate

| Week | Milestone | Focus |
|---|---|---|
| 1 | v1.13.1 + v1.14.0 | Unblock slugs, activate lote-level |
| 2 | v1.16.0 | Indicators MEMOLA family |
| 3 | v1.18.0 + v1.15.0 | Pricing completeness + first real reports |
| 4-5 | v1.17.0 | API ecosystem (SDKs, OpenAPI, webhooks) |
| 6-7 | v1.19.0 | Marketing push begins |
| 8-12 | **v1.20.0** | First USD 2K MRR |

---

## The Real Bottleneck (Updated)

**Code is not the bottleneck. Developer adoption is.**

The platform is built. What's missing now:
- **First 5 Enterprise customers** — Martin's app gets traction + 4 más por outreach
- **First piece of organic traffic** que convierta `/precios/*` o `/mercado/inmag-dolares` en signups
- **First public case study** que destranque outreach a frigoríficos, bancos, traders

Every feature from here optimizes funnel, but **someone has to write to Martin tomorrow, contestar el email pendiente, agendar 5 calls con frigoríficos exportadores**.

---

## Open Strategic Questions

1. **¿Lite tier USD 29 sí o no?** Captura "developer chico" segment (mochileros, agtech 1-person, consultora chica) pero diluye Starter. Pros: lowers friction para primer paying user, baja CAC. Cons: 80% margen vs 95% margen, requiere otra columna en `/enterprise`, riesgo de canibalización si vienen Starters reales que se conformarían con Lite.

2. **¿Stripe vs solo Rebill?** Argentina-only es limitante para developer audience global. Pero Stripe add: integración nueva, webhooks duplicados, cumplimiento USD billing arg. Punto medio: lanzar SOLO Rebill hasta v1.18, ahí evaluar.

3. **¿Open source los SDKs?** Pros: GitHub stars, dev mindshare, "trustability" del data product. Cons: ningún competidor puede correr el server pero sí copiar el cliente, no es moat real. Yo opinaría sí, agresivamente — los SDKs son distribución pura.

4. **¿Comprar `consignataria.com.ar`** (sin S) para evitar typo-poaching? Mid-priority, USD 200-500 si está libre, ROI claro a partir de 1K visitas/mes.

5. **¿Newsletter dedicado al data product** (tipo Substack "Argentina Cattle Weekly") con el INMAG en USD + indicators + comparativa internacional? 500-1000 subs target a 6 meses. Vehículo de marketing + lead gen para Enterprise. Decisión sobre si lo arma Jose o se contrata escritor externo.

---

*Roadmap reescrito: 13 de mayo 2026.*
*Anterior versión: v1.9.7 → v2.0 (now obsolete).*
*Estimated effort total: 40-60 horas de desarrollo a lo largo de 8-12 semanas.*
*Bloqueador real: outreach a primeros 5 customers (Jose domain).*
