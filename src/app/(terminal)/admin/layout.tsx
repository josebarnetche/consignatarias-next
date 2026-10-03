import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import AdminNav from './AdminNav'
import type { Metadata } from 'next'

// Varias páginas de admin no declaran metadata y heredaban el index del layout raíz.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const service = createServiceClient()
  if (!service) {
    redirect('/overview')
  }
  
  const { data: role } = await service
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (!role || role.role !== 'admin') {
    redirect('/overview')
  }

  return (
    <div className="max-w-5xl mx-auto px-2 sm:px-4 py-4 space-y-0">
      <AdminNav />
      {children}
    </div>
  )
}
