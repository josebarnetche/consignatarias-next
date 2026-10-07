/**
 * LA BANDA CONSIGNATARIAS — el número semanal propio.
 *
 * QUÉ MIDE Y POR QUÉ ESE Y NO EL PRECIO. El precio del novillo ya lo publican
 * cinco: el MAG, Rosgan, Agrositio, Valor Carne y Faxcarne. Competir ahí es pelear
 * por un número que no es nuestro. Lo que no publica nadie es **cuánto se abre el
 * mercado**: la distancia entre lo que cobró el que vendió bien y el que vendió
 * mal, el mismo día, por la misma categoría.
 *
 * Y no es un hueco casual. Es lo que los proveedores grandes se reservan a
 * propósito: DATAGRO publica el promedio y dice, textual, que el mínimo, el máximo
 * y la bonificación "têm uso, distribuição e comercialização reservados"; Agrolink
 * regala 30 días y cobra el histórico; Scot publica el cuadro y vende el mail que
 * llegó primero. **Nadie cobra el número: cobran la dispersión alrededor del
 * número.** Nosotros la teníamos calculada y la estábamos regalando sin nombre.
 *
 * CÓMO SE LEE. Amplitud = (P90 − P10) / mediana, sobre los lotes realmente
 * operados en el Mercado Agroganadero en una ventana móvil de 30 días. Si sube, el
 * mercado se está abriendo: la misma hacienda vale cada vez más distinto según
 * quién la venda, y ahí es donde un consignatario bueno se paga solo. Si baja, el
 * mercado se cierra y el precio manda sobre el oficio.
 *
 * ⚠️ VENTANA MÓVIL DE 30 DÍAS: dos puntos consecutivos comparten 29 días de lotes.
 * Se lee NIVEL y TENDENCIA, nunca la diferencia de un día contra otro.
 *
 * EL NOMBRE ES PARTE DEL PRODUCTO. Se llama "Banda Consignatarias" y no "banda de
 * precios" porque la atribución que sobrevive al reenvío es la que va adentro del
 * nombre: en treinta años ningún medio escribió "elaborado por Tardáguila", pero
 * todos escriben "Índice Faxcarne". El nombre no se cambia nunca.
 */

export interface PuntoBanda {
  date: string
  category: string
  p10: number | null
  mediana: number | null
  p90: number | null
  amplitud_pct: number | null
  lotes: number | null
}

export interface CategoriaSemana {
  categoria: string
  p10: number
  mediana: number
  p90: number
  amplitudPct: number
  lotes: number
  /** Cambio de la amplitud contra la semana previa, en puntos porcentuales. */
  deltaSemanaPp: number | null
}

export interface BandaSemanal {
  fecha: string
  /** La categoría que encabeza el informe. El novillo es la referencia del mercado. */
  titular: CategoriaSemana | null
  categorias: CategoriaSemana[]
  /** Dónde está la amplitud del titular contra su propia serie. */
  posicion: { minimo: number; maximo: number; promedio: number; semanas: number } | null
  lectura: 'se_abre' | 'se_cierra' | 'estable' | null
  /** El párrafo listo para copiar. Es lo que un periodista pega sin reescribir. */
  cita: string
  advertencia: string
}

export const CATEGORIA_TITULAR = 'NOVILLO'
/** Debajo de esto el movimiento es ruido de una ventana móvil, no una señal. */
export const UMBRAL_PP = 1.5
/** Semanas mínimas para ubicar el dato contra su propia historia sin mentir. */
export const MIN_SEMANAS_SERIE = 8

const redondear = (n: number, d = 1) => Number(n.toFixed(d))

/** El punto más cercano a `fecha` sin pasarse, por categoría. */
function ultimoHasta(puntos: PuntoBanda[], categoria: string, fecha: string): PuntoBanda | null {
  const c = puntos
    .filter((p) => p.category === categoria && p.date <= fecha && p.amplitud_pct != null)
    .sort((a, b) => a.date.localeCompare(b.date))
  return c.length ? c[c.length - 1] : null
}

/**
 * La banda de la semana.
 *
 * `fecha` es el corte; por defecto, el último dato disponible. La comparación
 * semanal se hace contra el punto de siete días antes y no contra el punto previo
 * de la serie: la serie no tiene un punto por día y comparar puntos consecutivos
 * mezclaría ventanas de distinto largo.
 */
export function bandaSemanal(puntos: PuntoBanda[], fecha?: string): BandaSemanal {
  const validos = puntos.filter((p) => p.amplitud_pct != null && p.mediana != null)
  const corte =
    fecha ?? validos.map((p) => p.date).sort().slice(-1)[0] ?? new Date().toISOString().slice(0, 10)
  const semanaPrevia = new Date(new Date(corte).getTime() - 7 * 86_400_000).toISOString().slice(0, 10)

  const cats = [...new Set(validos.map((p) => p.category))]
  const categorias: CategoriaSemana[] = []
  for (const cat of cats) {
    const hoy = ultimoHasta(validos, cat, corte)
    if (!hoy || hoy.mediana == null || hoy.p10 == null || hoy.p90 == null || hoy.amplitud_pct == null) continue
    const antes = ultimoHasta(validos, cat, semanaPrevia)
    categorias.push({
      categoria: cat,
      p10: hoy.p10,
      mediana: hoy.mediana,
      p90: hoy.p90,
      amplitudPct: redondear(hoy.amplitud_pct),
      lotes: hoy.lotes ?? 0,
      deltaSemanaPp:
        antes?.amplitud_pct != null && antes.date !== hoy.date
          ? redondear(hoy.amplitud_pct - antes.amplitud_pct)
          : null,
    })
  }
  categorias.sort((a, b) => b.amplitudPct - a.amplitudPct)

  const titular = categorias.find((c) => c.categoria === CATEGORIA_TITULAR) ?? categorias[0] ?? null

  // Posición contra la propia serie: sin un mínimo de semanas no se afirma nada.
  let posicion: BandaSemanal['posicion'] = null
  if (titular) {
    const serie = validos
      .filter((p) => p.category === titular.categoria)
      .map((p) => p.amplitud_pct as number)
    if (serie.length >= MIN_SEMANAS_SERIE) {
      posicion = {
        minimo: redondear(Math.min(...serie)),
        maximo: redondear(Math.max(...serie)),
        promedio: redondear(serie.reduce((s, x) => s + x, 0) / serie.length),
        semanas: serie.length,
      }
    }
  }

  const d = titular?.deltaSemanaPp ?? null
  const lectura: BandaSemanal['lectura'] =
    d == null ? null : d >= UMBRAL_PP ? 'se_abre' : d <= -UMBRAL_PP ? 'se_cierra' : 'estable'

  const fmt = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 1 })
  /**
   * El récord es lo que convierte un número en noticia. Faxcarne lo usa igual:
   * "el valor más bajo desde 2011, cuando se comenzó a elaborar esta serie". Sin
   * esto, un medio tiene un porcentaje; con esto, tiene un titular.
   * Sólo se afirma si la serie es lo bastante larga como para que signifique algo.
   */
  let record = ''
  if (titular && posicion) {
    if (titular.amplitudPct <= posicion.minimo) record = ' Es el valor más bajo de la serie.'
    else if (titular.amplitudPct >= posicion.maximo) record = ' Es el valor más alto de la serie.'
  }
  const cita = titular
    ? `La Banda Consignatarias del ${titular.categoria.toLowerCase()} se ubicó en ${fmt(titular.amplitudPct)}% ` +
      `el ${new Date(corte + 'T12:00:00').toLocaleDateString('es-AR')}` +
      (d != null
        ? `, ${d > 0 ? `${fmt(Math.abs(d))} puntos más` : d < 0 ? `${fmt(Math.abs(d))} puntos menos` : 'sin cambios'} que la semana anterior`
        : '') +
      `. Mide cuánto se abre el precio de la hacienda: la distancia entre el 10% que menos cobró y el 10% que más cobró, ` +
      `sobre ${titular.lotes.toLocaleString('es-AR')} lotes operados en el Mercado Agroganadero.${record} ` +
      `Fuente: Banda Consignatarias, consignatarias.com.ar.`
    : 'Sin datos suficientes para publicar la Banda Consignatarias de esta semana.'

  return {
    fecha: corte,
    titular,
    categorias,
    posicion,
    lectura,
    cita,
    advertencia:
      'Ventana móvil de 30 días: dos puntos consecutivos comparten 29 días de lotes, así que se lee nivel y tendencia, ' +
      'no la diferencia de un día contra otro. La serie arranca en junio de 2026.',
  }
}
