import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import ResultadoForm from './ResultadoForm'
import { normalizarEmail } from '@/lib/claims/aprobar'
import { getRematesSinResultado } from '@/lib/resultados-firma'

export const metadata = {
  title: 'Cargar Resultado',
  robots: { index: false },
}

export default async function NuevoResultadoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const service = createServiceClient()
  if (!service) redirect('/login')

  const { data: consignataria } = await service
    .from('consignatarias')
    .select('display_name, canonical_slug')
    .eq('claimed_by_email', normalizarEmail(user.email))
    .maybeSingle()

  if (!consignataria) redirect('/dashboard')

  const sugeridos = await getRematesSinResultado(service, consignataria.canonical_slug, consignataria.display_name).catch(() => [])

  return (
    <ResultadoForm
      consignatariaSlug={consignataria.canonical_slug}
      consignatariaName={consignataria.display_name}
      sugeridos={sugeridos}
    />
  )
}
