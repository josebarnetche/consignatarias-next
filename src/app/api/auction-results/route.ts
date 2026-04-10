import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { requireServiceClient } from '@/lib/supabase'
import { auctionResultSchema } from '@/lib/validators/auction-result'

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

    // Verify the user owns this consignataria
    const { data: consignataria } = await service
      .from('consignatarias')
      .select('canonical_slug')
      .eq('canonical_slug', parsed.data.consignataria_slug)
      .eq('claimed_by_email', user.email!)
      .single()

    if (!consignataria) {
      return NextResponse.json(
        { error: 'No tenés permisos para esta consignataria' },
        { status: 403 },
      )
    }

    const { data: result, error: insertError } = await service
      .from('auction_results')
      .insert({
        ...parsed.data,
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
