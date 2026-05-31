# SEO Opportunities — consignatarias.com.ar

**Date:** 2026-05-31
**Scope:** Traditional Google organic search (distinct from AI/GEO).
**Method:** Grounded in the actual repo (routes, `src/lib/data/*`, Supabase tables) + web-search demand validation against the real Argentine cattle SERP.
**Premise that shapes everything below:** the platform's moat is *data it already owns and refreshes daily* (INMAG 2244 rows since 2015, 16 MAG sub-categories, USD blue 5621 rows, provinceEntry, 436 remates with locality/type, 1090 frigoríficos). The win is converting that data into **page templates** Google can index, not writing one-off articles.

---

## 0. Where the site already stands (baseline)

Confirmed by web search, the site **already ranks** for two of the hardest, highest-value head terms:
- `/mercado/inmag` surfaces for *"precio novillo Liniers/INMAG"* alongside El Rural, Agrofy, MAGYP.
- `/mercado/arrendamiento` surfaces at #1-ish for *"índice novillo arrendamiento"*, beating the niche single-purpose competitors `indicenovilloarrendamiento.com` and El Rural.
- `/remates/mes/abril` and individual remate pages already rank for *"calendario remates 2026"* / *"feria Corrientes"*.

This is the proof the data-as-pages thesis works. **The gap is breadth: the site has the head terms but is leaving the long tail (geo × category × time) almost entirely unbuilt.** That long tail is where the volume actually lives and where incumbents (Agrofy, deCampoaCampo, Rosgan, El Rural) are weak because none of them generate it programmatically from a clean daily feed.

### Competitive map (who ranks today, per cluster)
| Cluster | Incumbents that rank | Their weakness |
|---|---|---|
| Precio novillo / INMAG | El Rural, Agrofy News, MAGYP PDFs, LA NACION campo | Static PDFs, no historical pages, no per-category landing, no answer snippet |
| Precio invernada / ternero | deCampoaCampo, Rosgan, CACG, Monasterio-Tattersall, Alzaga Unzué, Informe Ganadero | Each is a single feria's price list; no national aggregate, no geo breakdown |
| Arrendamiento (kg novillo/ha) | indicenovilloarrendamiento.com, El Rural, CADE Tierras, contador blogs | Niche single-page sites, no calculator + live index combined |
| Calendario de remates | ClicRural, Entre Surcos y Corrales, CACG, Rosgan, individual consignataria sites | Fragmented per-source; no national filterable calendar by province/locality/month |
| Glosario / how-to (rinde, cría, invernada) | produccion-animal.com.ar PDFs, Valor Carne, Engormix, CREA, WordReference | Old PDFs and forum threads; no clean, schema-marked answer page |
| Hacienda gorda por zona (Rosario/Santa Fe) | AFA Diario, Agrofy (Mercado Rosario), Rosgan/BCR, Colombo y Colombo | No cross-market comparison page; each is one market's own list |

---

## 1. Programmatic SEO opportunities (new page TEMPLATES from data the site already has)

Ranked by expected ROI. Page-count estimates use real counts from the repo.

### P-1. Precio [categoría] en [provincia] — geo × category price matrix ⭐ TOP PRIORITY
- **URL pattern:** `/precios/[categoria]/[provincia]` → e.g. `/precios/novillos/buenos-aires`, `/precios/terneros/corrientes`, `/precios/vacas/santa-fe`
- **Data source:** `market-prices.json` → `categories` (6 cats with current/prev/change) × `provinceEntry.provinces` (per-province enPie + share); enriched with `remates.json` filtered by province+type for "where to sell near you", and `mag_prices_detailed` (16 sub-cats) for the weight-band table. `existencias-bovinas.json` gives per-province stock context.
- **Page count:** 6 categories × 12–16 provinces with activity ≈ **72–96 pages**.
- **Target query:** *"precio del novillo en Corrientes"*, *"cuánto vale el ternero en Santa Fe"*, *"precio vaca gorda Buenos Aires"* — the exact searches producers make before consigning. Web search confirms producers explicitly compare by zone (Rosario vs Liniers, "0,50–1 peso por encima").
- **Competitive difficulty:** LOW–MEDIUM. No incumbent generates per-province × per-category pages; they publish per-feria lists. This is greenfield long-tail.
- **Why it's #1:** highest intent (pre-transaction), zero programmatic competition, reuses the exact template already proven at `/precios/[categoria]`, and each page naturally links to the relevant remates + consignatarias in that province (internal-link engine).

### P-2. Historical "precio novillo [año]" / "precio novillo [mes] [año]" pages ⭐
- **URL pattern:** `/precios/historico/[año]` and `/precios/[categoria]/historico/[año]` → e.g. `/precios/historico/2023`, `/precios/novillos/historico/2024`
- **Data source:** `mag_inmag_history` (Supabase, **2244 rows, 2015→today**) + `mag-remitentes-history.json` + `market-monthly.json` (2022-01→2024-12 monthly by category) + `usd_blue_history` (to render the same number in USD — a genuine moat nobody else publishes).
- **Page count:** ~11 years × (1 INMAG yearly + 6 category-year) ≈ **70–80 pages**, plus monthly variants ≈ 130 (start with yearly).
- **Target query:** *"precio novillo 2023"*, *"a cuánto estaba el novillo en 2020"*, *"histórico precio hacienda"*, *"precio kilo vivo 2024 en dólares"*. These compound forever — old years keep getting searched, and the site is the *only* source with the daily series back to 2015 AND the USD overlay.
- **Competitive difficulty:** LOW. MAGYP only publishes monthly PDFs; nobody offers a clean indexable year page, and **nobody offers the peso-vs-USD historical view** — that's the unique angle (`/mercado/inmag-dolares` already proves the demand).

### P-3. Remates por localidad (per-locality auction pages) — expand the existing `/remates/ciudad/[ciudad]`
- **URL pattern:** already exists at `/remates/ciudad/[ciudad]`; the opportunity is *depth*, not a new route — currently thin. Add: next 3 auctions, historical auctions held there, consignatarias that operate there, and the local price (province price from P-1).
- **Data source:** `remates.json` → **181 unique `location` values**, `consignatariaSlug`, `type`, `date`.
- **Page count:** **~181 locality pages** (already in sitemap via `getUniqueCitySlugs`) — under-built, not non-existent.
- **Target query:** *"remate feria en Villaguay"*, *"remates de hacienda en Mercedes Corrientes"*, *"feria ganado [pueblo]"*. Web search shows producers search by town + "feria".
- **Competitive difficulty:** LOW. ClicRural/Entre Surcos list nationally but rarely have an indexable per-town page with future + past + who-operates-here.

### P-4. Comparación de frigoríficos por provincia / ranking
- **URL pattern:** `/frigorificos/[provincia]` already exists as a list; add `/frigorificos/[provincia]/habilitados-exportacion` and a comparison/ranking template.
- **Data source:** `frigorificos.json` (**1090 rows**: cuit, name, matricula, province, stage, senasaActive) + `senasa-habilitados.json` (592 KB, export habilitación detail) + `frigorificos-enriched.json`.
- **Page count:** 22 provinces × (general + export-habilitado filter) ≈ **30–44 pages**, plus the 1090 individual profiles already in sitemap (under-optimized).
- **Target query:** *"frigoríficos habilitados exportación [provincia]"*, *"frigorífico en [provincia] SENASA"*, *"frigoríficos que compran hacienda en [zona]"*.
- **Competitive difficulty:** MEDIUM. SENASA publishes raw lists; nobody offers filterable, province-segmented, export-vs-consumo comparison pages. Strong B2B intent (sellers looking for buyers).

### P-5. Per-consignataria performance pages — LONG PLAY (data not yet live)
- **URL pattern:** `/consignatarias/[slug]/resultados` or `/consignatarias/[slug]/precios`
- **Data source:** `mag_consignataria_sales_lots` (lote-level: pesada × remitente × categoría). **⚠ Currently 0 rows** — `mag_scrape_queue` has 768 pending jobs. This template cannot ship until the pipeline runs (ROADMAP v1.15.0).
- **Page count:** 74 canonical consignatarias × performance view ≈ **74 pages**, once data lands.
- **Target query:** *"resultados remate [consignataria]"*, *"precios que pagó [consignataria]"*, *"[consignataria] cuánto pagó por el novillo"*.
- **Competitive difficulty:** LOW once built (nobody has lote-level aggregated by consignataria) but **gated on the scraper** — list as a long play, not a quick win.

### P-6. Remates [mes] [provincia] combo & "remates esta semana en [provincia]"
- **URL pattern:** `/remates/[provincia]/mes/[mes]` (combine existing `/remates/[provincia]` + `/remates/mes/[mes]`)
- **Data source:** `remates.json` province × date.
- **Page count:** ~12 provinces × 12 months, but only emit combos with auctions ≈ **40–70 live pages** (same filter logic already used for province×type combos).
- **Target query:** *"remates en Corrientes en mayo"*, *"ferias de hacienda julio Buenos Aires"*.
- **Competitive difficulty:** LOW. Reuses proven combo-filtering pattern in `sitemap.ts`.

---

## 2. Content / answer opportunities (single strong page wins, weak incumbents)

These are high-intent queries where the current #1 results are old PDFs (produccion-animal.com.ar), forum threads (WordReference, Agrofy foro), or generic blogs — beatable with one clean, schema-marked page. The `/glosario` and `/preguntas-frecuentes` routes already exist as the home for these.

| Page | Target query | Current weak incumbent | Data/angle |
|---|---|---|---|
| `/calculadora/rinde-gancho` (or glossary entry) | *"cómo se calcula el rinde al gancho"*, *"kg gancho a kg vivo"* | produccion-animal PDFs, Engormix, Valor Carne | Interactive calc + the 58% rule; the `/calculadora` route already exists, add a rinde mode |
| `/mercado/arrendamiento` — deepen | *"cómo calcular arrendamiento ganadero en kg de novillo"* | indicenovilloarrendamiento.com, contador blogs | Already ranks; add the explicit formula (kg/ha × INMAG × ha) + live index + worked example. Pairs the calculator WITH the live number — no competitor does both |
| `/glosario/cria-recria-invernada` | *"qué es cría recría invernada"*, *"diferencia ternero novillito"* | WordReference forum, CREA, academic PDFs | Clean definitional hub; high glossary intent, evergreen |
| `/guias/cuando-vender-hacienda` | *"cuándo conviene vender el novillo"*, *"mejor momento para vender hacienda"* | scattered blog notes | Seasonal/decision guide tied to live INMAG + USD trend + month-of-year stats from the series |
| `/guias/peso-vivo-vs-gancho` | *"venta al peso vivo o al gancho"* | Agrofy News one note | Decision guide; Agrofy ranks but with thin content |
| `/precios/cuanto-vale-un-novillo` (already planned in ROADMAP v1.19) | *"cuánto vale un novillo"*, *"cuánto sale un ternero"* | LA NACION articles (dated) | Answer-first page wired to live `categories` data |
| Seasonal: `/remates/destete` / `/guias/zafra-ternero` | *"zafra de terneros 2026"*, *"época de destete remates"* | Informe Ganadero tags | Tie the seasonal calendar to actual remates data — invernada peaks Mar-May |

**Pattern that wins all of these:** answer the question in the first sentence (Google's snippet), mark up `FAQPageSchema` + `Speakable` (the `JsonLd` component is already imported in `/precios/[categoria]`), and link to the relevant live-data page. The site already does this on `/precios/[categoria]` — replicate the recipe.

---

## 3. Internal linking & site-structure wins

The site has the ingredients of a strong hub-spoke graph but the spokes don't link laterally.

1. **Hub: `/precios`** → should link down to every P-1 geo×category page and every P-2 historical page. Today `/precios/[categoria]` is a flat set of 6; it has no province children and no historical children. Make `/precios` the canonical hub and each category page a sub-hub linking to its provinces + its history.
2. **Cross-link remates ↔ precios ↔ consignatarias by province.** A `/remates/corrientes` page should link to `/precios/novillos/corrientes`, to `/consignatarias/corrientes`, and to `/frigorificos/corrientes`. This province-cluster mesh is the single biggest structural lift — it turns 4 isolated province silos into one interlinked authority cluster per province (×12).
3. **Orphan risk — individual pages.** 1090 frigorífico CUIT pages (priority 0.5) and ~250 remate-detail pages are emitted in the sitemap but likely receive few internal links → crawl-budget waste / orphan pages. Fix: the province list/comparison pages (P-4) and locality pages (P-3) should link to their members. The ROADMAP already noted "80+ serverless invocations of crawler burn" on slug variants — same crawl-economy logic applies to orphaned leaf pages.
4. **Anchor-text diversification.** Internal links currently lean on the entity name. Add descriptive anchors: "precio del novillo en Corrientes", "remates de invernada en mayo", "frigoríficos habilitados para exportación en Santa Fe" — matches the long-tail targets and feeds the target pages their keyword.
5. **Glossary as link magnet.** Every glossary term (cría, invernada, rinde, INMAG, arrendamiento) should be auto-linked on first mention across all data pages → distributes authority to `/glosario` spokes and improves topical depth signals.

---

## 4. Freshness / data-moat plays (recurring auto-updated pages that compound)

The daily cron (`scrape-auctions.yml` 14:00, `mag-detailed-prices.yml` 15:30) already refreshes the underlying data. Turn that freshness into *dated, indexable* recurring pages — Google rewards genuine daily/weekly updates on commodity-price queries, and this is the site's structural advantage over PDF-publishing incumbents.

1. **`/precios/hacienda-en-pie` + all P-1 pages: stamp visible "actualizado [fecha] [hora]"** and `dateModified` schema. Already daily-refreshed; make the freshness legible to crawlers. (`changeFrequency: daily` is set — back it with real dateModified.)
2. **Weekly recap page `/reporte-semanal`** (route exists) → auto-generate a dated "Resumen semanal del mercado: INMAG, variación por categoría, remates de la semana" every Monday. Each week's snapshot can live at `/reporte-semanal/[YYYY-WW]` → an ever-growing archive of indexable weekly recaps (compounds like P-2).
3. **Monthly `/el-corredor/[YYYY-MM]`** archive — the ROADMAP flags the PDFs are placeholders; making each month a real HTML page (not just PDF) creates a monthly compounding archive ranking for "mercado ganadero [mes] [año]".
4. **Derived-index pages (ROADMAP v1.16 — Liquidation Index, Heaviness Index, Quality Premium).** These are *citable, unique metrics nobody else publishes*, computed from `mag_prices_detailed`. A daily-updated `/mercado/indicadores/liquidation-index` is both a freshness play and a press/backlink magnet ("según el índice de liquidación de consignatarias.com.ar…"). High link-equity potential.
5. **`/mercado/inmag-dolares`** (priority 0.95, exists) is the template to clone — the peso-vs-dollar overlay using `usd_blue_history` is the moat. Extend the same USD overlay to P-1 and P-2.

---

## 5. Quick wins vs long plays — prioritized matrix

| # | Opportunity | Section | Impact | Effort | Type |
|---|---|---|---|---|---|
| 1 | **`/precios/[categoria]/[provincia]`** geo×cat matrix (72–96 pp) | P-1 | High | Med | Quick-ish (clone existing template) |
| 2 | **Historical `/precios/[…]/historico/[año]`** (70–130 pp) | P-2 | High | Med | Quick-ish |
| 3 | **Province-cluster internal mesh** (remates↔precios↔consig↔frigo) | §3 | High | Low | **Quick win** |
| 4 | **Freshness stamps + dateModified** on all price pages | §4.1 | Med-High | Low | **Quick win** |
| 5 | **Deepen `/remates/ciudad/[ciudad]`** (181 pp already in sitemap) | P-3 | Med-High | Low | **Quick win** |
| 6 | Answer pages: rinde/gancho, cuándo vender, cría-recría-invernada | §2 | Med-High | Low | Quick win |
| 7 | `/frigorificos/[provincia]` export-filter + comparison | P-4 | Med | Med | Medium |
| 8 | Weekly `/reporte-semanal/[YYYY-WW]` archive | §4.2 | Med | Med | Medium |
| 9 | Derived-index pages (Liquidation/Heaviness/Quality) | §4.4 | High (links) | Med-High | Long |
| 10 | Per-consignataria `/resultados` (gated on lote scraper) | P-5 | High | High | **Long (blocked)** |

### Top 5 to do first
1. **Province-cluster internal mesh (§3.2)** — zero new pages, just links between routes that already exist. Highest impact-per-hour; unblocks the value of everything else by making province silos one cluster. **Do this week.**
2. **`/precios/[categoria]/[provincia]` (P-1)** — the single biggest greenfield long-tail with the highest commercial intent and no programmatic competitor. Clones the proven `/precios/[categoria]` template. ~80 high-value pages.
3. **Historical year pages (P-2)** — compounding, uniquely defensible (daily series since 2015 + USD overlay nobody else has). ~70 pages that keep earning forever.
4. **Freshness stamps + `dateModified` (§4.1)** — trivial effort; flips the site's daily-update advantage into a ranking signal on commodity-price SERPs where incumbents ship stale PDFs.
5. **Deepen the 181 locality pages (P-3)** — pages already exist in the sitemap but are thin; filling them with future+past auctions + local price + who-operates-here captures hyper-local "feria en [pueblo]" intent with near-zero competition.

**Explicitly deferred (don't start yet):** per-consignataria performance pages (P-5) — the `mag_consignataria_sales_lots` table is at 0 rows with 768 queued jobs; build the pipeline first (ROADMAP v1.15.0), then the pages.

---

## Sources (demand validation)
- Precio novillo / INMAG / Liniers: [El Rural](https://www.elrural.com/mercados/ganadero/precios-indicativos/indice-novillo-mercado-de-liniers-precios-indicativos/), [Agrofy News](https://news.agrofy.com.ar/mercado-ganadero/mercado-de-liniers), [MAGYP resumen mensual](https://www.magyp.gob.ar/sitio/areas/bovinos/), [LA NACION campo](https://www.lanacion.com.ar/economia/campo/ganaderia/)
- Precio ternero / invernada: [deCampoaCampo](https://www.decampoacampo.com/__dcac/outside/precios/invernada), [Rosgan](https://www.rosgan.com.ar/precios-rosgan/), [CACG](https://cacg.org.ar/precios), [Monasterio Tattersall](https://www.monasterio-tattersall.com/precios-hacienda), [Alzaga Unzué](https://www.alzagaunzue.com/hacienda/precioInvernada), [Informe Ganadero](https://informeganadero.com.ar/tag/precio-del-ternero/), [De Frente al Campo (US$4,4/kg récord)](https://www.defrentealcampo.com.ar/el-ternero-para-invernada-alcanzo-los-us44-por-kilo-y-marco-el-valor-mas-alto-de-la-historia/)
- Calendario remates / feria por provincia: [El Litoral — Corrientes expande calendario](https://www.ellitoral.com.ar/campo/2026-4-17-17-7-0-ganaderia-con-precios-record-corrientes-expande-su-calendario-de-remates), [ClicRural cartelera](https://clicrural.com.ar/remates/cartelera), [Entre Surcos y Corrales](https://www.entresurcosycorralesya.com/remates-generales.html)
- Arrendamiento en kg de novillo: [indicenovilloarrendamiento.com](https://indicenovilloarrendamiento.com/), [El Rural índice arrendamiento](https://www.elrural.com/historicos/ganadero/indice-novillo-arrendamiento-precios-indicativos/), [Compañía Argentina de Tierras](https://cadetierras.com.ar/estadisticas/valores-orientativos-de-arrendamiento-en-las-principales-zonas-de-cria-del-pais-en-kgs-de-nov-haano-kilos-necesarios-por-vaca-y-por-ternero-destetado), [Contador Andrés Pérez](https://contadorandresperez.com.ar/calculo-arrendamiento-ganadero/)
- Hacienda gorda por zona (Rosario/Santa Fe): [Sociedad Rural de Rosario](https://ruralrosario.org/), [AFA Diario](https://diario.afascl.coop/afaw/precios-hacienda2.vsp), [Agrofy Mercado de Rosario](https://news.agrofy.com.ar/mercado-ganadero/mercado-de-rosario), [BCR Rosgan](https://www.bcr.com.ar/es/mercados/investigacion-y-desarrollo/), [Colombo y Colombo](https://colomboycolombo.com.ar/lotes)
- Glosario cría/recría/invernada: [CREA](https://www.crea.org.ar/6-2-ganaderia/), [produccion-animal.com.ar glosario](https://www.produccion-animal.com.ar/glosarios/04-Vocablos_uso_corriente.pdf)
- Rinde al gancho / peso vivo: [Valor Carne](https://www.valorcarne.com.ar/el-rendimiento-tras-el-desbaste-y-el-dressing/), [produccion-animal rinde](https://www.produccion-animal.com.ar/informacion_tecnica/comercializacion/49-rinde.pdf), [Agrofy peso vivo vs gancho](https://news.agrofy.com.ar/noticia/50132/un-viejo-dilema-venta-al-peso-vivo-o-rendimiento-al-gancho)
- Self-confirmation (site already ranking): consignatarias.com.ar surfaced organically for INMAG, arrendamiento, and calendario-remates queries.
