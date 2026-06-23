import { NextRequest, NextResponse } from 'next/server'
import { logEvent } from '@/lib/ops'

export const dynamic = 'force-dynamic'

/**
 * GET /api/newsletter/digest/open?email=<email>&campaign=<campaign>
 *
 * Pixel de apertura (digest_open) del digest semanal "qué cambió". Devuelve un
 * PNG 1x1 transparente y registra la apertura de forma liviana en ops_events
 * (reusando logEvent, que es fire-and-forget vía waitUntil y NUNCA tira).
 *
 * Regla de oro: el pixel SIEMPRE responde la imagen. Si el log falla, da igual —
 * logEvent ya traga sus propios errores; aun así envolvemos en try/catch para
 * blindar el response. Cache-Control: no-store para que cada apertura cuente.
 */

// PNG transparente 1x1 (43 bytes), precomputado.
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC',
  'base64',
)

export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get('email') || null
    const campaign = req.nextUrl.searchParams.get('campaign') || null

    // Registro liviano y fire-and-forget. No bloquea la respuesta del pixel.
    void logEvent({
      eventType: 'api_call',
      status: 'ok',
      route: '/api/newsletter/digest/open',
      metadata: { kind: 'digest_open', email, campaign },
    })
  } catch {
    // El pixel nunca debe fallar por culpa del logging.
  }

  return new NextResponse(PIXEL, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Content-Length': String(PIXEL.length),
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    },
  })
}
