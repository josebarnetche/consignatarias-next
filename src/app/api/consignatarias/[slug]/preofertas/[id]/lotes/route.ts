import { NextRequest, NextResponse } from 'next/server'
import { autorizarFirma, errorDeValidacion, leerJson, refrescarPublico, respuestaSoloPro } from '@/lib/preofertas-firma-auth'
import { getPreofertaDeFirma } from '@/lib/preofertas-firma'
import { loteCrearSchema } from '@/lib/validators/preoferta-firma'

type Props = { params: Promise<{ slug: string; id: string }> }

export const dynamic = 'force-dynamic'

/** Tope de lotes por remate: un remate grande anda por 150; 300 deja aire sin abrir la puerta al abuso. */
const MAX_LOTES = 300

/** POST → agrega un lote a la pre-oferta (al final, salvo que venga `orden`). Requiere PRO. */
export async function POST(req: NextRequest, { params }: Props) {
  const { slug, id } = await params
  const ctx = await autorizarFirma(slug)
  if (!ctx.ok) return ctx.response
  if (!ctx.esPro) return respuestaSoloPro()

  const preoferta = await getPreofertaDeFirma(ctx.db, slug, id)
  if (!preoferta) return NextResponse.json({ error: 'Pre-oferta no encontrada' }, { status: 404 })
  if (preoferta.lotes.length >= MAX_LOTES) {
    return NextResponse.json({ error: `Máximo ${MAX_LOTES} lotes por remate` }, { status: 409 })
  }

  const parsed = loteCrearSchema.safeParse(await leerJson(req))
  if (!parsed.success) return errorDeValidacion(parsed.error.issues)
  const d = parsed.data
  const orden = d.orden ?? (preoferta.lotes.reduce((m, l) => Math.max(m, l.orden), 0) + 1)

  const { data, error } = await ctx.db
    .from('preofertas_firma_lotes')
    .insert({
      preoferta_id: id,
      orden,
      titulo: d.titulo,
      categoria: d.categoria ?? null,
      cabezas: d.cabezas ?? null,
      peso_kg: d.peso_kg ?? null,
      video_url: d.video_url ?? null,
      descripcion: d.descripcion ?? null,
      precio_base: d.precio_base ?? null,
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('[preofertas-firma] alta de lote:', error)
    return NextResponse.json({ error: 'No se pudo agregar el lote' }, { status: 500 })
  }
  refrescarPublico(id)
  return NextResponse.json({ preoferta: await getPreofertaDeFirma(ctx.db, slug, id) }, { status: 201 })
}
