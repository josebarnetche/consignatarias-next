import marketData from '@/lib/data/market-prices.json'

// Public, machine-readable daily price snapshot (CC-BY) — a crawlable citation surface
// for agents / answer engines. Mirrors the llms.txt route: regenerated on each daily data
// rebuild (the data JSON is committed daily → Vercel rebuild). Honest by construction:
// `as_of` comes from the data, never Date.now(), so it never claims false freshness.
// Scope-isolated from the paid feed: ONLY today's 6-category snapshot + INMAG + USD blue —
// NO historical series, NO 16 sub-categories, NO lote data (those stay behind /api/precios).
export const dynamic = 'force-static'
export const revalidate = 86400

export function GET() {
  const inmag = marketData.inmag as { current: number; prev: number; change: number; unit?: string; series?: Array<{ date: string }> }
  const lastDate = inmag.series?.[inmag.series.length - 1]?.date ?? marketData.lastUpdate
  const categories = marketData.categories as Record<string, { current: number; prev: number; change: number }>
  const usd = marketData.usdBlue as { current: number; change: number; unit?: string; source?: string }

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
    note: 'Snapshot del día — sin serie histórica. La serie completa y las 16 subcategorías son el feed Enterprise (/api/precios).',
  }

  return new Response(JSON.stringify(body, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}
