import { jsPDF } from 'jspdf'

interface RemateData {
  fecha: string
  ubicacion: string
  tipo: string
  cabezas: number | null
  source?: string
}

interface ConsignatariaReportData {
  consignataria: {
    name: string
    slug: string
    logoUrl?: string | null
    verified?: boolean
    isPro?: boolean
    provincia?: string
    phone?: string
    email?: string
    website?: string
  }
  stats: {
    totalRemates: number
    upcomingRemates: number
    totalCabezas: number
    provinces: string[]
    types: string[]
  }
  upcomingRemates: RemateData[]
  generatedAt: string
}

function fmt(n: number): string {
  return n.toLocaleString('es-AR')
}

/**
 * Generate a branded PDF report for a consignataria
 * PRO subscribers get enhanced branding and features
 */
export function generateConsignatariaPDF(data: ConsignatariaReportData): jsPDF {
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
  const proGold: [number, number, number] = [245, 158, 11] // amber-500
  const primaryColor: [number, number, number] = [16, 185, 129] // emerald-500
  const darkColor: [number, number, number] = [24, 24, 27] // zinc-900
  const grayColor: [number, number, number] = [113, 113, 122] // zinc-500
  const lightGray: [number, number, number] = [228, 228, 231] // zinc-200

  const isPro = data.consignataria.isPro

  // ============================================
  // HEADER - PRO gets gold accent
  // ============================================
  if (isPro) {
    // Gold accent bar for PRO
    doc.setFillColor(...proGold)
    doc.rect(0, 0, pageWidth, 4, 'F')
    
    doc.setFillColor(...darkColor)
    doc.rect(0, 4, pageWidth, 36, 'F')
  } else {
    doc.setFillColor(...darkColor)
    doc.rect(0, 0, pageWidth, 38, 'F')
  }

  // PRO badge
  if (isPro) {
    doc.setFillColor(...proGold)
    doc.roundedRect(pageWidth - margin - 20, isPro ? 10 : 8, 20, 7, 1, 1, 'F')
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.text('PRO', pageWidth - margin - 10, isPro ? 15 : 13, { align: 'center' })
  }

  // Consignataria name
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  const nameY = isPro ? 20 : 18
  doc.text(data.consignataria.name.toUpperCase(), margin, nameY)

  // Subtitle
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(156, 163, 175)
  doc.text('Reporte de Remates', margin, nameY + 8)

  // Date generated
  doc.setFontSize(8)
  doc.text(`Generado: ${data.generatedAt}`, margin, nameY + 15)

  y = isPro ? 48 : 46

  // ============================================
  // STATS BAR
  // ============================================
  const accentColor = isPro ? proGold : primaryColor

  doc.setFillColor(...accentColor)
  doc.rect(margin, y, contentWidth, 16, 'F')

  const statWidth = contentWidth / 4
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')

  doc.text(String(data.stats.totalRemates), margin + statWidth * 0.5, y + 9, { align: 'center' })
  doc.text(String(data.stats.upcomingRemates), margin + statWidth * 1.5, y + 9, { align: 'center' })
  doc.text(`~${fmt(data.stats.totalCabezas)}`, margin + statWidth * 2.5, y + 9, { align: 'center' })
  doc.text(String(data.stats.provinces.length), margin + statWidth * 3.5, y + 9, { align: 'center' })

  doc.setFontSize(6)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(isPro ? 0 : 255, isPro ? 0 : 255, isPro ? 0 : 255)
  if (isPro) doc.setTextColor(255, 255, 255)
  doc.text('Total Remates', margin + statWidth * 0.5, y + 14, { align: 'center' })
  doc.text('Próximos', margin + statWidth * 1.5, y + 14, { align: 'center' })
  doc.text('Cabezas Est.', margin + statWidth * 2.5, y + 14, { align: 'center' })
  doc.text('Provincias', margin + statWidth * 3.5, y + 14, { align: 'center' })

  y += 22

  // ============================================
  // TIPOS DE REMATE
  // ============================================
  if (data.stats.types.length > 0) {
    doc.setTextColor(...grayColor)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.text('TIPOS DE REMATE', margin, y)
    y += 5

    doc.setFillColor(250, 250, 250)
    doc.rect(margin, y, contentWidth, 10, 'F')

    doc.setTextColor(...darkColor)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(data.stats.types.join(' • '), margin + 4, y + 7)

    y += 16
  }

  // ============================================
  // PRÓXIMOS REMATES
  // ============================================
  if (data.upcomingRemates.length > 0) {
    doc.setTextColor(...grayColor)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.text('PRÓXIMOS REMATES', margin, y)
    y += 5

    // Table header
    doc.setFillColor(...darkColor)
    doc.rect(margin, y, contentWidth, 7, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(6)
    doc.setFont('helvetica', 'bold')
    doc.text('FECHA', margin + 3, y + 5)
    doc.text('UBICACIÓN', margin + 25, y + 5)
    doc.text('TIPO', margin + 100, y + 5)
    doc.text('CABEZAS', margin + contentWidth - 3, y + 5, { align: 'right' })
    y += 8

    // Calculate available space for rows
    const footerHeight = 25
    const availableHeight = pageHeight - y - footerHeight
    const rowHeight = 8
    const maxRows = Math.floor(availableHeight / rowHeight)

    const remates = data.upcomingRemates.slice(0, Math.min(maxRows, 15))

    remates.forEach((r, i) => {
      const rowY = y + i * rowHeight

      // Alternating background
      doc.setFillColor(i % 2 === 0 ? 255 : 248, i % 2 === 0 ? 255 : 248, i % 2 === 0 ? 255 : 248)
      doc.rect(margin, rowY, contentWidth, rowHeight - 1, 'F')

      // Date
      doc.setTextColor(...grayColor)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      const dateStr = r.fecha.slice(8) + '/' + r.fecha.slice(5, 7)
      doc.text(dateStr, margin + 3, rowY + 5.5)

      // Location
      doc.setTextColor(...darkColor)
      doc.setFont('helvetica', 'bold')
      const ubicacion = r.ubicacion.length > 40 ? r.ubicacion.slice(0, 40) + '...' : r.ubicacion
      doc.text(ubicacion, margin + 25, rowY + 5.5)

      // Type
      doc.setTextColor(...grayColor)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.text(r.tipo.toUpperCase(), margin + 100, rowY + 5.5)

      // Cabezas
      if (r.cabezas) {
        doc.setTextColor(...darkColor)
        doc.setFontSize(8)
        doc.text(fmt(r.cabezas), margin + contentWidth - 3, rowY + 5.5, { align: 'right' })
      }
    })

    y += remates.length * rowHeight + 5

    // Show if there are more
    if (data.upcomingRemates.length > remates.length) {
      doc.setTextColor(...grayColor)
      doc.setFontSize(7)
      doc.text(
        `+${data.upcomingRemates.length - remates.length} remates más en consignatarias.com.ar`,
        margin,
        y
      )
      y += 6
    }
  } else {
    // No upcoming remates message
    doc.setFillColor(250, 250, 250)
    doc.rect(margin, y, contentWidth, 20, 'F')
    doc.setTextColor(...grayColor)
    doc.setFontSize(10)
    doc.text('No hay remates programados próximamente', pageWidth / 2, y + 12, { align: 'center' })
    y += 25
  }

  // ============================================
  // CONTACT INFO (PRO only gets enhanced section)
  // ============================================
  if (isPro && (data.consignataria.phone || data.consignataria.email || data.consignataria.website)) {
    y = Math.max(y, pageHeight - 60)
    
    doc.setDrawColor(...lightGray)
    doc.line(margin, y, pageWidth - margin, y)
    y += 6

    doc.setTextColor(...grayColor)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.text('CONTACTO', margin, y)
    y += 5

    doc.setFillColor(250, 250, 250)
    doc.rect(margin, y, contentWidth, 18, 'F')

    doc.setTextColor(...darkColor)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')

    let contactY = y + 6
    if (data.consignataria.phone) {
      doc.text(`Tel: ${data.consignataria.phone}`, margin + 4, contactY)
      contactY += 5
    }
    if (data.consignataria.email) {
      doc.text(`Email: ${data.consignataria.email}`, margin + 4, contactY)
      contactY += 5
    }
    if (data.consignataria.website) {
      doc.setTextColor(...accentColor)
      doc.text(data.consignataria.website, margin + 4, contactY)
    }

    y += 24
  }

  // ============================================
  // FOOTER
  // ============================================
  const footerY = pageHeight - 15

  doc.setDrawColor(...lightGray)
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5)

  // PRO footer branding
  if (isPro) {
    doc.setFillColor(...proGold)
    doc.circle(margin + 3, footerY, 2, 'F')
    doc.setTextColor(...darkColor)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('Perfil PRO', margin + 8, footerY + 1)
  }

  doc.setTextColor(...grayColor)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')

  const footerText = isPro 
    ? 'Reporte exclusivo PRO — consignatarias.com.ar'
    : 'Generado en consignatarias.com.ar'
  
  doc.text(footerText, pageWidth / 2, footerY, { align: 'center' })

  doc.setTextColor(...(isPro ? proGold : primaryColor))
  doc.text(`consignatarias.com.ar/consignatarias/${data.consignataria.slug}`, pageWidth - margin, footerY, { align: 'right' })

  // PRO watermark (subtle)
  if (isPro) {
    doc.setFillColor(...proGold)
    doc.rect(0, pageHeight - 3, pageWidth, 3, 'F')
  }

  return doc
}
