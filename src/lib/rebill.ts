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

/**
 * createUserSubscriptionLink — payment link para usuario individual (productor PRO).
 * Distinto de createPaymentLink que está scoped a entidades (consignataria/frigorifico).
 *
 * Precio anchor: ARS $7.900/mes (override con REBILL_USER_PRO_AMOUNT env var).
 */
export async function createUserSubscriptionLink(
  userId: string,
  customerEmail: string
) {
  const secretKey = process.env.REBILL_SECRET_KEY
  if (!secretKey) {
    throw new Error('REBILL_SECRET_KEY is not configured')
  }

  const amount = parseInt(process.env.REBILL_USER_PRO_AMOUNT || '7900', 10)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.consignatarias.com.ar'

  const payload = {
    title: [{ language: 'es', text: 'PRO — consignatarias.com.ar' }],
    paymentMethods: [{ methods: ['card'], currency: 'ARS' }],
    prices: [{ amount, currency: 'ARS' }],
    metadata: {
      userId,
      customerEmail,
      kind: 'user_pro_subscription',
    },
    redirectUrls: {
      approved: `${appUrl}/cuenta?upgraded=true`,
    },
    isSingleUse: false, // recurring subscription
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
    console.error('Rebill user subscription error:', res.status, responseText)
    throw new Error(`Rebill error: ${res.status} ${responseText}`)
  }
  return JSON.parse(responseText)
}

/**
 * createEnterpriseStarterLink — payment link para plan Enterprise Starter (API).
 * USD 99/mes facturado en ARS al equivalente del momento del cobro.
 * Default ARS 139.900 (override con REBILL_ENTERPRISE_STARTER_AMOUNT).
 * Setea metadata.kind='enterprise_starter_subscription' para que el webhook
 * lo rutee a la rama que actualiza user_subscriptions.api_tier='starter'.
 */
export async function createEnterpriseStarterLink(
  userId: string,
  customerEmail: string,
) {
  const secretKey = process.env.REBILL_SECRET_KEY
  if (!secretKey) {
    throw new Error('REBILL_SECRET_KEY is not configured')
  }

  const amount = parseInt(process.env.REBILL_ENTERPRISE_STARTER_AMOUNT || '139900', 10)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.consignatarias.com.ar'

  const payload = {
    title: [{ language: 'es', text: 'Enterprise Starter — API consignatarias.com.ar' }],
    paymentMethods: [{ methods: ['card'], currency: 'ARS' }],
    prices: [{ amount, currency: 'ARS' }],
    metadata: {
      userId,
      customerEmail,
      kind: 'enterprise_starter_subscription',
      api_tier: 'starter',
    },
    redirectUrls: {
      approved: `${appUrl}/cuenta/api-keys?enterprise_activated=true`,
    },
    isSingleUse: false,
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
    console.error('Rebill enterprise starter error:', res.status, responseText)
    throw new Error(`Rebill error: ${res.status} ${responseText}`)
  }
  return JSON.parse(responseText)
}
