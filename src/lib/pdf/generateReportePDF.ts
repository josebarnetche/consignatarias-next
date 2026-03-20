// Dynamic import for bundle optimization (jsPDF ~200KB)
import type { jsPDF } from 'jspdf'

interface RemateItem {
  fecha: string
  consignataria: string
  ubicacion: string
  tipo: string
  cabezas: number | null
}

interface ReportData {
  fecha: string
  inmag: { current: number; prev: number; change: number }
  categories: Record<string, { current: number; prev: number; change: number }>
  usdBlue: { current: number; prev: number; change: number }
  corn: { current: number; prev: number; change: number }
  rematesHoy?: RemateItem[]
  remates: {
    total: number
    cabezas: number
    provincias: number
    consignatarias: number
    top5: RemateItem[]
  }
}

const CATEGORY_LABELS: Record<string, string> = {
  novillos: 'Novillos',
  novillitos: 'Novillitos',
  vaquillonas: 'Vaquillonas',
  vacas: 'Vacas',
  toros: 'Toros',
  terneros: 'Terneros',
}

function fmt(n: number, decimals = 0): string {
  return n.toLocaleString('es-AR', { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  })
}

export async function generateReportePDF(data: ReportData): Promise<jsPDF> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  const contentWidth = pageWidth - margin * 2
  let y = margin

  // Colors
  const primaryColor: [number, number, number] = [16, 185, 129] // emerald-500
  const darkColor: [number, number, number] = [24, 24, 27] // zinc-900
  const grayColor: [number, number, number] = [113, 113, 122] // zinc-500
  const lightGray: [number, number, number] = [228, 228, 231] // zinc-200

  // Header background (compact)
  doc.setFillColor(...darkColor)
  doc.rect(0, 0, pageWidth, 35, 'F')

  // Logo text
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('CONSIGNATARIAS.COM.AR', margin, 12)

  // Title
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Reporte Diario del Mercado Ganadero', margin, 23)

  // Date
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(156, 163, 175)
  doc.text(data.fecha, margin, 31)

  y = 42

  // === ROW 1: INMAG + Macro (side by side) ===
  const halfWidth = contentWidth / 2 - 2

  // INMAG box
  doc.setFillColor(250, 250, 250)
  doc.rect(margin, y, halfWidth, 28, 'F')
  doc.setDrawColor(...lightGray)
  doc.rect(margin, y, halfWidth, 28, 'S')

  doc.setTextColor(...grayColor)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text('ÍNDICE INMAG', margin + 4, y + 6)

  doc.setTextColor(...darkColor)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(`$${fmt(data.inmag.current)}`, margin + 4, y + 17)

  const changeColor = data.inmag.change >= 0 ? primaryColor : [239, 68, 68] as [number, number, number]
  doc.setTextColor(...changeColor)
  doc.setFontSize(8)
  doc.text(`${data.inmag.change >= 0 ? '+' : ''}${fmt(data.inmag.change, 1)}% semanal`, margin + 4, y + 24)

  // Macro box (USD + Maíz)
  const macroX = margin + halfWidth + 4
  doc.setFillColor(250, 250, 250)
  doc.rect(macroX, y, halfWidth, 28, 'F')
  doc.setDrawColor(...lightGray)
  doc.rect(macroX, y, halfWidth, 28, 'S')

  doc.setTextColor(...grayColor)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text('CONTEXTO MACRO', macroX + 4, y + 6)

  doc.setTextColor(...darkColor)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(`Dólar Blue: $${fmt(data.usdBlue.current)}`, macroX + 4, y + 15)
  doc.text(`Maíz: USD ${fmt(data.corn.current, 1)}/tn`, macroX + 4, y + 24)

  y += 34

  // === ROW 2: Categories (2 rows x 3 cols, compact) ===
  doc.setTextColor(...grayColor)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text('PRECIOS POR CATEGORÍA ($/kg vivo)', margin, y)
  y += 5

  const catEntries = Object.entries(data.categories)
  const colWidth = contentWidth / 3
  let col = 0
  let row = 0

  catEntries.forEach(([key, val]) => {
    const x = margin + col * colWidth
    const yPos = y + row * 11

    doc.setFillColor(250, 250, 250)
    doc.rect(x, yPos, colWidth - 1, 10, 'F')

    doc.setTextColor(...grayColor)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text(CATEGORY_LABELS[key] || key, x + 2, yPos + 4)

    doc.setTextColor(...darkColor)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(`$${fmt(val.current)}`, x + 2, yPos + 9)

    const catChangeColor = val.change >= 0 ? primaryColor : [239, 68, 68] as [number, number, number]
    doc.setTextColor(...catChangeColor)
    doc.setFontSize(7)
    doc.text(`${val.change >= 0 ? '+' : ''}${fmt(val.change, 1)}%`, x + colWidth - 12, yPos + 9)

    col++
    if (col >= 3) {
      col = 0
      row++
    }
  })

  y += row * 11 + 16

  // === ROW 3: Remates HOY (if available) ===
  if (data.rematesHoy && data.rematesHoy.length > 0) {
    doc.setFillColor(...primaryColor)
    doc.rect(margin, y, contentWidth, 7, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text(`REMATES HOY — ${data.rematesHoy.length} remates`, margin + 4, y + 5)
    y += 9

    // Show max 4 remates for today
    const todayRemates = data.rematesHoy.slice(0, 4)
    todayRemates.forEach((r, i) => {
      const rowY = y + i * 9

      doc.setFillColor(i % 2 === 0 ? 255 : 248, i % 2 === 0 ? 255 : 248, i % 2 === 0 ? 255 : 248)
      doc.rect(margin, rowY, contentWidth, 8, 'F')

      doc.setTextColor(...darkColor)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      const name = r.consignataria.length > 30 ? r.consignataria.slice(0, 30) + '...' : r.consignataria
      doc.text(name, margin + 2, rowY + 5.5)

      doc.setTextColor(...grayColor)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.text(r.ubicacion?.slice(0, 20) || '', margin + 80, rowY + 5.5)

      if (r.cabezas) {
        doc.text(`${fmt(r.cabezas)} cab`, margin + contentWidth - 3, rowY + 5.5, { align: 'right' })
      }
    })

    if (data.rematesHoy.length > 4) {
      doc.setTextColor(...grayColor)
      doc.setFontSize(7)
      doc.text(`+${data.rematesHoy.length - 4} más en consignatarias.com.ar`, margin + 2, y + todayRemates.length * 9 + 4)
      y += 6
    }

    y += todayRemates.length * 9 + 6
  }

  // === ROW 4: Próximos 7 días stats bar ===
  doc.setTextColor(...grayColor)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text('PRÓXIMOS 7 DÍAS', margin, y)
  y += 5

  doc.setFillColor(...darkColor)
  doc.rect(margin, y, contentWidth, 14, 'F')

  const statWidth = contentWidth / 4
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')

  doc.text(String(data.remates.total), margin + statWidth * 0.5, y + 8, { align: 'center' })
  doc.text(`~${fmt(data.remates.cabezas)}`, margin + statWidth * 1.5, y + 8, { align: 'center' })
  doc.text(String(data.remates.provincias), margin + statWidth * 2.5, y + 8, { align: 'center' })
  doc.text(String(data.remates.consignatarias), margin + statWidth * 3.5, y + 8, { align: 'center' })

  doc.setFontSize(6)
  doc.setFont('helvetica', 'normal')
  doc.text('Remates', margin + statWidth * 0.5, y + 12, { align: 'center' })
  doc.text('Cabezas', margin + statWidth * 1.5, y + 12, { align: 'center' })
  doc.text('Provincias', margin + statWidth * 2.5, y + 12, { align: 'center' })
  doc.text('Consignatarias', margin + statWidth * 3.5, y + 12, { align: 'center' })

  y += 20

  // === ROW 5: Destacados (max 5, only if space) ===
  const remainingSpace = pageHeight - y - 25 // Leave room for footer
  const maxRows = Math.min(5, Math.floor(remainingSpace / 9))

  if (data.remates.top5.length > 0 && maxRows > 0) {
    doc.setTextColor(...grayColor)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.text('DESTACADOS PRÓXIMOS', margin, y)
    y += 5

    const showRemates = data.remates.top5.slice(0, maxRows)
    showRemates.forEach((r, i) => {
      const rowY = y + i * 8

      doc.setFillColor(i % 2 === 0 ? 255 : 248, i % 2 === 0 ? 255 : 248, i % 2 === 0 ? 255 : 248)
      doc.rect(margin, rowY, contentWidth, 7, 'F')

      // Date
      doc.setTextColor(...grayColor)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.text(r.fecha.slice(5).replace('-', '/'), margin + 2, rowY + 5)

      // Consignataria name
      doc.setTextColor(...darkColor)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      const consigName = r.consignataria.length > 25 ? r.consignataria.slice(0, 25) + '...' : r.consignataria
      doc.text(consigName, margin + 15, rowY + 5)

      // Type
      doc.setTextColor(...grayColor)
      doc.setFontSize(6)
      doc.setFont('helvetica', 'normal')
      const tipoShort = r.tipo.toUpperCase().slice(0, 10)
      doc.text(tipoShort, margin + contentWidth - 3, rowY + 5, { align: 'right' })
    })

    y += showRemates.length * 8 + 5
  }

  // === Footer ===
  const footerY = pageHeight - 12
  doc.setDrawColor(...lightGray)
  doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3)

  doc.setTextColor(...grayColor)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text('Generado por consignatarias.com.ar — El mercado ganadero en una sola pantalla', margin, footerY)

  doc.setTextColor(...primaryColor)
  doc.text('www.consignatarias.com.ar', pageWidth - margin, footerY, { align: 'right' })

  return doc
}
