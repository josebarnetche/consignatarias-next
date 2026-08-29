import { jsPDF } from 'jspdf'
import { saneaProfundo } from './winansi'

/**
 * generateInformeCanonPDF — el entregable del informe de canon de arrendamiento.
 *
 * Se genera on-demand en la ruta de descarga, no se pre-renderiza: el mismo producto tiene
 * una variante por zona y el dato de precio cambia todos los días.
 *
 * TODO texto dinámico pasa por `saneaProfundo` antes de tocar el documento: jsPDF con
 * Helvetica codifica en WinAnsi y un `→` sin sanear se imprime como `!` en el PDF que el
 * comprador pagó. Ver `src/lib/pdf/winansi.ts`.
 */

export interface ZonaCanon {
  provincia: string
  zona: string | null
  /** Casos relevados. Va SIEMPRE a la vista: distingue un número de 45 casos de uno de 3. */
  n: number
  usdHa: number
  p25: number | null
  p75: number | null
  kgHaMesCanon: number
  kgHaAno: number | null
  /**
   * Años de producción bruta de carne para repagar la tierra, tal como viene en el dataset.
   * OJO: **no** es el repago por arrendamiento — mide la producción entera del campo, no lo
   * que cobra quien lo alquila. En Corrientes da 10,5 años contra los 19 del canon. El
   * informe calcula el de arrendamiento aparte y muestra los dos, porque son dos preguntas.
   */
  aniosRepago: number | null
  aptitud: string | null
  canonFuente: string | null
}

export interface InformeCanonData {
  zona: ZonaCanon
  /** Zonas limítrofes o comparables, para que el canon no se lea en el vacío. */
  comparables: ZonaCanon[]
  /** Precio del novillo en pie, ARS/kg vivo, con su fecha. Convierte los kilos a pesos. */
  novilloArsKg: number
  novilloFecha: string
  /** Dólar de referencia para el valor de la tierra. */
  usdArs: number | null
  /** Email del comprador — se estampa en el pie de cada página. */
  compradorEmail: string
  generadoISO: string
  datasetFecha: string
}

import {
  TINTA,
  GRIS,
  GRIS_CLARO,
  CIELO,
  PAPEL,
  PAPEL_ACENTO,
  LINEA,
  AMBAR,
  AMBAR_PAPEL,
  cabeceraImpresa,
} from './estilo-impreso'

function fmt(n: number, dec = 0): string {
  return n.toLocaleString('es-AR', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

function nombreZona(z: ZonaCanon): string {
  return z.zona ? `${z.provincia} · ${z.zona}` : z.provincia
}

export function generateInformeCanonPDF(dataCruda: InformeCanonData): jsPDF {
  const data = saneaProfundo(dataCruda)
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210
  const M = 18
  let y = 0

  const { zona } = data
  const canonMensualArs = zona.kgHaMesCanon * data.novilloArsKg
  const canonAnualArs = canonMensualArs * 12

  /**
   * Años de canon para repagar la hectárea — el número que le importa a quien arrienda.
   *
   * NO se toma `zona.aniosRepago` del dataset: ese campo mide el repago contra la
   * producción bruta de carne del campo entero (62 kg/ha/año en Corrientes, ~10,5 años),
   * no contra lo que cobra el arrendador. Con un canon de 3 kg/ha/mes son ~19 años, casi
   * el doble. Publicar el primero en un informe de arrendamiento sería contestar otra
   * pregunta.
   */
  const novilloUsdKg = data.usdArs ? data.novilloArsKg / data.usdArs : null
  const repagoCanon =
    novilloUsdKg && novilloUsdKg > 0 && zona.kgHaMesCanon > 0
      ? zona.usdHa / (zona.kgHaMesCanon * 12 * novilloUsdKg)
      : null

  // ---------- Cabecera ----------
  // Imprimible: una regla de acento de 1,2 mm en vez de una barra rellena de 42 mm.
  // Ver `estilo-impreso.ts` — este PDF se imprime en la oficina del campo.
  y = cabeceraImpresa(doc, {
    titulo: 'Canon de arrendamiento',
    subtitulo: nombreZona(zona),
    nota: `Relevamiento ${data.datasetFecha}`,
  })

  // ---------- El número ----------
  doc.setTextColor(...GRIS)
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.text('LO QUE SE ESTA PAGANDO EN TU ZONA', M, y)
  y += 12
  doc.setTextColor(...CIELO)
  doc.setFontSize(30)
  doc.setFont('helvetica', 'bold')
  doc.text(`${fmt(zona.kgHaMesCanon, 2)} kg`, M, y)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...TINTA)
  doc.text('de novillo por hectarea y por mes', M + 42, y)
  y += 9
  doc.setFontSize(8.5)
  doc.setTextColor(...GRIS)
  doc.text(`Sobre ${zona.n} casos relevados${zona.n < 10 ? ' - muestra chica, tomalo como orientacion' : ''}`, M, y)
  y += 14

  // ---------- Conversión a pesos ----------
  doc.setDrawColor(...LINEA)
  doc.setFillColor(...PAPEL_ACENTO)
  doc.roundedRect(M, y - 6, W - 2 * M, 34, 2, 2, 'FD')
  doc.setTextColor(...TINTA)
  doc.setFontSize(9.5)
  doc.setFont('helvetica', 'bold')
  doc.text('En pesos, al precio de hoy', M + 6, y + 1)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...GRIS)
  doc.text(
    `Novillo en pie ARS ${fmt(data.novilloArsKg)}/kg vivo (${data.novilloFecha})`,
    M + 6,
    y + 8,
  )
  doc.setFontSize(11)
  doc.setTextColor(...TINTA)
  doc.setFont('helvetica', 'bold')
  doc.text(`ARS ${fmt(canonMensualArs)} por hectarea y por mes`, M + 6, y + 16)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`ARS ${fmt(canonAnualArs)} por hectarea y por año`, M + 6, y + 23)
  y += 40

  // ---------- Contexto de la zona ----------
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TINTA)
  doc.text('El contexto de la zona', M, y)
  y += 8

  const contexto: Array<[string, string]> = [
    ['Valor de la hectarea', `USD ${fmt(zona.usdHa)}`],
    ...(zona.p25 && zona.p75
      ? ([['Dispersion (p25 - p75)', `USD ${fmt(zona.p25)} a USD ${fmt(zona.p75)}`]] as Array<[string, string]>)
      : []),
    ...(zona.kgHaAno
      ? ([['Produccion de la zona', `${fmt(zona.kgHaAno)} kg de carne por ha y por año`]] as Array<[string, string]>)
      : []),
    ...(repagoCanon
      ? ([
          ['Años de canon para repagar la hectarea', `${fmt(repagoCanon, 1)} años`],
        ] as Array<[string, string]>)
      : []),
    ...(zona.aniosRepago
      ? ([
          ['Años de produccion de carne para repagarla', `${fmt(zona.aniosRepago, 1)} años`],
        ] as Array<[string, string]>)
      : []),
    ['Aptitud', zona.aptitud ?? 'sin clasificar'],
  ]

  doc.setFontSize(9)
  for (const [k, v] of contexto) {
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRIS)
    doc.text(k, M, y)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...TINTA)
    doc.text(v, W - M, y, { align: 'right' })
    doc.setDrawColor(...LINEA)
    doc.line(M, y + 2, W - M, y + 2)
    y += 8
  }
  y += 6

  // ---------- Comparables ----------
  if (data.comparables.length) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...TINTA)
    doc.text('Como viene la vecindad', M, y)
    y += 4
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRIS)
    doc.text('Para ver si conviene mirar mas alla del alambrado.', M, y + 4)
    y += 11

    doc.setFillColor(...PAPEL)
    doc.rect(M, y - 5, W - 2 * M, 8, 'F')
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...GRIS)
    doc.text('ZONA', M + 3, y)
    doc.text('CANON', M + 88, y)
    doc.text('USD/HA', M + 125, y)
    doc.text('CASOS', W - M - 3, y, { align: 'right' })
    y += 8

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    for (const c of data.comparables.slice(0, 10)) {
      doc.setTextColor(...TINTA)
      doc.text(nombreZona(c).slice(0, 44), M + 3, y)
      doc.text(`${fmt(c.kgHaMesCanon, 2)} kg`, M + 88, y)
      doc.text(`${fmt(c.usdHa)}`, M + 125, y)
      doc.setTextColor(...GRIS)
      doc.text(`n=${c.n}`, W - M - 3, y, { align: 'right' })
      doc.setDrawColor(...LINEA)
      doc.line(M, y + 2, W - M, y + 2)
      y += 7
    }
  }

  // ---------- Página 2: metodología y límites ----------
  doc.addPage()
  y = 26
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TINTA)
  doc.text('De donde sale cada numero', M, y)
  y += 10

  const bloques: Array<[string, string]> = [
    [
      'El canon',
      zona.canonFuente ??
        'Relevamiento propio de avisos y operaciones publicadas de arrendamiento, zona por zona.',
    ],
    [
      'Por que en kilos y no en pesos',
      'Porque asi se pacta en el campo: el contrato fija kilos por hectarea y por mes, y se liquida al precio del novillo del momento. El canon acompaña la inflacion sin renegociar el contrato.',
    ],
    [
      'El precio del novillo',
      `Mercado Agroganadero de Cañuelas, promedio de la categoria novillo, ARS ${fmt(data.novilloArsKg)}/kg vivo al ${data.novilloFecha}. Se actualiza todos los dias en consignatarias.com.ar/precios`,
    ],
    [
      'El valor de la hectarea',
      'Relevamiento propio de avisos de venta, con el cuartil inferior y superior para mostrar la dispersion real y no solo la mediana.',
    ],
  ]

  for (const [t, d] of bloques) {
    doc.setFontSize(9.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...TINTA)
    doc.text(t, M, y)
    y += 5.5
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRIS)
    for (const linea of doc.splitTextToSize(d, W - 2 * M)) {
      doc.text(linea, M, y)
      y += 4.6
    }
    y += 6
  }

  y += 4
  doc.setFillColor(...AMBAR_PAPEL)
  doc.setDrawColor(...AMBAR)
  const limites =
    'Este informe NO es una tasacion ni asesoramiento legal, y no reemplaza a un matriculado. Es el contexto de mercado de tu zona, con la fuente y la cantidad de casos a la vista, para negociar sabiendo que se esta pagando alrededor. El canon ganadero se paga en kilos de novillo; un campo agricola se arrienda en quintales de soja y no se convierte uno en otro.'
  const lineasLim = doc.splitTextToSize(limites, W - 2 * M - 12)
  doc.roundedRect(M, y, W - 2 * M, lineasLim.length * 4.6 + 14, 2, 2, 'FD')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...AMBAR)
  doc.text('Los limites de este informe', M + 6, y + 8)
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  let yl = y + 14
  for (const linea of lineasLim) {
    doc.text(linea, M + 6, yl)
    yl += 4.6
  }

  // ---------- Pie estampado en todas las páginas ----------
  const total = doc.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRIS_CLARO)
    doc.text(
      `Ejemplar de ${data.compradorEmail} - generado el ${data.generadoISO} - consignatarias.com.ar`,
      M,
      288,
    )
    doc.text(`${i} de ${total}`, W - M, 288, { align: 'right' })
  }

  return doc
}
