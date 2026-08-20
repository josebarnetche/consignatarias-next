import marketData from '@/lib/data/market-prices.json'
import { fetchChicagoCattle } from '@/lib/markets/chicago'

// Public, machine-readable daily price snapshot (CC-BY) — a crawlable citation surface
// for agents / answer engines. Mirrors the llms.txt route: regenerated on each daily data
// rebuild (the data JSON is committed daily → Vercel rebuild). Honest by construction:
// `as_of` comes from the data, never Date.now(), so it never claims false freshness.
// Scope-isolated from the paid feed: ONLY today's 6-category snapshot + INMAG + USD blue +
// the Chicago (CME) reference — NO historical series, NO 16 sub-categories, NO lote data
// (those stay behind /api/precios). The CME block fails soft: if Yahoo is down it is omitted,
// never faked.
export const dynamic = 'force-static'
export const revalidate = 86400

export async function GET() {
  const inmag = marketData.inmag as { current: number; prev: number; change: number; unit?: string; series?: Array<{ date: string }> }
  const lastDate = inmag.series?.[inmag.series.length - 1]?.date ?? marketData.lastUpdate
  const categories = marketData.categories as Record<string, { current: number; prev: number; change: number }>
  const usd = marketData.usdBlue as { current: number; change: number; unit?: string; source?: string }

  // Referencia internacional: futuros de Chicago en USD/kg vivo + la brecha contra el novillo
  // local convertido al blue. Si el proveedor no responde, el bloque no se emite.
  const chicago = await fetchChicagoCattle()
  const r2 = (n: number) => Math.round(n * 100) / 100
  const r1 = (n: number) => Math.round(n * 10) / 10
  const inmagUsd = usd.current > 0 ? r2(inmag.current / usd.current) : null
  const live = chicago.liveCattle
  const cme =
    live || chicago.feederCattle
      ? {
          live_cattle: live
            ? {
                value: r2(live.usdPerKg),
                change_pct: live.changePct === null ? null : r1(live.changePct),
                unit: 'USD/kg vivo',
                symbol: live.symbol,
                as_of: live.asOf,
              }
            : null,
          feeder_cattle: chicago.feederCattle
            ? {
                value: r2(chicago.feederCattle.usdPerKg),
                change_pct:
                  chicago.feederCattle.changePct === null ? null : r1(chicago.feederCattle.changePct),
                unit: 'USD/kg vivo',
                symbol: chicago.feederCattle.symbol,
                as_of: chicago.feederCattle.asOf,
              }
            : null,
          brecha_novillo_pct:
            live && inmagUsd ? r1((inmagUsd / r2(live.usdPerKg) - 1) * 100) : null,
          source: 'CME Group vía Yahoo Finance (cotización diferida ~10 min)',
          method: 'Centavos por libra a dólares por kilo vivo: (¢/lb ÷ 100) × 2,2046226',
          note: 'brecha_novillo_pct compara el INMAG del día convertido al dólar blue venta contra el Live Cattle de Chicago.',
        }
      : null

  const body = {
    schema: 'https://consignatarias.com.ar/precios.json',
    as_of: lastDate,
    license: 'CC-BY-4.0',
    license_url: 'https://creativecommons.org/licenses/by/4.0/',
    attribution: 'INMAG (Mercado Agroganadero Argentino), vía consignatarias.com.ar',
    source: 'Mercado Agroganadero de Cañuelas (ex-Liniers)',
    citation: `INMAG (Mercado Agroganadero Argentino), vía consignatarias.com.ar, ${lastDate}`,
    unit: 'ARS/kg vivo',
    inmag: {
      value: inmag.current,
      prev: inmag.prev,
      change_pct: inmag.change,
      unit: inmag.unit ?? '$/kg vivo',
      value_usd: inmagUsd,
      value_usd_note: 'INMAG convertido al dólar blue venta del día',
    },
    categorias: Object.entries(categories).map(([categoria, v]) => ({
      categoria,
      precio_kg: v.current,
      prev: v.prev,
      change_pct: v.change,
      moneda: 'ARS',
    })),
    usd_blue: {
      value: usd.current,
      change_pct: usd.change,
      unit: usd.unit ?? 'ARS',
      source: usd.source ?? null,
    },
    ...(cme ? { cme } : {}),
    note: 'Snapshot del día — sin serie histórica. La serie completa y las 16 subcategorías son el feed Enterprise (/api/precios).',
  }

  return new Response(JSON.stringify(body, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}
