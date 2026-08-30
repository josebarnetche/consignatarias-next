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
  cabeceraImpresa,
} from './estilo-impreso'
import type { InformeProvincial, PartidoProvincial } from '@/lib/informes/provincial'

/** Imprimible: fondo blanco, sin bloques de tinta. Ver `estilo-impreso.ts`. */

const W = 210
const M = 18

function fmt(n: number, dec = 0): string {
  return n.toLocaleString('es-AR', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

function pct(n: number | null, dec = 1): string {
  if (n == null) return '—'
  const v = n * 100
  return `${v >= 0 ? '+' : ''}${fmt(v, dec)} %`
}

export function generateInformeProvincialPDF(cruda: InformeProvincial): jsPDF {
  const d = saneaProfundo(cruda)
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  let y = cabeceraImpresa(doc, {
    titulo: d.provincia,
    subtitulo: `Donde esta el rodeo · cierre de ${d.anio}`,
    nota: `Dataset ${d.datasetGenerado}`,
  })

  // ---------- La provincia en números ----------
  const cabeza: Array<[string, string]> = [
    ['CABEZAS', d.totalCabezas != null ? fmt(d.totalCabezas) : '—'],
    ['ESTABLECIMIENTOS', d.totalEstablecimientos != null ? fmt(d.totalEstablecimientos) : '—'],
    ['PARTIDOS CON DATO', fmt(d.partidos.length)],
  ]
  const ancho = (W - 2 * M) / 3
  cabeza.forEach(([k, v], i) => {
    const x = M + i * ancho
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...GRIS_CLARO)
    doc.text(k, x, y)
    doc.setFontSize(15)
    doc.setTextColor(...TINTA)
    doc.text(v, x, y + 8)
  })
  y += 19

  if (d.variacionProvincial != null) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRIS)
    // Sin signo: el verbo ya dice la dirección y un "se achico +18,8 %" se lee como un
    // error de tipeo.
    const verbo = d.variacionProvincial >= 0 ? 'crecio' : 'se achico'
    doc.text(
      `Desde 2012 el rodeo provincial ${verbo} ${fmt(Math.abs(d.variacionProvincial) * 100, 1)} %.`,
      M,
      y,
    )
    y += 10
  }

  doc.setDrawColor(...LINEA)
  doc.line(M, y, W - M, y)
  y += 10

  /**
   * El caso en que NINGÚN partido creció.
   *
   * En Corrientes el mejor de la provincia perdió 9 % en trece años. Titular eso como
   * "en crecimiento" sería mentir, así que el encabezado cambia según el dato.
   */
  const hayCrecimiento = d.enCrecimiento.some((p) => (p.variacion ?? 0) > 0)

  y = bloquePartidos(
    doc,
    y,
    hayCrecimiento ? 'Donde crecio el rodeo' : 'Donde menos se perdio',
    hayCrecimiento
      ? 'Partidos de tamaño relevante que ganaron hacienda desde 2012.'
      : `Ningun partido de ${d.provincia} gano rodeo desde 2012. Estos son los que menos perdieron.`,
    d.enCrecimiento,
  )

  y = bloquePartidos(
    doc,
    y + 4,
    'Donde mas se perdio',
    'Prospectar aca es remar contra la corriente: la hacienda se esta yendo.',
    d.enRetroceso,
  )

  // Nota sobre el piso, para que no parezca que faltan partidos.
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRIS_CLARO)
  for (const l of doc.splitTextToSize(
    `Los dos rankings sólo consideran partidos de ${fmt(d.pisoRodeo)} cabezas o más —la mediana de la provincia—. Sin ese piso, un partido chico que duplica cuarenta animales encabeza la lista y no sirve para prospectar.`.replace(
      /—/g,
      '-',
    ),
    W - 2 * M,
  )) {
    doc.text(l, M, y)
    y += 3.8
  }

  // ---------- Página 2+: todos los partidos ----------
  doc.addPage()
  y = cabeceraImpresa(doc, {
    titulo: 'Todos los partidos',
    subtitulo: `${d.provincia} · ordenados por rodeo`,
    nota: `${d.partidos.length} partidos`,
  })

  y = encabezadoTabla(doc, y)

  for (const p of d.partidos) {
    if (y > 268) {
      doc.addPage()
      y = cabeceraImpresa(doc, {
        titulo: 'Todos los partidos',
        subtitulo: `${d.provincia} · continuacion`,
        nota: `${d.partidos.length} partidos`,
      })
      y = encabezadoTabla(doc, y)
    }
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...TINTA)
    doc.text(p.nombre.slice(0, 26), M + 2, y)
    doc.text(fmt(p.cabezas), M + 56, y)
    doc.setTextColor(...GRIS)
    doc.text(p.establecimientos != null ? fmt(p.establecimientos) : '—', M + 86, y)
    doc.text(p.escalaMedia != null ? fmt(Math.round(p.escalaMedia)) : '—', M + 110, y)
    if (p.invernada) {
      doc.setTextColor(...AMBAR)
      doc.text('invernada', M + 132, y)
    } else {
      doc.setTextColor(...TINTA)
      doc.text(p.indice != null ? `${fmt(p.indice * 100, 0)} %` : '—', M + 132, y)
    }
    doc.setTextColor(...GRIS)
    doc.text(p.variacion != null ? pct(p.variacion, 0) : '—', W - M - 2, y, { align: 'right' })
    doc.setDrawColor(...LINEA)
    doc.line(M, y + 1.8, W - M, y + 1.8)
    y += 5.8
  }

  // ---------- Última página: canal de salida y método ----------
  doc.addPage()
  y = cabeceraImpresa(doc, {
    titulo: 'El canal que ya existe',
    subtitulo: `${d.provincia}`,
    nota: `Al ${d.generadoISO}`,
  })

  const canal: Array<[string, string]> = [
    ['Frigorificos habilitados por SENASA en la provincia', fmt(d.frigorificos)],
    ['Remates por venir en el calendario', fmt(d.rematesProximos)],
    ['Firmas que rematan en la provincia', fmt(d.firmasQueRematan.length)],
  ]
  doc.setFontSize(9.5)
  for (const [k, v] of canal) {
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

  if (d.firmasQueRematan.length) {
    y += 4
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...TINTA)
    doc.text('Con quien se comparte el calendario', M, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...GRIS)
    for (const l of doc.splitTextToSize(d.firmasQueRematan.join(' · '), W - 2 * M)) {
      doc.text(l, M, y)
      y += 4.4
    }
    y += 6
  }

  // Metodología y límites
  y += 4
  doc.setFillColor(...PAPEL_ACENTO)
  doc.setDrawColor(...LINEA)
  const nota =
    'Este informe describe la PROVINCIA, no una cartera: no sabemos quien le consigna a quien fuera del Mercado de Cañuelas. Sirve para decidir donde hay rodeo con quien trabajar, no para saber de quien es. La fuente del stock es censal —cubre los establecimientos declarados— y se actualiza una vez al año, en abril. Los partidos marcados "invernada" tienen mas terneros de los que su rodeo puede parir: ahi entran animales comprados y el indice mide engorde, no eficiencia reproductiva.'
  const ls = doc.splitTextToSize(nota, W - 2 * M - 12)
  doc.roundedRect(M, y, W - 2 * M, ls.length * 4.4 + 13, 2, 2, 'FD')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...CIELO)
  doc.text('Como leer esto', M + 6, y + 7)
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...TINTA)
  let yl = y + 13
  for (const l of ls) {
    doc.text(l, M + 6, yl)
    yl += 4.4
  }
  y = yl + 6

  doc.setFontSize(7.5)
  doc.setTextColor(...GRIS_CLARO)
  for (const l of doc.splitTextToSize(
    `Fuente del stock: ${d.fuente}, dataset del ${d.datasetGenerado}. Frigorificos: registro publico de SENASA. Remates: calendario propio de consignatarias.com.ar. Datos agregados por departamento: no contienen identificacion de personas ni de establecimientos.`,
    W - 2 * M,
  )) {
    doc.text(l, M, y)
    y += 3.8
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

function encabezadoTabla(doc: jsPDF, y: number): number {
  doc.setFillColor(...PAPEL)
  doc.rect(M, y - 5, W - 2 * M, 7, 'F')
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...GRIS)
  doc.text('PARTIDO', M + 2, y)
  doc.text('CABEZAS', M + 56, y)
  doc.text('ESTABLEC.', M + 86, y)
  doc.text('ESCALA', M + 110, y)
  doc.text('TERN./VACA', M + 132, y)
  doc.text('DESDE 2012', W - M - 2, y, { align: 'right' })
  return y + 7
}

/** Un bloque de cinco partidos con su variación. */
function bloquePartidos(
  doc: jsPDF,
  y: number,
  titulo: string,
  bajada: string,
  filas: PartidoProvincial[],
): number {
  if (!filas.length) return y

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TINTA)
  doc.text(titulo, M, y)
  y += 5
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRIS)
  for (const l of doc.splitTextToSize(bajada, W - 2 * M)) {
    doc.text(l, M, y)
    y += 4
  }
  y += 5

  doc.setFontSize(9)
  for (const p of filas) {
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...TINTA)
    doc.text(p.nombre.slice(0, 28), M + 2, y)
    doc.setTextColor(...GRIS)
    doc.text(`${fmt(p.cabezas)} cabezas`, M + 62, y)
    doc.text(p.establecimientos != null ? `${fmt(p.establecimientos)} establec.` : '—', M + 108, y)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...((p.variacion ?? 0) >= 0 ? CIELO : AMBAR))
    doc.text(pct(p.variacion, 0), W - M - 2, y, { align: 'right' })
    doc.setDrawColor(...LINEA)
    doc.line(M, y + 2, W - M, y + 2)
    y += 6.5
  }

  return y + 4
}
