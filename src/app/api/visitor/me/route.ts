import { NextResponse } from 'next/server'
import { getVisitorContext } from '@/lib/visitor-segment'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Contexto de personalización del visitante actual (segmento + historial), derivado
 * de la cookie `cid`. Lo consume el cliente (SmartWelcome) para adaptar el contenido
 * sin des-optimizar (páginas estáticas + personalización progresiva). Sin cid → null.
 */
export async function GET() {
  const ctx = await getVisitorContext()
  return NextResponse.json(ctx ?? null, {
    headers: { 'Cache-Control': 'private, no-store' },
  })
}
