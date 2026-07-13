import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Breadcrumb from '@/components/ui/Breadcrumb'
import { BPG_TEMAS, BPG_FUENTE, temaPorSlug } from '@/lib/data/bpg-ganaderas'

export const dynamicParams = false

export function generateStaticParams() {
  return BPG_TEMAS.map((t) => ({ slug: t.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const t = temaPorSlug(slug)
  if (!t) return { title: 'Buenas Prácticas Ganaderas | Consignatarias' }
  return {
    title: `${t.titulo} — cómo implementarlo (Buenas Prácticas Ganaderas) | Consignatarias`,
    description: t.resumen,
    alternates: { canonical: `https://www.consignatarias.com.ar/buenas-practicas/${t.slug}` },
  }
}

export default async function BpgTemaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const t = temaPorSlug(slug)
  if (!t) notFound()

  const idx = BPG_TEMAS.findIndex((x) => x.slug === t.slug)
  const prev = idx > 0 ? BPG_TEMAS[idx - 1] : null
  const next = idx < BPG_TEMAS.length - 1 ? BPG_TEMAS[idx + 1] : null

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 font-sans">
      <Breadcrumb
        items={[
          { name: 'Herramientas', href: '/calculadora' },
          { name: 'Buenas Prácticas', href: '/buenas-practicas' },
          { name: t.titulo },
        ]}
      />

      <header className="mt-4 mb-6">
        <p className="text-xxs uppercase tracking-widest text-accent mb-2">
          {t.bloque} · Tema {String(t.n).padStart(2, '0')}
        </p>
        <h1 className="text-2xl sm:text-3xl font-semibold text-white text-balance">{t.titulo}</h1>
        <p className="mt-3 text-zinc-400">{t.intro}</p>
      </header>

      <div className="space-y-8">
        {t.secciones.map((s) => (
          <section key={s.subtitulo}>
            <h2 className="text-base font-semibold text-white mb-3">{s.subtitulo}</h2>
            <ul className="space-y-2">
              {s.practicas.map((p, i) => (
                <li key={i} className="flex gap-3 text-data text-zinc-300">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent/60" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {/* Navegación entre temas */}
      <nav className="mt-10 flex items-stretch justify-between gap-3 border-t border-terminal-border pt-5">
        {prev ? (
          <Link href={`/buenas-practicas/${prev.slug}`} className="group flex-1 rounded-terminal border border-terminal-border bg-terminal-panel p-3 hover:border-accent transition-colors">
            <span className="text-xxs text-zinc-500">← Anterior</span>
            <div className="text-data text-zinc-200 group-hover:text-accent">{prev.titulo}</div>
          </Link>
        ) : (
          <span className="flex-1" />
        )}
        {next ? (
          <Link href={`/buenas-practicas/${next.slug}`} className="group flex-1 rounded-terminal border border-terminal-border bg-terminal-panel p-3 text-right hover:border-accent transition-colors">
            <span className="text-xxs text-zinc-500">Siguiente →</span>
            <div className="text-data text-zinc-200 group-hover:text-accent">{next.titulo}</div>
          </Link>
        ) : (
          <span className="flex-1" />
        )}
      </nav>

      <p className="mt-6 text-xxs text-zinc-600">
        Resumen de la{' '}
        <a href={BPG_FUENTE.url} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-accent underline underline-offset-2">
          {BPG_FUENTE.titulo}
        </a>{' '}
        ({BPG_FUENTE.autor}, {BPG_FUENTE.anio}). Reescrito y resumido; no reemplaza la guía completa ni el
        asesoramiento profesional. Volver al{' '}
        <Link href="/buenas-practicas" className="text-zinc-500 hover:text-accent underline underline-offset-2">índice</Link>.
      </p>
    </div>
  )
}
