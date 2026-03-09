import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST() {
  const supabase = await createClient()
  await supabase.auth.signOut()

  return NextResponse.redirect(
    new URL('/overview', process.env.NEXT_PUBLIC_APP_URL || 'https://www.consignatarias.com.ar'),
    { status: 302 },
  )
}
