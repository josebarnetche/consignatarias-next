/**
 * monthly-close.ts — cierre mensual OFICIAL del novillo del MAG, compartido por los
 * crons `monthly-close` y `arrendamiento-cierre` para que ambos usen EXACTAMENTE el
 * mismo número (antes divergían: uno el ponderado oficial, otro un promedio simple de
 * ruedas → los suscriptores de arrendamiento veían dos "promedios mensuales" distintos).
 *
 * El número correcto para liquidar el canon de arrendamiento es el **promedio mensual
 * PONDERADO** = importe total del mes / kilos totales (fila "Totales" de haciinfo000011).
 */

const MAG = 'https://www.mercadoagroganadero.com.ar/dll/hacienda2.dll/haciinfo000011'

export interface MonthClose {
  /** Promedio mensual ponderado $/kg (importe/kilos del mes). */
  inmag: number
  cabezas: number
  importe: number
}

/**
 * fetchMonthClose — baja del MAG el cierre oficial del mes (y,m 1-based), parseando la
 * fila "Totales" del listado. Devuelve null si el MAG no tiene el cierre todavía.
 */
export async function fetchMonthClose(y: number, m: number): Promise<MonthClose | null> {
  const ld = new Date(y, m, 0).getDate() // último día del mes m (1-based)
  const mm = String(m).padStart(2, '0')
  const url = `${MAG}?txtFECHAINI=01/${mm}/${y}&txtFECHAFIN=${String(ld).padStart(2, '0')}/${mm}/${y}&CP=&LISTADO=SI`
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
  if (!res.ok) return null
  const html = new TextDecoder('iso-8859-1').decode(await res.arrayBuffer())
  const txt = html
    .replace(/<\/td>/gi, '\t')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
  for (const line of txt.split('\n')) {
    if (!/\bTotales\b/.test(line)) continue
    const nums = line.match(/[\d.]+,\d+|\d[\d.]*/g)
    if (nums && nums.length >= 3) {
      const cabezas = parseInt(nums[0].replace(/\./g, ''), 10)
      const importe = parseFloat(nums[1].replace(/\./g, '').replace(',', '.'))
      const inmag = parseFloat(nums[2].replace(/\./g, '').replace(',', '.'))
      if (inmag > 0) return { inmag, cabezas, importe }
    }
  }
  return null
}
