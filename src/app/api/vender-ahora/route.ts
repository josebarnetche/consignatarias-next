import { NextRequest, NextResponse } from 'next/server'
import { getCurrentSession } from '@/lib/user-tier'
import { fetchInmagUsdJoined, percentileOf } from '@/lib/charts/data'
import marketPrices from '@/lib/data/market-prices.json'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_CATS = ['novillos', 'novillitos', 'vaquillonas', 'vacas', 'toros', 'terneros'] as const
type Cat = typeof VALID_CATS[number]

export async function GET(req: NextRequest) {
  const session = await getCurrentSession()

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

  // Precio actual de la categoría (nominal, hoy) — el valor del lote.
  const categories = marketPrices.categories as Record<
    string,
    { current: number; prev: number; change: number }
  >
  const currentCat = categories[cat as Cat]
  const pricePerKg = currentCat.current
  const valor = pricePerKg * kgs

  const usdBlue = marketPrices.usdBlue.current
  const usdValue = usdBlue > 0 ? valor / usdBlue : null
  const usdPerKg = usdBlue > 0 ? pricePerKg / usdBlue : null

  const actual = {
    precio_kg_ars: pricePerKg,
    valor_cabeza_ars: Math.round(valor),
    precio_kg_usd: usdPerKg !== null ? Number(usdPerKg.toFixed(2)) : null,
    valor_cabeza_usd: usdValue !== null ? Math.round(usdValue) : null,
    variacion_semanal_pct: currentCat.change,
    usd_blue: usdBlue,
  }

  // Preview gratuito: el valor por cabeza sale de precios ya públicos (/mercado),
  // así que es gratis y sirve de gancho. El análisis estadístico de momento de
  // venta (percentiles + lectura) es la función PRO Usuario.
  const isPro = session.tier === 'pro'
  if (!isPro) {
    return NextResponse.json({
      success: true,
      locked: true,
      input: { categoria: cat, kgs },
      actual,
      teaser:
        'El valor de tu hacienda es gratis. El análisis de si conviene vender hoy —percentil de 30 y 365 días en dólares reales + lectura del mercado— es PRO Usuario.',
      timestamp: new Date().toISOString(),
    })
  }

  // ── Contexto estadístico en DÓLARES REALES (neutraliza la inflación en pesos) ──
  // El percentil nominal en pesos quedaba estructuralmente alto por inflación
  // (el nominal de hoy casi siempre está cerca del techo del rango). Medimos el
  // INMAG / dólar blue (precio real) para que "caro vs barato" sea comparable en
  // el tiempo. El INMAG (novillo) se usa como referencia de dirección del mercado.
  const today = new Date().toISOString().slice(0, 10)
  const fiveYearsAgo = new Date()
  fiveYearsAgo.setUTCFullYear(fiveYearsAgo.getUTCFullYear() - 5)
  const oneYearAgo = new Date()
  oneYearAgo.setUTCFullYear(oneYearAgo.getUTCFullYear() - 1)
  const oneYearAgoIso = oneYearAgo.toISOString().slice(0, 10)
  const thirtyAgoIso = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10)

  const joined = await fetchInmagUsdJoined(fiveYearsAgo.toISOString().slice(0, 10), today)
  const nn = (v: number | null): v is number => v !== null
  const realAll = joined.map((r) => r.inmag_usd).filter(nn)
  const realYear = joined.filter((r) => r.date >= oneYearAgoIso).map((r) => r.inmag_usd).filter(nn)
  const real30 = joined.filter((r) => r.date >= thirtyAgoIso).map((r) => r.inmag_usd).filter(nn)
  const latestReal = realAll.length ? realAll[realAll.length - 1] : null

  const pct30 = latestReal !== null && real30.length ? percentileOf(latestReal, real30) : 0
  const pct365 = latestReal !== null && realYear.length ? percentileOf(latestReal, realYear) : 0

  const avg5 = realAll.length ? realAll.reduce((s, v) => s + v, 0) / realAll.length : null
  const min5 = realAll.length ? Math.min(...realAll) : null
  const max5 = realAll.length ? Math.max(...realAll) : null
  const r2 = (v: number | null) => (v !== null ? Number(v.toFixed(2)) : null)

  // Recomendación — umbrales sobre percentiles REALES (en USD).
  // `veredicto` resume la lectura en una decisión accionable (no un dato suelto).
  let recomendacion = ''
  let veredicto: 'vender' | 'aguantar' | 'neutro' = 'neutro'
  if (pct30 >= 80 && pct365 >= 60) {
    veredicto = 'vender'
    recomendacion = `En dólares reales, el precio está en el 20% más alto del último mes y sobre la mediana anual. Históricamente, momento de salida: si tu lote está listo, vender hoy capta el pico.`
  } else if (pct30 <= 20 && pct365 <= 30) {
    veredicto = 'aguantar'
    recomendacion = `En dólares reales, el precio está en el 20% más bajo del mes y bajo el promedio anual. Si podés aguantar 30-60 días, el percentil sugiere que es más probable que recupere.`
  } else if (pct365 >= 70) {
    veredicto = 'vender'
    recomendacion = `Sobre la mediana anual en términos reales. Mercado firme: la decisión pesa más por costos de retención que por el precio en sí.`
  } else if (pct365 <= 30) {
    veredicto = 'aguantar'
    recomendacion = `Bajo la mediana anual en términos reales. Si el costo de retención lo permite, hay recorrido histórico esperando.`
  } else {
    veredicto = 'neutro'
    recomendacion = `Zona neutra (percentil ${pct365} anual real). Sin señal estadística clara — la decisión la definen costos de retención y necesidad de caja.`
  }

  // Honestidad de precisión: el percentil mide el INMAG (novillo) en USD reales.
  // Para novillo es directo; para el resto de las categorías es DIRECCIONAL
  // (la dirección del mercado se mueve junta, pero el nivel exacto no).
  const esNovillo = cat === 'novillos'
  const precision: 'preciso' | 'indicativo' = esNovillo ? 'preciso' : 'indicativo'

  return NextResponse.json({
    success: true,
    locked: false,
    input: { categoria: cat, kgs },
    actual,
    contexto: {
      base: 'real_usd',
      precision,
      percentil_30_dias: pct30,
      percentil_365_dias: pct365,
      inmag_usd_hoy: r2(latestReal),
      inmag_usd_min_5a: r2(min5),
      inmag_usd_prom_5a: r2(avg5),
      inmag_usd_max_5a: r2(max5),
    },
    veredicto,
    recomendacion,
    disclaimer:
      'Percentiles medidos sobre el INMAG en dólares reales (INMAG ÷ dólar blue) para neutralizar la inflación en pesos. El INMAG (novillo) se usa como referencia de dirección del mercado. No considera condición del lote, costos de retención ni plaza zonal. Información, no asesoramiento.',
    fuente: 'INMAG diario MAG Cañuelas ÷ dólar blue + categoría diaria del Mercado Agroganadero',
    timestamp: new Date().toISOString(),
  })
}
