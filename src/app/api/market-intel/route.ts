import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getCurrentSession } from '@/lib/user-tier'
import { createAdminClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Intel de mercado — watchlist de consignatarias para seguir su actividad en el
 * MAG de Cañuelas (mercado de referencia). Free sigue hasta 3 firmas; PRO hasta 20.
 * Es "ver lo que operan los otros", no self-data. Datos honestamente scopeados:
 * solo cubre lo operado en Cañuelas (~12% nacional), no ferias del interior.
 *
 *  GET    ?days=30           → tier, límites y watchlist con cabezas + precio prom.
 *  POST   { slug }           → agrega una firma (gate por tier).
 *  DELETE ?slug=...          → saca una firma.
 */

const FREE_MAX = 3
const PRO_MAX = 20

// market_watchlist aún no está en database.types → cliente sin tipar.
function admin(): SupabaseClient {
  return createAdminClient() as unknown as SupabaseClient
}

export async function GET(req: NextRequest) {
  const { user, tier } = await getCurrentSession()
  if (!user) return NextResponse.json({ error: 'auth' }, { status: 401 })
  const maxFirms = tier === 'pro' ? PRO_MAX : FREE_MAX
  const days = Math.min(Math.max(parseInt(req.nextUrl.searchParams.get('days') || '30', 10) || 30, 1), 90)
  const db = admin()

  const { data: wl } = await db
    .from('market_watchlist')
    .select('consignataria_slug')
    .eq('user_id', user.id)
  const slugs: string[] = (wl || []).map((w: { consignataria_slug: string }) => w.consignataria_slug)
  if (slugs.length === 0) return NextResponse.json({ tier, maxFirms, days, watchlist: [] })

  const [{ data: consigs }, { data: mags }] = await Promise.all([
    db.from('consignatarias').select('canonical_slug, display_name, cuit').in('canonical_slug', slugs),
    db.from('mag_consignatarias').select('mag_id, consignataria_canonical_slug').in('consignataria_canonical_slug', slugs),
  ])
  const nameBySlug = new Map((consigs || []).map((c: { canonical_slug: string; display_name: string }) => [c.canonical_slug, c.display_name]))
  const cuitBySlug = new Map((consigs || []).map((c: { canonical_slug: string; cuit: string | null }) => [c.canonical_slug, c.cuit]))
  const magIdBySlug = new Map(
    (mags || [])
      .filter((m: { consignataria_canonical_slug: string | null }) => m.consignataria_canonical_slug)
      .map((m: { mag_id: number; consignataria_canonical_slug: string }) => [m.consignataria_canonical_slug, m.mag_id]),
  )

  const magIds = [...magIdBySlug.values()]
  const desde = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)
  const aggByMagId = new Map<number, { cabezas: number; priceSum: number; priceN: number }>()
  if (magIds.length) {
    const { data: lots } = await db
      .from('mag_consignataria_sales_lots')
      .select('mag_consignataria_id, head_count, price')
      .in('mag_consignataria_id', magIds)
      .gte('date', desde)
      .limit(50000)
    for (const r of (lots || []) as Array<{ mag_consignataria_id: number; head_count: number | null; price: number | string | null }>) {
      const a = aggByMagId.get(r.mag_consignataria_id) || { cabezas: 0, priceSum: 0, priceN: 0 }
      a.cabezas += r.head_count || 0
      const p = r.price != null ? Number(r.price) : 0
      if (p > 0) {
        a.priceSum += p
        a.priceN++
      }
      aggByMagId.set(r.mag_consignataria_id, a)
    }
  }

  const watchlist = slugs.map((slug) => {
    const magId = magIdBySlug.get(slug)
    const a = magId != null ? aggByMagId.get(magId) : null
    return {
      slug,
      display_name: nameBySlug.get(slug) || slug,
      cuit: cuitBySlug.get(slug) || null,
      en_mag: magId != null,
      cabezas: a?.cabezas ?? 0,
      precio_prom: a && a.priceN ? Math.round(a.priceSum / a.priceN) : null,
    }
  })
  watchlist.sort((x, y) => y.cabezas - x.cabezas)
  return NextResponse.json({ tier, maxFirms, days, watchlist })
}

export async function POST(req: NextRequest) {
  const { user, tier } = await getCurrentSession()
  if (!user) return NextResponse.json({ error: 'auth' }, { status: 401 })
  const maxFirms = tier === 'pro' ? PRO_MAX : FREE_MAX
  const body = (await req.json().catch(() => ({}))) as { slug?: string }
  const slug = typeof body.slug === 'string' ? body.slug.trim() : ''
  if (!slug) return NextResponse.json({ error: 'slug requerido' }, { status: 400 })

  const db = admin()
  const { count } = await db
    .from('market_watchlist')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
  if ((count ?? 0) >= maxFirms) {
    return NextResponse.json(
      {
        error: 'limit',
        maxFirms,
        tier,
        message:
          tier === 'pro'
            ? `Llegaste al máximo de ${maxFirms} firmas seguidas.`
            : `Seguí hasta ${maxFirms} firmas gratis. Con PRO seguís hasta ${PRO_MAX} + histórico.`,
      },
      { status: 403 },
    )
  }
  const { error } = await db.from('market_watchlist').insert({ user_id: user.id, consignataria_slug: slug })
  if (error && !/duplicate/i.test(error.message)) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const { user } = await getCurrentSession()
  if (!user) return NextResponse.json({ error: 'auth' }, { status: 401 })
  const slug = req.nextUrl.searchParams.get('slug') || ''
  if (!slug) return NextResponse.json({ error: 'slug requerido' }, { status: 400 })
  await admin().from('market_watchlist').delete().eq('user_id', user.id).eq('consignataria_slug', slug)
  return NextResponse.json({ ok: true })
}
