import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import AdminNav, { type NavBadges } from './AdminNav'
import { ADMIN_NAV } from '@/lib/admin/nav'
import { getAdminPendientes } from '@/lib/admin/pendientes'
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

  // Contadores de la navegación: lo que espera una decisión y los crons en rojo.
  const pendientes = await getAdminPendientes()
  const badges: NavBadges = {}
  for (const item of ADMIN_NAV.flatMap((g) => g.items)) {
    const count = item.badge?.(pendientes)
    if (count != null && count > 0) badges[item.href] = { count, tone: item.badgeTone ?? 'accent' }
  }

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-4">
      <AdminNav badges={badges} />
      <div className="min-w-0 space-y-px">{children}</div>
    </div>
  )
}
