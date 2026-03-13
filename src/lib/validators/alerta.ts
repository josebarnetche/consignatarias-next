import { z } from 'zod'

// Valid event types for alert subscriptions (same as webhooks)
export const ALERTA_EVENTS = [
  'remate.created',
  'remate.updated',
  'remate.cancelled',
  'remate.starting_soon',
  'remate.live',
  'price.update',
] as const

export type AlertaEvent = (typeof ALERTA_EVENTS)[number]

// Valid frequencies for alert delivery
export const ALERTA_FREQUENCIES = ['immediate', 'daily_digest', 'weekly_digest'] as const
export type AlertaFrequency = (typeof ALERTA_FREQUENCIES)[number]

// Valid status values
export const ALERTA_STATUS = ['active', 'paused'] as const
export type AlertaStatus = (typeof ALERTA_STATUS)[number]

// Filter options schema
const alertaFiltersSchema = z.object({
  provincia: z.string().max(100).optional(),
  consignataria: z.string().max(200).optional(),
  tipo: z.enum(['invernada', 'especial', 'general', 'reproductores']).optional(),
  categoria: z.enum(['mixto', 'vaca_gorda', 'terneros', 'vaquillonas', 'toros']).optional(),
  precio_min: z.number().positive().optional(),
  precio_max: z.number().positive().optional(),
  keywords: z.array(z.string().max(100)).max(10).optional(),
}).optional()

// Validate webhook URL (same rules as webhooks)
const webhookUrlSchema = z
  .string()
  .url('URL inválida')
  .refine(
    (url) => url.startsWith('https://'),
    'URL debe usar HTTPS'
  )
  .refine(
    (url) => {
      try {
        const parsed = new URL(url)
        const hostname = parsed.hostname.toLowerCase()
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          return false
        }
        if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(hostname)) {
          return false
        }
        return true
      } catch {
        return false
      }
    },
    'URL debe ser pública (no localhost ni IPs privadas)'
  )

// CREATE - POST /api/alertas
export const alertaCreateSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(200, 'El nombre no puede exceder 200 caracteres'),
  webhook_url: webhookUrlSchema,
  filters: alertaFiltersSchema,
  events: z
    .array(z.enum(ALERTA_EVENTS))
    .min(1, 'Debe especificar al menos un evento')
    .max(10, 'Máximo 10 eventos por alerta')
    .default(['remate.created']),
  frequency: z.enum(ALERTA_FREQUENCIES).default('immediate'),
})

export type AlertaCreateInput = z.infer<typeof alertaCreateSchema>

// UPDATE - PATCH /api/alertas/[alerta_id]
export const alertaUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  webhook_url: webhookUrlSchema.optional(),
  filters: alertaFiltersSchema,
  events: z
    .array(z.enum(ALERTA_EVENTS))
    .min(1, 'Debe especificar al menos un evento')
    .max(10, 'Máximo 10 eventos por alerta')
    .optional(),
  frequency: z.enum(ALERTA_FREQUENCIES).optional(),
  status: z.enum(ALERTA_STATUS).optional(),
})

export type AlertaUpdateInput = z.infer<typeof alertaUpdateSchema>

// Alerta ID validation
export const alertaIdSchema = z.string().uuid('ID de alerta inválido')
