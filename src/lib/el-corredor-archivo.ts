import { existsSync } from 'fs'
import { join } from 'path'
import manifest from '../../public/el-corredor/manifest.json'
import respaldo from '@/lib/data/el-corredor-hechos.json'
import { listarEdiciones, type Edicion, type ManifestCorredor } from '@/lib/el-corredor-ediciones'

/**
 * El archivo de El Corredor tal cual lo ven las PÁGINAS (server-only: lee /public
 * para confirmar que la tapa y la OG de cada edición vieja existen).
 *
 * La importación estática del manifest es a propósito: cada edición nueva entra por
 * un commit del workflow → deploy → estas páginas se regeneran. Lo que decide qué
 * se ENVÍA por mail no pasa por acá (ver src/lib/el-corredor-manifest.ts).
 */
const existe = (ruta: string) => existsSync(join(process.cwd(), 'public', ruta))

export function getEdiciones(): Edicion[] {
  return listarEdiciones(manifest as ManifestCorredor, respaldo, existe)
}

export function getEdicion(slug: string): Edicion | null {
  return getEdiciones().find((e) => e.slug === slug) ?? null
}
