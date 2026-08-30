import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireServiceClient } from '@/lib/supabase'
import { checkRateLimit, getClientId } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const schema = z.object({
  email: z.string().email(),
  source: z.string().trim().max(60).optional(),
})

/**
 * POST /api/alertas/novillo-usd  { email }
 *
 * Alta a la alerta del novillo en dólares. **No pide umbral ni configuración**: ése es el
 * punto del producto. La feature de alertas configurables que ya existe tiene 0 usos en 48
 * usuarios; acá lo único que el productor elige es si la quiere.
 *
 * Re-suscribirse limpia la baja anterior en vez de fallar: alguien que se dio de baja y
 * vuelve no tiene por qué toparse con un error.
 */
export async function POST(req: NextRequest) {
  const rl = checkRateLimit(`alerta-novillo:${getClientId(req)}`)
  if (!rl.success) {
    return NextResponse.json({ error: 'Demasiados intentos. Probá en un minuto.' }, { status: 429 })
  }

  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Email inválido.' }, { status: 400 })
  }

  const email = parsed.data.email.trim().toLowerCase()
  const service = requireServiceClient()

  const { error } = await service
    .from('alerta_novillo_usd_suscriptores')
    .upsert(
      { email, source: parsed.data.source ?? 'sitio', unsubscribed_at: null },
      { onConflict: 'email' },
    )

  if (error) {
    console.error('[alerta-novillo] alta falló:', error.message)
    return NextResponse.json({ error: 'No pudimos anotarte.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
