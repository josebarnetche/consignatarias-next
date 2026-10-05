/**
 * calidad.ts — cuánto vale comercialmente un lead, y qué hacer con él.
 *
 * `triage.ts` ya decide si una fila es un lead o es ruido. Esto es el paso
 * siguiente, que faltaba: de los que SÍ son leads, cuáles se le pueden llevar a
 * un consignatario y cuáles no.
 *
 * LOS NÚMEROS SON DE JOSE (04-10-2026), no una estimación: «20 cabezas no es
 * atractivo, a partir de 40 sí, 1500 es pro, como para dárselo a Pablo
 * Usandizaga». Están acá arriba y en constantes porque van a cambiar con el
 * mercado: se corrigen en un lugar, no en seis pantallas.
 *
 * Lo que esto NO hace: derivar. La derivación la decide Jose caso por caso, y
 * sólo en `pro` — ver [[feedback-consignatarias-lead-es-nuestro]]: el lead es
 * nuestro, y pasarle el contacto a una firma sin comisión acordada por escrito
 * es regalarle la relación.
 */

/** Debajo de esto no le interesa a una consignataria: no alcanza para un viaje. */
export const CABEZAS_MINIMAS = 40
/** Desde acá el lead es de los que un consignatario grande atiende él mismo. */
export const CABEZAS_PRO = 300

export type NivelLead = 'pro' | 'trabajable' | 'chico' | 'sin_datos'

export interface LeadParaCalificar {
  intent: string
  category?: string | null
  province?: string | null
  headCount?: number | null
  desiredPriceArs?: number | null
  status?: string | null
  createdAt?: string | null
}

export interface Calificacion {
  nivel: NivelLead
  /** Una línea para leer en el digest sin abrir el board. */
  motivo: string
  /** Qué dato falta para poder calificarlo o trabajarlo. Vacío si está completo. */
  faltan: string[]
  /** Sólo `pro` se considera derivable, y aun así la decisión es de Jose. */
  derivable: boolean
  /** Días desde que entró, si sigue sin contactar. El acuse promete "a la brevedad". */
  diasSinContactar: number | null
}

const SIN_CONTACTAR = new Set(['new', 'needs_review', 'routed'])

/** Días enteros entre una fecha y hoy. Null si la fecha no sirve. */
function diasDesde(iso: string | null | undefined): number | null {
  if (!iso) return null
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return null
  return Math.floor((Date.now() - t) / 86_400_000)
}

/**
 * El nivel de un lead y qué le falta.
 *
 * Un lead sin cabezas declaradas NO es chico: es `sin_datos`. La diferencia
 * importa porque son acciones distintas — al chico no se lo llama, al sin_datos
 * se le pregunta. Tratarlos igual fue lo que dejó 22 leads parados: la mitad no
 * estaba descartada, estaba sin preguntar.
 */
export function calificarLead(lead: LeadParaCalificar): Calificacion {
  const faltan: string[] = []
  if (!lead.category) faltan.push('categoría')
  if (!lead.headCount) faltan.push('cabezas')
  if (!lead.province) faltan.push('provincia')

  const dias = SIN_CONTACTAR.has(String(lead.status || '')) ? diasDesde(lead.createdAt) : null
  const base = { faltan, diasSinContactar: dias }

  const cab = lead.headCount ?? null
  if (cab === null) {
    return {
      ...base,
      nivel: 'sin_datos',
      motivo: 'no declaró cabezas: no se puede calificar hasta preguntarle',
      derivable: false,
    }
  }

  if (cab >= CABEZAS_PRO) {
    return {
      ...base,
      nivel: 'pro',
      motivo: `${cab} cabezas: operación grande, de las que un consignatario atiende él mismo`,
      derivable: true,
    }
  }

  if (cab >= CABEZAS_MINIMAS) {
    return {
      ...base,
      nivel: 'trabajable',
      motivo: `${cab} cabezas: entra en el piso de ${CABEZAS_MINIMAS} que interesa a una firma`,
      derivable: false,
    }
  }

  return {
    ...base,
    nivel: 'chico',
    motivo: `${cab} cabezas: debajo del piso de ${CABEZAS_MINIMAS}, no es atractivo para una firma`,
    derivable: false,
  }
}

/** Orden para el digest: primero lo que puede facturar, después lo que hay que preguntar. */
export const ORDEN_NIVEL: Record<NivelLead, number> = {
  pro: 0,
  trabajable: 1,
  sin_datos: 2,
  chico: 3,
}

/**
 * La acción concreta que sigue. El digest la imprime tal cual: un digest que
 * sólo clasifica no mueve nada.
 */
export function proximaAccion(c: Calificacion, intent: string): string {
  if (c.nivel === 'pro') {
    return intent === 'vender'
      ? 'Llamar hoy. Es el tamaño que una firma grande atiende: se puede derivar con comisión acordada por escrito.'
      : 'Llamar hoy. Comprador de ese volumen se trabaja contra los lotes en vidriera y los remates de la semana.'
  }
  if (c.nivel === 'trabajable') {
    return 'Llamar. Entra en el piso que le interesa a una firma de la zona.'
  }
  if (c.nivel === 'sin_datos') {
    return `Preguntarle lo que falta (${c.faltan.join(', ')}) antes de decidir: sin cabezas no se puede calificar.`
  }
  return 'No se deriva. Responder con el dato que pidió (valuación o referencia) y dejarlo en la lista de espera por si junta volumen.'
}
