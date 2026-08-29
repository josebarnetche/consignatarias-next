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
  cabeceraImpresa,
} from './estilo-impreso'
import type { ParteSemanal, Lectura } from '@/lib/informes/semanal'

/**
 * generateParteSemanalPDF — el Parte Semanal del Mercado.
 *
 * Diseñado **para imprimir**: fondo blanco, sin bloques rellenos grandes, contraste que
 * sobrevive al blanco y negro. Ver `estilo-impreso.ts`. Se manda por mail y termina
 * pinchado en la oficina del campo, no leído en una pantalla oscura.
 *
 * Dos páginas fijas: la lectura del mercado y la agenda. Si no entra, se recorta la
 * agenda — nunca se estira a una tercera hoja, porque un parte semanal que no cabe en una
 * hoja doblada al medio deja de leerse.
 */

const W = 210
const M = 18

function fmt(n: number, dec = 0): string {
  return n.toLocaleString('es-AR', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

export function generateParteSemanalPDF(cruda: ParteSemanal): jsPDF {
  const data = saneaProfundo(cruda)
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  let y = cabeceraImpresa(doc, {
    titulo: 'Parte semanal del mercado',
    subtitulo: `Semana ${data.semanaISO}`,
    nota: `Cierre al ${data.fechaCorte}`,
  })

  // ---------- Las tres lecturas ----------
  for (const [etiqueta, l] of [
    ['NOVILLO EN PESOS', data.novillo],
    ['EL MISMO NOVILLO, EN DOLARES', data.dolarizado],
    ['MAIZ / NOVILLO', data.maizNovillo],
  ] as Array<[string, Lectura]>) {
    y = bloqueLectura(doc, y, etiqueta, l)
  }

  // ---------- Categorías ----------
  y += 4
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TINTA)
  doc.text('Todas las categorias', M, y)
  y += 7

  doc.setFillColor(...PAPEL)
  doc.rect(M, y - 5, W - 2 * M, 7, 'F')
  doc.setFontSize(7.5)
  doc.setTextColor(...GRIS)
  doc.text('CATEGORIA', M + 3, y)
  doc.text('ARS/KG VIVO', M + 90, y)
  doc.text('SEMANA', W - M - 3, y, { align: 'right' })
  y += 7

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  for (const c of data.categorias) {
    doc.setTextColor(...TINTA)
    doc.text(c.nombre, M + 3, y)
    doc.setFont('helvetica', 'bold')
    doc.text(fmt(c.precio), M + 90, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRIS)
    doc.text(`${c.variacion >= 0 ? '+' : ''}${fmt(c.variacion, 1)} %`, W - M - 3, y, { align: 'right' })
    doc.setDrawColor(...LINEA)
    doc.line(M, y + 2, W - M, y + 2)
    y += 6.5
  }

  // ---------- Estacionalidad ----------
  const conDato = data.estacional.filter((e) => e.valor != null)
  if (conDato.length >= 2) {
    y += 8
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...TINTA)
    doc.text('La misma semana, en años anteriores', M, y)
    y += 5
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRIS)
    doc.text('En pesos corrientes: no comparar sin mirar la inflacion del periodo.', M, y + 3)
    y += 10

    const ancho = (W - 2 * M) / conDato.length
    conDato.forEach((e, i) => {
      const x = M + i * ancho
      doc.setFontSize(8)
      doc.setTextColor(...GRIS_CLARO)
      doc.text(String(e.anio), x + ancho / 2, y, { align: 'center' })
      doc.setFontSize(10.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...TINTA)
      doc.text(fmt(e.valor!), x + ancho / 2, y + 6, { align: 'center' })
      doc.setFont('helvetica', 'normal')
    })
    y += 12
  }

  // ---------- Página 2: agenda ----------
  doc.addPage()
  y = cabeceraImpresa(doc, {
    titulo: 'Los proximos remates',
    subtitulo: 'Siete dias por delante',
    nota: `Semana ${data.semanaISO}`,
  })

  if (data.agenda.length === 0) {
    doc.setFontSize(9.5)
    doc.setTextColor(...GRIS)
    doc.text('No hay remates cargados para los proximos siete dias.', M, y)
    y += 8
  } else {
    doc.setFillColor(...PAPEL)
    doc.rect(M, y - 5, W - 2 * M, 7, 'F')
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...GRIS)
    doc.text('FECHA', M + 3, y)
    doc.text('FIRMA', M + 28, y)
    doc.text('LUGAR', M + 105, y)
    doc.text('TIPO', W - M - 3, y, { align: 'right' })
    y += 7

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    for (const r of data.agenda) {
      if (y > 262) break // no se estira a una tercera hoja
      doc.setTextColor(...GRIS)
      doc.text(r.fecha, M + 3, y)
      doc.setTextColor(...TINTA)
      doc.text(r.firma.slice(0, 40), M + 28, y)
      doc.setTextColor(...GRIS)
      doc.text(r.lugar.slice(0, 30), M + 105, y)
      doc.text(r.tipo.slice(0, 12), W - M - 3, y, { align: 'right' })
      doc.setDrawColor(...LINEA)
      doc.line(M, y + 2, W - M, y + 2)
      y += 6.2
    }
  }

  // ---------- Cómo leer esto ----------
  y += 8
  doc.setFillColor(...PAPEL_ACENTO)
  doc.setDrawColor(...LINEA)
  const nota =
    'Este parte no dice si conviene vender. Dice que paso, con que se compara y si el movimiento se distingue de la volatilidad normal de la serie. Cuando un numero no alcanza para afirmar algo, lo decimos en vez de titularlo. El indice es el novillo del Mercado de Cañuelas: mercado de gordo y mayormente pampeano.'
  const lineas = doc.splitTextToSize(nota, W - 2 * M - 12)
  doc.roundedRect(M, y, W - 2 * M, lineas.length * 4.4 + 13, 2, 2, 'FD')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...CIELO)
  doc.text('Como leer esto', M + 6, y + 7)
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...TINTA)
  let yl = y + 13
  for (const l of lineas) {
    doc.text(l, M + 6, yl)
    yl += 4.4
  }
  y = yl + 6

  doc.setFontSize(7.5)
  doc.setTextColor(...GRIS_CLARO)
  for (const l of doc.splitTextToSize(data.fuentes, W - 2 * M)) {
    doc.text(l, M, y)
    y += 3.8
  }

  // ---------- Pie estampado ----------
  const total = doc.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRIS_CLARO)
    doc.text(
      `Ejemplar de ${data.compradorEmail} - ${data.generadoISO} - consignatarias.com.ar`,
      M,
      288,
    )
    doc.text(`${i} de ${total}`, W - M, 288, { align: 'right' })
  }

  return doc
}

/** Un bloque de lectura: etiqueta, número grande, titular y contexto. */
function bloqueLectura(doc: jsPDF, y: number, etiqueta: string, l: Lectura): number {
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...GRIS_CLARO)
  doc.text(etiqueta, M, y)
  y += 8

  doc.setFontSize(17)
  doc.setTextColor(...TINTA)
  doc.text(l.valor, M, y)

  // Marca de señal: un punto de acento, no un badge relleno. Y el titular dice lo mismo
  // en palabras, así que en blanco y negro no se pierde nada.
  if (l.esSenal) {
    doc.setFillColor(...CIELO)
    doc.circle(W - M - 2, y - 3, 1.6, 'F')
  }
  y += 7

  doc.setFontSize(10)
  doc.setFont('helvetica', l.esSenal ? 'bold' : 'normal')
  doc.setTextColor(...(l.esSenal ? CIELO : GRIS))
  for (const linea of doc.splitTextToSize(l.titular, W - 2 * M)) {
    doc.text(linea, M, y)
    y += 5
  }

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRIS)
  for (const linea of doc.splitTextToSize(l.contexto, W - 2 * M)) {
    doc.text(linea, M, y)
    y += 4.4
  }

  doc.setDrawColor(...LINEA)
  doc.line(M, y + 2, W - M, y + 2)
  return y + 10
}
