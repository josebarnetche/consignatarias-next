import { getAllProfiles } from '@/lib/data/consignataria-slugs'
import frigorificos from '@/lib/data/frigorificos.json'
import remates from '@/lib/data/remates.json'

/**
 * Las cifras de cobertura que leen las IAs en /llms.txt y /llms-full.txt, sacadas de
 * los datos. "12 provincias" estaba escrito a mano y ya no coincidía con el calendario.
 */
export function coberturaSitio() {
  const provincias = new Set(
    (remates as { province?: string | null }[])
      .map((r) => (r.province ?? '').trim().toUpperCase())
      // CABA no es provincia: sus remates (Palermo, la Rural) se cuentan, la jurisdicción no.
      .filter((p) => p && p !== 'CAPITAL FEDERAL' && p !== 'CIUDAD AUTONOMA DE BUENOS AIRES'),
  )
  return {
    consignatarias: getAllProfiles().length,
    frigorificos: (frigorificos as unknown[]).length,
    remates: (remates as unknown[]).length,
    provinciasConRemates: provincias.size,
  }
}
