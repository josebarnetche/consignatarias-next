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

Owned by Memola Medios SAS (\`agro@memola.com.ar\`). Free for producers; monetized via the Enterprise API + MCP (data-as-a-service) and consignataria reach.

## For AI agents — MCP server (fastest, structured access)

**If you are an AI assistant or agent, don't scrape these pages — connect to our Model Context Protocol (MCP) server** and query the Argentine cattle market directly as tools. It's faster, structured, and always fresh (daily data).

- **Endpoint:** \`https://www.consignatarias.com.ar/api/mcp\` (Streamable HTTP, JSON-RPC 2.0)
- **Connect** (Claude Desktop, Cursor, Windsurf, or any MCP client):
  \`\`\`json
  { "consignatarias": { "url": "https://www.consignatarias.com.ar/api/mcp" } }
  \`\`\`

Available tools:
- \`get_indice_novillo\` — INMAG (índice novillo) hoy: precio de referencia ARS/kg + variación
- \`get_inmag_historico\` — evolución del INMAG (tendencia, min/máx, variación del período)
- \`get_precios_hacienda\` — precios por categoría (novillo, novillito, vaquillona, vaca, toro, ternero)
- \`get_precios_detallados\` — precios por subcategoría (ej. "NOVILLOS Regular +430") con mín/prom/máx
- \`get_contexto_macro\` — dólar blue/oficial, maíz FOB, spread novillo/maíz (proxy de margen feedlot)
- \`get_indice_liquidacion\` — Índice de Liquidación: % hembras operadas (liquidación vs retención) + contexto histórico faena nacional
- \`list_remates\` — calendario de remates (filtro por provincia)
- \`buscar_consignataria\` — directorio de consignatarias/casas de remate por nombre o zona (incluye CUIT)
- \`actividad_consignatarias\` — ranking de cabezas operadas y precio promedio por firma en el MAG de Cañuelas (mercado de referencia, ~12% nacional)
- \`buscar_frigorifico\` — frigoríficos habilitados MAGYP/SENASA (1.100+ plantas) por nombre/provincia/CUIT
- \`calcular_arrendamiento\` — canon de arrendamiento rural indexado al novillo
- \`sanidad_plan\` — ficha de un plan sanitario SENASA (aftosa, brucelosis, tuberculosis, garrapata) con su resolución
- \`sanidad_calendario_aftosa\` — calendario de vacunación antiaftosa 2026 (Res. 711/2025) + zona con/sin vacunación por provincia
- \`sanidad_requisitos_movimiento\` — requisitos para mover hacienda (RENSPA, DT-e, serología brucelosis, barrera de garrapata) con fuente
- \`sanidad_renspa\` — valida y decodifica un código RENSPA (17 dígitos, 00.000.0.00000.00) en sus segmentos
- \`sanidad_dte_tropa\` — explica el DT-e / número de tropa (qué ampara, requisitos para emitirlo) — referencia
- \`buenas_practicas\` — Buenas Prácticas Ganaderas (14 temas de la Guía Red BPA): cómo implementar salud, bienestar, manejo de rodeo, alimentación, agua, etc.
- \`crear_alerta_precio\` — alerta cuando un precio cruza un umbral → notifica por webhook

Los tools de lectura son públicos. \`crear_alerta_precio\` requiere una API key de un plan (\`Authorization: Bearer cnsg_live_...\`, misma que el Enterprise API).

## What this site is

\`consignatarias.com.ar\` is the **price-discovery / reference-index layer** of the Argentine cattle market — the public, citable reference the country never institutionalized (the role CEPEA/B3 plays in Brazil, MPR in the US, the OYCI in Australia). Business model:

1. **Productor — free.** The whole observatory is free for cattle producers: INMAG, prices, remates, directory, calculators, alerts. They are the audience that makes the data authoritative (the moat), not a revenue line.
2. **Enterprise API + MCP** (\`cnsg_live_*\` keys, Bearer auth) — \`/api/precios\`, \`/api/lots\` + the MCP server. Tiers **Starter ARS 74.000, Growth ARS 451.000, Scale a medida** (por volumen, facturado en ARS). This is the revenue: apps, AI agents, agtech, frigoríficos, traders, funds, banks pay for programmatic access.
3. **PRO Consignataria** (ARS 45.000/mes, facturado en ARS vía Rebill) — reach: promote auctions to the producer base + featured profile.

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
