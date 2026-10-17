import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // El admin que entra a /dashboard sin "ver como" va al panel de admin. Esa decisión
  // la toma page.tsx, que sí lee ?como= (un layout no recibe los searchParams).

  return <>{children}</>
}
