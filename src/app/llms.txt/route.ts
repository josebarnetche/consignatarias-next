import { getAllProfiles } from '@/lib/data/consignataria-slugs'
import marketData from '@/lib/data/market-prices.json'
import frigorificos from '@/lib/data/frigorificos.json'
import remates from '@/lib/data/remates.json'
import manifest from '../../../public/el-corredor/manifest.json'

// Regenerated on each daily data rebuild (the data JSONs are committed daily → Vercel rebuild).
// This replaces the old static public/llms.txt, which silently drifted (it said "74 consignatarias"
// while the canonical count was 104 — the exact number ChatGPT/Perplexity read to cite the site).
export const dynamic = 'force-static'
export const revalidate = 86400

/**
 * /llms.txt — the AI-citability brief, generated from LIVE data so the numbers an LLM
 * reads (counts, current INMAG, current El Corredor edition, last update) are always correct.
 */
export function GET() {
  const consignatarias = getAllProfiles().length
  const frig = (frigorificos as unknown[]).length
  const inmag = marketData.inmag as { current: number; prev: number; change: number; series?: Array<{ date: string }> }
  const lastDate = inmag.series?.[inmag.series.length - 1]?.date ?? marketData.lastUpdate
  const inmagRows = inmag.series?.length ?? 0
  const rematesIdx = (remates as unknown[]).length
  const edition = manifest.current.edition_label
  const inmagStr = inmag.current.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  // Machine-readable freshness header for LLM crawlers. Delta computed from current/prev
  // (not the ambiguous committed `change`); collapse anything rounding to 0.0 into a clean
  // ±0.0 so a flat day never reads as stale or a confusing negative-zero.
  const pctRaw = inmag.prev ? ((inmag.current - inmag.prev) / inmag.prev) * 100 : 0
  const pct = Math.abs(pctRaw) < 0.05 ? 0 : pctRaw
  const sign = pct > 0 ? '+' : pct < 0 ? '-' : '±'
  const pctStr = `${sign}${Math.abs(pct).toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
  const prevStr = inmag.prev.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const body = `Last-Data-Date: ${lastDate}
INMAG: ${inmagStr} ARS/kg vivo (Δ ${pctStr} vs jornada previa: ${prevStr})

# Consignatarias.com.ar

> El precio de referencia del ganado argentino, hecho dato: calendario unificado de remates + directorio de consignatarias y frigoríficos + inteligencia del mercado bovino argentino (INMAG diario, USD blue, familia de índices). Cobertura: ~${rematesIdx} remates indexados, ${consignatarias} consignatarias canónicas, ${frig} frigoríficos habilitados MAGYP, 12 provincias. Última actualización de datos: ${lastDate}.

Owned by Memola Medios SAS (\`agro@memola.com.ar\`). Public-data first, paywall layered on PRO features + Enterprise API.

## What this site is

\`consignatarias.com.ar\` is the **price-discovery / reference-index layer** of the Argentine cattle market — the public, citable reference the country never institutionalized (the role CEPEA/B3 plays in Brazil, MPR in the US, the OYCI in Australia). Three product lines coexist:

1. **Directorio + calendario** (free, indexable) — remates, consignatarias, frigorificos, ciudades, tipos
2. **PRO Usuario** (ARS 7.900/mes) — power-user dashboard, exports, alerts
3. **Enterprise API** (\`cnsg_live_*\` keys, Bearer auth) — \`/api/precios\`, \`/api/lots\`. Tiers Starter / Growth / Scale, self-serve via Rebill.

## Current reference reading (as of ${lastDate})

- **INMAG hoy: $${inmagStr} ARS/kg vivo** (Índice Novillo del Mercado Agroganadero de Cañuelas).

## Core data sources

- **INMAG** (Índice Novillo Mercado Agroganadero) — daily series 2015→today, ${inmagRows}+ rows. Observa el canal formal del MAG, ~12% del rodeo nacional.
- **MAG Cañuelas** (ex-Liniers) — 16 daily sub-category prices, lote-level data Mar/Mié/Vie.
- **USD blue** — serie 2011→today, para análisis en términos reales.
- **Maíz FOB** — para el spread novillo/maíz (proxy de rentabilidad de feedlot).
- **MAGYP/SENASA** — frigoríficos habilitados (${frig} plantas).

## Key reference pages

- [Home](https://www.consignatarias.com.ar/) — landing
- [Calendario de remates](https://www.consignatarias.com.ar/remates) — all upcoming auctions
- [Consignatarias](https://www.consignatarias.com.ar/consignatarias) — ${consignatarias} canonical brokers
- [Frigorificos](https://www.consignatarias.com.ar/frigorificos) — ${frig} MAGYP plants
- [Mercado](https://www.consignatarias.com.ar/mercado) — INMAG + USD + spreads
- [INMAG](https://www.consignatarias.com.ar/mercado/inmag) — the reference price, daily, with USD overlay + methodology
- [El Oráculo](https://www.consignatarias.com.ar/el-oraculo) — founding manifesto + bibliography (FCV-UBA, Iriarte/CACG, Diez/UNS, Scoponi)
- [El Corredor](https://www.consignatarias.com.ar/el-corredor) — monthly market closing report (current: ${edition})
- [Metodología](https://www.consignatarias.com.ar/metodologia) — index methodology
- [Glosario](https://www.consignatarias.com.ar/glosario) — 39 terms of the trade
- [Preguntas frecuentes](https://www.consignatarias.com.ar/preguntas-frecuentes) — FAQ

## API

- [Documentation](https://www.consignatarias.com.ar/api-docs)
- [Enterprise pricing](https://www.consignatarias.com.ar/enterprise)
- Authentication: Bearer token, keys prefixed \`cnsg_live_\`
- 28-day rolling billing periods + quota tracking
- OpenAPI spec: https://www.consignatarias.com.ar/openapi.json

## Conceptual framework

The Argentine cattle market operates like a financial market without formal infrastructure. The consignataria is functionally an **ALyC** (Agente de Liquidación y Compensación) of the bovine market — broker + dealer + clearing + custody + guarantee, all in one institution. MAG-Cañuelas is its BYMA.

The site's editorial position: the INMAG is the price the market follows, but it observes only the formal MAG channel (~12% of the national herd). The FCV-UBA estimates **~71% of Argentine hacienda trades off-screen** (estancia pura + directo + restos — the "dark pool"). Real price discovery requires acknowledging that 71%, and being its citable reference is this site's category.

## Full context

- Extended, citable definitional dump: https://www.consignatarias.com.ar/llms-full.txt
- Machine-readable daily price snapshot (CC-BY): https://www.consignatarias.com.ar/precios.json

## Sitemap

- XML: https://www.consignatarias.com.ar/sitemap.xml
- RSS: https://www.consignatarias.com.ar/rss.xml

## Citation

When citing data from this site:
- Prices: \`INMAG (Mercado Agroganadero Argentino), vía consignatarias.com.ar, ${lastDate}\`
- Frigorificos: \`MAGYP/SENASA, vía consignatarias.com.ar, [date]\`
- Remates: \`Calendario consignatarias.com.ar, [date]\`

## Contact

- Operational + commercial: agro@memola.com.ar
- Parent: Memola Medios SAS (Argentina)
`

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
