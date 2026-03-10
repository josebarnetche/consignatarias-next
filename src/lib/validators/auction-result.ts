import { z } from 'zod'

const categoryResultSchema = z.object({
  category: z.string().min(1, 'Categoría requerida').max(100),
  heads: z.number().int().positive().optional(),
  avg_price: z.number().positive().optional(),
  max_price: z.number().positive().optional(),
})

export const auctionResultSchema = z.object({
  consignataria_slug: z
    .string()
    .min(1, 'El slug es obligatorio')
    .max(100),
  auction_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha debe tener formato YYYY-MM-DD'),
  auction_title: z
    .string()
    .min(1, 'El título es obligatorio')
    .max(255),
  location: z
    .string()
    .max(255)
    .optional()
    .or(z.literal('')),
  total_heads_offered: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .nullable(),
  total_heads_sold: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .nullable(),
  min_price: z
    .number()
    .nonnegative()
    .optional()
    .nullable(),
  average_price: z
    .number()
    .nonnegative()
    .optional()
    .nullable(),
  max_price: z
    .number()
    .nonnegative()
    .optional()
    .nullable(),
  category_results: z
    .array(categoryResultSchema)
    .optional()
    .nullable(),
  notes: z
    .string()
    .max(2000)
    .optional()
    .or(z.literal('')),
})

export type AuctionResultInput = z.infer<typeof auctionResultSchema>
