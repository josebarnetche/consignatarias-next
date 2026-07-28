import { Metadata } from 'next'
import Link from 'next/link'
import DemandaCompraForm from '@/components/DemandaCompraForm'
import { SectionBreadcrumbSchema } from '@/components/seo/JsonLd'

export const revalidate = 86400

const BASE_URL = 'https://www.consignatarias.com.ar'

export const metadata: Metadata = {
  title: 'Quiero comprar hacienda — te conectamos con el remate',
  description:
    'Publicá qué hacienda buscás comprar (categoría, cabezas, provincia) y te devolvemos al instante los remates programados que matchean, con aviso por email de cada remate nuevo. Gratis, con los datos del calendario ganadero de consignatarias.com.ar.',
  keywords: [
    'comprar hacienda',
    'comprar terneros',
    'comprar novillos',
    'donde comprar hacienda',
    'remates de hacienda',
    'comprar vacas',
    'invernada en venta',
  ],
  openGraph: {
    title: 'Quiero comprar hacienda — te conectamos con el remate',
    description: 'Decinos qué buscás y te conectamos con los remates programados que matchean. Aviso automático de cada remate nuevo.',
    url: `${BASE_URL}/quiero-comprar`,
    type: 'website',
  },
  alternates: { canonical: `${BASE_URL}/quiero-comprar` },
}

export default function QuieroComprarPage() {
  return (
    <>
      <SectionBreadcrumbSchema section="quiero-comprar" sectionName="Quiero comprar hacienda" />
      <div className="max-w-3xl mx-auto px-4 py-8 text-sm leading-relaxed">
        <h1 className="text-zinc-100 text-2xl font-medium mb-6">Quiero comprar hacienda</h1>

        <p className="text-zinc-300 text-base mb-6">
          Decinos qué buscás — categoría, cantidad, provincia — y te devolvemos al instante los
          remates programados que matchean. Tu búsqueda queda activa: cada vez que una consignataria
          publique un remate que encaje, te llega el aviso por email. Gratis.
        </p>

        <div className="mb-8">
          <DemandaCompraForm />
        </div>

        <h2 className="text-zinc-200 text-lg font-medium mb-3">Cómo funciona</h2>
        <ol className="text-zinc-400 mb-8 space-y-2 list-decimal pl-5">
          <li>Publicás tu búsqueda (30 segundos, sin registrarte).</li>
          <li>Te mostramos los remates del calendario que ya matchean, con fecha, consignataria y link.</li>
          <li>Cuando el scrape diario detecta un remate nuevo que encaja, te avisamos por email.</li>
          <li>Comprás en el remate, directo con la consignataria — nosotros somos el radar.</li>
        </ol>

        <div className="border-t border-zinc-800 pt-4 flex flex-wrap gap-4 text-xs">
          <Link href="/remates" className="text-zinc-500 hover:text-accent transition-colors">
            Calendario completo de remates →
          </Link>
          <Link href="/precios" className="text-zinc-500 hover:text-accent transition-colors">
            Precios por categoría
          </Link>
          <Link href="/consignatarias" className="text-zinc-500 hover:text-accent transition-colors">
            Directorio de consignatarias
          </Link>
          <Link href="/mcp" className="text-zinc-500 hover:text-accent transition-colors">
            Para agentes de IA: tool quiero_comprar (MCP)
          </Link>
        </div>
      </div>
    </>
  )
}
