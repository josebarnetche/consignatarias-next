import { z } from 'zod'

// Valid event types for webhook subscriptions
export const WEBHOOK_EVENTS = [
  'remate.created',
  'remate.updated',
  'remate.cancelled',
  'remate.starting_soon',
  'remate.live',
  'price.update',
] as const

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number]

// Filters schema
const webhookFiltersSchema = z.object({
  provincia: z.string().max(100).optional(),
  consignataria_slug: z.string().max(200).optional(),
}).optional()

// Main webhook registration schema
export const webhookRegisterSchema = z.object({
  url: z
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
          // Block localhost and private IPs
          const hostname = parsed.hostname.toLowerCase()
          if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return false
          }
          // Block private IP ranges
          if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(hostname)) {
            return false
          }
          return true
        } catch {
          return false
        }
      },
      'URL debe ser pública (no localhost ni IPs privadas)'
    ),
  events: z
    .array(z.enum(WEBHOOK_EVENTS))
    .min(1, 'Debe especificar al menos un evento')
    .max(10, 'Máximo 10 eventos por webhook'),
  secret: z
    .string()
    .min(16, 'El secreto debe tener al menos 16 caracteres')
    .max(256, 'El secreto no puede exceder 256 caracteres'),
  filters: webhookFiltersSchema,
  description: z
    .string()
    .max(500)
    .optional(),
  owner_email: z
    .string()
    .email('Email inválido')
    .max(255)
    .optional(),
})

export type WebhookRegisterInput = z.infer<typeof webhookRegisterSchema>
