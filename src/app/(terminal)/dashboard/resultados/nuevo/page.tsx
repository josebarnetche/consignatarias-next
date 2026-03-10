import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import ResultadoForm from './ResultadoForm'

export const metadata = {
  title: 'Cargar Resultado — Consignatarias.com.ar',
  robots: { index: false },
}

export default async function NuevoResultadoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const service = createServiceClient()

  const { data: consignataria } = await service
    .from('consignatarias')
    .select('display_name, canonical_slug')
    .eq('claimed_by_email', user.email!)
    .single()

  if (!consignataria) redirect('/dashboard')

  return (
    <ResultadoForm
      consignatariaSlug={consignataria.canonical_slug}
      consignatariaName={consignataria.display_name}
    />
  )
}
