import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sendArrepentimientoRequest } from '@/lib/email'

export const dynamic = 'force-dynamic'

const schema = z.object({
  nombre: z.string().min(2, 'Ingresá tu nombre').max(120),
  email: z.string().email('Email inválido'),
  identificador: z.string().max(200).optional(),
  motivo: z.string().max(1000).optional(),
})

/**
 * POST /api/arrepentimiento
 *
 * Right-of-withdrawal request (Botón de Arrepentimiento — Res. 424/2020 SCI,
 * art. 34 Ley 24.240). Records the request by notifying the team and sends the
 * user an acknowledgement. No account required, per the resolution.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }
    await sendArrepentimientoRequest(parsed.data)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'No se pudo procesar la solicitud' }, { status: 500 })
  }
}
