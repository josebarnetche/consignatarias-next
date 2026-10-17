import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { requireServiceClient } from '@/lib/supabase'
import { auctionResultSchema } from '@/lib/validators/auction-result'
import { normalizarEmail } from '@/lib/claims/aprobar'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = auctionResultSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const service = requireServiceClient()

    // Verify the user owns this consignataria.
    // 17-10-2026: el mail se normaliza igual que en la página del formulario
    // (`resultados/nuevo/page.tsx`). Comparando contra `user.email` crudo, una firma
    // cuyo claim quedó en minúsculas veía el formulario y después recibía un 403.
    const { data: consignataria } = await service
      .from('consignatarias')
      .select('canonical_slug')
      .eq('canonical_slug', parsed.data.consignataria_slug)
      .eq('claimed_by_email', normalizarEmail(user.email))
      .maybeSingle()

    if (!consignataria) {
      return NextResponse.json(
        { error: 'No tenés permisos para esta consignataria' },
        { status: 403 },
      )
    }

    // Filas del desglose: precios en ARS por kg vivo (lo que mide el VR). `categoria_vr`
    // y `peso_kg` se guardan sólo si vinieron, para que una fila "Otra" no cargue un
    // null que después haya que interpretar. Las filas viejas no tienen ninguno de los dos.
    const categoryResults = parsed.data.category_results?.map((c) => ({
      category: c.category.trim(),
      ...(c.categoria_vr ? { categoria_vr: c.categoria_vr } : {}),
      ...(c.heads !== undefined ? { heads: c.heads } : {}),
      ...(c.peso_kg !== undefined ? { peso_kg: c.peso_kg } : {}),
      ...(c.avg_price !== undefined ? { avg_price: c.avg_price } : {}),
      ...(c.max_price !== undefined ? { max_price: c.max_price } : {}),
    })) ?? null

    const { data: result, error: insertError } = await service
      .from('auction_results')
      .insert({
        ...parsed.data,
        category_results: categoryResults,
        location: parsed.data.location || null,
        notes: parsed.data.notes || null,
        submitted_by: user.id,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Auction result insert error:', insertError)
      return NextResponse.json(
        { error: 'Error al guardar el resultado' },
        { status: 500 },
      )
    }

    return NextResponse.json(
      { message: 'Resultado cargado correctamente', id: result.id },
      { status: 201 },
    )
  } catch {
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    )
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const service = requireServiceClient()

    const { data: results, error } = await service
      .from('auction_results')
      .select('*')
      .eq('submitted_by', user.id)
      .order('auction_date', { ascending: false })

    if (error) {
      console.error('Auction results fetch error:', error)
      return NextResponse.json(
        { error: 'Error al obtener resultados' },
        { status: 500 },
      )
    }

    return NextResponse.json(results)
  } catch {
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    )
  }
}
