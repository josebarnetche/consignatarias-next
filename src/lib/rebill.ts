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

/**
 * createConsignatariaSubscriptionLink — recurring PRO link for a consignataria firm.
 * Entity-scoped: metadata.entitySlug/entityType route the Rebill webhook to Branch 2,
 * which upserts subscriptions(status='active') → getEntityTier() returns 'pro' → the
 * public profile shows the PRO badge. ARS 45.000/mes (override REBILL_CONSIGNATARIA_PRO_AMOUNT).
 * Unlike the legacy createPaymentLink (isSingleUse:true), this is a recurring subscription.
 */
export async function createConsignatariaSubscriptionLink(
  entitySlug: string,
  customerEmail: string,
) {
  const secretKey = process.env.REBILL_SECRET_KEY
  if (!secretKey) {
    throw new Error('REBILL_SECRET_KEY is not configured')
  }

  const amount = parseInt(process.env.REBILL_CONSIGNATARIA_PRO_AMOUNT || '45000', 10)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.consignatarias.com.ar'

  const payload = {
    title: [{ language: 'es', text: 'PRO Consignataria — consignatarias.com.ar' }],
    paymentMethods: [{ methods: ['card'], currency: 'ARS' }],
    prices: [{ amount, currency: 'ARS' }],
    metadata: {
      entitySlug,
      entityType: 'consignataria',
      customerEmail,
    },
    redirectUrls: {
      approved: `${appUrl}/consignatarias/${entitySlug}?upgraded=true`,
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
    console.error('Rebill consignataria subscription error:', res.status, responseText)
    throw new Error(`Rebill error: ${res.status} ${responseText}`)
  }
  return JSON.parse(responseText)
}

/**
 * createFrigorificoSubscriptionLink — link PRO recurrente para un frigorífico.
 * Igual que el de consignataria pero entity_type='frigorifico' → el webhook (Branch 2)
 * upserta subscriptions(active) y prende frigorifico_profiles.featured → el perfil
 * habilita la vitrina de carne + RFQ. Precio anclado al PRO Consignataria (spec §H3).
 */
export async function createFrigorificoSubscriptionLink(
  entitySlug: string,
  customerEmail: string,
) {
  const secretKey = process.env.REBILL_SECRET_KEY
  if (!secretKey) {
    throw new Error('REBILL_SECRET_KEY is not configured')
  }

  const amount = parseInt(process.env.REBILL_FRIGO_PRO_AMOUNT || '45000', 10)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.consignatarias.com.ar'

  const payload = {
    title: [{ language: 'es', text: 'PRO Frigorífico — consignatarias.com.ar' }],
    paymentMethods: [{ methods: ['card'], currency: 'ARS' }],
    prices: [{ amount, currency: 'ARS' }],
    metadata: {
      entitySlug,
      entityType: 'frigorifico',
      customerEmail,
    },
    redirectUrls: {
      approved: `${appUrl}/frigorificos/${entitySlug}?upgraded=true`,
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
    console.error('Rebill frigorifico subscription error:', res.status, responseText)
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
 * Generic factory for an Enterprise API plan payment link.
 *
 * `apiTier` controls metadata routing (the webhook reads este api_tier del metadata
 * para setear user_subscriptions.api_tier). Montos por defecto (pricing 2026-07):
 *   - starter: ARS 74.000  (~USD 49 al blue ~1510)
 *   - growth:  ARS 451.000 (~USD 299 al blue ~1510)
 * Son ARS pegados al USD del momento — ajustar vía REBILL_ENTERPRISE_{STARTER,GROWTH}_AMOUNT
 * env a medida que se mueve el blue. Scale queda sales-led (mailto), sin link self-serve.
 */
async function createEnterprisePlanLink(
  userId: string,
  customerEmail: string,
  apiTier: 'starter' | 'growth',
) {
  const secretKey = process.env.REBILL_SECRET_KEY
  if (!secretKey) {
    throw new Error('REBILL_SECRET_KEY is not configured')
  }

  const defaultAmounts = { starter: 74000, growth: 451000 }
  const envKey = apiTier === 'growth' ? 'REBILL_ENTERPRISE_GROWTH_AMOUNT' : 'REBILL_ENTERPRISE_STARTER_AMOUNT'
  const amount = parseInt(process.env[envKey] || String(defaultAmounts[apiTier]), 10)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.consignatarias.com.ar'
  const planLabel = apiTier === 'growth' ? 'Growth' : 'Starter'

  const payload = {
    title: [
      { language: 'es', text: `Enterprise ${planLabel} — API consignatarias.com.ar` },
    ],
    paymentMethods: [{ methods: ['card'], currency: 'ARS' }],
    prices: [{ amount, currency: 'ARS' }],
    metadata: {
      userId,
      customerEmail,
      kind: 'enterprise_subscription',
      api_tier: apiTier,
    },
    redirectUrls: {
      approved: `${appUrl}/cuenta/api-keys?enterprise_activated=${apiTier}`,
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
    console.error(`Rebill enterprise ${apiTier} error:`, res.status, responseText)
    throw new Error(`Rebill error: ${res.status} ${responseText}`)
  }
  return JSON.parse(responseText)
}

export async function createEnterpriseGrowthLink(
  userId: string,
  customerEmail: string,
) {
  return createEnterprisePlanLink(userId, customerEmail, 'growth')
}

/**
 * createEnterpriseStarterLink — payment link para plan Enterprise Starter (API).
 * ARS 74.000/mes (override con REBILL_ENTERPRISE_STARTER_AMOUNT), alineado con el
 * precio publicado en /planes y con createEnterprisePlanLink. El default viejo era
 * 139.900 (precio stale) → el checkout cobraba distinto de lo que muestra la página.
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

  const amount = parseInt(process.env.REBILL_ENTERPRISE_STARTER_AMOUNT || '74000', 10)
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

/**
 * createGuiaPurchaseLink — pago ÚNICO de una guía premium (PDF).
 *
 * A diferencia de los links de arriba, esto no otorga tier ni suscripción: es
 * `isSingleUse: true` y el webhook (Branch 3, kind='guia_purchase') deja una fila
 * en `guia_purchases`, que es el entitlement de descarga. El email viaja en la
 * metadata porque la compra es email-first (no exige cuenta) y ES la llave con la
 * que después se sirve el PDF estampado.
 */
export async function createGuiaPurchaseLink(opts: {
  guiaSlug: string
  title: string
  amountArs: number
  customerEmail: string
  /** Datos de factura A (opcionales) — la emite Memola Medios SAS. */
  razonSocial?: string
  cuit?: string
}) {
  const secretKey = process.env.REBILL_SECRET_KEY
  if (!secretKey) {
    throw new Error('REBILL_SECRET_KEY is not configured')
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.consignatarias.com.ar'

  const payload = {
    // Punto medio, no raya: el título del catálogo ya trae una ("… — Guía 2026")
    // y dos rayas en el resumen del checkout se leen como un error.
    title: [{ language: 'es', text: `${opts.title} · consignatarias.com.ar` }],
    paymentMethods: [{ methods: ['card'], currency: 'ARS' }],
    prices: [{ amount: opts.amountArs, currency: 'ARS' }],
    metadata: {
      kind: 'guia_purchase',
      guiaSlug: opts.guiaSlug,
      customerEmail: opts.customerEmail,
      ...(opts.razonSocial ? { razonSocial: opts.razonSocial } : {}),
      ...(opts.cuit ? { cuit: opts.cuit } : {}),
    },
    redirectUrls: {
      approved: `${appUrl}/cuenta/guias?comprada=${encodeURIComponent(opts.guiaSlug)}`,
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
    console.error('Rebill guia purchase error:', res.status, responseText)
    throw new Error(`Rebill error: ${res.status} ${responseText}`)
  }
  return JSON.parse(responseText)
}

/**
 * createInformePurchaseLink — pago ÚNICO de un informe de datos.
 *
 * Igual que `createGuiaPurchaseLink` en lo esencial (single use, email-first, el precio lo
 * pone el servidor), con dos diferencias que importan:
 *
 *  1. **`variante`**. El mismo producto tiene muchos entregables — un informe por zona, por
 *     departamento o por provincia. La variante viaja en la metadata y termina siendo la
 *     coordenada del entitlement: comprar el de Mercedes no habilita el de Curuzú Cuatiá.
 *
 *  2. **Los tres `redirectUrls`**. Los links viejos declaran sólo `approved`, así que una
 *     tarjeta rechazada deja al comprador varado en Rebill sin señal de vuelta. Acá se
 *     declaran también el rechazo y la cancelación, que caen en una página que le explica
 *     qué pasó y cómo seguir. Es el escenario más probable con una tarjeta del exterior.
 */
export async function createInformePurchaseLink(opts: {
  productoSlug: string
  title: string
  amountArs: number
  customerEmail: string
  variante?: string
  varianteLabel?: string
  razonSocial?: string
  cuit?: string
}) {
  const secretKey = process.env.REBILL_SECRET_KEY
  if (!secretKey) {
    throw new Error('REBILL_SECRET_KEY is not configured')
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.consignatarias.com.ar'
  const titulo = opts.varianteLabel ? `${opts.title} · ${opts.varianteLabel}` : opts.title

  const payload = {
    title: [{ language: 'es', text: `${titulo} · consignatarias.com.ar` }],
    paymentMethods: [{ methods: ['card'], currency: 'ARS' }],
    prices: [{ amount: opts.amountArs, currency: 'ARS' }],
    metadata: {
      kind: 'informe_purchase',
      productoSlug: opts.productoSlug,
      ...(opts.variante ? { variante: opts.variante } : {}),
      ...(opts.varianteLabel ? { varianteLabel: opts.varianteLabel } : {}),
      customerEmail: opts.customerEmail,
      ...(opts.razonSocial ? { razonSocial: opts.razonSocial } : {}),
      ...(opts.cuit ? { cuit: opts.cuit } : {}),
    },
    redirectUrls: {
      approved: `${appUrl}/cuenta/informes?comprado=${encodeURIComponent(opts.productoSlug)}`,
      rejected: `${appUrl}/informes/pago-no-completado?motivo=rechazado&p=${encodeURIComponent(opts.productoSlug)}`,
      cancelled: `${appUrl}/informes/pago-no-completado?motivo=cancelado&p=${encodeURIComponent(opts.productoSlug)}`,
    },
    isSingleUse: true,
  }

  const res = await fetch(`${REBILL_API}/payment-links`, {
    method: 'POST',
    headers: { 'x-api-key': secretKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const responseText = await res.text()
  if (!res.ok) {
    console.error('Rebill informe purchase error:', res.status, responseText)
    throw new Error(`Rebill error: ${res.status} ${responseText}`)
  }
  return JSON.parse(responseText)
}

/**
 * createProductoSubscriptionLink — alta de suscripción a un producto de datos.
 *
 * Diferencia con `createInformePurchaseLink`: `isSingleUse: false`. Rebill cobra el
 * primer período al aprobar y después renueva solo, mandando `payment.success` en cada
 * ciclo — que es lo que corre `current_period_end` hacia adelante en el webhook.
 *
 * Lleva los tres `redirectUrls`, no sólo `approved`: una tarjeta rechazada en una alta de
 * suscripción es igual de probable que en una compra, y sin la vuelta el interesado queda
 * varado sin que nos enteremos.
 */
export async function createProductoSubscriptionLink(opts: {
  productoSlug: string
  title: string
  amountArs: number
  customerEmail: string
  razonSocial?: string
  cuit?: string
}) {
  const secretKey = process.env.REBILL_SECRET_KEY
  if (!secretKey) {
    throw new Error('REBILL_SECRET_KEY is not configured')
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.consignatarias.com.ar'

  const payload = {
    title: [{ language: 'es', text: `${opts.title} · consignatarias.com.ar` }],
    paymentMethods: [{ methods: ['card'], currency: 'ARS' }],
    prices: [{ amount: opts.amountArs, currency: 'ARS' }],
    metadata: {
      kind: 'producto_subscription',
      productoSlug: opts.productoSlug,
      customerEmail: opts.customerEmail,
      ...(opts.razonSocial ? { razonSocial: opts.razonSocial } : {}),
      ...(opts.cuit ? { cuit: opts.cuit } : {}),
    },
    redirectUrls: {
      approved: `${appUrl}/cuenta/informes?suscripto=${encodeURIComponent(opts.productoSlug)}`,
      rejected: `${appUrl}/informes/pago-no-completado?motivo=rechazado&p=${encodeURIComponent(opts.productoSlug)}`,
      cancelled: `${appUrl}/informes/pago-no-completado?motivo=cancelado&p=${encodeURIComponent(opts.productoSlug)}`,
    },
    isSingleUse: false, // suscripción recurrente
  }

  const res = await fetch(`${REBILL_API}/payment-links`, {
    method: 'POST',
    headers: { 'x-api-key': secretKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const responseText = await res.text()
  if (!res.ok) {
    console.error('Rebill producto subscription error:', res.status, responseText)
    throw new Error(`Rebill error: ${res.status} ${responseText}`)
  }
  return JSON.parse(responseText)
}

/**
 * Estado de una suscripción en Rebill.
 *
 * `PATCH /v3/subscriptions/{id}` es el endpoint que existe —se verificó sondeando la API:
 * es el único verbo que responde "Subscription {id} not found" en vez de "Cannot PATCH",
 * lo que distingue una ruta real de una inexistente. DELETE, PUT y `/cancel` no existen.
 */
export async function getRebillSubscription(
  subscriptionId: string,
): Promise<{ status?: string; [k: string]: unknown } | null> {
  const secretKey = process.env.REBILL_SECRET_KEY
  if (!secretKey) throw new Error('REBILL_SECRET_KEY is not configured')

  const res = await fetch(`${REBILL_API}/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    headers: { 'x-api-key': secretKey },
  })
  if (!res.ok) return null
  return (await res.json()) as { status?: string }
}

/** Estados que consideramos "ya no cobra". Se compara en mayúsculas. */
const ESTADOS_INACTIVOS = ['CANCELLED', 'CANCELED', 'INACTIVE', 'PAUSED', 'FINISHED', 'EXPIRED']

/**
 * Cancela el débito de una suscripción en Rebill.
 *
 * POR QUÉ ESTÁ ESCRITO ASÍ
 * La documentación pública de Rebill no es accesible (su sitio de docs es una SPA y no
 * expone OpenAPI), y el `PATCH` valida la existencia del recurso ANTES que el body, así
 * que no se puede inferir el nombre del campo sondeando con un id falso. Sin poder leer
 * el contrato, la opción honesta no es adivinar y confiar: es **probar y verificar**.
 *
 * Entonces: se intentan los shapes más probables en orden y, sobre todo, **se comprueba el
 * efecto con un GET**. Un 200 no alcanza — si la API acepta el PATCH pero ignora un campo
 * que no conoce, la suscripción sigue cobrando y nosotros creeríamos que la dimos de baja.
 * Eso es exactamente el incidente que hay que evitar.
 *
 * Devuelve `verificada: true` sólo si el GET posterior confirma que dejó de estar activa.
 * Cuando no se puede confirmar, el llamador tiene que tratarlo como baja pendiente y
 * avisar — nunca como éxito.
 */
export async function cancelarSuscripcionRebill(subscriptionId: string): Promise<{
  ok: boolean
  verificada: boolean
  estadoFinal: string | null
  intento: string | null
  detalle: string
}> {
  const secretKey = process.env.REBILL_SECRET_KEY
  if (!secretKey) throw new Error('REBILL_SECRET_KEY is not configured')

  const url = `${REBILL_API}/subscriptions/${encodeURIComponent(subscriptionId)}`
  const headers = { 'x-api-key': secretKey, 'Content-Type': 'application/json' }

  // De más probable a menos. El orden importa poco porque igual se verifica el efecto.
  const intentos: Array<[string, Record<string, unknown>]> = [
    ['status=CANCELLED', { status: 'CANCELLED' }],
    ['status=cancelled', { status: 'cancelled' }],
    ['status=CANCELED', { status: 'CANCELED' }],
    ['status=INACTIVE', { status: 'INACTIVE' }],
    ['cancel=true', { cancel: true }],
    ['active=false', { active: false }],
  ]

  const errores: string[] = []

  for (const [nombre, body] of intentos) {
    let res: Response
    try {
      res = await fetch(url, { method: 'PATCH', headers, body: JSON.stringify(body) })
    } catch (err) {
      errores.push(`${nombre}: ${err instanceof Error ? err.message : 'fetch falló'}`)
      continue
    }

    if (!res.ok) {
      errores.push(`${nombre}: HTTP ${res.status}`)
      continue
    }

    // Aceptó. Ahora la única pregunta que importa: ¿dejó de cobrar?
    const sub = await getRebillSubscription(subscriptionId)
    const estado = String(sub?.status ?? '').toUpperCase()
    if (estado && ESTADOS_INACTIVOS.includes(estado)) {
      return {
        ok: true,
        verificada: true,
        estadoFinal: estado,
        intento: nombre,
        detalle: `Cancelada y verificada con ${nombre}.`,
      }
    }

    errores.push(`${nombre}: aceptado pero el estado quedó en "${estado || 'desconocido'}"`)
  }

  return {
    ok: false,
    verificada: false,
    estadoFinal: null,
    intento: null,
    detalle: `Ningún intento dio de baja el débito. ${errores.join(' · ')}`,
  }
}
