import { Metadata } from 'next'
import { getAllProfiles } from '@/lib/data/consignataria-slugs'
import ActivarFinder from '@/components/consignataria/ActivarFinder'

export const metadata: Metadata = {
  title: 'Activá PRO — encontrá tu consignataria',
  description:
    'Activá PRO Consignataria: promocioná tus remates a la base de productores, perfil destacado y tu propia página. Buscá tu firma para empezar. Prueba gratis.',
  robots: { index: false, follow: true },
  alternates: { canonical: 'https://www.consignatarias.com.ar/consignatarias/activar' },
}

/**
 * Puerta de entrada SELF-SERVE a PRO Consignataria. La consignataria busca su firma
 * (getAllProfiles) y cae en /consignatarias/<slug>/activar, que ya resuelve el checkout
 * de Rebill sin humano en el medio. Es el destino del CTA "Probar gratis" de /planes.
 */
export default function ActivarEntryPage() {
  const firms = getAllProfiles()
    .map((p) => ({ slug: p.canonicalSlug, name: p.displayName }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))

  return (
    <div className="max-w-lg mx-auto px-2 sm:px-4 py-8">
      <div className="mb-5">
        <p className="text-xxs font-terminal uppercase tracking-widest text-amber-300 mb-1">
          PRO Consignataria
        </p>
        <h1 className="text-xl font-heading text-zinc-100 mb-2">Activá PRO para tu firma</h1>
        <p className="text-zinc-400 text-data max-w-md leading-relaxed">
          Que más productores vean tus remates: te lo avisamos por email a toda la base, tu perfil
          queda destacado y tenés tu propia página. ARS 45.000/mes, sin permanencia: cancelás cuando quieras. Buscá tu firma
          para empezar.
        </p>
      </div>

      <ActivarFinder firms={firms} />
    </div>
  )
}
