/**
 * frigorificos-indexables.ts — qué fichas /frigorificos/[cuit] merecen estar en el índice.
 *
 * De los 1.115 CUIT del directorio, ~250 no figuran en el padrón SENASA vigente. La
 * mayoría de esos tampoco tiene nada propio: frigorificos-enriched.json trae una fila
 * para 233 de ellos, pero en ~220 la fila es una cáscara con todos los campos en null.
 * Esa ficha es la plantilla con un nombre y "no figura en el padrón": página flaca que
 * diluye a las otras 870 (auditoría SEO 2026-10-03, hallazgo 10).
 *
 * Criterio: se indexa si la habilitación está vigente O si hay algún dato enriquecido real.
 *
 * HOY NO SE USA PARA NOINDEX (decisión del 03-10-2026): Search Console muestra que las
 * fichas, incluidas las "sin verificación", son la familia con más clics del sitio y
 * están indexadas casi todas. Queda como criterio medido y testeado por si se quiere
 * podar el sitemap o el noindex más adelante; si se usa, que sea en los dos lugares a
 * la vez (página y sitemap), o Search Console marca la contradicción.
 */
import frigorificosEnrichedData from '@/lib/data/frigorificos-enriched.json'
import { getSenasaRecord } from '@/lib/data/senasa-habilitados'

interface FilaEnriquecida {
  cuit: string
  localidad: string | null
  direccion: string | null
  telefono: string | null
  email: string | null
  web: string | null
  grupoEmpresario: string | null
  tipo: string | null
  volumenFaena: number | string | null
  notas: string | null
}

const CAMPOS_CON_DATO: (keyof FilaEnriquecida)[] = [
  'localidad',
  'direccion',
  'telefono',
  'email',
  'web',
  'grupoEmpresario',
  'tipo',
  'volumenFaena',
  'notas',
]

const conDatoEnriquecido = new Set(
  (frigorificosEnrichedData as FilaEnriquecida[])
    .filter((f) => CAMPOS_CON_DATO.some((k) => f[k] != null && String(f[k]).trim() !== ''))
    .map((f) => f.cuit),
)

/** true si el CUIT tiene alguna fila enriquecida con al menos un campo no vacío. */
export function tieneDatoEnriquecido(cuit: string): boolean {
  return conDatoEnriquecido.has(cuit)
}

/** true si la ficha del CUIT se indexa: habilitación SENASA vigente o datos enriquecidos reales. */
export function esFrigorificoIndexable(cuit: string): boolean {
  return getSenasaRecord(cuit) !== null || conDatoEnriquecido.has(cuit)
}
