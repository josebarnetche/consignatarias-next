import { z } from 'zod'

export const profileUpdateSchema = z.object({
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email().max(100).optional().nullable()
    .or(z.literal('')),
  website: z.string().max(200).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  logo_url: z.string().max(500).optional().nullable(),
  whatsapp: z.string().max(30).optional().nullable(),
})

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>
