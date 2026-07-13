import { Metadata } from 'next'
import Link from 'next/link'
import Breadcrumb from '@/components/ui/Breadcrumb'
import { BPG_FUENTE, BPG_INTRO, BLOQUES, temasPorBloque } from '@/lib/data/bpg-ganaderas'

export const metadata: Metadata = {
  title: 'Buenas Prácticas Ganaderas (BPG) — guía para vacunos de carne | Consignatarias',
  description:
    'Las Buenas Prácticas Ganaderas para la producción de ganado vacuno de carne, resumidas: 14 temas en 4 bloques (personas, infraestructura, ambiente y animal), cada uno con cómo implementarlo. Basado en la Guía de la Red BPA.',
  keywords: [
    'buenas prácticas ganaderas', 'BPG', 'BPA', 'ganado vacuno de carne', 'plan sanitario',
    'bienestar animal', 'manejo de rodeo', 'alimentación', 'agua', 'forrajes', 'Red BPA', 'SENASA',
  ],
  alternates: { canonical: 'https://www.consignatarias.com.ar/buenas-practicas' },
}

export default function BuenasPracticasPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 font-sans">
      <Breadcrumb items={[{ name: 'Herramientas', href: '/calculadora' }, { name: 'Buenas Prácticas (BPG)' }]} />

      <header className="mt-4 mb-6">
        <p className="text-xxs uppercase tracking-widest text-accent mb-2">Guía · Buenas Prácticas Ganaderas</p>
        <h1 className="text-2xl sm:text-3xl font-semibold text-white text-balance">
          Buenas Prácticas Ganaderas para vacunos de carne
        </h1>
        <p className="mt-3 text-zinc-400 max-w-2xl">{BPG_INTRO}</p>
      </header>

      <div className="rounded-terminal border border-terminal-border bg-terminal-panel px-4 py-3 text-data text-zinc-400">
        Resumen basado en la{' '}
        <a href={BPG_FUENTE.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-bright underline underline-offset-2">
          {BPG_FUENTE.titulo} ↗
        </a>{' '}
        ({BPG_FUENTE.autor}, {BPG_FUENTE.anio}), con respaldo de {BPG_FUENTE.respaldo}. Cada tema tiene su
        página con cómo implementarlo. Contenido reescrito y resumido; la guía completa es la fuente.
      </div>

      <section className="mt-10 space-y-8">
        {BLOQUES.map((bloque) => (
          <div key={bloque}>
            <h2 className="text-xxs uppercase tracking-widest text-accent mb-3">{bloque}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {temasPorBloque(bloque).map((t) => (
                <Link
                  key={t.slug}
                  href={`/buenas-practicas/${t.slug}`}
                  className="group rounded-terminal border border-terminal-border bg-terminal-panel p-4 hover:border-accent transition-colors"
                >
                  <div className="flex items-baseline gap-2">
                    <span className="text-xxs font-terminal text-zinc-600">{String(t.n).padStart(2, '0')}</span>
                    <h3 className="text-data font-semibold text-white group-hover:text-accent">{t.titulo} →</h3>
                  </div>
                  <p className="mt-1 text-data text-zinc-400">{t.resumen}</p>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="mt-10 rounded-terminal border border-accent/30 bg-accent/5 p-5">
        <h2 className="text-base font-semibold text-white">Sanidad obligatoria vs. buenas prácticas</h2>
        <p className="mt-2 text-data text-zinc-300">
          Las BPG son <strong className="text-zinc-100">voluntarias</strong> y abarcan toda la producción. Los planes
          sanitarios <strong className="text-zinc-100">obligatorios</strong> de SENASA (aftosa, brucelosis, tuberculosis,
          garrapata) y los requisitos para mover hacienda están en{' '}
          <Link href="/sanidad" className="text-accent hover:text-accent-bright underline underline-offset-2">/sanidad</Link>.
        </p>
      </section>

      <p className="mt-8 text-xxs text-zinc-600">
        Fuente: {BPG_FUENTE.titulo} — {BPG_FUENTE.autor}, {BPG_FUENTE.anio}. Este resumen no reemplaza la guía
        completa ni el asesoramiento profesional.
      </p>
    </div>
  )
}
