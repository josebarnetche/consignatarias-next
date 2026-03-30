import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    // Check if user is admin
    const userClient = await createClient()
    const { data: { user } } = await userClient.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Check admin role
    const { data: userRole } = await userClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (userRole?.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const supabase = createServiceClient()

    const { data: subscribers, error } = await supabase
      .from('newsletter_subscribers')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching subscribers:', error)
      return NextResponse.json({ error: 'Error al obtener suscriptores' }, { status: 500 })
    }

    // Stats
    const total = subscribers?.length || 0
    const active = subscribers?.filter(s => s.status === 'active').length || 0
    const sources = subscribers?.reduce((acc, s) => {
      acc[s.source] = (acc[s.source] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    return NextResponse.json({
      subscribers,
      stats: {
        total,
        active,
        sources
      }
    })

  } catch (err) {
    console.error('Admin suscriptores error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
