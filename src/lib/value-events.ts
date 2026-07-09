/**
 * value-events.ts — Registro único de EVENTOS DE VALOR del sistema interno de conteo.
 *
 * Qué es un "evento de valor": una acción del usuario que señala valor/intención real
 * a lo largo del journey (recurrencia, lead, engagement, funnel de pago, conversión,
 * descubrimiento AI, B2B). No es un pageview genérico — es un hecho con VALOR ATRIBUIBLE.
 *
 * Cada evento tiene un PESO = proximidad a la plata / fuerza de la señal. El sistema
 * cuenta eventos por tipo/entidad/fuente/día y computa un "índice de valor" ponderado
 * (Σ count×peso). Así una suscripción al calendario (recurrencia) o un clic de WhatsApp
 * (lead) pesan mucho más que ver el muro PRO, y podemos atribuir valor por canal
 * (ej. cuánto valor generan las sesiones que vienen de ChatGPT).
 *
 * Esta es la ÚNICA fuente de verdad: la usan el helper cliente (trackValueEvent), el
 * beacon (/api/track/event, que deriva el peso de acá y NO confía en el cliente) y los
 * reportes. Agregar un evento = agregar una línea acá.
 */

export type ValueEventGroup =
  | 'recurrencia' // crea visitas repetidas → la palanca de monetización #1
  | 'lead' // intención directa de contacto
  | 'engagement' // interacción con un remate puntual
  | 'funnel' // escalones del embudo de pago
  | 'conversion' // la plata de verdad
  | 'discovery' // origen estratégico (AI)
  | 'b2b' // intención de la consignataria (reclamar/PRO)

export interface ValueEventDef {
  weight: number
  group: ValueEventGroup
  label: string
}

export const VALUE_EVENTS = {
  // --- Recurrencia (lo que nos faltaba: que el anónimo vuelva) ---
  calendar_subscribe: { weight: 12, group: 'recurrencia', label: 'Suscripción a calendario' },
  calendar_download: { weight: 6, group: 'recurrencia', label: 'Descargó .ics de un remate' },
  newsletter_subscribe: { weight: 8, group: 'recurrencia', label: 'Suscripción a newsletter' },
  alert_create: { weight: 8, group: 'recurrencia', label: 'Alerta creada' },

  // --- Lead / contacto (intención directa) ---
  contact_whatsapp: { weight: 10, group: 'lead', label: 'Clic WhatsApp' },
  contact_phone: { weight: 6, group: 'lead', label: 'Clic teléfono' },
  contact_email: { weight: 6, group: 'lead', label: 'Clic email' },
  contact_web: { weight: 4, group: 'lead', label: 'Clic sitio web' },
  // Form "pedí que te contacten" enviado (firmas sin contacto público). Lead
  // capturado de verdad — pesa como un WhatsApp.
  lead_form: { weight: 10, group: 'lead', label: 'Form de contacto enviado' },

  // --- Engagement con un remate ---
  catalog_click: { weight: 5, group: 'engagement', label: 'Abrir catálogo' },
  live_click: { weight: 5, group: 'engagement', label: 'Abrir transmisión en vivo' },
  youtube_channel_click: { weight: 3, group: 'engagement', label: 'Abrir canal de YouTube' },

  // --- Señales de engagement pasivo (first-party, ligadas al visitor_id) ---
  scroll_depth: { weight: 1, group: 'engagement', label: 'Scroll profundo (≥75%)' },
  time_on_page: { weight: 1, group: 'engagement', label: 'Tiempo en página' },
  tool_used: { weight: 4, group: 'engagement', label: 'Usó una herramienta' },

  // --- Funnel de pago ---
  pro_prompt_view: { weight: 1, group: 'funnel', label: 'Vio el muro PRO' },
  pro_prompt_click: { weight: 6, group: 'funnel', label: 'Clic en el muro PRO' },
  planes_view: { weight: 8, group: 'funnel', label: 'Vio /planes' },
  signup: { weight: 15, group: 'funnel', label: 'Alta de cuenta' },
  checkout_start: { weight: 30, group: 'funnel', label: 'Inició checkout' },

  // --- Conversión (la plata) ---
  subscription_paid: { weight: 100, group: 'conversion', label: 'Pago confirmado' },

  // --- Descubrimiento (origen AI — la tesis de citabilidad) ---
  ai_referral: { weight: 3, group: 'discovery', label: 'Llegó desde un motor de IA' },

  // --- B2B (la consignataria sobre su propio perfil) ---
  claim_cta_click: { weight: 4, group: 'b2b', label: 'Clic en reclamar perfil' },
  // Clic en la burbuja global de WhatsApp que nos escribe a NOSOTROS
  // (intención de sumarse como consignataria a la plataforma). Peso alto:
  // es un lead B2B directo hacia nuestro número.
  whatsapp_lead: { weight: 12, group: 'b2b', label: 'Clic WhatsApp — quiere ser consignataria' },
} as const satisfies Record<string, ValueEventDef>

export type ValueEvent = keyof typeof VALUE_EVENTS

export function isValueEvent(e: string): e is ValueEvent {
  return Object.prototype.hasOwnProperty.call(VALUE_EVENTS, e)
}

export function eventWeight(e: ValueEvent): number {
  return VALUE_EVENTS[e].weight
}

/** Entidades a las que se atribuye un evento. */
export type ValueEntityType = 'consignataria' | 'frigorifico' | 'categoria' | 'remate' | 'global'

/** Fuentes de tráfico para atribución (derivadas client-side). */
export type ValueSource = 'ai' | 'organic' | 'direct' | 'referral' | 'social' | 'unknown'
