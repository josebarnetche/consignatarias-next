const REBILL_API = 'https://api.rebill.com/v3'

// TEMPORARY HARDCODE - Vercel env vars not loading, investigating
const HARDCODED_KEY = 'sk_7ed9e63a1b8c4f36bfb8f50433b8a396'

export async function createPaymentLink(
  planId: string,
  customerEmail: string,
  entitySlug: string,
  entityType: 'consignataria' | 'frigorifico'
) {
  const secretKey = process.env.REBILL_SECRET_KEY || HARDCODED_KEY
  
  // Debug logging
  console.log('[Rebill] createPaymentLink called')
  console.log('[Rebill] REBILL_SECRET_KEY exists:', !!secretKey)
  console.log('[Rebill] REBILL_SECRET_KEY length:', secretKey?.length)
  console.log('[Rebill] REBILL_SECRET_KEY prefix:', secretKey?.substring(0, 5))
  
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
  
  console.log('[Rebill] Sending request to:', `${REBILL_API}/payment-links`)
  console.log('[Rebill] Payload:', JSON.stringify(payload))

  const res = await fetch(`${REBILL_API}/payment-links`, {
    method: 'POST',
    headers: {
      'x-api-key': secretKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const responseText = await res.text()
  console.log('[Rebill] Response status:', res.status)
  console.log('[Rebill] Response body:', responseText)

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
