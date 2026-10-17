import { z } from 'zod'
import { SLUGS_CATEGORIA_RESULTADO } from '@/lib/reports/resultado-categorias'

/**
 * Fila del desglose por categoría.
 *
 * 17-10-2026 — se suman `categoria_vr` y `peso_kg` para poder comparar el resultado
 * contra el Valor de Referencia. Las dos son opcionales: las filas viejas (categoría
 * en texto libre, sin peso) siguen pasando la validación tal cual, y la columna
 * `category_results` es JSON, así que no hace falta migración.
 *
 * Los precios son ARS por kg vivo, como ya decía el formulario ("Prom. ($/kg)") y como
 * mide el VR. El techo de 1500 kg en el peso frena un error de tipeo (kg totales del
 * lote en vez de promedio por cabeza), que daría una banda equivocada.
 */
const categoryResultSchema = z.object({
  category: z.string().min(1, 'Categoría requerida').max(100),
  categoria_vr: z
    .string()
    .refine((s) => SLUGS_CATEGORIA_RESULTADO.includes(s), 'Categoría desconocida')
    .optional()
    .nullable(),
  heads: z.number().int().positive().optional(),
  peso_kg: z.number().positive().max(1500, 'El peso es por cabeza, en kg').optional(),
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
