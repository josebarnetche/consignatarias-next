import { z } from 'zod'

export const frigorificoProfileUpdateSchema = z.object({
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email().max(100).optional().nullable()
    .or(z.literal('')),
  website: z.string().max(200).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
})

export type FrigorificoProfileUpdateInput = z.infer<typeof frigorificoProfileUpdateSchema>
