import { NextRequest, NextResponse } from 'next/server'
import { getCurrentSession } from '@/lib/user-tier'
import { fetchInmagUsdJoined, percentileOf } from '@/lib/charts/data'
import marketPrices from '@/lib/data/market-prices.json'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_CATS = ['novillos', 'novillitos', 'vaquillonas', 'vacas', 'toros', 'terneros'] as const
type Cat = typeof VALID_CATS[number]

const MES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
] as const

const TASTE_COOKIE = 'cnsg_free_verdict'

/** ISO-week key like "2026-W24" — the unit of the free weekly taste. */
function isoWeekKey(d: Date): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const dayNum = (date.getUTCDay() + 6) % 7 // Mon=0 … Sun=6
  date.setUTCDate(date.getUTCDate() - dayNum + 3) // Thursday of this week
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4))
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3)
  const week = 1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * 86400_000))
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

/** Days until next Monday (start of the next ISO week) — for "próxima probada en N días". */
function daysUntilNextWeek(d: Date): number {
  const dow = (d.getUTCDay() + 6) % 7 // Mon=0 … Sun=6
  return 7 - dow
}

export async function GET(req: NextRequest) {
  const session = await getCurrentSession()

  const { searchParams } = new URL(req.url)
  const cat = (searchParams.get('categoria') ?? '').toLowerCase()
  const kgsRaw = searchParams.get('kgs')
  const kgs = kgsRaw ? parseFloat(kgsRaw) : null
  const cabezasRaw = searchParams.get('cabezas')
  const cabezasParsed = cabezasRaw ? parseInt(cabezasRaw, 10) : 1
  const cabezas = Number.isFinite(cabezasParsed) ? Math.min(1000, Math.max(1, cabezasParsed)) : 1

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

  // Valor del lote completo (el "camión"): cabezas × valor por cabeza. Sale de
  // precios públicos × la cantidad del usuario, así que es parte del gancho gratis.
  const valorLote = valor * cabezas
  const valorLoteUsd = usdValue !== null ? usdValue * cabezas : null

  const actual = {
    cabezas,
    precio_kg_ars: pricePerKg,
    valor_cabeza_ars: Math.round(valor),
    valor_lote_ars: Math.round(valorLote),
    precio_kg_usd: usdPerKg !== null ? Number(usdPerKg.toFixed(2)) : null,
    valor_cabeza_usd: usdValue !== null ? Math.round(usdValue) : null,
    valor_lote_usd: valorLoteUsd !== null ? Math.round(valorLoteUsd) : null,
    variacion_semanal_pct: currentCat.change,
    usd_blue: usdBlue,
  }

  // ── PRO Usuario retirado (2026-07): ¿vendo ahora? es GRATIS para todos.
  //    Se mantiene la maquinaria de "probada" abajo por compat (queda inerte). ──
  const isPro = true
  void session
  const now = new Date()
  const weekKey = isoWeekKey(now)

  let tasteGranted = false
  let setTasteCookie = false
  let lastTasteCat: string | null = null
  if (!isPro) {
    const cookie = req.cookies.get(TASTE_COOKIE)?.value ?? ''
    const [cw, cc] = cookie.split(':')
    if (cw === weekKey && cc === cat) {
      tasteGranted = true // re-view de la probada ya gastada esta semana
    } else if (cw === weekKey && cc) {
      tasteGranted = false // ya usó la probada de la semana en otra categoría
      lastTasteCat = cc
    } else {
      tasteGranted = true // semana nueva (o sin cookie) → conceder
      setTasteCookie = true
    }
  }

  // Free sin probada disponible → locked. No corremos el cómputo histórico.
  if (!isPro && !tasteGranted) {
    const resetDays = daysUntilNextWeek(now)
    const usado = VALID_CATS.includes(lastTasteCat as Cat)
      ? `Tu probada gratis de esta semana fue ${lastTasteCat}. `
      : ''
    return NextResponse.json({
      success: true,
      locked: true,
      input: { categoria: cat, kgs, cabezas },
      actual,
      teaser:
        `El valor de tu hacienda es gratis. El veredicto vender / aguantar —percentil en dólares reales + brecha estacional— es PRO Usuario. ${usado}Próxima probada gratis en ${resetDays} día${resetDays === 1 ? '' : 's'}.`,
      taste_reset_days: resetDays,
      timestamp: now.toISOString(),
    })
  }

  // ── Contexto estadístico en DÓLARES REALES (neutraliza la inflación en pesos) ──
  // Medimos el INMAG / dólar blue (precio real) para que "caro vs barato" sea comparable
  // en el tiempo. El INMAG (novillo) se usa como referencia de dirección del mercado.
  const today = now.toISOString().slice(0, 10)
  const tenYearsAgo = new Date(now)
  tenYearsAgo.setUTCFullYear(tenYearsAgo.getUTCFullYear() - 10)
  const fiveYearsAgoIso = (() => {
    const d = new Date(now)
    d.setUTCFullYear(d.getUTCFullYear() - 5)
    return d.toISOString().slice(0, 10)
  })()
  const oneYearAgoIso = (() => {
    const d = new Date(now)
    d.setUTCFullYear(d.getUTCFullYear() - 1)
    return d.toISOString().slice(0, 10)
  })()
  const thirtyAgoIso = new Date(now.getTime() - 30 * 86400_000).toISOString().slice(0, 10)

  // Una sola lectura de la década; las ventanas se derivan por filtro.
  const joined = await fetchInmagUsdJoined(tenYearsAgo.toISOString().slice(0, 10), today)
  const nn = (v: number | null): v is number => v !== null
  const realAll = joined.map((r) => r.inmag_usd).filter(nn)
  const real5 = joined.filter((r) => r.date >= fiveYearsAgoIso).map((r) => r.inmag_usd).filter(nn)
  const realYear = joined.filter((r) => r.date >= oneYearAgoIso).map((r) => r.inmag_usd).filter(nn)
  const real30 = joined.filter((r) => r.date >= thirtyAgoIso).map((r) => r.inmag_usd).filter(nn)
  const latestReal = realAll.length ? realAll[realAll.length - 1] : null

  const pct30 = latestReal !== null && real30.length ? percentileOf(latestReal, real30) : 0
  const pct365 = latestReal !== null && realYear.length ? percentileOf(latestReal, realYear) : 0

  const avg5 = real5.length ? real5.reduce((s, v) => s + v, 0) / real5.length : null
  const min5 = real5.length ? Math.min(...real5) : null
  const max5 = real5.length ? Math.max(...real5) : null
  const r2 = (v: number | null) => (v !== null ? Number(v.toFixed(2)) : null)

  // ── Brecha estacional (descriptiva, NO predictiva) ──────────────────────────
  // Promedio mensual del INMAG en USD reales sobre la década → el mes históricamente
  // más alto. La "brecha" es cuánto estuvo ese mes por encima del nivel real de hoy,
  // aplicada al lote. Es un patrón histórico, no un pronóstico de precio.
  const byMonth: number[][] = Array.from({ length: 12 }, () => [])
  for (const r of joined) {
    if (r.inmag_usd !== null) byMonth[Number(r.date.slice(5, 7)) - 1].push(r.inmag_usd)
  }
  const monthAvg = byMonth.map((a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null))
  let bestIdx = -1
  let bestAvg = -Infinity
  monthAvg.forEach((v, i) => {
    if (v !== null && v > bestAvg) {
      bestAvg = v
      bestIdx = i
    }
  })
  const currentMonthIdx = now.getUTCMonth()
  const seasonalGap =
    latestReal !== null && bestIdx >= 0 && bestAvg > 0 && latestReal > 0
      ? bestAvg / latestReal - 1
      : null
  const hasUpside = seasonalGap !== null && seasonalGap > 0.01 && bestIdx !== currentMonthIdx
  const estacional = bestIdx >= 0 && seasonalGap !== null
    ? {
        mejor_mes: MES[bestIdx],
        gap_pct: Number((seasonalGap * 100).toFixed(1)),
        en_pico: !hasUpside,
        upside_cab_ars: hasUpside ? Math.round(valor * seasonalGap) : 0,
        upside_lote_ars: hasUpside ? Math.round(valorLote * seasonalGap) : 0,
      }
    : null

  // Recomendación — umbrales sobre percentiles REALES (en USD).
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

  // Cierre en plata sobre el lote del usuario: la decisión, no el dato suelto.
  const fmtArs = (n: number) => `$${n.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`
  if (hasUpside && estacional) {
    recomendacion += ` Patrón estacional: ${estacional.mejor_mes} estuvo +${estacional.gap_pct}% sobre hoy en dólares reales — sobre tu lote de ${cabezas} cabeza${cabezas === 1 ? '' : 's'}, una brecha histórica de ${fmtArs(estacional.upside_lote_ars)} (${fmtArs(estacional.upside_cab_ars)}/cab). Es un patrón de la década, no una predicción.`
  } else if (estacional?.en_pico) {
    recomendacion += ` Y estás en torno al pico estacional histórico (${estacional.mejor_mes} es el mes más alto de la década en dólares reales): el calendario no juega a favor de esperar.`
  }

  // Honestidad de precisión: el percentil mide el INMAG (novillo) en USD reales.
  const esNovillo = cat === 'novillos'
  const precision: 'preciso' | 'indicativo' = esNovillo ? 'preciso' : 'indicativo'

  const body = {
    success: true,
    locked: false,
    taste: !isPro, // free que consume su probada de la semana
    taste_reset_days: !isPro ? daysUntilNextWeek(now) : undefined,
    input: { categoria: cat, kgs, cabezas },
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
      estacional,
    },
    veredicto,
    recomendacion,
    disclaimer:
      'Percentiles medidos sobre el INMAG en dólares reales (INMAG ÷ dólar blue) para neutralizar la inflación en pesos. El INMAG (novillo) se usa como referencia de dirección del mercado. La brecha estacional es un patrón histórico de 10 años, no un pronóstico. No considera condición del lote, costos de retención ni plaza zonal. Información, no asesoramiento.',
    fuente: 'INMAG diario MAG Cañuelas ÷ dólar blue + categoría diaria del Mercado Agroganadero',
    timestamp: now.toISOString(),
  }

  const res = NextResponse.json(body)
  if (setTasteCookie) {
    res.cookies.set(TASTE_COOKIE, `${weekKey}:${cat}`, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 8 * 86400, // 8 días — cubre el reset semanal
    })
  }
  return res
}
