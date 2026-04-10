import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { createClient } from '@/lib/supabase-server'

type Props = { params: Promise<{ remateId: string }> }

/**
 * GET /api/remates/[remateId]/watch
 * 
 * Check if user is watching + get total watch count
 */
export async function GET(req: NextRequest, { params }: Props) {
  const { remateId } = await params
  const remateIdNum = parseInt(remateId)
  
  if (isNaN(remateIdNum)) {
    return NextResponse.json({ error: 'Invalid remate ID' }, { status: 400 })
  }

  const sessionId = req.nextUrl.searchParams.get('sessionId')
  const supabase = createServiceClient()
  
  if (!supabase) {
    return NextResponse.json({ isWatching: false, count: 0 })
  }

  // Get total count
  const { count } = await supabase
    .from('remate_favorites')
    .select('*', { count: 'exact', head: true })
    .eq('remate_id', remateIdNum)

  // Check if current user is watching
  let isWatching = false
  
  // Try authenticated user first
  const authSupabase = await createClient()
  const { data: { user } } = await authSupabase.auth.getUser()
  
  if (user) {
    const { data } = await supabase
      .from('remate_favorites')
      .select('id')
      .eq('remate_id', remateIdNum)
      .eq('user_id', user.id)
      .single()
    isWatching = !!data
  } else if (sessionId) {
    const { data } = await supabase
      .from('remate_favorites')
      .select('id')
      .eq('remate_id', remateIdNum)
      .eq('session_id', sessionId)
      .single()
    isWatching = !!data
  }

  return NextResponse.json({ 
    isWatching, 
    count: count ?? 0 
  })
}

/**
 * POST /api/remates/[remateId]/watch
 * 
 * Add remate to favorites (start watching)
 */
export async function POST(req: NextRequest, { params }: Props) {
  const { remateId } = await params
  const remateIdNum = parseInt(remateId)
  
  if (isNaN(remateIdNum)) {
    return NextResponse.json({ error: 'Invalid remate ID' }, { status: 400 })
  }

  const body = await req.json()
  const { sessionId, consignatariaSlug } = body

  const supabase = createServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 })
  }

  // Try authenticated user first
  const authSupabase = await createClient()
  const { data: { user } } = await authSupabase.auth.getUser()

  const insertData: {
    remate_id: number
    consignataria_slug: string
    user_id?: string
    session_id?: string
  } = {
    remate_id: remateIdNum,
    consignataria_slug: consignatariaSlug,
  }

  if (user) {
    insertData.user_id = user.id
  } else if (sessionId) {
    insertData.session_id = sessionId
  } else {
    return NextResponse.json({ error: 'Session required' }, { status: 400 })
  }

  // Insert (ignore if duplicate)
  await supabase
    .from('remate_favorites')
    .upsert(insertData, { 
      onConflict: user ? 'remate_id,user_id' : 'remate_id,session_id',
      ignoreDuplicates: true 
    })

  // Get updated count
  const { count } = await supabase
    .from('remate_favorites')
    .select('*', { count: 'exact', head: true })
    .eq('remate_id', remateIdNum)

  return NextResponse.json({ success: true, count: count ?? 0 })
}

/**
 * DELETE /api/remates/[remateId]/watch
 * 
 * Remove remate from favorites (stop watching)
 */
export async function DELETE(req: NextRequest, { params }: Props) {
  const { remateId } = await params
  const remateIdNum = parseInt(remateId)
  
  if (isNaN(remateIdNum)) {
    return NextResponse.json({ error: 'Invalid remate ID' }, { status: 400 })
  }

  const body = await req.json()
  const { sessionId } = body

  const supabase = createServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 })
  }

  // Try authenticated user first
  const authSupabase = await createClient()
  const { data: { user } } = await authSupabase.auth.getUser()

  if (user) {
    await supabase
      .from('remate_favorites')
      .delete()
      .eq('remate_id', remateIdNum)
      .eq('user_id', user.id)
  } else if (sessionId) {
    await supabase
      .from('remate_favorites')
      .delete()
      .eq('remate_id', remateIdNum)
      .eq('session_id', sessionId)
  }

  // Get updated count
  const { count } = await supabase
    .from('remate_favorites')
    .select('*', { count: 'exact', head: true })
    .eq('remate_id', remateIdNum)

  return NextResponse.json({ success: true, count: count ?? 0 })
}
