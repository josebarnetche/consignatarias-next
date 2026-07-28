import marketPrices from '@/lib/data/market-prices.json'

/** Fecha de la última rueda real del INMAG (última entrada de la serie).
 *  NO usar marketPrices.lastUpdate para fechar el índice: esa es la fecha del scrape. */
export const INMAG_DATE: string =
  marketPrices.inmag.series[marketPrices.inmag.series.length - 1]?.date ?? marketPrices.lastUpdate
