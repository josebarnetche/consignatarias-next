/**
 * Manifest de El Corredor leído EN TIEMPO DE REQUEST.
 *
 * Nunca `import manifest from '…/manifest.json'`: eso lo congela en el bundle del
 * build. El 2026-08-01 esa importación estática hizo que el blast mensual mandara
 * la edición de Junio con Julio ya publicado (el deploy nuevo todavía no había
 * propagado cuando el workflow disparó el envío). Cualquier ruta que decida QUÉ
 * edición entregar tiene que leerlo por acá.
 */
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.consignatarias.com.ar'

export interface CorredorManifest {
  current: { ym: string; edition_label: string; pdf_path: string }
}

export async function loadCorredorManifest(): Promise<CorredorManifest> {
  const res = await fetch(`${APP_URL}/el-corredor/manifest.json`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`manifest HTTP ${res.status}`)
  const m = (await res.json()) as CorredorManifest
  if (!m?.current?.ym || !m.current.pdf_path) throw new Error('manifest sin current.ym/pdf_path')
  return m
}
