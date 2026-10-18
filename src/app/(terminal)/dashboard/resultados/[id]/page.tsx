import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import { normalizarEmail } from '@/lib/claims/aprobar'
import ResultadoForm, { type ResultadoInicial } from '../nuevo/ResultadoForm'

export const metadata = {
  title: 'Editar resultado',
  robots: { index: false },
}

/** Editar un resultado ya cargado (18-10-2026). Sólo la firma dueña del resultado. */
export default async function EditarResultadoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/dashboard/resultados/${id}`)

  const service = createServiceClient()
  if (!service) redirect('/login')

  const { data: consignataria } = await service
    .from('consignatarias')
    .select('display_name, canonical_slug')
    .eq('claimed_by_email', normalizarEmail(user.email))
    .maybeSingle()
  if (!consignataria) redirect('/dashboard')

  const { data: fila } = await service
    .from('auction_results')
    .select('id, consignataria_slug, auction_date, auction_title, location, total_heads_offered, total_heads_sold, min_price, average_price, max_price, category_results, notes')
    .eq('id', id)
    .maybeSingle()
  if (!fila || fila.consignataria_slug !== consignataria.canonical_slug) notFound()

  return (
    <ResultadoForm
      consignatariaSlug={consignataria.canonical_slug}
      consignatariaName={consignataria.display_name}
      inicial={fila as unknown as ResultadoInicial}
    />
  )
}
