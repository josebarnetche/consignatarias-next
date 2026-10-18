import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { requireServiceClient } from '@/lib/supabase'
import { auctionResultSchema } from '@/lib/validators/auction-result'
import { normalizarEmail } from '@/lib/claims/aprobar'

type Props = { params: Promise<{ id: string }> }

/**
 * Editar y borrar un resultado cargado (18-10-2026). Hasta hoy la firma podía cargar
 * el resultado de un remate pero no corregirlo: un promedio mal tipeado quedaba para
 * siempre en "Tu precio contra el mercado" y en el reporte mensual.
 *
 * El permiso es el mismo que el alta: el resultado tiene que ser de la firma cuyo
 * claim tiene el mail de la sesión. No se pide que lo haya cargado el mismo usuario:
 * si la firma cambia de mail, sus resultados siguen siendo suyos.
 */
async function resultadoPropio(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'No autenticado' }, { status: 401 }) }

  const service = requireServiceClient()
  const { data: firma } = await service
    .from('consignatarias')
    .select('canonical_slug')
    .eq('claimed_by_email', normalizarEmail(user.email))
    .maybeSingle()
  if (!firma) return { error: NextResponse.json({ error: 'No tenés una consignataria a tu nombre' }, { status: 403 }) }

  const { data: fila } = await service
    .from('auction_results')
    .select('id, consignataria_slug')
    .eq('id', id)
    .maybeSingle()
  if (!fila || fila.consignataria_slug !== firma.canonical_slug) {
    return { error: NextResponse.json({ error: 'Resultado no encontrado' }, { status: 404 }) }
  }
  return { service, slug: firma.canonical_slug }
}

export async function PATCH(req: NextRequest, { params }: Props) {
  const { id } = await params
  const r = await resultadoPropio(id)
  if ('error' in r) return r.error

  const parsed = auctionResultSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }
  // El resultado no se puede mover a otra firma.
  if (parsed.data.consignataria_slug !== r.slug) {
    return NextResponse.json({ error: 'No tenés permisos para esta consignataria' }, { status: 403 })
  }

  // Mismo armado de filas que el alta (POST /api/auction-results).
  const categoryResults = parsed.data.category_results?.map((c) => ({
    category: c.category.trim(),
    ...(c.categoria_vr ? { categoria_vr: c.categoria_vr } : {}),
    ...(c.heads !== undefined ? { heads: c.heads } : {}),
    ...(c.peso_kg !== undefined ? { peso_kg: c.peso_kg } : {}),
    ...(c.avg_price !== undefined ? { avg_price: c.avg_price } : {}),
    ...(c.max_price !== undefined ? { max_price: c.max_price } : {}),
  })) ?? null

  const { error } = await r.service
    .from('auction_results')
    .update({
      ...parsed.data,
      category_results: categoryResults,
      location: parsed.data.location || null,
      notes: parsed.data.notes || null,
    })
    .eq('id', id)

  if (error) {
    console.error('Auction result update error:', error)
    return NextResponse.json({ error: 'Error al guardar el resultado' }, { status: 500 })
  }
  return NextResponse.json({ message: 'Resultado actualizado', id })
}

export async function DELETE(_req: NextRequest, { params }: Props) {
  const { id } = await params
  const r = await resultadoPropio(id)
  if ('error' in r) return r.error

  const { error } = await r.service.from('auction_results').delete().eq('id', id)
  if (error) {
    console.error('Auction result delete error:', error)
    return NextResponse.json({ error: 'Error al borrar el resultado' }, { status: 500 })
  }
  return NextResponse.json({ message: 'Resultado borrado' })
}
