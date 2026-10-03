import type { Metadata } from 'next'
import PreofertasActivas from '@/components/PreofertasActivas'
import { getActivePreofertas } from '@/lib/data/preofertas'

const URL = 'https://www.consignatarias.com.ar/preofertas'

export async function generateMetadata(): Promise<Metadata> {
  const title = 'Pre-ofertas de remates de cabaña'
  const description = 'Pre-ofertá los lotes de los remates de cabaña antes del martillo: video, valor actual y genética de cada reproductor, y contacto directo con la consignataria.'
  // Sin pre-ofertas abiertas la página es un aviso de "no hay": va noindex, y el sitemap
  // la deja afuera con el mismo cálculo.
  const abiertas = getActivePreofertas(Date.now()).length > 0
  return {
    title,
    description,
    alternates: { canonical: URL },
    openGraph: { title, description, url: URL, type: 'website' },
    ...(!abiertas && { robots: { index: false, follow: true } }),
  }
}

// No lee cookies ni headers: lo único que cambia es qué pre-ofertas siguen abiertas, que
// depende de la hora. Con ISR horario alcanza (el cierre se anuncia con días de
// anticipación) y la página deja de renderizarse en cada request.
export const revalidate = 3600

export default function PreofertasIndexPage() {
  const activas = getActivePreofertas(Date.now())
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl md:text-3xl font-heading text-zinc-100">Pre-ofertas</h1>
      <p className="text-zinc-400 text-data mt-1 max-w-2xl">
        El puente entre el productor y el remate: conocé los lotes antes del martillo —video, valor actual del libro
        y la genética de cada reproductor— y quedá en contacto directo con la consignataria.
      </p>
      <div className="mt-6">
        {activas.length > 0
          ? <PreofertasActivas />
          : <p className="text-zinc-500 text-sm">No hay pre-ofertas abiertas en este momento. Volvé antes del próximo remate destacado.</p>}
      </div>
    </div>
  )
}
