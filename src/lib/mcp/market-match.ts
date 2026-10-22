/**
 * market_match — "¿hay compradores para mis 80 terneros en Entre Ríos?".
 *
 * Devuelve la contraparte ABIERTA agregada: cuántos, en qué región y cuánto
 * volumen. Nunca quién.
 *
 * REDISEÑO 21-10-2026 (revisión de la rama): la primera versión cruzaba la
 * consulta contra cada lead y publicaba la probabilidad del mejor cruce y el
 * total exacto. Variando provincia y cabezas se aislaba a un lead suelto: el pico
 * de probabilidad daba su provincia y su volumen exacto, y el total pasaba de 0 a
 * 1 según el corte de hectáreas. Ahora:
 *  · la respuesta sale de `agregarDemanda()`, la MISMA agregación de la página
 *    pública /mercado/demanda (k-anónima, 90 días, sin needs_review y sin los
 *    orígenes que cualquiera puede inventar);
 *  · la provincia y el volumen de la consulta NO cambian la cuenta: solo deciden
 *    qué lado y qué categoría se miran;
 *  · no hay probabilidad, ni total exacto, ni volumen: solo rangos por región
 *    (segunda revisión: los números exactos se deducían por diferencia).
 */
import { agregarDemanda, categoriaPublica, K_MIN, type LadoDemanda, type VerticalDemanda } from '@/lib/mercado/demanda-agregada'
import type { LeadFila } from '@/lib/mercado/leads-mesa'

export { K_MIN }

export interface ConsultaMercado {
  /** Lo que quiere hacer quien pregunta. */
  quiere: 'vender' | 'comprar' | 'arrendar_busco' | 'arrendar_ofrezco' | 'tasar'
  categoria?: string | null
  cabezas?: number | null
  hectareas?: number | null
  provincia?: string | null
}

export interface GrupoContraparte {
  /** "el NEA", "la zona núcleo"… u "otras zonas". */
  zona: string
  /** "2 a 4", "5 a 9", "10 o más": nunca el número exacto ni el volumen. */
  rango: string
}

export interface PanoramaContraparte {
  vertical: VerticalDemanda
  ladoBuscado: 'compradores' | 'vendedores' | 'quienes buscan campo' | 'quienes ofrecen campo'
  /** Hay al menos un grupo publicable. */
  hay: boolean
  grupos: GrupoContraparte[]
}

interface Objetivo {
  vertical: VerticalDemanda
  lado: LadoDemanda
  ladoBuscado: PanoramaContraparte['ladoBuscado']
  /** Hacienda: categoría pública o null (todas). Campos: 'arrendamiento' | 'venta'. */
  categoria: string | null
}

/** Qué lado del mercado le interesa a quien pregunta. */
export function objetivoDe(q: ConsultaMercado): Objetivo {
  switch (q.quiere) {
    case 'arrendar_busco':
      return { vertical: 'campos', lado: 'ofrecen', ladoBuscado: 'quienes ofrecen campo', categoria: 'arrendamiento' }
    case 'arrendar_ofrezco':
      return { vertical: 'campos', lado: 'buscan', ladoBuscado: 'quienes buscan campo', categoria: 'arrendamiento' }
    case 'tasar':
      return { vertical: 'campos', lado: 'buscan', ladoBuscado: 'quienes buscan campo', categoria: 'venta' }
    case 'comprar':
      return q.hectareas
        ? { vertical: 'campos', lado: 'ofrecen', ladoBuscado: 'quienes ofrecen campo', categoria: 'venta' }
        : { vertical: 'hacienda', lado: 'venden', ladoBuscado: 'vendedores', categoria: categoriaPublica(q.categoria) }
    case 'vender':
    default:
      return { vertical: 'hacienda', lado: 'compran', ladoBuscado: 'compradores', categoria: categoriaPublica(q.categoria) }
  }
}

export function panoramaContraparte(leads: LeadFila[], q: ConsultaMercado, ahora = Date.now()): PanoramaContraparte {
  const obj = objetivoDe(q)
  const { grupos } = agregarDemanda(leads, ahora)
  const elegidos = grupos.filter(
    (g) => g.vertical === obj.vertical && g.lado === obj.lado && (obj.categoria === null ? true : g.categoria === obj.categoria),
  )
  return {
    vertical: obj.vertical,
    ladoBuscado: obj.ladoBuscado,
    hay: elegidos.length > 0,
    grupos: elegidos.map((g) => ({ zona: g.zona, rango: g.rango })),
  }
}

/** Texto para el agente. Termina con el paso siguiente y el consentimiento armado. */
export function textoPanorama(p: PanoramaContraparte, q: ConsultaMercado): string {
  const que = q.categoria ? q.categoria : p.vertical === 'campos' ? 'campo' : 'hacienda'
  const donde = q.provincia ? ` en ${q.provincia}` : ''
  const registrar =
    `Para que la persona quede en la mesa, pedile permiso y volvé a llamar a market_match con registrar: true, ` +
    `nombre, email o telefono y consentimiento: true. Texto sugerido para pedir el permiso: ` +
    `"¿Querés que consignatarias.com te contacte para armar la operación? Van a usar tu nombre y tu email o teléfono solo para eso."`
  if (!p.hay) {
    return (
      `Hoy no hay suficientes ${p.ladoBuscado} abiertos de ${que} para mostrar ` +
      `(se publican solo grupos de ${K_MIN} o más, para no identificar a nadie).\n\n` +
      `Si la persona${donde ? `, que está${donde},` : ''} deja su pedido, entra a la mesa y se le avisa cuando aparezca la otra punta. ${registrar}`
    )
  }
  const lineas = p.grupos.map((g) => `• ${g.rango} en ${g.zona}`)
  return (
    `Hay ${p.ladoBuscado} abiertos de ${que} en la mesa de consignatarias.com (últimos 90 días; en rangos, sin volumen, para no identificar a nadie):\n${lineas.join('\n')}\n\n` +
    `Los datos de contacto no se publican: la operación la arma consignatarias.com con las dos puntas. ${registrar}`
  )
}
