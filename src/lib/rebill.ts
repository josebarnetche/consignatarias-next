const REBILL_API = 'https://api.rebill.com/v3'

export async function createPaymentLink(
  planId: string,
  customerEmail: string,
  entitySlug: string,
  entityType: 'consignataria' | 'frigorifico'
) {
  const secretKey = process.env.REBILL_SECRET_KEY

  if (!secretKey) {
    throw new Error('REBILL_SECRET_KEY is not configured')
  }

  const amount = planId === process.env.REBILL_FRIGO_PLAN_ID ? 35000 : 45000
  const title = entityType === 'frigorifico'
    ? 'Frigo PRO - Consignatarias.com.ar'
    : 'PRO - Consignatarias.com.ar'

  const payload = {
    title: [{ language: 'es', text: title }],
    paymentMethods: [{ methods: ['card'], currency: 'ARS' }],
    prices: [{ amount, currency: 'ARS' }],
    metadata: { entitySlug, entityType, customerEmail, planId },
    redirectUrls: {
      approved: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.consignatarias.com.ar'}/dashboard?upgraded=true`,
    },
    isSingleUse: true,
  }

  const res = await fetch(`${REBILL_API}/payment-links`, {
    method: 'POST',
    headers: {
      'x-api-key': secretKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const responseText = await res.text()

  if (!res.ok) {
    console.error('Rebill payment-links error:', res.status, responseText)
    throw new Error(`Rebill error: ${res.status} ${responseText}`)
  }

  return JSON.parse(responseText)
}

export async function cancelSubscription(rebillSubscriptionId: string) {
  const res = await fetch(`${REBILL_API}/subscriptions/${rebillSubscriptionId}/cancel`, {
    method: 'POST',
    headers: {
      'x-api-key': process.env.REBILL_SECRET_KEY!,
      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Rebill cancel error: ${res.status} ${err}`)
  }

  return res.json()
}
