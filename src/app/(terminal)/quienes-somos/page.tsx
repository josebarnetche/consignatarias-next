import { Metadata } from 'next'
import { SectionBreadcrumbSchema } from '@/components/seo/JsonLd'

export const metadata: Metadata = {
  title: 'Quienes Somos | Consignatarias.com.ar',
  description: 'Consignatarias.com.ar es una plataforma de inteligencia del mercado ganadero argentino. Conoce nuestras fuentes de datos, metodologia y equipo.',
  openGraph: {
    title: 'Quienes Somos | Consignatarias.com.ar',
    description: 'Plataforma de inteligencia del mercado ganadero argentino. Fuentes de datos, metodologia y contacto.',
    url: 'https://www.consignatarias.com.ar/quienes-somos',
    type: 'website',
  },
  alternates: {
    canonical: 'https://www.consignatarias.com.ar/quienes-somos',
  },
}

export default function QuienesSomosPage() {
  return (
    <>
      <SectionBreadcrumbSchema section="quienes-somos" sectionName="Quienes Somos" />
      <div className="max-w-3xl mx-auto px-4 py-8 text-sm leading-relaxed">
        {/* Title */}
        <h1 className="text-zinc-100 text-2xl font-medium mb-6">Quienes Somos</h1>

        <p className="text-zinc-400 mb-6">
          Consignatarias.com.ar es una plataforma de inteligencia del mercado ganadero argentino
          desarrollada por Memola Medios S.A.S.
        </p>

        {/* Que hacemos */}
        <h2 className="text-zinc-200 text-lg font-medium mt-8 mb-3">Que hacemos</h2>
        <p className="text-zinc-400 mb-6">
          Agregamos informacion de remates de hacienda de mas de 67 consignatarias en 10 provincias
          argentinas en un solo calendario unificado. Tambien mantenemos un directorio de 364 plantas
          frigorificas habilitadas por MAGYP y un panel de precios de mercado con el indice INMAG,
          precios por categoria de hacienda, maiz FOB y cotizacion del dolar.
        </p>

        {/* Fuentes de datos */}
        <h2 className="text-zinc-200 text-lg font-medium mt-8 mb-3">Fuentes de datos</h2>
        <p className="text-zinc-400 mb-3">
          Nuestros datos provienen de fuentes publicas y oficiales:
        </p>
        <ul className="space-y-2 text-zinc-400 mb-6">
          <li className="flex items-start gap-2">
            <span className="text-zinc-600 mt-1 shrink-0">&bull;</span>
            <span>Camara Argentina de Consignatarios de Ganado (CACG) &mdash; API publica</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-zinc-600 mt-1 shrink-0">&bull;</span>
            <span>Colombo y Colombo SA &mdash; calendario web</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-zinc-600 mt-1 shrink-0">&bull;</span>
            <span>Ivan L. O&apos;Farrell Consignataria &mdash; calendario web</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-zinc-600 mt-1 shrink-0">&bull;</span>
            <span>Cooperativa Guillermo Lehmann &mdash; calendario web</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-zinc-600 mt-1 shrink-0">&bull;</span>
            <span>Madelan SA &mdash; calendario web</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-zinc-600 mt-1 shrink-0">&bull;</span>
            <span>UMC Haciendas Villaguay &mdash; calendario web</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-zinc-600 mt-1 shrink-0">&bull;</span>
            <span>Mercado Agroganadero (mercadoagroganadero.com.ar) &mdash; indice INMAG</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-zinc-600 mt-1 shrink-0">&bull;</span>
            <span>Ministerio de Agricultura (MAGYP) &mdash; precios de maiz FOB y registro de frigorificos</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-zinc-600 mt-1 shrink-0">&bull;</span>
            <span>dolarapi.com &mdash; cotizacion del dolar</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-zinc-600 mt-1 shrink-0">&bull;</span>
            <span>Fuentes manuales: IderCor, Etchevehere Rural, Coop. La Ganadera, Tradicion Ganadera, y otras</span>
          </li>
        </ul>

        {/* Metodologia */}
        <h2 className="text-zinc-200 text-lg font-medium mt-8 mb-3">Metodologia</h2>
        <p className="text-zinc-400 mb-6">
          Un pipeline automatizado recopila datos de todas las fuentes cada dia a las 14:00 (hora argentina).
          Los datos se normalizan, deduplican y validan antes de publicarse. El sitio se regenera
          automaticamente con cada actualizacion.
        </p>

        {/* Contacto */}
        <h2 className="text-zinc-200 text-lg font-medium mt-8 mb-3">Contacto</h2>
        <p className="text-zinc-400 mb-6">
          Para consultas comerciales, verificacion de perfiles o sumar tu consignataria:{' '}
          <a href="mailto:agro@memola.com.ar" className="text-accent hover:underline">
            agro@memola.com.ar
          </a>
        </p>

        {/* Empresa */}
        <h2 className="text-zinc-200 text-lg font-medium mt-8 mb-3">Empresa</h2>
        <p className="text-zinc-400">
          Memola Medios S.A.S. &mdash; Todos los derechos reservados.
        </p>
      </div>
    </>
  )
}
