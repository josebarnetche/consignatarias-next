import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { getCanonicalSlug, getProfile } from '@/lib/data/consignataria-slugs'
import { getEntityTier } from '@/lib/features'
import { sendRemateReminder } from '@/lib/email'
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
 * GET /api/cron/remate-reminders
 * Requires CRON_SECRET header
 */

export async function GET(req: NextRequest) {
  // Verify cron secret
  const cronSecret = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret')
  const envSecret = process.env.CRON_SECRET
  
  // Debug: Log first 4 chars of each secret for comparison
  console.log('[remate-reminders] Secret check:', {
    provided: cronSecret?.substring(0, 4) + '...',
    expected: envSecret?.substring(0, 4) + '...',
    providedLen: cronSecret?.length,
    expectedLen: envSecret?.length,
    match: cronSecret === envSecret
  })
  
  if (cronSecret !== envSecret && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ 
      error: 'Unauthorized',
      debug: {
        providedPrefix: cronSecret?.substring(0, 4),
        expectedPrefix: envSecret?.substring(0, 4),
        providedLen: cronSecret?.length,
        expectedLen: envSecret?.length
      }
    }, { status: 401 })
  }

  const now = new Date()
  const results = {
    checked: 0,
    remindersSent24h: 0,
    remindersSent1h: 0,
    errors: [] as string[],
  }

  try {
    const service = createServiceClient()

    // Get all active alerts
    const { data: alerts, error: alertsError } = await service
      .from('alertas')
      .select('*')
      .eq('activa', true)

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
