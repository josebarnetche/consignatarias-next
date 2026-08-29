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
import type { InformeDepartamental } from '@/lib/informes/departamental'

/** Imprimible: fondo blanco, sin bloques de tinta. Ver `estilo-impreso.ts`. */

const W = 210
const M = 18

function fmt(n: number, dec = 0): string {
  return n.toLocaleString('es-AR', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

function pct(n: number | null, dec = 1): string {
  return n == null ? '—' : `${fmt(n * 100, dec)} %`
}

export function generateInformeDepartamentalPDF(cruda: InformeDepartamental): jsPDF {
  const d = saneaProfundo(cruda)
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  let y = cabeceraImpresa(doc, {
    titulo: d.departamento,
    subtitulo: `${d.provincia} · rodeo al 31 de diciembre de ${d.anio}`,
    nota: `Dataset ${d.datasetGenerado}`,
  })

  // ---------- Los tres números de arriba ----------
  const cabeza: Array<[string, string]> = [
    ['CABEZAS', fmt(d.totalCabezas)],
    ['ESTABLECIMIENTOS', d.establecimientos != null ? fmt(d.establecimientos) : '—'],
    ['CABEZAS POR ESTABLECIMIENTO', d.escalaMedia != null ? fmt(d.escalaMedia) : '—'],
  ]
  const ancho = (W - 2 * M) / 3
  cabeza.forEach(([k, v], i) => {
    const x = M + i * ancho
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...GRIS_CLARO)
    doc.text(k, x, y)
    doc.setFontSize(16)
    doc.setTextColor(...TINTA)
    doc.text(v, x, y + 8)
  })
  y += 20

  // ---------- La eficiencia ----------
  doc.setDrawColor(...LINEA)
  doc.line(M, y, W - M, y)
  y += 10

  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...GRIS_CLARO)
  doc.text('TERNEROS POR VACA', M, y)
  y += 9
  doc.setFontSize(26)
  doc.setTextColor(...CIELO)
  doc.text(pct(d.indice), M, y)

  if (d.puesto && d.deCuantos) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRIS)
    doc.text(`Puesto ${d.puesto} de ${d.deCuantos} en ${d.provincia}`, M + 48, y)
  }
  y += 9

  // El caso en que el indicador no significa lo que parece.
  if (d.compraTerneros) {
    doc.setFillColor(...AMBAR_PAPEL)
    doc.setDrawColor(...AMBAR)
    const txt =
      'Este departamento tiene mas terneros de los que su rodeo de vacas puede parir: el exceso son terneros COMPRADOS. Es zona de invernada, no de cria, y aca el indice deja de medir eficiencia reproductiva. Por eso este informe no calcula destete.'
    const ls = doc.splitTextToSize(txt, W - 2 * M - 12)
    doc.roundedRect(M, y, W - 2 * M, ls.length * 4.3 + 8, 2, 2, 'FD')
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...AMBAR)
    let yl = y + 6
    for (const l of ls) {
      doc.text(l, M + 6, yl)
      yl += 4.3
    }
    y = yl + 6
  } else if (d.destete != null) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRIS)
    const ls = doc.splitTextToSize(
      `Destete estimado: ${pct(d.destete)}. Es una estimacion, no una medicion: el origen no separa vacas de cria de vacas de invernada, asi que se asume que el 83 % de las vacas entra en servicio (supuesto de INTA para el NEA, Cria Vacuna en el NEA 2018, pags. 9-10).`,
      W - 2 * M,
    )
    for (const l of ls) {
      doc.text(l, M, y)
      y += 4.4
    }
    y += 4
  }

  // ---------- Dónde está parado ----------
  if (d.referencias.length) {
    y += 4
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...TINTA)
    doc.text('Contra su provincia', M, y)
    y += 8

    doc.setFontSize(9)
    for (const r of d.referencias) {
      doc.setFont('helvetica', r.esEsteDepartamento ? 'bold' : 'normal')
      doc.setTextColor(...(r.esEsteDepartamento ? CIELO : TINTA))
      doc.text(r.nombre.slice(0, 40), M + 3, y)
      doc.text(pct(r.indice), W - M - 3, y, { align: 'right' })
      doc.setDrawColor(...LINEA)
      doc.line(M, y + 2, W - M, y + 2)
      y += 6.5
    }
    y += 4
  }

  // ---------- Composición del rodeo ----------
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TINTA)
  doc.text('Como esta compuesto el rodeo', M, y)
  y += 8

  doc.setFillColor(...PAPEL)
  doc.rect(M, y - 5, W - 2 * M, 7, 'F')
  doc.setFontSize(7.5)
  doc.setTextColor(...GRIS)
  doc.text('CATEGORIA', M + 3, y)
  doc.text('CABEZAS', M + 85, y)
  doc.text('DEL RODEO', W - M - 3, y, { align: 'right' })
  y += 7

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  for (const c of d.composicion) {
    doc.setTextColor(...TINTA)
    doc.text(c.nombre, M + 3, y)
    doc.text(fmt(c.cabezas), M + 85, y)
    doc.setTextColor(...GRIS)
    doc.text(pct(c.porcentaje, 1), W - M - 3, y, { align: 'right' })
    doc.setDrawColor(...LINEA)
    doc.line(M, y + 2, W - M, y + 2)
    y += 6.3
  }

  // ---------- Página 2: la serie ----------
  doc.addPage()
  y = cabeceraImpresa(doc, {
    titulo: 'Como viene',
    subtitulo: `${d.departamento}, ${d.serie[0]?.anio ?? ''} a ${d.anio}`,
    nota: `${d.provincia}`,
  })

  if (d.variacionStock != null) {
    doc.setFontSize(10.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...TINTA)
    const dir = d.variacionStock >= 0 ? 'gano' : 'perdio'
    doc.text(
      `El rodeo ${dir} ${pct(Math.abs(d.variacionStock))} desde ${d.serie[0]?.anio ?? 2012}.`,
      M,
      y,
    )
    y += 6
    if (d.variacionIndicePuntos != null) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9.5)
      doc.setTextColor(...GRIS)
      const signo = d.variacionIndicePuntos >= 0 ? '+' : ''
      doc.text(
        `En el mismo periodo la relacion terneros/vaca se movio ${signo}${fmt(d.variacionIndicePuntos, 1)} puntos.`,
        M,
        y,
      )
      y += 8
    }
  }

  doc.setFillColor(...PAPEL)
  doc.rect(M, y - 5, W - 2 * M, 7, 'F')
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...GRIS)
  doc.text('AÑO', M + 3, y)
  doc.text('CABEZAS', M + 45, y)
  doc.text('TERNEROS/VACA', M + 105, y)
  doc.text('NOTA', W - M - 3, y, { align: 'right' })
  y += 7

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  for (const s of d.serie) {
    if (y > 258) break
    doc.setTextColor(...TINTA)
    doc.text(String(s.anio), M + 3, y)
    doc.text(fmt(s.total), M + 45, y)
    doc.text(pct(s.indice), M + 105, y)
    if (s.conRuido) {
      doc.setTextColor(...AMBAR)
      doc.setFontSize(7.5)
      doc.text('dato con ruido', W - M - 3, y, { align: 'right' })
      doc.setFontSize(9)
    }
    doc.setDrawColor(...LINEA)
    doc.line(M, y + 2, W - M, y + 2)
    y += 6.2
  }

  // ---------- Cómo leerlo ----------
  y += 8
  const conRuido = d.serie.some((s) => s.conRuido)
  const nota =
    'Este informe describe la ZONA, no tu campo: nadie midio tu rodeo. El dato es el agregado del departamento y sirve para saber contra que te estas comparando. La fuente es censal (cubre los establecimientos declarados), no una muestra.' +
    (conRuido
      ? ' Los años marcados "dato con ruido" son aquellos en los que el organismo publico dos filas para este departamento y hubo que sumarlas: la cifra de esos años carga esa imprecision.'
      : '')

  doc.setFillColor(...PAPEL_ACENTO)
  doc.setDrawColor(...LINEA)
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
    `Fuente: ${d.paisFuente}. Dataset generado el ${d.datasetGenerado}. Datos agregados por departamento: no contienen identificacion de personas ni de establecimientos.`,
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
