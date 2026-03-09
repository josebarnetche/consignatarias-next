import { z } from 'zod'

export const consignatariaUpdateSchema = z.object({
  display_name: z.string().min(1).max(255).optional(),
  name: z.string().max(255).nullable().optional(),
  province: z.string().max(100).nullable().optional(),
  location: z.string().max(255).nullable().optional(),
  phone: z.string().max(100).nullable().optional(),
  email: z.string().email('Email inválido').max(255).nullable().optional()
    .or(z.literal('')),
  website: z.string().max(500).nullable().optional(),
  cuit: z.string().max(20).nullable().optional(),
  matricula: z.string().max(50).nullable().optional(),
  category: z.string().max(100).nullable().optional(),
  verified: z.boolean().optional(),
  featured: z.boolean().optional(),
})

export type ConsignatariaUpdateInput = z.infer<typeof consignatariaUpdateSchema>
