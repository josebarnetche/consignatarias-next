/**
 * estilo-impreso.ts — la paleta y las reglas de los PDF que la gente imprime.
 *
 * POR QUÉ EXISTE
 * El sitio es una terminal oscura y eso está bien en pantalla, pero un PDF es otra cosa:
 * se manda por mail, se abre en el teléfono y **se imprime en la oficina del campo**, casi
 * siempre en una impresora hogareña con cartucho caro. Una tapa negra a sangre en A4 son
 * 210 × 297 mm de tinta sólida: sale mal, tarda, y el productor la termina leyendo en
 * pantalla igual.
 *
 * LAS REGLAS
 *  1. **Fondo blanco siempre.** Nunca un bloque relleno que ocupe más de ~15 mm de alto.
 *  2. **El color va en el texto y en líneas finas**, no en rellenos grandes.
 *  3. Los fondos de apoyo son grises casi blancos (>= 96 % de luminosidad): se ven en
 *     pantalla y prácticamente no consumen tinta.
 *  4. Contraste alto para que también funcione **impreso en blanco y negro**: nada
 *     depende sólo del color para entenderse.
 *
 * Lo usan `generateInformeCanonPDF` y el reporte semanal. Si aparece un generador nuevo,
 * usa esto en vez de inventar su propia paleta.
 */

/** Tinta principal — casi negro, para títulos y cifras. */
export const TINTA: [number, number, number] = [24, 32, 48]

/** Texto secundario. Legible impreso, no compite con la tinta. */
export const GRIS: [number, number, number] = [88, 100, 118]

/** Gris claro para notas al pie y etiquetas. */
export const GRIS_CLARO: [number, number, number] = [130, 142, 158]

/** El acento de marca, oscurecido para que rinda sobre papel blanco. */
export const CIELO: [number, number, number] = [7, 89, 115]

/** Fondos de apoyo. Casi blancos a propósito: se ven y no gastan tinta. */
export const PAPEL: [number, number, number] = [250, 251, 252]
export const PAPEL_ACENTO: [number, number, number] = [240, 248, 252]

/** Líneas y bordes. */
export const LINEA: [number, number, number] = [214, 222, 232]
export const LINEA_FUERTE: [number, number, number] = [160, 174, 192]

/** Ámbar para advertencias — sobrevive a la impresión en escala de grises. */
export const AMBAR: [number, number, number] = [124, 78, 12]
export const AMBAR_PAPEL: [number, number, number] = [254, 251, 240]

/**
 * Alto máximo, en milímetros, de un bloque de color relleno.
 *
 * Por encima de esto el bloque deja de ser un detalle y pasa a ser fondo, que es lo que
 * arruina la impresión. La cabecera de un informe se resuelve con una línea de acento y
 * texto oscuro, no con una barra rellena.
 */
export const MAX_ALTO_RELLENO_MM = 15

/**
 * Cabecera imprimible: título, bajada, y una regla de acento.
 *
 * Reemplaza a la barra oscura a todo el ancho. Ocupa lo mismo visualmente y no gasta
 * tinta. Devuelve la `y` donde sigue el contenido.
 */
export function cabeceraImpresa(
  // Se tipa contra el jsPDF real y no contra una interfaz propia: duplicar la firma de
  // `text()` obliga a mantener dos definiciones que se despegan al primer cambio de la
  // librería.
  doc: import('jspdf').jsPDF,
  opts: {
    titulo: string
    subtitulo: string
    marca?: string
    nota?: string
    anchoMm?: number
    margenMm?: number
  },
): number {
  const W = opts.anchoMm ?? 210
  const M = opts.margenMm ?? 18

  // Regla de acento: 3 mm de alto, no 42.
  doc.setFillColor(...CIELO)
  doc.rect(M, 16, W - 2 * M, 1.2, 'F')

  doc.setTextColor(...GRIS_CLARO)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.text((opts.marca ?? 'CONSIGNATARIAS.COM.AR').toUpperCase(), M, 13)
  if (opts.nota) doc.text(opts.nota, W - M, 13, { align: 'right' })

  doc.setTextColor(...TINTA)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text(opts.titulo, M, 29)

  doc.setTextColor(...CIELO)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(opts.subtitulo, M, 37)

  return 50
}
