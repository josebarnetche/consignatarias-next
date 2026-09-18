import demandaData from '@/lib/data/demanda-fichas.json'

/**
 * Cuánta demanda real recibió una ficha en los últimos 30 días.
 *
 * El CTA de reclamo prometía en abstracto ("recibí consultas de compradores"). Al
 * 17-sep-2026 el resultado de esa promesa era: 1.843 personas mirando 696 fichas de
 * frigoríficos en 30 días y **un** solo perfil reclamado en toda la historia. Esto
 * reemplaza la promesa por el número medido de esa misma firma, que es lo único que un
 * dueño de planta puede verificar contra su propia intuición.
 *
 * El dato lo produce `scripts/demanda-fichas.mjs` (workflow diario) y se lee del JSON
 * committeado: la página es estática y no puede consultar la base en el build.
 *
 * Se publican AGREGADOS. El nombre, teléfono y mail de quien consultó no salen de acá:
 * el lead es nuestro y se trabaja desde el panel, no desde la ficha pública.
 */
export interface DemandaFicha {
  tipo: 'frigorifico' | 'consignataria'
  /** Sesiones distintas que abrieron la ficha en la ventana. No es pageviews. */
  visitas: number
  /** Consultas dejadas en esa ficha en la ventana. */
  consultas: number
}

interface DemandaArchivo {
  generado: string
  ventanaDias: number
  minimoPublicable: number
  fichas: Record<string, DemandaFicha>
}

const DATA = demandaData as unknown as DemandaArchivo

/** Días que cubre la medición (para escribirlo en la página sin hardcodear). */
export const VENTANA_DIAS = DATA.ventanaDias

/**
 * Devuelve la demanda de una ficha, o `null` si no llegó al piso publicable.
 *
 * El piso existe a propósito: con tres visitas el número no informa nada y encima invita
 * a desconfiar del resto del sitio. Preferimos no decir nada antes que decir poco.
 */
export function getDemandaFicha(
  tipo: DemandaFicha['tipo'],
  clave: string,
): DemandaFicha | null {
  const f = DATA.fichas[clave]
  if (!f || f.tipo !== tipo) return null
  return f
}
