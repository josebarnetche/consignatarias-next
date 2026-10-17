import { NextRequest, NextResponse } from 'next/server'
import { autorizarFirma, errorDeValidacion, leerJson, refrescarPublico, respuestaSoloPro } from '@/lib/preofertas-firma-auth'
import { getPreofertaDeFirma } from '@/lib/preofertas-firma'
import { loteActualizarSchema } from '@/lib/validators/preoferta-firma'

type Props = { params: Promise<{ slug: string; id: string; loteId: string }> }

export const dynamic = 'force-dynamic'

/** PATCH → edita un lote (requiere PRO). DELETE → lo quita, solo si no tiene ofertas. */
export async function PATCH(req: NextRequest, { params }: Props) {
  const { slug, id, loteId } = await params
  const ctx = await autorizarFirma(slug)
  if (!ctx.ok) return ctx.response
  if (!ctx.esPro) return respuestaSoloPro()

  const preoferta = await getPreofertaDeFirma(ctx.db, slug, id)
  if (!preoferta?.lotes.some((l) => l.id === loteId)) {
    return NextResponse.json({ error: 'Lote no encontrado' }, { status: 404 })
  }

  const parsed = loteActualizarSchema.safeParse(await leerJson(req))
  if (!parsed.success) return errorDeValidacion(parsed.error.issues)
  const d = parsed.data

  const { error } = await ctx.db
    .from('preofertas_firma_lotes')
    .update({
      ...(d.titulo !== undefined && { titulo: d.titulo }),
      ...(d.categoria !== undefined && { categoria: d.categoria ?? null }),
      ...(d.cabezas !== undefined && { cabezas: d.cabezas ?? null }),
      ...(d.peso_kg !== undefined && { peso_kg: d.peso_kg ?? null }),
      ...(d.video_url !== undefined && { video_url: d.video_url ?? null }),
      ...(d.descripcion !== undefined && { descripcion: d.descripcion ?? null }),
      ...(d.precio_base !== undefined && { precio_base: d.precio_base ?? null }),
      ...(d.orden !== undefined && { orden: d.orden }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', loteId)
    .eq('preoferta_id', id)

  if (error) {
    console.error('[preofertas-firma] edición de lote:', error)
    return NextResponse.json({ error: 'No se pudo guardar el lote' }, { status: 500 })
  }
  refrescarPublico(id)
  return NextResponse.json({ preoferta: await getPreofertaDeFirma(ctx.db, slug, id) })
}

export async function DELETE(_req: NextRequest, { params }: Props) {
  const { slug, id, loteId } = await params
  const ctx = await autorizarFirma(slug)
  if (!ctx.ok) return ctx.response

  const preoferta = await getPreofertaDeFirma(ctx.db, slug, id)
  if (!preoferta?.lotes.some((l) => l.id === loteId)) {
    return NextResponse.json({ error: 'Lote no encontrado' }, { status: 404 })
  }

  const { count } = await ctx.db
    .from('preoferta_bids')
    .select('id', { count: 'exact', head: true })
    .eq('lote_firma_id', loteId)
  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: `Este lote ya recibió ${count} oferta${count === 1 ? '' : 's'}: no se puede quitar sin perder esos contactos.` },
      { status: 409 },
    )
  }

  const { error } = await ctx.db.from('preofertas_firma_lotes').delete().eq('id', loteId).eq('preoferta_id', id)
  if (error) {
    console.error('[preofertas-firma] baja de lote:', error)
    return NextResponse.json({ error: 'No se pudo quitar el lote' }, { status: 500 })
  }
  refrescarPublico(id)
  return NextResponse.json({ preoferta: await getPreofertaDeFirma(ctx.db, slug, id) })
}
