/**
 * Referencia internacional de hacienda: futuros de Chicago (CME) — Live Cattle
 * (novillo gordo) y Feeder Cattle (invernada), convertidos a USD/kg vivo.
 *
 * Fuente: endpoint público de Yahoo Finance (no oficial, cotización diferida
 * ~10 min). Server-side only. Falla "suave": devuelve null por instrumento si
 * no hay dato y el panel se oculta — nunca rompe /mercado.
 *
 * Unidades: los futuros de hacienda cotizan en centavos de USD por libra (¢/lb)
 * sobre peso vivo. Conversión a USD/kg: (¢/lb ÷ 100) × 2,2046226.
 */

const LB_TO_KG = 2.2046226218 // USD/lb → USD/kg

export interface ChicagoQuote {
  symbol: string
  label: string
  usdPerKg: number
  changePct: number | null
  asOf: string | null // YYYY-MM-DD
}

export interface ChicagoCattle {
  liveCattle: ChicagoQuote | null
  feederCattle: ChicagoQuote | null
}

async function fetchQuote(symbol: string, label: string): Promise<ChicagoQuote | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      symbol,
    )}?interval=1d&range=5d`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (consignatarias.com.ar market reference)' },
      next: { revalidate: 21600 }, // 6 h
    })
    if (!res.ok) return null
    const json = await res.json()
    const meta = json?.chart?.result?.[0]?.meta
    const price = meta?.regularMarketPrice
    if (typeof price !== 'number' || !Number.isFinite(price)) return null
    const prev =
      typeof meta.previousClose === 'number'
        ? meta.previousClose
        : typeof meta.chartPreviousClose === 'number'
          ? meta.chartPreviousClose
          : null
    const usdPerKg = (price / 100) * LB_TO_KG // ¢/lb → USD/lb → USD/kg
    const changePct = prev && prev > 0 ? ((price - prev) / prev) * 100 : null
    const asOf =
      typeof meta.regularMarketTime === 'number'
        ? new Date(meta.regularMarketTime * 1000).toISOString().slice(0, 10)
        : null
    return { symbol, label, usdPerKg, changePct, asOf }
  } catch {
    return null
  }
}

/** Live Cattle (novillo gordo en pie) + Feeder Cattle (invernada en pie). */
export async function fetchChicagoCattle(): Promise<ChicagoCattle> {
  const [liveCattle, feederCattle] = await Promise.all([
    fetchQuote('LE=F', 'Novillo gordo · Live Cattle'),
    fetchQuote('GF=F', 'Invernada · Feeder Cattle'),
  ])
  return { liveCattle, feederCattle }
}
