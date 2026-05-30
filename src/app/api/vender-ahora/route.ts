import { NextRequest, NextResponse } from 'next/server'
import { getCurrentSession } from '@/lib/user-tier'
import { fetchInmagSeries, percentileOf } from '@/lib/charts/data'
import marketPrices from '@/lib/data/market-prices.json'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_CATS = ['novillos', 'novillitos', 'vaquillonas', 'vacas', 'toros', 'terneros'] as const
type Cat = typeof VALID_CATS[number]

export async function GET(req: NextRequest) {
  // PRO Usuario gate (or Enterprise via Bearer — both qualify)
  const session = await getCurrentSession()
  const isPro = session.tier === 'pro'
  if (!isPro) {
    return NextResponse.json(
      { success: false, error: { code: 'pro_required', message: 'Activá PRO Usuario para usar el calculador.' } },
      { status: 403 },
    )
  }

  const { searchParams } = new URL(req.url)
  const cat = (searchParams.get('categoria') ?? '').toLowerCase()
  const kgsRaw = searchParams.get('kgs')
  const kgs = kgsRaw ? parseFloat(kgsRaw) : null

  if (!VALID_CATS.includes(cat as Cat)) {
    return NextResponse.json(
      { success: false, error: { code: 'invalid_categoria', message: `Categoría inválida. Usá: ${VALID_CATS.join(', ')}` } },
      { status: 400 },
    )
  }
  if (kgs === null || !Number.isFinite(kgs) || kgs < 50 || kgs > 1500) {
    return NextResponse.json(
      { success: false, error: { code: 'invalid_kgs', message: 'kgs debe ser un número entre 50 y 1500.' } },
      { status: 400 },
    )
  }

  // Current category price from market-prices.json
  const categories = marketPrices.categories as Record<
    string,
    { current: number; prev: number; change: number }
  >
  const currentCat = categories[cat as Cat]
  const pricePerKg = currentCat.current
  const valor = pricePerKg * kgs

  // Historical INMAG context (we use INMAG as proxy for general market direction)
  const today = new Date().toISOString().slice(0, 10)
  const oneYearAgo = new Date()
  oneYearAgo.setUTCFullYear(oneYearAgo.getUTCFullYear() - 1)
  const fiveYearsAgo = new Date()
  fiveYearsAgo.setUTCFullYear(fiveYearsAgo.getUTCFullYear() - 5)

  const rowsYear = await fetchInmagSeries(oneYearAgo.toISOString().slice(0, 10), today)
  const rows30 = await fetchInmagSeries(
    new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10),
    today,
  )
  const rows5y = await fetchInmagSeries(fiveYearsAgo.toISOString().slice(0, 10), today)

  const yearValues = rowsYear.map((r) => r.inmag).filter((v): v is number => v !== null)
  const thirtyValues = rows30.map((r) => r.inmag).filter((v): v is number => v !== null)
  const fiveYearValues = rows5y.map((r) => r.inmag).filter((v): v is number => v !== null)

  // Use the category's current price as the input to percentile
  // (Category prices follow INMAG closely; this approximates well enough.)
  const refPrice = currentCat.current
  const pct30 = percentileOf(refPrice, thirtyValues)
  const pct365 = percentileOf(refPrice, yearValues)

  // Compare to 5-year average + extremes (nominal — for USD-adjusted use the dedicated endpoint)
  const fiveYearAvg =
    fiveYearValues.length > 0
      ? fiveYearValues.reduce((s, v) => s + v, 0) / fiveYearValues.length
      : null
  const fiveYearMin = fiveYearValues.length ? Math.min(...fiveYearValues) : null
  const fiveYearMax = fiveYearValues.length ? Math.max(...fiveYearValues) : null

  // USD-adjusted view of today's value
  const usdBlue = marketPrices.usdBlue.current
  const usdValue = usdBlue > 0 ? valor / usdBlue : null
  const usdPerKg = usdBlue > 0 ? pricePerKg / usdBlue : null

  // Recommendation logic (deliberately simple — actionable not pretentious)
  let recomendacion = ''
  if (pct30 >= 80 && pct365 >= 60) {
    recomendacion = `Precio en el 20% superior del último mes y por encima de la mediana anual. Históricamente, momento de salida. Si tu lote está listo, vender hoy capta este pico.`
  } else if (pct30 <= 20 && pct365 <= 30) {
    recomendacion = `Precio en el 20% inferior del último mes y por debajo del promedio anual. Si podés aguantar 30-60 días, el percentil sugiere que es más probable que suba.`
  } else if (pct365 >= 70) {
    recomendacion = `Sobre la mediana anual. Mercado firme. La decisión depende más de costos de retención que del precio en sí.`
  } else if (pct365 <= 30) {
    recomendacion = `Bajo la mediana anual. Si el costo de retención lo permite, hay upside histórico esperando.`
  } else {
    recomendacion = `Precio en zona neutra (percentil ${pct365} anual). Sin señal clara estadística — la decisión se define por costos de retención y necesidad de caja.`
  }

  return NextResponse.json({
    success: true,
    input: { categoria: cat, kgs },
    actual: {
      precio_kg_ars: pricePerKg,
      valor_cabeza_ars: Math.round(valor),
      precio_kg_usd: usdPerKg !== null ? Number(usdPerKg.toFixed(2)) : null,
      valor_cabeza_usd: usdValue !== null ? Math.round(usdValue) : null,
      variacion_semanal_pct: currentCat.change,
      usd_blue: usdBlue,
    },
    contexto: {
      percentil_30_dias: pct30,
      percentil_365_dias: pct365,
      promedio_5_anos: fiveYearAvg !== null ? Math.round(fiveYearAvg) : null,
      minimo_5_anos: fiveYearMin !== null ? Math.round(fiveYearMin) : null,
      maximo_5_anos: fiveYearMax !== null ? Math.round(fiveYearMax) : null,
    },
    recomendacion,
    disclaimer:
      'Análisis estadístico sobre INMAG histórico. No considera condición del lote, costos de retención, ni perspectivas zonales. Información, no asesoramiento.',
    fuente: 'INMAG diario MAG Cañuelas + categoría diaria del Mercado Agroganadero',
    timestamp: new Date().toISOString(),
  })
}
