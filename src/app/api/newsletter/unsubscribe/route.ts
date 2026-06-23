import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { logEvent } from '@/lib/ops'

export const dynamic = 'force-dynamic'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.consignatarias.com.ar'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Baja del newsletter — one-click (RFC 8058) + fallback por link.
 *
 *   POST /api/newsletter/unsubscribe?email=&campaign=   → lo dispara el botón
 *        nativo de Gmail/Apple Mail (List-Unsubscribe-Post=One-Click). Responde
 *        200 con cuerpo mínimo (el cliente de correo no muestra HTML acá).
 *   GET  /api/newsletter/unsubscribe?email=&campaign=    → fallback humano:
 *        marca la baja y redirige a una página de confirmación simple.
 *
 * Sin auth (es one-click desde el mail, no hay sesión), pero se valida el formato
 * del email. Idempotente: dar de baja a alguien ya dado de baja devuelve ok igual.
 * Columnas reales de `newsletter_subscribers` (ver migración 20260313):
 *   status ('active'|'unsubscribed'|'bounced') + unsubscribed_at TIMESTAMPTZ.
 */

/** Marca al suscriptor como dado de baja. Idempotente. Devuelve true si el email era válido y la query no falló. */
async function unsubscribe(emailRaw: string | null, campaign: string | null): Promise<{ ok: boolean; email: string | null }> {
  const email = (emailRaw ?? '').trim().toLowerCase()
  if (!email || !EMAIL_RE.test(email)) {
    return { ok: false, email: null }
  }

  try {
    const supabase = requireServiceClient()
    // Idempotente: actualiza por email; si ya estaba 'unsubscribed' no cambia nada
    // relevante. No falla si el email no existe en la tabla (update afecta 0 filas).
    const { error } = await supabase
      .from('newsletter_subscribers')
      .update({
        status: 'unsubscribed',
        unsubscribed_at: new Date().toISOString(),
      })
      .eq('email', email)

    if (error) {
      console.error('[newsletter/unsubscribe] update error:', error.message)
      return { ok: false, email }
    }

    void logEvent({
      eventType: 'api_call',
      status: 'ok',
      route: '/api/newsletter/unsubscribe',
      metadata: { kind: 'digest_unsubscribe', email, campaign },
    })

    return { ok: true, email }
  } catch (err) {
    console.error('[newsletter/unsubscribe] unexpected error:', err)
    return { ok: false, email }
  }
}

export async function POST(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const { ok } = await unsubscribe(sp.get('email'), sp.get('campaign'))
  // One-click: el cliente de correo sólo mira el status code. Cuerpo mínimo.
  return new NextResponse(ok ? 'unsubscribed' : 'invalid email', {
    status: ok ? 200 : 400,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const { ok, email } = await unsubscribe(sp.get('email'), sp.get('campaign'))
  // Fallback humano: redirige a la página de confirmación que ya enlazan los emails.
  const target = new URL('/unsubscribe', APP_URL)
  if (email) target.searchParams.set('email', email)
  target.searchParams.set('ok', ok ? '1' : '0')
  return NextResponse.redirect(target, { status: 302 })
}
