import { z } from 'zod'

export const claimSchema = z.object({
  consignataria_slug: z
    .string()
    .min(1, 'El slug es obligatorio')
    .max(100),
  cuit: z
    .string()
    .regex(/^\d{2}-\d{8}-\d$/, 'CUIT debe tener formato XX-XXXXXXXX-X')
    .optional()
    .or(z.literal(''))
    .nullable(),
  // Normalizado acá: la sesión de Supabase siempre es minúscula, y un reclamo con
  // mayúsculas dejaba al dueño afuera de su propia ficha.
  claimant_email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Email inválido')
    .max(255),
  claimant_name: z
    .string()
    .max(255)
    .optional()
    .or(z.literal('')),
  claimant_phone: z
    .string()
    .max(50)
    .optional()
    .or(z.literal(''))
    .nullable(),
  claimant_role: z
    .string()
    .max(100)
    .optional()
    .or(z.literal(''))
    .nullable(),
})

export type ClaimInput = z.infer<typeof claimSchema>

export const claimReviewSchema = z.object({
  status: z.enum(['approved', 'rejected'], {
    error: 'Estado debe ser "approved" o "rejected"',
  }),
  admin_notes: z
    .string()
    .max(1000)
    .optional()
    .or(z.literal('')),
  /** Cómo se verificó la identidad de quien reclama. Obligatorio para aprobar
   *  (lib/claims/aprobar.ts → METODOS_VERIFICACION). */
  verificacion: z
    .enum(['email_registrado', 'dominio_propio', 'documentacion', 'llamada'])
    .optional(),
}).refine((d) => d.status !== 'approved' || !!d.verificacion, {
  message: 'Para aprobar hay que indicar cómo se verificó la identidad',
  path: ['verificacion'],
})

export type ClaimReviewInput = z.infer<typeof claimReviewSchema>

export const frigorificoClaimSchema = z.object({
  frigorifico_cuit: z
    .string()
    .min(1, 'El CUIT es obligatorio')
    .max(20),
  frigorifico_name: z
    .string()
    .min(1, 'El nombre es obligatorio')
    .max(255),
  // Normalizado acá: la sesión de Supabase siempre es minúscula, y un reclamo con
  // mayúsculas dejaba al dueño afuera de su propia ficha.
  claimant_email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Email inválido')
    .max(255),
  claimant_name: z
    .string()
    .max(255)
    .optional()
    .or(z.literal('')),
  claimant_phone: z
    .string()
    .max(50)
    .optional()
    .or(z.literal(''))
    .nullable(),
  claimant_role: z
    .string()
    .max(100)
    .optional()
    .or(z.literal(''))
    .nullable(),
})

export type FrigorificoClaimInput = z.infer<typeof frigorificoClaimSchema>
