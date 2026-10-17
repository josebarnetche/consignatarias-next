import { NextRequest, NextResponse } from 'next/server'
import { autorizarFirma, errorDeValidacion, leerJson, refrescarPublico, respuestaSoloPro } from '@/lib/preofertas-firma-auth'
import { getPreofertaDeFirma } from '@/lib/preofertas-firma'
import { finDelDiaRemate, preofertaActualizarSchema } from '@/lib/validators/preoferta-firma'

type Props = { params: Promise<{ slug: string; id: string }> }

export const dynamic = 'force-dynamic'

/**
 * PATCH → edita datos del remate y/o cambia el estado (publicar, cerrar, volver a borrador).
 * DELETE → borra la pre-oferta, solo si no recibió ofertas.
 *
 * Cerrar y borrar no piden PRO: una firma que dejó el plan tiene que poder apagar lo suyo.
 */
export async function PATCH(req: NextRequest, { params }: Props) {
  const { slug, id } = await params
  const ctx = await autorizarFirma(slug)
  if (!ctx.ok) return ctx.response

  const actual = await getPreofertaDeFirma(ctx.db, slug, id)
  if (!actual) return NextResponse.json({ error: 'Pre-oferta no encontrada' }, { status: 404 })

  const parsed = preofertaActualizarSchema.safeParse(await leerJson(req))
  if (!parsed.success) return errorDeValidacion(parsed.error.issues)
  const d = parsed.data

  const soloCierra = Object.keys(d).length === 1 && d.estado === 'cerrada'
  if (!soloCierra && !ctx.esPro) return respuestaSoloPro()

  const fecha = d.fecha_remate ?? actual.fecha_remate
  const cierre = d.cierre ? new Date(d.cierre).toISOString() : actual.cierre
  if (Date.parse(cierre) > finDelDiaRemate(fecha)) {
    return NextResponse.json({ error: 'El cierre de las ofertas tiene que ser antes del remate (o el mismo día)' }, { status: 400 })
  }

  if (d.estado === 'publicada') {
    if (actual.lotes.length === 0) {
      return NextResponse.json({ error: 'Cargá al menos un lote antes de publicar' }, { status: 409 })
    }
    if (Date.parse(cierre) <= Date.now()) {
      return NextResponse.json({ error: 'El cierre ya pasó: corré la fecha de cierre para volver a publicar' }, { status: 409 })
    }
  }

  const { error } = await ctx.db
    .from('preofertas_firma')
    .update({
      ...(d.titulo !== undefined && { titulo: d.titulo }),
      ...(d.fecha_remate !== undefined && { fecha_remate: d.fecha_remate }),
      ...(d.lugar !== undefined && { lugar: d.lugar ?? null }),
      ...(d.cierre !== undefined && { cierre }),
      ...(d.condiciones !== undefined && { condiciones: d.condiciones ?? null }),
      ...(d.estado !== undefined && { estado: d.estado }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('consignataria_slug', slug)

  if (error) {
    console.error('[preofertas-firma] edición:', error)
    return NextResponse.json({ error: 'No se pudo guardar' }, { status: 500 })
  }

  refrescarPublico(id)
  return NextResponse.json({ preoferta: await getPreofertaDeFirma(ctx.db, slug, id) })
}

export async function DELETE(_req: NextRequest, { params }: Props) {
  const { slug, id } = await params
  const ctx = await autorizarFirma(slug)
  if (!ctx.ok) return ctx.response

  const actual = await getPreofertaDeFirma(ctx.db, slug, id)
  if (!actual) return NextResponse.json({ error: 'Pre-oferta no encontrada' }, { status: 404 })

  // Cada oferta es el contacto de un interesado: borrarla en cascada sería perder leads
  // sin aviso. La FK (ON DELETE RESTRICT) lo frena igual; esto da el mensaje claro.
  const { count } = await ctx.db
    .from('preoferta_bids')
    .select('id', { count: 'exact', head: true })
    .eq('preoferta_firma_id', id)
  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: `Esta pre-oferta ya recibió ${count} oferta${count === 1 ? '' : 's'}: cerrala en vez de borrarla, así no perdés los contactos.` },
      { status: 409 },
    )
  }

  const { error } = await ctx.db.from('preofertas_firma').delete().eq('id', id).eq('consignataria_slug', slug)
  if (error) {
    console.error('[preofertas-firma] baja:', error)
    return NextResponse.json({ error: 'No se pudo borrar' }, { status: 500 })
  }
  refrescarPublico(id)
  return NextResponse.json({ ok: true })
}
