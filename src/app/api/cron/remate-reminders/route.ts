import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { getCanonicalSlug, getProfile } from '@/lib/data/consignataria-slugs'
import { getEntityTier } from '@/lib/features'
import { sendRemateReminder, sendRemateResultsToProducer } from '@/lib/email'
import { SEGMENT_SOURCES } from '@/lib/newsletter-segments'
import { authorizeCron } from '@/lib/cron-auth'
import rematesData from '@/lib/data/remates.json'
import type { Auction } from '@/lib/db/schema'

const auctions = rematesData as Auction[]

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.consignatarias.com.ar'

/**
 * Alcance del recordatorio (configurable, default abierto a opt-in).
 * - REQUIRE_PRO_TIER=true → vuelve al comportamiento histórico (sólo firmas PRO/enterprise),
 *   útil cuando se quiera usar el recordatorio como gancho de upsell de la firma.
 * - false (default) → abrimos a TODO suscripto opt-in del segmento subasta-por-firma y a
 *   los watchers de user_favorites, sin importar el tier de la firma. Hoy lo que vende es
 *   cumplir la promesa ("te aviso del remate que seguís"), no gatear por plan.
 */
const REQUIRE_PRO_TIER = process.env.REMATE_REMINDER_REQUIRE_PRO === 'true'

/**
 * Cron job: secuencia de recordatorios de remate AL PRODUCTOR (opt-in, gated).
 * Tres mails, cada uno con 1 CTA, UTM y List-Unsubscribe (header lo agrega sendRemateReminder):
 *   - T-24h: recordatorio "mañana arranca", CTA → catálogo o perfil.
 *   - T-1h: "en vivo" SÓLO si auction.youtubeUrl existe; si no, degrada a "ver catálogo".
 *   - resultados (?results=1): sólo si hay promedios reales cargados.
 *
 * Destinatarios (live path): unión de
 *   (a) watchers de la firma en user_favorites (notify_new_remate != false), y
 *   (b) suscriptos opt-in activos del segmento subasta-por-firma (newsletter_subscribers).
 * Dedup por email dentro de cada (remate, timing).
 *
 * NINGÚN envío automático: authorizeCron + ?test=<email>. NO agrega ningún .yml.
 *
 * GET /api/cron/remate-reminders
 * Auth: authorizeCron (CRON_SECRET / ADMIN_SECRET vía x-cron-secret / Bearer / ?secret=)
 *   ?test=<email>           → manda 1 T-24h + 1 T-1h demo a ese email (sin DB writes)
 *   ?results=1[&test=]      → Mail 3 (resultados al productor)
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

  // ============================================================
  // TEST mode (recordatorios T-24h / T-1h): 1 mail demo de cada uno, sin DB.
  // ============================================================
  if (testEmail) {
    const demo = auctions.find((a) => a.youtubeUrl) || auctions[0]
    if (!demo) {
      return NextResponse.json({ mode: 'remate_reminder', test: true, message: 'No hay remates en el dataset para el demo', sent: 0 })
    }
    try {
      await sendOneReminder(demo, testEmail, '24h')
      await sendOneReminder(demo, testEmail, '1h')
      return NextResponse.json({
        mode: 'remate_reminder',
        test: true,
        recipient: testEmail,
        demoRemate: demo.title,
        sent: 2, // T-24h + T-1h
      })
    } catch (e) {
      return NextResponse.json({ mode: 'remate_reminder', test: true, recipient: testEmail, sent: 0, error: (e as Error).message }, { status: 500 })
    }
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

    // Find remates happening in 24h or 1h
    const rematesNext24h: Auction[] = []
    const rematesNext1h: Auction[] = []

    for (const auction of auctions) {
      if (auction.status !== 'scheduled') continue

      const canonical = getCanonicalSlug(auction.consignatariaSlug || '')
      if (!canonical) continue

      // Gate de tier configurable. Por default NO se exige PRO (se abre a opt-in).
      if (REQUIRE_PRO_TIER) {
        const tier = await getEntityTier('consignataria', canonical)
        if (tier !== 'pro' && tier !== 'enterprise') continue
      }

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

    // Pre-cargar suscriptos opt-in del segmento subasta-por-firma (compartido entre remates).
    const segmentSubscribers = await getSubastaSegmentEmails(service)

    // DEDUP persistente: un remate vive ~2h en la ventana T-24h, así que un cron horario
    // re-mandaría. Precargamos lo ya enviado (outreach_log, últimos 7 días) y NO repetimos
    // por (remate, timing, email). sendDeduped registra el envío.
    const sentKeys = await loadSentReminderKeys(service)
    const sendDeduped = async (remate: Auction, email: string, timing: '24h' | '1h'): Promise<boolean> => {
      const key = reminderKey(remate, timing)
      if (sentKeys.has(`${key}|${email}`)) return false
      await sendOneReminder(remate, email, timing)
      sentKeys.add(`${key}|${email}`)
      await service.from('outreach_log').insert({
        type: key,
        consignataria_slug: getCanonicalSlug(remate.consignatariaSlug || '') || remate.consignatariaSlug,
        email_sent_to: email,
      })
      return true
    }

    // T-24h
    for (const remate of rematesNext24h) {
      const recipients = await getRecipientsForRemate(service, remate, segmentSubscribers)
      for (const email of recipients) {
        try {
          if (await sendDeduped(remate, email, '24h')) results.remindersSent24h++
        } catch (e) {
          results.errors.push(`24h: ${remate.id || remate.title} → ${email} - ${(e as Error).message}`)
        }
      }
    }

    // T-1h (degradación a catálogo si no hay youtubeUrl la maneja sendOneReminder)
    for (const remate of rematesNext1h) {
      const recipients = await getRecipientsForRemate(service, remate, segmentSubscribers)
      for (const email of recipients) {
        try {
          if (await sendDeduped(remate, email, '1h')) results.remindersSent1h++
        } catch (e) {
          results.errors.push(`1h: ${remate.id || remate.title} → ${email} - ${(e as Error).message}`)
        }
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      requireProTier: REQUIRE_PRO_TIER,
      rematesNext24h: rematesNext24h.length,
      rematesNext1h: rematesNext1h.length,
      segmentSubscribers: segmentSubscribers.size,
    })

  } catch (error) {
    return NextResponse.json({
      error: (error as Error).message,
      ...results
    }, { status: 500 })
  }
}

type ServiceClient = ReturnType<typeof requireServiceClient>

/**
 * Suscriptos opt-in activos del segmento subasta-por-firma. Estos NO siguen una firma
 * puntual vía user_favorites: pidieron la agenda de remates por firma vía newsletter,
 * así que reciben todos los recordatorios del alcance. Devuelve un Set de emails.
 */
/** Clave de dedup persistente por (remate, timing). Se concatena el email al chequear. */
function reminderKey(remate: Auction, timing: '24h' | '1h'): string {
  return `remate_reminder:${remate.id || remate.title}:${timing}`
}

/** Precarga las claves de recordatorios ya enviados (outreach_log type 'remate_reminder:%',
 *  últimos 7 días) como Set de '<type>|<email>', para no duplicar en corridas horarias. */
async function loadSentReminderKeys(service: ServiceClient): Promise<Set<string>> {
  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString()
  const { data } = await service
    .from('outreach_log')
    .select('type, email_sent_to')
    .like('type', 'remate_reminder:%')
    .gte('sent_at', weekAgo)
  const set = new Set<string>()
  for (const r of (data || []) as { type: string; email_sent_to: string }[]) {
    if (r.type && r.email_sent_to) set.add(`${r.type}|${r.email_sent_to.trim().toLowerCase()}`)
  }
  return set
}

async function getSubastaSegmentEmails(service: ServiceClient): Promise<Set<string>> {
  const { data, error } = await service
    .from('newsletter_subscribers')
    .select('email')
    .eq('status', 'active')
    .in('source', [...SEGMENT_SOURCES.subastaPorFirma])

  if (error || !data) return new Set()
  return new Set(data.map((r) => (r.email || '').trim().toLowerCase()).filter(Boolean))
}

/**
 * Emails que deben recibir el recordatorio de ESTE remate:
 *   (a) watchers de la firma en user_favorites (notify_new_remate distinto de false), y
 *   (b) todos los suscriptos opt-in del segmento subasta-por-firma.
 * Dedup por email.
 */
async function getRecipientsForRemate(
  service: ServiceClient,
  remate: Auction,
  segmentEmails: Set<string>,
): Promise<string[]> {
  const out = new Set<string>(segmentEmails)
  const canonical = getCanonicalSlug(remate.consignatariaSlug || '') || remate.consignatariaSlug

  // (a) watchers de la firma. user_favorites.user_id → FK a auth.users (NO public.users),
  // así que resolvemos el email con el RPC get_user_emails (SECURITY DEFINER) en vez del
  // embed PostgREST `users(email)` que no existe.
  const { data: favs } = await service
    .from('user_favorites')
    .select('user_id, notify_new_remate')
    .eq('consignataria_slug', canonical)

  // null/undefined = default ON (el watcher no apagó la notificación de remate).
  const watcherIds = (favs || [])
    .filter((f) => f.notify_new_remate !== false && f.user_id)
    .map((f) => f.user_id as string)

  if (watcherIds.length > 0) {
    const { data: emails } = await service.rpc('get_user_emails', { p_ids: watcherIds })
    for (const row of emails || []) {
      if (row.email) out.add(row.email.trim().toLowerCase())
    }
  }

  return [...out]
}

/**
 * Construye y manda un recordatorio. Cada mail: 1 CTA, UTM y List-Unsubscribe (el header
 * lo agrega sendRemateReminder). T-1h muestra el "en vivo" sólo si hay youtubeUrl; si no,
 * degrada a "ver catálogo".
 */
async function sendOneReminder(remate: Auction, email: string, timing: '24h' | '1h') {
  const canonical = getCanonicalSlug(remate.consignatariaSlug || '')
  const profile = canonical ? getProfile(canonical) : null
  const consignatariaName = profile?.displayName || remate.consignatariaSlug || 'Consignataria'

  const isLive = timing === '1h' && Boolean(remate.youtubeUrl)
  const subject = timing === '24h'
    ? `Mañana: ${remate.title}`
    : isLive
      ? `En vivo en 1 hora: ${remate.title}`
      : `Arranca en 1 hora: ${remate.title}`

  // Un único CTA por mail. T-1h en vivo → YouTube; en cualquier otro caso → catálogo o perfil.
  const utm = `utm_source=email&utm_medium=remate_reminder&utm_campaign=auction_${timing}`
  const profileUrl = canonical ? `${APP_URL}/consignatarias/${canonical}?${utm}` : `${APP_URL}/remates?${utm}`
  let ctaLabel: string
  let ctaUrl: string
  if (isLive && remate.youtubeUrl) {
    ctaLabel = 'Ver transmisión en vivo'
    ctaUrl = remate.youtubeUrl
  } else if (remate.catalogUrl) {
    ctaLabel = 'Ver catálogo'
    ctaUrl = remate.catalogUrl
  } else {
    ctaLabel = 'Ver el remate'
    ctaUrl = profileUrl
  }

  const heading = timing === '24h'
    ? 'Recordatorio: el remate es mañana'
    : isLive
      ? 'Arranca en 1 hora — transmisión en vivo'
      : 'Arranca en 1 hora'

  const body = `
    <h2 style="margin:0 0 12px;color:#18181b;font-size:18px">${heading}</h2>
    <p style="margin:0 0 4px;color:#18181b"><strong>${escapeHtml(remate.title)}</strong></p>
    <p style="margin:0 0 4px;color:#3f3f46">Consignataria: ${escapeHtml(consignatariaName)}</p>
    <p style="margin:0 0 4px;color:#3f3f46">Fecha: ${formatDate(remate.date)}${remate.time ? ` a las ${remate.time}` : ''}</p>
    ${remate.location ? `<p style="margin:0 0 4px;color:#3f3f46">Lugar: ${escapeHtml(remate.location)}</p>` : ''}
    ${remate.estimatedHeads ? `<p style="margin:0 0 4px;color:#3f3f46">Cabezas: ${remate.estimatedHeads.toLocaleString('es-AR')}</p>` : ''}
    <div style="text-align:center;margin:24px 0">
      <a href="${ctaUrl}" style="background:#22c55e;color:#fff;padding:12px 28px;text-decoration:none;border-radius:4px;display:inline-block;font-size:13px;font-weight:bold;letter-spacing:1px">${ctaLabel.toUpperCase()}</a>
    </div>
  `

  await sendRemateReminder(email, subject, body)
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
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

  // Alertas activas (productores que siguen una firma). alertas.user_id → FK a
  // auth.users, así que el email se resuelve con el RPC get_user_emails (no con un
  // embed `users(email)` que no existe).
  const { data: alerts, error: alertsError } = await service
    .from('alertas')
    .select('user_id, filters, status')
    .eq('status', 'active')

  if (alertsError) {
    return NextResponse.json({ error: alertsError.message }, { status: 500 })
  }

  const alertUserIds = [...new Set((alerts || []).map((a) => a.user_id).filter(Boolean))] as string[]
  const emailByUserId = new Map<string, string>()
  if (alertUserIds.length > 0) {
    const { data: emails } = await service.rpc('get_user_emails', { p_ids: alertUserIds })
    for (const row of emails || []) {
      if (row.email) emailByUserId.set(row.id, row.email)
    }
  }

  type AlertRow = { filters: Record<string, string> | null; email: string | undefined }
  const alertList: AlertRow[] = (alerts || []).map((a) => ({
    filters: (a.filters ?? null) as Record<string, string> | null,
    email: a.user_id ? emailByUserId.get(a.user_id) : undefined,
  }))

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
      const email = alert.email
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
