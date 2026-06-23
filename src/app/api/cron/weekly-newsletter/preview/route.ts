import { NextRequest, NextResponse } from 'next/server'
import { authorizeCron } from '@/lib/cron-auth'
import { buildDigestModel } from '@/lib/newsletter/digest-content'
import { buildDigestEmail } from '@/lib/newsletter/digest-template'

/**
 * PREVIEW del digest semanal "qué cambió" — modo dry-run, NO envía nada.
 *
 * Protegido igual que el cron de envío vivo (authorizeCron: CRON_SECRET o
 * ADMIN_SECRET vía Bearer / x-cron-secret / ?secret=). Renderiza el HTML del
 * digest para revisión humana ANTES de activar el envío real.
 *
 * Uso:
 *   GET /api/cron/weekly-newsletter/preview?secret=<CRON_SECRET>            → HTML
 *   GET /api/cron/weekly-newsletter/preview?secret=<...>&format=json        → modelo + headers
 *   GET /api/cron/weekly-newsletter/preview?secret=<...>&email=test@x.com   → con destinatario de prueba
 *
 * NO toca el cron route de envío (../route.ts) ni el yml. Es sólo lectura.
 */
export async function GET(req: NextRequest) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const recipient = req.nextUrl.searchParams.get('email') || 'preview@consignatarias.com'
  const format = req.nextUrl.searchParams.get('format')

  const model = buildDigestModel()
  const email = buildDigestEmail(model, recipient)

  if (format === 'json') {
    return NextResponse.json({
      dryRun: true,
      sent: false,
      recipient,
      subject: email.subject,
      headers: email.headers,
      openPixelUrl: email.openPixelUrl,
      model,
    })
  }

  // Render del HTML tal como se vería en el inbox (dry-run, sin enviar).
  return new NextResponse(email.html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Digest-Dry-Run': 'true',
      'X-Digest-Subject': encodeURIComponent(email.subject),
    },
  })
}
