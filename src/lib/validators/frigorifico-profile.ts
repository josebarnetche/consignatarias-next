import { z } from 'zod'

export const frigorificoProfileUpdateSchema = z.object({
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email().max(100).optional().nullable()
    .or(z.literal('')),
  website: z.string().max(200).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  whatsapp: z.string().max(30).optional().nullable(),
  location: z.string().max(120).optional().nullable(),
  logo_url: z.string().max(500).optional().nullable(),
})

export type FrigorificoProfileUpdateInput = z.infer<typeof frigorificoProfileUpdateSchema>
