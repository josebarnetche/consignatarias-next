import { NextRequest, NextResponse } from 'next/server'
import rematesData from '@/lib/data/remates.json'
import type { Auction } from '@/lib/db/schema'

const auctions = rematesData as Auction[]

function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const provincia = searchParams.get('provincia')?.toUpperCase()
  const tipo = searchParams.get('tipo')
  const desde = searchParams.get('desde')
  const hasta = searchParams.get('hasta')
  const format = searchParams.get('format') || 'csv'

  const today = new Date().toISOString().slice(0, 10)
  const defaultHasta = new Date()
  defaultHasta.setDate(defaultHasta.getDate() + 30)

  let filtered = auctions.filter(a => 
    a.date >= (desde || today) && 
    a.date <= (hasta || defaultHasta.toISOString().slice(0, 10))
  )

  if (provincia) {
    filtered = filtered.filter(a => a.province === provincia)
  }
  if (tipo) {
    filtered = filtered.filter(a => a.type === tipo)
  }

  // Sort by date
  filtered.sort((a, b) => a.date.localeCompare(b.date))

  if (format === 'json') {
    return NextResponse.json({
      success: true,
      count: filtered.length,
      data: filtered.map(a => ({
        fecha: a.date,
        hora: a.time,
        consignataria: a.consignatariaName,
        ubicacion: a.location,
        provincia: a.province,
        tipo: a.type,
        categoria: a.mainCategory,
        cabezas_estimadas: a.estimatedHeads,
        catalogo: a.catalogUrl,
        transmision: a.youtubeUrl,
      }))
    })
  }

  // Build CSV
  const headers = [
    'Fecha',
    'Hora',
    'Consignataria',
    'Ubicación',
    'Provincia',
    'Tipo',
    'Categoría',
    'Cabezas Est.',
    'Catálogo',
    'Transmisión'
  ]

  const rows = filtered.map(a => [
    escapeCSV(a.date),
    escapeCSV(a.time),
    escapeCSV(a.consignatariaName),
    escapeCSV(a.location),
    escapeCSV(a.province),
    escapeCSV(a.type),
    escapeCSV(a.mainCategory),
    escapeCSV(a.estimatedHeads),
    escapeCSV(a.catalogUrl),
    escapeCSV(a.youtubeUrl),
  ])

  const csv = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\r\n')

  // Add BOM for Excel compatibility
  const bom = '\ufeff'

  return new NextResponse(bom + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="remates-${today}.csv"`,
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
