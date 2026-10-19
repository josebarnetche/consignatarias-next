import { NextRequest, NextResponse } from 'next/server'
import { autorizarFirma, errorDeValidacion, leerJson, respuestaSoloPro } from '@/lib/preofertas-firma-auth'
import { getOfertasDeFirma, getPreofertaDeFirma, getPreofertasDeFirma } from '@/lib/preofertas-firma'
import { preofertaCrearSchema } from '@/lib/validators/preoferta-firma'

type Props = { params: Promise<{ slug: string }> }

export const dynamic = 'force-dynamic'

/**
 * Pre-ofertas de la firma (17-10-2026) — panel del dueño.
 * GET  → sus pre-ofertas (cualquier estado) con lotes + las ofertas recibidas.
 * POST → crea una en borrador. Requiere PRO (o admin).
 */
export async function GET(_req: NextRequest, { params }: Props) {
  const { slug } = await params
  const ctx = await autorizarFirma(slug)
  if (!ctx.ok) return ctx.response
  const [preofertas, ofertas] = await Promise.all([
    getPreofertasDeFirma(ctx.db, slug),
    getOfertasDeFirma(ctx.db, slug),
  ])
  return NextResponse.json({ preofertas, ofertas, esPro: ctx.esPro })
}

export async function POST(req: NextRequest, { params }: Props) {
  const { slug } = await params
  const ctx = await autorizarFirma(slug)
  if (!ctx.ok) return ctx.response
  if (!ctx.esPro) return respuestaSoloPro()

  const parsed = preofertaCrearSchema.safeParse(await leerJson(req))
  if (!parsed.success) return errorDeValidacion(parsed.error.issues)
  const d = parsed.data

  const { data, error } = await ctx.db
    .from('preofertas_firma')
    .insert({
      consignataria_slug: slug,
      titulo: d.titulo,
      fecha_remate: d.fecha_remate,
      lugar: d.lugar ?? null,
      cierre: new Date(d.cierre).toISOString(),
      condiciones: d.condiciones ?? null,
      remate_clave: d.remate_clave ?? null,
      estado: 'borrador',
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('[preofertas-firma] alta:', error)
    return NextResponse.json({ error: 'No se pudo crear la pre-oferta' }, { status: 500 })
  }
  const preoferta = await getPreofertaDeFirma(ctx.db, slug, data.id)
  return NextResponse.json({ preoferta }, { status: 201 })
}
