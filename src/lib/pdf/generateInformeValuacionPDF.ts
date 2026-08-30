import { jsPDF } from 'jspdf'
import { saneaProfundo } from './winansi'
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
import type { InformeValuacion } from '@/lib/informes/valuacion'

/** Imprimible: fondo blanco, sin bloques de tinta. Ver `estilo-impreso.ts`. */

const W = 210
const M = 18

function fmt(n: number, dec = 0): string {
  return n.toLocaleString('es-AR', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

export function generateInformeValuacionPDF(cruda: InformeValuacion): jsPDF {
  const d = saneaProfundo(cruda)
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const { v, t } = d

  let y = cabeceraImpresa(doc, {
    titulo: 'Valor de la hectarea',
    subtitulo: d.zonaNombre,
    nota: `Relevamiento ${d.datasetFecha}`,
  })

  // ---------- El número ----------
  doc.setTextColor(...GRIS)
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'bold')
  doc.text('LO QUE SE ESTA PAGANDO EN TU ZONA', M, y)
  y += 12
  doc.setTextColor(...CIELO)
  doc.setFontSize(30)
  doc.text(`USD ${fmt(v.usdHa)}`, M, y)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...TINTA)
  doc.text('por hectarea', M + 62, y)
  y += 9

  doc.setFontSize(8.5)
  doc.setTextColor(...GRIS)
  const conf =
    v.confianza === 'alta'
      ? 'Confianza alta: la zona tiene relevamiento propio y canon de referencia.'
      : v.confianza === 'media'
        ? 'Confianza media: se usa la referencia provincial, no una zona puntual.'
        : 'Confianza baja: muestra chica. Tomalo como orientacion, no como referencia.'
  doc.text(conf, M, y)
  y += 12

  // ---------- La dispersión, que es lo que hace negociable el número ----------
  if (t.p25 && t.p75) {
    doc.setDrawColor(...LINEA)
    doc.setFillColor(...PAPEL_ACENTO)
    doc.roundedRect(M, y - 6, W - 2 * M, 30, 2, 2, 'FD')
    doc.setFontSize(9.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...TINTA)
    doc.text('La banda en la que se opera', M + 6, y + 1)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...GRIS)
    doc.text(
      `De cada cuatro operaciones relevadas, una se cerro por debajo de USD ${fmt(t.p25)} y otra por encima de USD ${fmt(t.p75)}.`,
      M + 6,
      y + 9,
    )
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...TINTA)
    doc.text(`USD ${fmt(t.p25)}  —  USD ${fmt(t.p75)}`, M + 6, y + 18)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...GRIS_CLARO)
    doc.text(`sobre ${t.n} casos relevados`, M + 78, y + 18)
    y += 34
  }

  // ---------- Las dos vías ----------
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TINTA)
  doc.text('De donde sale ese numero', M, y)
  y += 5
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRIS)
  doc.text('Dos caminos independientes, como en cualquier tasacion seria.', M, y + 3)
  y += 11

  const vias: Array<[string, string, string]> = []
  if (v.porRenta) {
    vias.push([
      'Por renta',
      `USD ${fmt(v.porRenta.usdHa)}`,
      `El arrendamiento de la zona da USD ${fmt(v.porRenta.canonAnualUsdHa)} por ha y por año. A ${fmt(v.porRenta.anos, 1)} años de repago.`,
    ])
  }
  if (v.porComparables) {
    vias.push([
      'Por comparables',
      `USD ${fmt(v.porComparables.usdHa)}`,
      `Mediana de ${v.porComparables.n} operaciones y avisos relevados en ${v.porComparables.region}.`,
    ])
  }

  for (const [titulo, valor, detalle] of vias) {
    doc.setFontSize(9.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...TINTA)
    doc.text(titulo, M, y)
    doc.setTextColor(...CIELO)
    doc.text(valor, M + 42, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...GRIS)
    for (const l of doc.splitTextToSize(detalle, W - 2 * M)) {
      doc.text(l, M, y)
      y += 4.3
    }
    y += 4
  }

  // La brecha entre las dos vías es información, no un error.
  if (v.brecha != null && Math.abs(v.brecha) > 20) {
    doc.setFillColor(...AMBAR_PAPEL)
    doc.setDrawColor(...AMBAR)
    const txt = `Las dos vias se apartan ${fmt(Math.abs(v.brecha))} %. Eso tambien es informacion: un campo cuyo canon implica bastante mas que el comparable de su zona esta caro de arrendar, o es mejor que el promedio de la zona. Al reves, esta barato o es peor.`
    const ls = doc.splitTextToSize(txt, W - 2 * M - 12)
    doc.roundedRect(M, y, W - 2 * M, ls.length * 4.3 + 9, 2, 2, 'FD')
    doc.setFontSize(8.5)
    doc.setTextColor(...AMBAR)
    let yl = y + 6
    for (const l of ls) {
      doc.text(l, M + 6, yl)
      yl += 4.3
    }
    y = yl + 6
  }

  // ---------- Los dos repagos ----------
  y += 2
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TINTA)
  doc.text('Cuanto tarda en pagarse', M, y)
  y += 8

  const repagos: Array<[string, string]> = [
    ...(d.aniosPorCanon
      ? ([['Años de arrendamiento', `${fmt(d.aniosPorCanon, 1)} años`]] as Array<[string, string]>)
      : []),
    ...(d.aniosPorProduccion
      ? ([
          ['Años de produccion bruta del campo', `${fmt(d.aniosPorProduccion, 1)} años`],
        ] as Array<[string, string]>)
      : []),
    ...(t.kg_ha_ano
      ? ([['Produccion de la zona', `${fmt(t.kg_ha_ano)} kg de carne por ha y por año`]] as Array<[string, string]>)
      : []),
    ['Aptitud', t.aptitud ?? 'sin clasificar'],
  ]

  doc.setFontSize(9)
  for (const [k, val] of repagos) {
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRIS)
    doc.text(k, M, y)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...TINTA)
    doc.text(val, W - M, y, { align: 'right' })
    doc.setDrawColor(...LINEA)
    doc.line(M, y + 2, W - M, y + 2)
    y += 8
  }

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRIS_CLARO)
  for (const l of doc.splitTextToSize(
    'Son dos preguntas distintas y se confunden seguido: el primero es lo que tarda quien ALQUILA la hectarea en recuperarla; el segundo, lo que tarda la produccion entera del campo. En zona de cria el segundo puede ser la mitad del primero.',
    W - 2 * M,
  )) {
    doc.text(l, M, y)
    y += 3.9
  }

  // ---------- Página 2: comparables y límites ----------
  doc.addPage()
  y = cabeceraImpresa(doc, {
    titulo: 'Como viene la vecindad',
    subtitulo: d.zonaNombre,
    nota: `Relevamiento ${d.datasetFecha}`,
  })

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRIS)
  doc.text('Para ver si conviene mirar mas alla del alambrado.', M, y)
  y += 9

  doc.setFillColor(...PAPEL)
  doc.rect(M, y - 5, W - 2 * M, 8, 'F')
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...GRIS)
  doc.text('ZONA', M + 3, y)
  doc.text('USD/HA', M + 86, y)
  doc.text('BANDA', M + 112, y)
  doc.text('CASOS', W - M - 3, y, { align: 'right' })
  y += 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  for (const c of d.comparables) {
    doc.setTextColor(...TINTA)
    doc.text(c.nombre.slice(0, 42), M + 3, y)
    doc.text(fmt(c.usdHa), M + 86, y)
    doc.setTextColor(...GRIS)
    doc.text(c.p25 && c.p75 ? `${fmt(c.p25)} - ${fmt(c.p75)}` : '—', M + 112, y)
    doc.text(`n=${c.n}`, W - M - 3, y, { align: 'right' })
    doc.setDrawColor(...LINEA)
    doc.line(M, y + 2, W - M, y + 2)
    y += 6.4
  }

  // ---------- Método y límites ----------
  y += 8
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TINTA)
  doc.text('De donde sale cada numero', M, y)
  y += 9

  const bloques: Array<[string, string]> = [
    [
      'El valor de la hectarea',
      t.fuente ?? 'Relevamiento propio de avisos y operaciones publicadas, zona por zona.',
    ],
    [
      'El canon de la zona',
      t.canon_fuente ??
        'Relevamiento propio de avisos de arrendamiento. Se anualiza y se pasa a dolares al precio del novillo del mes.',
    ],
    [
      'El precio de referencia',
      v.esAgricola
        ? `Soja disponible estimada en USD ${fmt(d.sojaUsdQuintal, 1)} por quintal, a partir del FOB de MAGyP.`
        : `Novillo en pie a USD ${fmt(d.novilloUsdKg, 2)} por kilo vivo: promedio del mes en el Mercado de Cañuelas, al dolar blue.`,
    ],
  ]

  for (const [tit, det] of bloques) {
    doc.setFontSize(9.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...TINTA)
    doc.text(tit, M, y)
    y += 5.5
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRIS)
    for (const l of doc.splitTextToSize(det, W - 2 * M)) {
      doc.text(l, M, y)
      y += 4.4
    }
    y += 5
  }

  y += 2
  doc.setFillColor(...AMBAR_PAPEL)
  doc.setDrawColor(...AMBAR)
  const limites =
    'Este informe NO es una tasacion y no reemplaza a un matriculado: nadie fue a ver tu campo. Es el contexto de mercado de tu zona —que se paga alrededor, con que dispersion y sobre cuantos casos— para sentarte a negociar sabiendo donde estas parado. Un campo concreto puede valer bastante mas o bastante menos que la mediana de su zona segun aguadas, alambrados, acceso y estado del pastizal.'
  const ls = doc.splitTextToSize(limites, W - 2 * M - 12)
  doc.roundedRect(M, y, W - 2 * M, ls.length * 4.4 + 13, 2, 2, 'FD')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...AMBAR)
  doc.text('Los limites de este informe', M + 6, y + 7)
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...TINTA)
  let yl = y + 13
  for (const l of ls) {
    doc.text(l, M + 6, yl)
    yl += 4.4
  }

  // ---------- Pie ----------
  const total = doc.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRIS_CLARO)
    doc.text(`Ejemplar de ${d.compradorEmail} - ${d.generadoISO} - consignatarias.com.ar`, M, 288)
    doc.text(`${i} de ${total}`, W - M, 288, { align: 'right' })
  }

  return doc
}
