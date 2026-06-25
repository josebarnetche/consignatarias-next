import { fetchInmagUsdJoined, percentileOf } from '@/lib/charts/data'

/**
 * Señal de "zona de venta" del mercado — la MISMA lógica que /api/vender-ahora,
 * extraída acá para que el motor de alertas (cron) y la calculadora compartan un
 * único veredicto y no haya drift entre lo que el sitio muestra y lo que el mail
 * dice.
 *
 * Medimos el INMAG en DÓLARES REALES (INMAG ÷ dólar blue) para neutralizar la
 * inflación en pesos, igual que la calculadora. El novillo es la categoría base
 * del INMAG: el percentil es PRECISO para novillos e INDICATIVO (dirección del
 * mercado) para el resto. Esa honestidad se traslada al copy del mail.
 */
export type SellZoneVerdict = 'vender' | 'aguantar' | 'neutro'

export interface SellZoneSignal {
  pct30: number
  pct365: number
  verdict: SellZoneVerdict
  inmagUsdHoy: number | null
  /** Fecha del último dato real usado (YYYY-MM-DD). */
  asOf: string | null
}

const nn = (v: number | null): v is number => v !== null

/** Umbrales idénticos a /api/vender-ahora — la "zona de venta" es verdict==='vender'. */
function verdictFor(pct30: number, pct365: number): SellZoneVerdict {
  if (pct30 >= 80 && pct365 >= 60) return 'vender'
  if (pct30 <= 20 && pct365 <= 30) return 'aguantar'
  if (pct365 >= 70) return 'vender'
  if (pct365 <= 30) return 'aguantar'
  return 'neutro'
}

/**
 * computeSellZone — lee la década del INMAG-USD una sola vez y deriva los
 * percentiles de 30 y 365 días + el veredicto. `now` inyectable para tests.
 */
export async function computeSellZone(now: Date = new Date()): Promise<SellZoneSignal> {
  const today = now.toISOString().slice(0, 10)
  const tenYearsAgo = new Date(now)
  tenYearsAgo.setUTCFullYear(tenYearsAgo.getUTCFullYear() - 10)
  const oneYearAgoIso = (() => {
    const d = new Date(now)
    d.setUTCFullYear(d.getUTCFullYear() - 1)
    return d.toISOString().slice(0, 10)
  })()
  const thirtyAgoIso = new Date(now.getTime() - 30 * 86400_000).toISOString().slice(0, 10)

  const joined = await fetchInmagUsdJoined(tenYearsAgo.toISOString().slice(0, 10), today)
  const realAll = joined.map((r) => r.inmag_usd).filter(nn)
  const realYear = joined.filter((r) => r.date >= oneYearAgoIso).map((r) => r.inmag_usd).filter(nn)
  const real30 = joined.filter((r) => r.date >= thirtyAgoIso).map((r) => r.inmag_usd).filter(nn)
  const latestReal = realAll.length ? realAll[realAll.length - 1] : null
  const asOf = joined.length ? joined[joined.length - 1].date : null

  const pct30 = latestReal !== null && real30.length ? percentileOf(latestReal, real30) : 0
  const pct365 = latestReal !== null && realYear.length ? percentileOf(latestReal, realYear) : 0

  return {
    pct30,
    pct365,
    verdict: verdictFor(pct30, pct365),
    inmagUsdHoy: latestReal !== null ? Number(latestReal.toFixed(2)) : null,
    asOf,
  }
}

/** Categorías válidas para suscribir una alerta (espejo de /api/vender-ahora). */
export const ALERT_CATS = ['novillos', 'novillitos', 'vaquillonas', 'vacas', 'toros', 'terneros'] as const
export type AlertCat = typeof ALERT_CATS[number]

export const CAT_LABEL: Record<AlertCat, string> = {
  novillos: 'novillo',
  novillitos: 'novillito',
  vaquillonas: 'vaquillona',
  vacas: 'vaca',
  toros: 'toro',
  terneros: 'ternero',
}
