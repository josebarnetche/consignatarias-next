import { NextRequest, NextResponse } from 'next/server'
import { getCurrentSession } from '@/lib/user-tier'
import { createServiceClient } from '@/lib/supabase'

// Reads the session cookie → must render dynamically.
export const dynamic = 'force-dynamic'

interface MedioPagoRow {
  metodo?: string
  plazo_dias?: number | null
}

export interface MediosPagoSummary {
  metodos: string[] // raw method codes (formatted client-side)
  plazoMin: number | null // shortest collection term in days, if any
}

/**
 * GET /api/consignatarias/medios-pago?slugs=a,b,c
 *
 * PRO-only. Returns a compact payment-methods summary per slug for the
 * side-by-side comparator. Gated server-side so the PRO data never ships in
 * the statically-generated /comparar HTML.
 */
export async function GET(request: NextRequest) {
  const { tier } = await getCurrentSession()
  if (tier !== 'pro') {
    return NextResponse.json({ error: 'pro_required' }, { status: 403 })
  }

  const slugs = (request.nextUrl.searchParams.get('slugs') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3)

  if (slugs.length === 0) {
    return NextResponse.json({ result: {} })
  }

  const supabase = createServiceClient()
  if (!supabase) {
    return NextResponse.json({ result: {} })
  }

  const { data } = await supabase
    .from('consignatarias')
    .select('canonical_slug, medios_pago')
    .in('canonical_slug', slugs)

  const result: Record<string, MediosPagoSummary> = {}
  for (const row of data || []) {
    const raw = (row.medios_pago as MedioPagoRow[] | null) ?? []
    const medios = Array.isArray(raw) ? raw : []
    const metodos = medios.map((m) => m.metodo).filter((m): m is string => !!m)
    const plazos = medios
      .map((m) => m.plazo_dias)
      .filter((d): d is number => typeof d === 'number')
    result[row.canonical_slug as string] = {
      metodos: [...new Set(metodos)],
      plazoMin: plazos.length ? Math.min(...plazos) : null,
    }
  }

  return NextResponse.json({ result })
}
