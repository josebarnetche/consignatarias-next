import { jsPDF } from 'jspdf'

interface ReportData {
  fecha: string
  inmag: { current: number; prev: number; change: number }
  categories: Record<string, { current: number; prev: number; change: number }>
  usdBlue: { current: number; prev: number; change: number }
  corn: { current: number; prev: number; change: number }
  remates: {
    total: number
    cabezas: number
    provincias: number
    consignatarias: number
    top5: Array<{
      fecha: string
      consignataria: string
      ubicacion: string
      tipo: string
      cabezas: number | null
    }>
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

export function generateReportePDF(data: ReportData): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  const contentWidth = pageWidth - margin * 2
  let y = margin

  // Colors
  const primaryColor: [number, number, number] = [16, 185, 129] // emerald-500
  const darkColor: [number, number, number] = [24, 24, 27] // zinc-900
  const grayColor: [number, number, number] = [113, 113, 122] // zinc-500
  const lightGray: [number, number, number] = [228, 228, 231] // zinc-200

  // Header background
  doc.setFillColor(...darkColor)
  doc.rect(0, 0, pageWidth, 45, 'F')

  // Logo text
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('CONSIGNATARIAS.COM.AR', margin, 15)

  // Title
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Reporte Semanal del Mercado Ganadero', margin, 28)

  // Date
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(156, 163, 175)
  doc.text(data.fecha, margin, 38)

  y = 55

  // INMAG Section
  doc.setFillColor(250, 250, 250)
  doc.rect(margin, y, contentWidth, 35, 'F')
  doc.setDrawColor(...lightGray)
  doc.rect(margin, y, contentWidth, 35, 'S')

  doc.setTextColor(...grayColor)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('ÍNDICE INMAG', margin + 5, y + 8)

  doc.setTextColor(...darkColor)
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text(`$${fmt(data.inmag.current)}`, margin + 5, y + 22)

  doc.setFontSize(10)
  const changeColor = data.inmag.change >= 0 ? primaryColor : [239, 68, 68] as [number, number, number]
  doc.setTextColor(...changeColor)
  doc.text(`${data.inmag.change >= 0 ? '+' : ''}${fmt(data.inmag.change, 1)}% vs semana anterior`, margin + 5, y + 30)

  y += 45

  // Categories table
  doc.setTextColor(...grayColor)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('PRECIOS POR CATEGORÍA ($/kg vivo)', margin, y)
  y += 8

  const catEntries = Object.entries(data.categories)
  const colWidth = contentWidth / 3
  let col = 0
  let row = 0

  catEntries.forEach(([key, val]) => {
    const x = margin + col * colWidth
    const yPos = y + row * 15

    doc.setFillColor(250, 250, 250)
    doc.rect(x, yPos, colWidth - 2, 13, 'F')

    doc.setTextColor(...grayColor)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(CATEGORY_LABELS[key] || key, x + 3, yPos + 5)

    doc.setTextColor(...darkColor)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(`$${fmt(val.current)}`, x + 3, yPos + 11)

    const catChangeColor = val.change >= 0 ? primaryColor : [239, 68, 68] as [number, number, number]
    doc.setTextColor(...catChangeColor)
    doc.setFontSize(8)
    doc.text(`${val.change >= 0 ? '+' : ''}${fmt(val.change, 1)}%`, x + colWidth - 20, yPos + 11)

    col++
    if (col >= 3) {
      col = 0
      row++
    }
  })

  y += row * 15 + 25

  // Macro context
  doc.setTextColor(...grayColor)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('CONTEXTO MACRO', margin, y)
  y += 8

  // USD Blue
  doc.setFillColor(250, 250, 250)
  doc.rect(margin, y, contentWidth / 2 - 2, 20, 'F')
  doc.setTextColor(...grayColor)
  doc.setFontSize(8)
  doc.text('Dólar Blue', margin + 5, y + 6)
  doc.setTextColor(...darkColor)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(`$${fmt(data.usdBlue.current)}`, margin + 5, y + 15)

  // Corn
  doc.rect(margin + contentWidth / 2, y, contentWidth / 2 - 2, 20, 'F')
  doc.setTextColor(...grayColor)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('Maíz', margin + contentWidth / 2 + 5, y + 6)
  doc.setTextColor(...darkColor)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(`USD ${fmt(data.corn.current, 1)}/tn`, margin + contentWidth / 2 + 5, y + 15)

  y += 30

  // Upcoming remates
  doc.setTextColor(...grayColor)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('PRÓXIMOS 7 DÍAS', margin, y)
  y += 8

  // Stats row
  doc.setFillColor(...primaryColor)
  doc.rect(margin, y, contentWidth, 18, 'F')

  const statWidth = contentWidth / 4
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')

  doc.text(String(data.remates.total), margin + statWidth * 0.5, y + 10, { align: 'center' })
  doc.text(`~${fmt(data.remates.cabezas)}`, margin + statWidth * 1.5, y + 10, { align: 'center' })
  doc.text(String(data.remates.provincias), margin + statWidth * 2.5, y + 10, { align: 'center' })
  doc.text(String(data.remates.consignatarias), margin + statWidth * 3.5, y + 10, { align: 'center' })

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text('Remates', margin + statWidth * 0.5, y + 16, { align: 'center' })
  doc.text('Cabezas', margin + statWidth * 1.5, y + 16, { align: 'center' })
  doc.text('Provincias', margin + statWidth * 2.5, y + 16, { align: 'center' })
  doc.text('Consignatarias', margin + statWidth * 3.5, y + 16, { align: 'center' })

  y += 25

  // Top 5 remates
  if (data.remates.top5.length > 0) {
    doc.setTextColor(...grayColor)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('DESTACADOS', margin, y)
    y += 6

    data.remates.top5.forEach((r, i) => {
      const rowY = y + i * 10

      doc.setFillColor(i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 250)
      doc.rect(margin, rowY, contentWidth, 9, 'F')

      doc.setTextColor(...grayColor)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text(r.fecha.slice(5).replace('-', '/'), margin + 2, rowY + 6)

      doc.setTextColor(...darkColor)
      doc.setFont('helvetica', 'bold')
      const consigName = r.consignataria.length > 35 ? r.consignataria.slice(0, 35) + '...' : r.consignataria
      doc.text(consigName, margin + 20, rowY + 6)

      doc.setTextColor(...grayColor)
      doc.setFont('helvetica', 'normal')
      doc.text(r.tipo.toUpperCase(), margin + contentWidth - 40, rowY + 6)

      if (r.cabezas) {
        doc.text(`${fmt(r.cabezas)} cab`, margin + contentWidth - 15, rowY + 6, { align: 'right' })
      }
    })

    y += data.remates.top5.length * 10 + 10
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 15
  doc.setDrawColor(...lightGray)
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5)

  doc.setTextColor(...grayColor)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('Generado por consignatarias.com.ar — El mercado ganadero en una sola pantalla', margin, footerY)
  doc.text('Datos actualizados diariamente. Valores referenciales.', margin, footerY + 5)

  doc.setTextColor(...primaryColor)
  doc.text('www.consignatarias.com.ar', pageWidth - margin, footerY, { align: 'right' })

  return doc
}
