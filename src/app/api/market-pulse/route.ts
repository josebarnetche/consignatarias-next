import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase-server'
import { calcularPulsoMercado } from '@/lib/market-pulse'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Market pulse — actividad del último día con datos en el MAG de Cañuelas,
 * agregada por consignatario. Alimenta el "drip" animado del dashboard: cabezas
 * operadas por firma, con count-up. Público (dato de mercado de referencia).
 * También devuelve el acumulado histórico (sensación de progreso).
 * El cálculo vive en `@/lib/market-pulse`, que también usa /mercado/pulso en el server.
 */
export async function GET() {
  const db = createAdminClient() as unknown as SupabaseClient
  return NextResponse.json(await calcularPulsoMercado(db))
}
