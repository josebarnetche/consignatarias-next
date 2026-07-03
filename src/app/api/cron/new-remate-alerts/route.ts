import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { authorizeCron } from '@/lib/cron-auth'
import { getCanonicalSlug } from '@/lib/data/consignataria-slugs'
import { getEntityTier } from '@/lib/features'
import { sendNewRemateAlert } from '@/lib/email'
import rematesData from '@/lib/data/remates.json'
import type { Auction } from '@/lib/db/schema'

const auctions = rematesData as Auction[]

/**
 * Cron job to send immediate alerts when PRO consignatarias publish new remates.
 * Runs every 30 minutes, checks for remates added since last check.
 * 
 * GET /api/cron/new-remate-alerts
 * Requires CRON_SECRET header
 * 
 * Flow:
 * 1. Get remates created/scraped in last 30 min
 * 2. Filter to PRO consignatarias only
 * 3. Match against active alertas (by provincia, tipo, categoria)
 * 4. Send email notifications to matching subscribers
 */

interface AlertMatch {
  alertaId: string
  userId: string
  email: string
  webhookUrl?: string
  remateTitle: string
  consignataria: string
  provincia: string
  fecha: string
  url: string
}

export async function GET(req: NextRequest) {
  // Fail CLOSED in every environment (was only enforced when NODE_ENV==='production').
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  // Could be used to filter "new since last run" in future
  const _thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000)
  
  const results = {
    checked: 0,
    newRemates: 0,
    proRemates: 0,
    alertsSent: 0,
    webhooksSent: 0,
    errors: [] as string[],
  }

  try {
    const service = requireServiceClient()

    // Alertas activas suscriptas a remate.created. (Columnas reales: `id`, `status`
    // — antes se usaba `alerta_id`/`activa`, inexistentes → la query fallaba.)
    const { data: alerts, error: alertsError } = await service
      .from('alertas')
      .select('id, user_id, webhook_url, filters')
      .eq('status', 'active')
      .contains('events', ['remate.created'])

    if (alertsError) {
      console.error('[new-remate-alerts] Error fetching alerts:', alertsError)
      return NextResponse.json({ error: alertsError.message }, { status: 500 })
    }

    if (!alerts || alerts.length === 0) {
      return NextResponse.json({
        message: 'No active alerts subscribed to remate.created',
        ...results,
      })
    }

    // Email del dueño de cada alerta: alertas.user_id → FK a auth.users, así que se
    // resuelve con el RPC get_user_emails (el embed `users(email)` no existe).
    const alertUserIds = [...new Set(alerts.map((a) => a.user_id).filter(Boolean))] as string[]
    const emailByUserId = new Map<string, string>()
    if (alertUserIds.length > 0) {
      const { data: emails } = await service.rpc('get_user_emails', { p_ids: alertUserIds })
      for (const row of emails || []) {
        if (row.email) emailByUserId.set(row.id, row.email)
      }
    }

    // Find remates added since last run
    // Note: In production, this would query scraped_at or created_at from DB
    // For now, we check remates with dates in the future that weren't in previous scrape
    const newRemates: Auction[] = []
    
    for (const auction of auctions) {
      if (auction.status !== 'scheduled') continue
      
      // Check if remate date is in the future
      const remateDate = new Date(auction.date)
      if (remateDate < now) continue

      // Check if PRO consignataria
      const canonical = getCanonicalSlug(auction.consignatariaSlug || '')
      if (!canonical) continue
      
      const tier = await getEntityTier('consignataria', canonical)
      if (tier !== 'pro' && tier !== 'enterprise') continue

      results.proRemates++
      
      // For MVP: consider all PRO remates with dates > 7 days out as "new"
      // In production: would check scraped_at timestamp
      const daysUntil = (remateDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      if (daysUntil > 7 && daysUntil < 60) {
        newRemates.push(auction)
      }
    }

    results.newRemates = newRemates.length
    results.checked = auctions.length

    if (newRemates.length === 0) {
      return NextResponse.json({
        message: 'No new PRO remates found',
        ...results,
      })
    }

    // Match new remates against alerts
    const matches: AlertMatch[] = []

    for (const remate of newRemates) {
      for (const alert of alerts) {
        const filters = alert.filters as Record<string, string> || {}
        
        // Check provincia filter
        if (filters.provincia && filters.provincia !== remate.province) {
          continue
        }

        // Check tipo filter
        if (filters.tipo && filters.tipo !== remate.type) {
          continue
        }

        // Check categoria filter  
        if (filters.categoria && filters.categoria !== remate.mainCategory) {
          continue
        }

        // Match found! Email resuelto vía el RPC (arriba).
        const userEmail = alert.user_id ? emailByUserId.get(alert.user_id) : undefined
        if (!userEmail) continue

        matches.push({
          alertaId: alert.id,
          userId: alert.user_id ?? '',
          email: userEmail,
          webhookUrl: alert.webhook_url || undefined,
          remateTitle: remate.title,
          consignataria: remate.consignatariaName || '',
          provincia: remate.province || '',
          fecha: remate.date,
          url: `https://consignatarias.com.ar/remates/${remate.id}`,
        })
      }
    }

    // Send notifications (dedupe by email+remate)
    const sent = new Set<string>()
    
    for (const match of matches) {
      const key = `${match.email}:${match.url}`
      if (sent.has(key)) continue
      sent.add(key)

      try {
        // Send email
        await sendNewRemateAlert({
          to: match.email,
          remateTitle: match.remateTitle,
          consignataria: match.consignataria,
          provincia: match.provincia,
          fecha: match.fecha,
          url: match.url,
        })
        results.alertsSent++

        // Send webhook if configured
        if (match.webhookUrl) {
          await fetch(match.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'remate.created',
              data: {
                title: match.remateTitle,
                consignataria: match.consignataria,
                provincia: match.provincia,
                fecha: match.fecha,
                url: match.url,
              },
              timestamp: now.toISOString(),
            }),
          })
          results.webhooksSent++
        }
      } catch (err) {
        results.errors.push(`Failed to send alert to ${match.email}: ${err}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${results.newRemates} new PRO remates, sent ${results.alertsSent} alerts`,
      ...results,
    })

  } catch (error) {
    console.error('[new-remate-alerts] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}
