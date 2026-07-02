import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { authenticate, setQuotaHeaders } from '@/lib/api-auth'
import { logEvent } from '@/lib/ops'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/lots — lote-level transactional data from MAG haciinfo000007.
 *
 * Each row = one pesada (lote) × remitente × categoría within a consignataria's
 * day at MAG. Auth: Bearer key (Enterprise tracked). Public access works too
 * (rate-limited by IP) but Enterprise gets quota tracking + higher limits.
 *
 * Params:
 *   ?date=YYYY-MM-DD     — single day (default: latest day with data)
 *   ?from=YYYY-MM-DD&to=YYYY-MM-DD — range (max 90 days)
 *   ?consignataria_id=N  — filter by MAG consignataria id
 *   ?category=NOVILLO    — uppercase category match
 *   ?tipo=FAENA|INVERNADA
 *   ?provincia=BUE       — 3-letter province
 *   ?limit=N             — page size (default 200, max 1000)
 *   ?offset=N
 */
export async function GET(req: NextRequest) {
  const requestId = crypto.randomUUID()
  const t0 = Date.now()
  const ROUTE = '/api/lots'
  let auth: Exclude<Awaited<ReturnType<typeof authenticate>>, { ok: false }> | null = null

  const finalize = (resp: NextResponse): NextResponse => {
    resp.headers.set('X-Request-Id', requestId)
    void logEvent({
      eventType: 'api_call',
      status: resp.status >= 400 ? 'error' : 'ok',
      requestId,
      route: ROUTE,
      latencyMs: Date.now() - t0,
      statusCode: resp.status,
      userId: auth?.key.userId ?? null,
      apiKeyId: auth?.key.id ?? null,
    })
    return resp
  }

  const result = await authenticate(req)
  if (!result.ok) return finalize(result.response)
  auth = result

  const { searchParams } = new URL(req.url)
  const dateParam = searchParams.get('date')
  const fromParam = searchParams.get('from')
  const toParam = searchParams.get('to')
  const consigParam = searchParams.get('consignataria_id')
  // Strip PostgREST reserved chars ( , ( ) * " ) before it's interpolated into
  // an ilike pattern below — categories are plain words, so allow only letters,
  // numbers, spaces and hyphen. Prevents filter-grammar injection.
  const categoryParam = searchParams
    .get('category')
    ?.toUpperCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
  const tipoParam = searchParams.get('tipo')?.toUpperCase()
  const provinciaParam = searchParams.get('provincia')?.toUpperCase()
  const limit = Math.max(1, Math.min(1000, parseInt(searchParams.get('limit') ?? '200', 10) || 200))
  const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0', 10) || 0)

  // Use anon client (public-read RLS)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  let query = supabase
    .from('mag_consignataria_sales_lots')
    .select(
      'date, mag_consignataria_id, tipo, pesada, remitente, localidad, provincia, head_count, category, total_kgs, kg_avg, price',
      { count: 'exact' },
    )

  // Date filter
  if (fromParam && toParam) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fromParam) || !/^\d{4}-\d{2}-\d{2}$/.test(toParam)) {
      return finalize(NextResponse.json(
        { success: false, error: { code: 'invalid_date', message: 'from/to must be YYYY-MM-DD' } },
        { status: 400 },
      ))
    }
    // Cap window at 90 days to prevent huge queries
    const fromDate = new Date(fromParam)
    const toDate = new Date(toParam)
    const dayMs = 86400_000
    if ((toDate.getTime() - fromDate.getTime()) / dayMs > 90) {
      return finalize(NextResponse.json(
        { success: false, error: { code: 'range_too_large', message: 'Max 90 days. Use pagination via offset.' } },
        { status: 400 },
      ))
    }
    query = query.gte('date', fromParam).lte('date', toParam)
  } else if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    query = query.eq('date', dateParam)
  } else {
    // Default: latest day with any data
    const { data: latest } = await supabase
      .from('mag_consignataria_sales_lots')
      .select('date')
      .order('date', { ascending: false })
      .limit(1)
    if (latest && latest.length > 0) {
      query = query.eq('date', latest[0].date)
    }
  }

  if (consigParam) {
    const cid = parseInt(consigParam, 10)
    if (Number.isFinite(cid)) query = query.eq('mag_consignataria_id', cid)
  }
  if (categoryParam) query = query.ilike('category', `%${categoryParam}%`)
  if (tipoParam === 'FAENA' || tipoParam === 'INVERNADA') query = query.eq('tipo', tipoParam)
  if (provinciaParam) query = query.eq('provincia', provinciaParam.slice(0, 3))

  query = query.order('date', { ascending: false }).order('pesada', { ascending: true }).range(offset, offset + limit - 1)

  const { data, count, error } = await query
  if (error) {
    return finalize(NextResponse.json(
      { success: false, error: { code: 'db_error', message: error.message } },
      { status: 500 },
    ))
  }

  // Aggregates over the result set (the page, not the full filter)
  const rows = data ?? []
  const totalCabezas = rows.reduce((s, r) => s + (r.head_count ?? 0), 0)
  const totalKgs = rows.reduce((s, r) => s + (Number(r.total_kgs) || 0), 0)
  const totalAmount = rows.reduce(
    (s, r) => s + (Number(r.total_kgs) || 0) * (Number(r.price) || 0),
    0,
  )
  const avgPrice = totalKgs > 0 ? totalAmount / totalKgs : null

  const response = NextResponse.json({
    success: true,
    data: {
      filters: {
        date: dateParam,
        from: fromParam,
        to: toParam,
        consignataria_id: consigParam,
        category: categoryParam,
        tipo: tipoParam,
        provincia: provinciaParam,
      },
      pagination: { limit, offset, returned: rows.length, total: count ?? null },
      aggregates: {
        cabezas: totalCabezas,
        kgs_total: Math.round(totalKgs * 100) / 100,
        precio_promedio_ponderado: avgPrice !== null ? Number(avgPrice.toFixed(3)) : null,
      },
      lots: rows,
      fuente: 'Mercado Agroganadero — haciinfo000007 (lote-level)',
      fuente_url: 'https://www.mercadoagroganadero.com.ar/dll/hacienda1.dll/haciinfo000007',
    },
    timestamp: new Date().toISOString(),
  })

  response.headers.set('Cache-Control', 'public, max-age=600, s-maxage=600, stale-while-revalidate=300')
  if (auth) setQuotaHeaders(response, auth)
  return finalize(response)
}
