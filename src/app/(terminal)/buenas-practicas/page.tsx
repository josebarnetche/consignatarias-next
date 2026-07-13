import { Metadata } from 'next'
import Link from 'next/link'
import Breadcrumb from '@/components/ui/Breadcrumb'
import { BPG_FUENTE, BPG_INTRO, BPG_BLOQUES, BPG_DESTACADOS } from '@/lib/data/bpg-ganaderas'

export const metadata: Metadata = {
  title: 'Buenas Prácticas Ganaderas (BPG) — guía para vacunos de carne | Consignatarias',
  description:
    'Las Buenas Prácticas Ganaderas para la producción de ganado vacuno de carne, resumidas: 14 temas en 4 bloques (personas, infraestructura, ambiente y animal), con las prácticas clave de salud y bienestar animal. Basado en la Guía de la Red BPA.',
  keywords: [
    'buenas prácticas ganaderas', 'BPG', 'BPA', 'ganado vacuno de carne', 'plan sanitario',
    'bienestar animal', 'período de carencia', 'bioseguridad', 'manejo de rodeo', 'Red BPA', 'SENASA',
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

      {/* Atribución */}
      <div className="rounded-terminal border border-terminal-border bg-terminal-panel px-4 py-3 text-data text-zinc-400">
        Resumen basado en la{' '}
        <a href={BPG_FUENTE.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-bright underline underline-offset-2">
          {BPG_FUENTE.titulo} ↗
        </a>{' '}
        ({BPG_FUENTE.autor}, {BPG_FUENTE.anio}), con respaldo de {BPG_FUENTE.respaldo}. Contenido reescrito y
        resumido; la guía completa es la fuente.
      </div>

      {/* Framework: 4 bloques × 14 temas */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-white mb-1">Los 14 temas, en 4 bloques</h2>
        <p className="text-data text-zinc-500 mb-4">El marco completo de la guía.</p>
        <div className="space-y-6">
          {BPG_BLOQUES.map((b) => (
            <div key={b.bloque}>
              <h3 className="text-xxs uppercase tracking-widest text-accent mb-3">{b.bloque}</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {b.temas.map((t) => (
                  <div key={t.n} className="rounded-terminal border border-terminal-border bg-terminal-panel p-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xxs font-terminal text-zinc-600">{String(t.n).padStart(2, '0')}</span>
                      <h4 className="text-data font-semibold text-white">{t.titulo}</h4>
                    </div>
                    <p className="mt-1 text-data text-zinc-400">{t.resumen}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Destacados: Salud + Bienestar */}
      {BPG_DESTACADOS.map((d) => (
        <section key={d.tema} className="mt-10">
          <h2 className="text-lg font-semibold text-white mb-1">{d.tema} — prácticas clave</h2>
          <ul className="mt-3 space-y-2">
            {d.practicas.map((p, i) => (
              <li key={i} className="flex gap-3 text-data text-zinc-300">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent/60" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {/* Relación con sanidad */}
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
