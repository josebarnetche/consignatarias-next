import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/admin-auth'
import { createPaymentLink } from '@/lib/rebill'

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authorized) return auth.response!

  try {
    const { planId, entitySlug, entityType } = await request.json()

    if (!planId || !entitySlug || !entityType) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: planId, entitySlug, entityType' },
        { status: 400 }
      )
    }

    if (entityType !== 'consignataria' && entityType !== 'frigorifico') {
      return NextResponse.json(
        { error: 'entityType debe ser "consignataria" o "frigorifico"' },
        { status: 400 }
      )
    }

    const checkout = await createPaymentLink(planId, auth.email!, entitySlug, entityType)

    return NextResponse.json({ url: checkout.url })
  } catch (err) {
    console.error('Subscribe error:', err)
    return NextResponse.json(
      { error: 'Error al crear el link de pago' },
      { status: 500 }
    )
  }
}
