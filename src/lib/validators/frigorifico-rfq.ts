import { z } from 'zod'

// RFQ = pedido de cotización mayorista. Es un LEAD, no una orden: el cierre es
// consultivo (WhatsApp/dashboard). Mínimo viable: a quién contactar + a dónde
// entregar (dispara el gate de alcance) + qué/cuánto.
export const frigorificoRfqSchema = z.object({
  provincia_entrega: z.string().min(2, 'Indicá la provincia de entrega').max(60),
  tipo_comprador: z.enum(['carniceria', 'distribuidor', 'gastronomia', 'mayorista']).optional().nullable(),
  nombre: z.string().max(120).optional().nullable().or(z.literal('')),
  empresa: z.string().max(160).optional().nullable().or(z.literal('')),
  cuit_comprador: z.string().max(20).optional().nullable().or(z.literal('')),
  whatsapp: z.string().max(40).optional().nullable().or(z.literal('')),
  email: z.string().email('Email inválido').max(160),
  mensaje: z.string().max(2000).optional().nullable().or(z.literal('')),
  // snapshot de producto(s) + cantidad de cajas/bultos al momento del pedido
  producto_snapshot: z.any().optional().nullable(),
})

export type FrigorificoRfqInput = z.infer<typeof frigorificoRfqSchema>
