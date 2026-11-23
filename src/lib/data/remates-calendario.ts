import rematesData from './remates.json'
import type { Auction } from '@/lib/db/schema'
import { colapsarDuplicadosDelCalendario } from './consignataria-slugs'

/**
 * Calendario de remates para listar: `remates.json` sin la misma subasta contada dos
 * veces por dos sitios de la misma firma (ver `colapsarDuplicadosDelCalendario`).
 *
 * Mismo tipo que el import del JSON, así cada página puede cambiar
 * `import remates from '@/lib/data/remates.json'` por este módulo sin más cambios.
 * Las páginas de detalle (/remates/[slug]) siguen leyendo el JSON completo, para que
 * ninguna URL ya publicada pase a 404.
 */
const rematesCalendario = colapsarDuplicadosDelCalendario(
  rematesData as unknown as Auction[],
) as unknown as typeof rematesData

export default rematesCalendario
