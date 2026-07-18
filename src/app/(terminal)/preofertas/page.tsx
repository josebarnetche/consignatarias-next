import type { Metadata } from 'next'
import PreofertasActivas from '@/components/PreofertasActivas'
import { getActivePreofertas } from '@/lib/data/preofertas'

export const metadata: Metadata = {
  title: 'Pre-ofertas de remates de cabaña',
  description: 'Pre-ofertá los lotes de los remates de cabaña antes del martillo: video, valor actual y genética de cada reproductor, y contacto directo con la consignataria.',
}
export const dynamic = 'force-dynamic'

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
