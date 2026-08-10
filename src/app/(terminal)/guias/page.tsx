import { Metadata } from 'next'
import Link from 'next/link'
import { GUIAS, TOTAL_GUIAS } from '@/lib/data/guias'
import { SectionBreadcrumbSchema } from '@/components/seo/JsonLd'

export const revalidate = 86400

const BASE_URL = 'https://www.consignatarias.com.ar'

export const metadata: Metadata = {
  title: `Guías del mercado ganadero — ${TOTAL_GUIAS} respuestas del oficio`,
  description:
    'Cómo vender hacienda, cuánto vale un campo, qué se paga por cada categoría, cómo funciona un remate y qué trámites hacen falta. Las guías del mercado ganadero argentino, ordenadas por tema.',
  keywords: [
    'guias ganaderas',
    'como vender hacienda',
    'mercado ganadero argentino',
    'glosario ganadero',
    'guia del productor ganadero',
  ],
  openGraph: { title: 'Guías del mercado ganadero', url: `${BASE_URL}/guias`, type: 'website' },
  alternates: { canonical: `${BASE_URL}/guias` },
}

export default function GuiasPage() {
  return (
    <>
      <SectionBreadcrumbSchema section="guias" sectionName="Guías" />
      <div className="max-w-4xl mx-auto px-4 py-8 text-sm leading-relaxed">
        <h1 className="text-zinc-100 text-2xl font-medium mb-3">Guías del mercado</h1>
        <p className="text-zinc-300 text-base mb-8 max-w-2xl">
          Lo que hay que saber para operar, escrito sin vueltas: qué se paga, quién cobra qué, cuánto vale
          la tierra y qué papel hace falta para cada cosa. {TOTAL_GUIAS} guías, ordenadas por tema.
        </p>

        <nav className="flex flex-wrap gap-x-4 gap-y-2 text-xs mb-10 pb-6 border-b border-zinc-800">
          {GUIAS.map((g) => (
            <a
              key={g.titulo}
              href={`#${g.titulo.toLowerCase().replace(/[^a-z]+/g, '-')}`}
              className="text-zinc-500 hover:text-accent transition-colors"
            >
              {g.titulo}
            </a>
          ))}
        </nav>

        <div className="space-y-12">
          {GUIAS.map((grupo) => (
            <section key={grupo.titulo} id={grupo.titulo.toLowerCase().replace(/[^a-z]+/g, '-')}>
              <h2 className="text-zinc-100 text-lg font-medium mb-1">{grupo.titulo}</h2>
              <p className="text-zinc-500 text-xs mb-4">{grupo.bajada}</p>
              <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {grupo.guias.map((g) => (
                  <Link
                    key={g.href}
                    href={g.href}
                    className="block border-l-2 border-zinc-800 hover:border-accent pl-3 py-1 transition-colors group"
                  >
                    <span className="block text-zinc-200 group-hover:text-accent text-sm transition-colors">
                      {g.label}
                    </span>
                    <span className="block text-zinc-500 text-xs mt-0.5">{g.hint}</span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="border-t border-zinc-800 mt-12 pt-5 flex flex-wrap gap-4 text-xs">
          <Link href="/glosario" className="text-zinc-500 hover:text-accent">
            Glosario del oficio
          </Link>
          <Link href="/preguntas-frecuentes" className="text-zinc-500 hover:text-accent">
            Preguntas frecuentes
          </Link>
          <Link href="/metodologia" className="text-zinc-500 hover:text-accent">
            Cómo calculamos lo que publicamos
          </Link>
        </div>
      </div>
    </>
  )
}
