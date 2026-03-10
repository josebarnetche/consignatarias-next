const REBILL_API = 'https://api.rebill.com/v3'

export async function createPaymentLink(
  planId: string,
  customerEmail: string,
  entitySlug: string,
  entityType: 'consignataria' | 'frigorifico'
) {
  const res = await fetch(`${REBILL_API}/checkout`, {
    method: 'POST',
    headers: {
      'x-api-key': process.env.REBILL_SECRET_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      planId,
      customer: { email: customerEmail },
      metadata: { entitySlug, entityType },
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?upgraded=true`,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Rebill error: ${res.status} ${err}`)
  }

  return res.json()
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
