import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/admin-auth'
import { frigorificoPuedeInterprovincial } from '@/lib/features'
import { revalidatePath } from 'next/cache'

type Props = { params: Promise<{ cuit: string }> }

// Column-list público EXPLÍCITO — nunca select('*'): la tabla tiene created_by
// (email del dueño) que no debe filtrarse por este GET no autenticado.
const PUBLIC_COLS =
  'id, frigorifico_cuit, sku, producto, categoria, estado, presentacion, unidad_venta, unidades_por_bulto, peso_unidad_g, pedido_minimo, incremento, precio_modo, precio_desde, precio_kg, moneda, escala_volumen, foto_url, segmento, disponibilidad, interprovincial, status, created_at, updated_at'

export async function GET(_req: NextRequest, { params }: Props) {
  const { cuit } = await params
  const supabase = requireServiceClient()

  const { data, error } = await supabase
    .from('frigorifico_products')
    .select(PUBLIC_COLS)
    .eq('frigorifico_cuit', cuit)
    .eq('status', 'active')
    .order('segmento', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Error al obtener productos' }, { status: 500 })
  }

  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest, { params }: Props) {
  const auth = await requireAuth()
  if (!auth.authorized) return auth.response!

  const { cuit } = await params
  const supabase = requireServiceClient()

  // Ownership: el email del usuario debe ser el titular del frigorífico.
  const { data: profile } = await supabase
    .from('frigorifico_profiles')
    .select('claimed_by_email')
    .eq('cuit', cuit)
    .single()

  if (!profile || profile.claimed_by_email !== auth.email) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const body = await req.json()
  const { producto } = body
  if (!producto || typeof producto !== 'string') {
    return NextResponse.json({ error: 'El nombre del producto es obligatorio' }, { status: 400 })
  }

  // Gate regulatorio: interprovincial=true SÓLO si el frigorífico está habilitado
  // para tránsito federal (constancia verificada). Si no, se fuerza a false —
  // no se puede ofrecer envío nacional sin la habilitación.
  let interprovincial = false
  if (body.interprovincial === true) {
    interprovincial = await frigorificoPuedeInterprovincial(cuit)
  }

  const { data, error } = await supabase
    .from('frigorifico_products')
    .insert({
      frigorifico_cuit: cuit,
      sku: body.sku || null,
      producto,
      categoria: body.categoria || 'vacuno',
      estado: body.estado || 'fresco',
      presentacion: body.presentacion || 'suelto',
      unidad_venta: body.unidad_venta || 'kg',
      unidades_por_bulto: body.unidades_por_bulto ?? null,
      peso_unidad_g: body.peso_unidad_g ?? null,
      pedido_minimo: body.pedido_minimo ?? 1,
      incremento: body.incremento ?? 1,
      precio_modo: body.precio_modo || 'consultar',
      precio_desde: body.precio_desde ?? null,
      precio_kg: body.precio_kg ?? null,
      moneda: body.moneda || 'ARS',
      escala_volumen: body.escala_volumen ?? null,
      foto_url: body.foto_url || null,
      segmento: body.segmento || 'carnicerias',
      disponibilidad: body.disponibilidad || 'en_stock',
      interprovincial,
      created_by: auth.email!,
    })
    .select()
    .single()

  if (error) {
    console.error('Frigo product insert error:', error)
    return NextResponse.json({ error: 'Error al crear el producto' }, { status: 500 })
  }

  try { revalidatePath(`/frigorificos/${cuit}`) } catch { /* best-effort */ }

  return NextResponse.json(data, { status: 201 })
}
