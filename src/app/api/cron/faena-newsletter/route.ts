import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { sendFaenaNewsletter } from '@/lib/email'
import { getFaenaStats, formatFaenaDate } from '@/lib/faena-api'

/**
 * Faena Newsletter — sends monthly cattle slaughter stats to subscribers.
 * Triggered by GitHub Actions cron (1st of each month, 10:00 ART) or manually.
 * Auth: requires ADMIN_SECRET as Bearer token or ?secret= query param.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
    || req.nextUrl.searchParams.get('secret')

  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Fetch latest faena stats from gobierno API
  const stats = await getFaenaStats()
  
  if (!stats) {
    return NextResponse.json({ 
      error: 'No se pudieron obtener datos de faena',
      message: 'API datos.gob.ar no respondió correctamente'
    }, { status: 502 })
  }

  const supabase = requireServiceClient()

  // Get newsletter subscribers with faena topic preference
  // Falls back to all active subscribers if no topic preference system exists
  const { data: subscribers } = await supabase
    .from('newsletter_subscribers')
    .select('email, preferences')
    .eq('status', 'active')

  if (!subscribers || subscribers.length === 0) {
    return NextResponse.json({ message: 'No hay suscriptores activos', sent: 0 })
  }

  // Filter to subscribers who want faena updates (or have no preference = all topics)
  const faenaSubscribers = subscribers.filter(sub => {
    if (!sub.preferences) return true // No preference = subscribed to all
    const prefs = typeof sub.preferences === 'string' 
      ? JSON.parse(sub.preferences) 
      : sub.preferences
    return prefs.faena !== false // Explicitly opted out
  })

  if (faenaSubscribers.length === 0) {
    return NextResponse.json({ message: 'No hay suscriptores de faena', sent: 0 })
  }

  // Format month name
  const currentMonth = formatFaenaDate(stats.current.date)

  // Send emails
  let sent = 0
  const errors: string[] = []

  for (const sub of faenaSubscribers) {
    try {
      const result = await sendFaenaNewsletter({
        to: sub.email,
        currentMonth,
        cabezas: stats.current.cabezas,
        monthlyChange: stats.monthlyChange,
        yearlyChange: stats.yearlyChange,
        total12Months: stats.total12Months,
      })
      
      if (result.success) {
        sent++
      } else {
        errors.push(`${sub.email}: ${result.error}`)
      }
      
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 100))
    } catch (err) {
      errors.push(`${sub.email}: ${err}`)
    }
  }

  return NextResponse.json({
    message: `Faena newsletter enviado: ${sent}/${faenaSubscribers.length}`,
    sent,
    total: faenaSubscribers.length,
    month: currentMonth,
    stats: {
      cabezas: stats.current.cabezas,
      monthlyChange: stats.monthlyChange.toFixed(1) + '%',
      yearlyChange: stats.yearlyChange.toFixed(1) + '%',
      total12Months: stats.total12Months,
    },
    errors: errors.length > 0 ? errors : undefined,
  })
}

// GET for health check
export async function GET() {
  const stats = await getFaenaStats()
  
  if (!stats) {
    return NextResponse.json({ 
      status: 'error',
      message: 'Failed to fetch faena data'
    }, { status: 502 })
  }

  return NextResponse.json({
    status: 'ok',
    lastData: formatFaenaDate(stats.current.date),
    cabezas: stats.current.cabezas,
    endpoint: '/api/cron/faena-newsletter',
    method: 'POST',
    auth: 'Bearer ADMIN_SECRET or ?secret=ADMIN_SECRET',
  })
}
