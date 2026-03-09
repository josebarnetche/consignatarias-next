import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user has any role
  const service = createServiceClient()
  const { data: role } = await service
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  // Admin users go to admin panel
  if (role?.role === 'admin') {
    redirect('/admin/claims')
  }

  return <>{children}</>
}
