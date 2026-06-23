import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { getCanonicalSlug, getProfile } from '@/lib/data/consignataria-slugs'
import { getEntityTier } from '@/lib/features'
import { sendRemateReminder, sendRemateResultsToProducer } from '@/lib/email'
import { authorizeCron } from '@/lib/cron-auth'
import rematesData from '@/lib/data/remates.json'
import type { Auction } from '@/lib/db/schema'

const auctions = rematesData as Auction[]

/**
 * Cron job to send remate reminders to interested buyers.
 * Runs every hour, sends reminders for:
 * - 24h before: "Mañana: [REMATE] de [CONSIGNATARIA]"
 * - 1h before: "Arranca en 1 hora: [REMATE]"
 *
 * Only sends for PRO consignatarias (incentive to upgrade).
 * Matches against alertas table (user subscriptions).
 *
 * Mail 3 (resultados al productor): ?results=1 dispara sendRemateResultsToProducer
 * SOLO para remates con promedios reales cargados (auction_results.average_price).
 * Nunca en seco. authorizeCron + ?test=. NO agrega ningún .yml.
 *
 * GET /api/cron/remate-reminders
 * Auth: authorizeCron (CRON_SECRET / ADMIN_SECRET vía x-cron-secret / Bearer / ?secret=)
 */

export async function GET(req: NextRequest) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = req.nextUrl
  const testEmail = (url.searchParams.get('test') || '').trim().toLowerCase()

  // ============================================================
  // MODE: Mail 3 — resultados al productor (?results=1)
  // ============================================================
  if (url.searchParams.get('results') === '1') {
    return handleResultsToProducers(testEmail)
  }

  const now = new Date()
  const results = {
    checked: 0,
    remindersSent24h: 0,
    remindersSent1h: 0,
    errors: [] as string[],
  }

  try {
    const service = requireServiceClient()

    // Get all active alerts (table may not exist yet)
    const { data: alerts, error: alertsError } = await service
      .from('alertas')
      .select('*')
      .eq('status', 'active')

    // If table doesn't exist, return success (no alerts to send)
    if (alertsError?.message?.includes('does not exist') || alertsError?.message?.includes('schema cache')) {
      return NextResponse.json({ 
        message: 'Alertas table not configured yet - skipping',
        ...results 
      })
    }

    if (alertsError) {
      return NextResponse.json({ error: alertsError.message }, { status: 500 })
    }

    if (!alerts || alerts.length === 0) {
      return NextResponse.json({ message: 'No active alerts', ...results })
    }

    // Find remates happening in 24h or 1h
    const rematesNext24h: Auction[] = []
    const rematesNext1h: Auction[] = []

    for (const auction of auctions) {
      if (auction.status !== 'scheduled') continue
      
      // Check if PRO consignataria
      const canonical = getCanonicalSlug(auction.consignatariaSlug || '')
      if (!canonical) continue
      
      const tier = await getEntityTier('consignataria', canonical)
      if (tier !== 'pro' && tier !== 'enterprise') continue

      // Calculate time until remate
      const remateDate = new Date(`${auction.date}T${auction.time || '10:00'}:00`)
      const hoursUntil = (remateDate.getTime() - now.getTime()) / (1000 * 60 * 60)

      if (hoursUntil >= 23 && hoursUntil <= 25) {
        rematesNext24h.push(auction)
      } else if (hoursUntil >= 0.5 && hoursUntil <= 1.5) {
        rematesNext1h.push(auction)
      }
    }

    results.checked = rematesNext24h.length + rematesNext1h.length

    // Match alerts with remates and send emails
    for (const alert of alerts) {
      // Check 24h reminders
      for (const remate of rematesNext24h) {
        if (matchesAlert(remate, alert)) {
          try {
            await sendReminderEmail(remate, alert, '24h')
            results.remindersSent24h++
          } catch (e) {
            results.errors.push(`24h: ${remate.id || remate.title} - ${(e as Error).message}`)
          }
        }
      }

      // Check 1h reminders
      for (const remate of rematesNext1h) {
        if (matchesAlert(remate, alert)) {
          try {
            await sendReminderEmail(remate, alert, '1h')
            results.remindersSent1h++
          } catch (e) {
            results.errors.push(`1h: ${remate.id || remate.title} - ${(e as Error).message}`)
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      rematesNext24h: rematesNext24h.length,
      rematesNext1h: rematesNext1h.length,
      alertsChecked: alerts.length,
    })

  } catch (error) {
    return NextResponse.json({ 
      error: (error as Error).message,
      ...results 
    }, { status: 500 })
  }
}

interface Alert {
  email: string
  provincia?: string
  tipo?: string
  categoria?: string
  consignataria_slug?: string
}

function matchesAlert(remate: Auction, alert: Alert): boolean {
  // If alert is for specific consignataria, check that
  if (alert.consignataria_slug) {
    const canonical = getCanonicalSlug(remate.consignatariaSlug || '')
    if (canonical !== alert.consignataria_slug) return false
  }

  // Check provincia filter
  if (alert.provincia && remate.province !== alert.provincia) {
    return false
  }

  // Check tipo filter
  if (alert.tipo && remate.type !== alert.tipo) {
    return false
  }

  // Check categoria filter (uses type field for category matching)
  if (alert.categoria && remate.type !== alert.categoria) {
    return false
  }

  return true
}

async function sendReminderEmail(remate: Auction, alert: Alert, timing: '24h' | '1h') {
  const canonical = getCanonicalSlug(remate.consignatariaSlug || '')
  const profile = canonical ? getProfile(canonical) : null
  const consignatariaName = profile?.displayName || remate.consignatariaSlug || 'Consignataria'

  const subject = timing === '24h'
    ? `🐄 Mañana: ${remate.title}`
    : `⏰ Arranca en 1 hora: ${remate.title}`

  const body = `
    <h2>${timing === '24h' ? 'Recordatorio: Remate mañana' : '¡Arranca en 1 hora!'}</h2>
    <p><strong>${remate.title}</strong></p>
    <p>Consignataria: ${consignatariaName}</p>
    <p>Fecha: ${formatDate(remate.date)} ${remate.time ? `a las ${remate.time}` : ''}</p>
    ${remate.location ? `<p>Lugar: ${remate.location}</p>` : ''}
    ${remate.estimatedHeads ? `<p>Cabezas: ${remate.estimatedHeads.toLocaleString('es-AR')}</p>` : ''}
    ${remate.catalogUrl ? `<p><a href="${remate.catalogUrl}">Ver catálogo</a></p>` : ''}
    ${remate.youtubeUrl ? `<p><a href="${remate.youtubeUrl}">Ver transmisión en vivo</a></p>` : ''}
    <hr>
    <p style="font-size: 12px; color: #666;">
      Recibiste este email porque tenés una alerta activa en consignatarias.com.ar
    </p>
  `

  await sendRemateReminder(alert.email, subject, body)
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

/* ------------------------------------------------------------------ */
/*  MAIL 3 — resultados al productor (gated: SOLO con promedios reales) */
/* ------------------------------------------------------------------ */

interface CategoryResult {
  category?: string
  heads?: number
  avg_price?: number
  max_price?: number
}

/**
 * Deriva (topCategoría, avgPrice $/kg, cabezas) de una fila de auction_results.
 * Prioriza category_results (la más operada por cabezas); si no hay, cae al
 * average_price global. Devuelve null si NO hay un promedio real → no se manda nada.
 */
function deriveResultPayload(row: {
  average_price: number | null
  total_heads_sold: number | null
  total_heads_offered: number | null
  category_results: unknown
}): { topCategoria: string; avgPrice: number; cabezas: number } | null {
  const cats = Array.isArray(row.category_results) ? (row.category_results as CategoryResult[]) : []
  // Categoría más operada con avg_price válido.
  const ranked = cats
    .filter((c) => typeof c.avg_price === 'number' && (c.avg_price as number) > 0)
    .sort((a, b) => (b.heads ?? 0) - (a.heads ?? 0))

  if (ranked.length > 0) {
    const top = ranked[0]
    const cabezas = top.heads ?? row.total_heads_sold ?? row.total_heads_offered ?? 0
    return {
      topCategoria: top.category?.trim() || 'Categoría más operada',
      avgPrice: top.avg_price as number,
      cabezas: cabezas > 0 ? cabezas : 0,
    }
  }

  // Fallback: promedio global cargado.
  if (typeof row.average_price === 'number' && row.average_price > 0) {
    const cabezas = row.total_heads_sold ?? row.total_heads_offered ?? 0
    return {
      topCategoria: 'General',
      avgPrice: row.average_price,
      cabezas: cabezas > 0 ? cabezas : 0,
    }
  }

  return null
}

/**
 * Mail 3 — "así cerró el remate de {firma}" al productor que sigue la firma.
 *
 * Recipients: alertas activas cuyo filtro consignataria_slug == el slug del
 * remate con resultados cargados. Opt-in real (la alerta la creó el productor).
 * GATED: solo dispara con auction_results que tengan un promedio real
 * (deriveResultPayload != null). Dedup por (slug+fecha+email) vía outreach_log
 * type='remate_results_producer'. Modo TEST: ?test=<email> manda 1 con data demo.
 */
async function handleResultsToProducers(testEmail: string): Promise<NextResponse> {
  // --- TEST mode: un Mail 3 con data demo, sin DB writes ---
  if (testEmail) {
    const res = await sendRemateResultsToProducer({
      to: testEmail,
      consignataria: 'Consignataria de Prueba',
      slug: 'test',
      location: 'Mercedes, Corrientes',
      topCategoria: 'Terneros',
      avgPrice: 2850,
      cabezas: 1200,
    })
    return NextResponse.json({
      mode: 'remate_results_producer',
      test: true,
      recipient: testEmail,
      sent: res?.success ? 1 : 0,
      error: res?.success ? undefined : res?.error,
    })
  }

  const service = requireServiceClient()
  const now = new Date()

  // Resultados cargados en las últimas 48h (ventana de envío del Mail 3).
  const since = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString()
  const { data: resultsRows, error: resultsError } = await service
    .from('auction_results')
    .select('consignataria_slug, auction_date, auction_title, location, average_price, total_heads_sold, total_heads_offered, category_results, created_at')
    .gte('created_at', since)

  if (resultsError?.message?.includes('does not exist') || resultsError?.message?.includes('schema cache')) {
    return NextResponse.json({ mode: 'remate_results_producer', message: 'auction_results table not available', sent: 0 })
  }
  if (resultsError) {
    return NextResponse.json({ error: resultsError.message }, { status: 500 })
  }
  if (!resultsRows || resultsRows.length === 0) {
    return NextResponse.json({ mode: 'remate_results_producer', message: 'No fresh auction results in window', sent: 0 })
  }

  // Solo filas con un promedio REAL.
  const withReal = resultsRows
    .map((r) => ({ row: r, payload: deriveResultPayload(r) }))
    .filter((x): x is { row: typeof resultsRows[number]; payload: NonNullable<ReturnType<typeof deriveResultPayload>> } => x.payload !== null)

  if (withReal.length === 0) {
    return NextResponse.json({ mode: 'remate_results_producer', message: 'No results with real averages', sent: 0 })
  }

  // Alertas activas (productores que siguen una firma).
  const { data: alerts, error: alertsError } = await service
    .from('alertas')
    .select('filters, status, users!inner(email)')
    .eq('status', 'active')

  if (alertsError?.message?.includes('does not exist') || alertsError?.message?.includes('schema cache')) {
    return NextResponse.json({ mode: 'remate_results_producer', message: 'alertas table not available', sent: 0 })
  }
  if (alertsError) {
    return NextResponse.json({ error: alertsError.message }, { status: 500 })
  }

  type AlertRow = { filters: Record<string, string> | null; users: { email: string } | { email: string }[] | null }
  const alertList = (alerts || []) as AlertRow[]

  // Dedup: ya se mandó Mail 3 para (slug+fecha+email).
  const { data: alreadySentRows } = await service
    .from('outreach_log')
    .select('consignataria_slug, auction_date, email_sent_to')
    .eq('type', 'remate_results_producer')

  const dedupKey = (slug: string, date: string, email: string) => `${slug}::${date}::${email.toLowerCase()}`
  const alreadySent = new Set(
    (alreadySentRows || []).map((r) =>
      dedupKey(r.consignataria_slug, r.auction_date as unknown as string, r.email_sent_to || ''),
    ),
  )

  const results: Array<{ slug: string; email: string; status: 'sent' | 'skipped' | 'error'; reason?: string }> = []
  let sent = 0

  for (const { row, payload } of withReal) {
    const canonical = getCanonicalSlug(row.consignataria_slug) || row.consignataria_slug
    const profile = getProfile(canonical)
    const consignatariaName = profile?.displayName || row.consignataria_slug

    // Productores que siguen ESTA firma.
    const matched = alertList.filter((a) => {
      const filterSlug = a.filters?.consignataria_slug
      if (!filterSlug) return false
      return getCanonicalSlug(filterSlug) === canonical || filterSlug === row.consignataria_slug
    })

    for (const alert of matched) {
      const email = Array.isArray(alert.users) ? alert.users[0]?.email : alert.users?.email
      if (!email) continue

      const key = dedupKey(canonical, row.auction_date as unknown as string, email)
      if (alreadySent.has(key)) {
        results.push({ slug: canonical, email, status: 'skipped', reason: 'Already sent Mail 3' })
        continue
      }

      const res = await sendRemateResultsToProducer({
        to: email,
        consignataria: consignatariaName,
        slug: canonical,
        location: row.location || 'Argentina',
        topCategoria: payload.topCategoria,
        avgPrice: payload.avgPrice,
        cabezas: payload.cabezas,
      })

      if (res?.success) {
        try {
          await service.from('outreach_log').insert({
            type: 'remate_results_producer',
            consignataria_slug: canonical,
            email_sent_to: email,
            auction_date: row.auction_date,
            auction_title: row.auction_title,
          })
        } catch {
          // logging soft-fail
        }
        alreadySent.add(key)
        sent++
        results.push({ slug: canonical, email, status: 'sent' })
      } else {
        results.push({ slug: canonical, email, status: 'error', reason: res?.error })
      }
    }
  }

  return NextResponse.json({
    mode: 'remate_results_producer',
    resultsWithRealAverages: withReal.length,
    activeAlerts: alertList.length,
    sent,
    skipped: results.filter((r) => r.status === 'skipped').length,
    errors: results.filter((r) => r.status === 'error').length,
    results,
  })
}
