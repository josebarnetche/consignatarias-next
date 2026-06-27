import { fetchInmagUsdJoined, percentileOf } from '@/lib/charts/data'

/**
 * Señal de mercado del INMAG en DÓLARES REALES (INMAG ÷ dólar blue), compartida
 * por la calculadora ¿Vendo ahora?, el semáforo on-site y el motor de alertas.
 *
 * DISEÑO TRUST-FIRST (jun-2026, tras backtest 2015-2026):
 * El percentil solo discrimina bien la dirección (aguantar > neutro > vender en
 * retorno forward, robusto en ambas mitades del período) PERO en un bull
 * estructural "percentil alto" se gatilla casi todos los días y, si lo tratáramos
 * como orden de venta, gritaría "vendé" mientras el precio sigue subiendo —
 * justo lo que erosiona la confianza. Por eso:
 *  1) NO damos una orden. Describimos: zona (alta/media/baja) + tendencia.
 *  2) La ALERTA solo es digna de disparo en la conjunción "zona alta Y girando"
 *     (precio en zona alta del año pero por debajo de su media móvil de 90 días,
 *     i.e. ya no haciendo nuevos máximos). En el backtest eso recorta ~84% de los
 *     falsos avisos del bull y los restantes precedieron caídas (-3% a 60d).
 * Honestidad de precisión: el percentil mide el novillo (categoría base del
 * INMAG); para el resto refleja la dirección del mercado.
 */
export type SellZone = 'alta' | 'media' | 'baja'
export type Trend = 'subiendo' | 'estable' | 'bajando'

export interface SellZoneSignal {
  pct30: number
  pct365: number
  /** Zona descriptiva del precio vs el año (no es una orden). */
  zone: SellZone
  /** Tendencia de mediano plazo: precio vs su media móvil de 90 días. */
  trend: Trend
  /** Media móvil de 90 días del INMAG-USD (referencia de tendencia). */
  ma90: number | null
  /**
   * ¿Vale la pena una alerta hoy? Solo en la conjunción zona alta + girando
   * (no en plena tendencia alcista). Es el gatillo trust-safe del cron.
   */
  alertWorthy: boolean
  inmagUsdHoy: number | null
  /** Fecha del último dato real usado (YYYY-MM-DD). */
  asOf: string | null
}

const nn = (v: number | null): v is number => v !== null

/** Banda alrededor de la MM90 para clasificar tendencia (±2%). */
const TREND_BAND = 0.02

function zoneFor(pct30: number, pct365: number): SellZone {
  if (pct365 >= 70 || (pct30 >= 80 && pct365 >= 60)) return 'alta'
  if (pct365 <= 30 || (pct30 <= 20 && pct365 <= 30)) return 'baja'
  return 'media'
}

function trendFor(v: number | null, ma90: number | null): Trend {
  if (v === null || ma90 === null || ma90 <= 0) return 'estable'
  const r = v / ma90 - 1
  if (r > TREND_BAND) return 'subiendo'
  if (r < -TREND_BAND) return 'bajando'
  return 'estable'
}

/**
 * computeSellZone — lee la década del INMAG-USD una sola vez y deriva
 * percentiles (30/365d), media móvil 90d, zona descriptiva, tendencia y el
 * gatillo de alerta. `now` inyectable para tests.
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
  const ninetyAgoIso = new Date(now.getTime() - 90 * 86400_000).toISOString().slice(0, 10)

  const joined = await fetchInmagUsdJoined(tenYearsAgo.toISOString().slice(0, 10), today)
  const realAll = joined.map((r) => r.inmag_usd).filter(nn)
  const realYear = joined.filter((r) => r.date >= oneYearAgoIso).map((r) => r.inmag_usd).filter(nn)
  const real30 = joined.filter((r) => r.date >= thirtyAgoIso).map((r) => r.inmag_usd).filter(nn)
  const real90 = joined.filter((r) => r.date >= ninetyAgoIso).map((r) => r.inmag_usd).filter(nn)
  const latestReal = realAll.length ? realAll[realAll.length - 1] : null
  const asOf = joined.length ? joined[joined.length - 1].date : null

  const pct30 = latestReal !== null && real30.length ? percentileOf(latestReal, real30) : 0
  const pct365 = latestReal !== null && realYear.length ? percentileOf(latestReal, realYear) : 0
  const ma90 = real90.length ? real90.reduce((s, v) => s + v, 0) / real90.length : null

  const zone = zoneFor(pct30, pct365)
  const trend = trendFor(latestReal, ma90)
  // Trust-safe: solo alertamos en zona alta Y no en tendencia alcista
  // (precio en/por-debajo de su MM90 = girando, no haciendo nuevos máximos).
  const alertWorthy =
    zone === 'alta' && latestReal !== null && ma90 !== null && latestReal <= ma90

  return {
    pct30,
    pct365,
    zone,
    trend,
    ma90: ma90 !== null ? Number(ma90.toFixed(2)) : null,
    alertWorthy,
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

/** Etiqueta + color para la zona (descriptivo, no imperativo). */
export const ZONE_META: Record<SellZone, { label: string; hex: string }> = {
  alta: { label: 'Zona alta del año', hex: '#34d399' },
  media: { label: 'Zona media', hex: '#a1a1aa' },
  baja: { label: 'Zona baja del año', hex: '#fbbf24' },
}

export const TREND_META: Record<Trend, { label: string; arrow: string }> = {
  subiendo: { label: 'en tendencia alcista', arrow: '↑' },
  estable: { label: 'tendencia estable', arrow: '→' },
  bajando: { label: 'girando a la baja', arrow: '↓' },
}
