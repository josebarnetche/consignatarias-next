import { cache } from 'react'
import { createServiceClient } from '@/lib/supabase'
import { leerSerieVr } from '@/lib/vr'
import bandas from '@/lib/data/vr-bandas.json'
import { bandaSemanal, type BandaSemanal, type PuntoBanda } from './banda-consignatarias'
import { puntosDesdeArchivo, puntosPublicables, serieAmplitud, type ArchivoBanda, type SerieCategoria } from './banda-pagina'

/**
 * Los datos de /banda y de su tarjeta OG. Solo lectura.
 *
 * Lee la MISMA serie que la tool MCP `consignatarias_band` (`vr_bandas_history`,
 * metodología VR v1.0, completa desde que arranca) y la pasa por la MISMA
 * función, así que el número y la cita de la página son los que recibe un
 * agente. Con esas filas sale también la serie de amplitud, que es lo que
 * devuelve `price_dispersion_history`: una sola lectura para las dos cosas.
 *
 * Si la base no responde (un build sin credenciales, una caída), cae a
 * `vr-bandas.json`, que el cron commitea con la banda vigente y la tendencia
 * corta. En ese modo la cita sale sin récord (ver `puntosDesdeArchivo`) y la
 * serie es la de 12 puntos que ya se publica en /vr/[categoria]. La página lo
 * declara: `origen` dice de dónde salió el dato.
 *
 * `cache` de React: la página y su `generateMetadata` piden lo mismo en el mismo
 * render, y así va una sola consulta.
 */

/** Antes del primer punto de la serie (mayo de 2026): pedir desde acá es pedirla entera. */
const SERIE_DESDE = '2026-01-01'

export interface DatosBanda {
  banda: BandaSemanal
  serie: SerieCategoria[]
  origen: 'serie' | 'archivo'
}

function desdeArchivo(): DatosBanda {
  const archivo = bandas as unknown as ArchivoBanda
  const puntos = puntosPublicables(puntosDesdeArchivo(archivo))
  const banda = bandaSemanal(puntos)
  const tendencia: PuntoBanda[] = Object.entries(archivo.tendencia ?? {}).flatMap(([category, pts]) =>
    pts.map((t) => ({ date: t.date, category, p10: null, mediana: t.mediana, p90: null, amplitud_pct: t.amplitud, lotes: null })),
  )
  return { banda, serie: serieAmplitud(tendencia, banda.categorias.map((c) => c.categoria)), origen: 'archivo' }
}

export const cargarBanda = cache(async (): Promise<DatosBanda> => {
  const sb = createServiceClient()
  if (!sb) return desdeArchivo()
  try {
    const { rows, error } = await leerSerieVr(sb, { desde: SERIE_DESDE })
    if (error || rows.length === 0) return desdeArchivo()
    const puntos = puntosPublicables(rows)
    const banda = bandaSemanal(puntos)
    if (!banda.titular) return desdeArchivo()
    return { banda, serie: serieAmplitud(puntos, banda.categorias.map((c) => c.categoria)), origen: 'serie' }
  } catch {
    return desdeArchivo()
  }
})
