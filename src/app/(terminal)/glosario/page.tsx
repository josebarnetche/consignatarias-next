import { Metadata } from 'next'
import Link from 'next/link'
import { SectionBreadcrumbSchema } from '@/components/seo/JsonLd'

export const metadata: Metadata = {
  title: 'Glosario Ganadero — Consignatarias.com.ar',
  description: 'Definiciones de terminos clave del mercado ganadero argentino: remate, consignataria, INMAG, invernada, cria, frigorifico, hacienda, SENASA y mas.',
  openGraph: {
    title: 'Glosario Ganadero — Consignatarias.com.ar',
    description: 'Glosario con definiciones de terminos del mercado ganadero argentino: remate, consignataria, INMAG, invernada, cria, frigorifico y mas.',
    url: 'https://www.consignatarias.com.ar/glosario',
    type: 'website',
  },
  alternates: {
    canonical: 'https://www.consignatarias.com.ar/glosario',
  },
}

const GLOSSARY_TERMS = [
  {
    term: 'Cabeza',
    definition: 'Unidad de conteo de ganado. 1 cabeza = 1 animal. Se usa para expresar el volumen de un remate o la capacidad de un establecimiento (ej. "remate de 2.000 cabezas").',
  },
  {
    term: 'Consignataria',
    definition: 'Intermediario habilitado por matricula entre productores ganaderos y compradores en remates de hacienda. La consignataria organiza la subasta, garantiza la operacion y cobra una comision sobre la venta.',
  },
  {
    term: 'Cria',
    definition: 'Tipo de remate enfocado en ganado reproductor: vientres (vacas y vaquillonas preñadas o con cria al pie), toros y reproductores. Orientado a establecimientos que buscan mejorar o ampliar su rodeo.',
  },
  {
    term: 'CUIT',
    definition: 'Clave Unica de Identificacion Tributaria. Identificador fiscal argentino de 11 digitos asignado por AFIP a personas fisicas y juridicas. Se usa para identificar consignatarias y frigorificos en registros oficiales.',
  },
  {
    term: 'Frigorifico',
    definition: 'Planta procesadora de carne habilitada por SENASA para faena, desposte y/o procesamiento de productos carnicos. Cada frigorifico cuenta con un numero de establecimiento oficial y esta sujeto a inspecciones sanitarias regulares.',
  },
  {
    term: 'Hacienda',
    definition: 'Termino que refiere al ganado bovino en pie (vivo), especialmente en el contexto de compraventa y remates. "Hacienda en pie" es sinonimo de ganado vivo listo para comercializar.',
  },
  {
    term: 'INMAG',
    definition: 'Indice Novillo del Mercado Agroganadero. Precio de referencia del kilogramo vivo de novillo, publicado por el Mercado Agroganadero de Liniers. Es el principal indicador de precios de la hacienda vacuna en Argentina, expresado en $/kg vivo.',
  },
  {
    term: 'Invernada',
    definition: 'Tipo de remate enfocado en ganado para engorde: novillitos, terneros y vaquillonas. El comprador adquiere animales jovenes para llevarlos a peso de faena en su establecimiento (feedlot o campo).',
  },
  {
    term: 'Matricula',
    definition: 'Numero de habilitacion otorgado a consignatarias de ganado por el registro publico correspondiente. Acredita que la consignataria esta autorizada legalmente para intermediar en operaciones de compraventa de hacienda.',
  },
  {
    term: 'Novillo',
    definition: 'Bovino macho castrado de 2 o mas años de edad. Es la categoria base del indice INMAG y la principal referencia de precios del mercado ganadero argentino.',
  },
  {
    term: 'Novillito',
    definition: 'Bovino macho castrado joven, entre 1 y 2 años de edad. Se comercializa principalmente en remates de invernada para completar su engorde hasta alcanzar peso de faena.',
  },
  {
    term: 'Plaza',
    definition: 'Localidad o establecimiento donde se realiza un remate de hacienda. Puede referirse a una ciudad, un predio ferial o un mercado concentrador (ej. "plaza de Liniers", "plaza de Rosario").',
  },
  {
    term: 'Remate',
    definition: 'Evento de venta de ganado mediante subasta publica, organizado por una consignataria habilitada. Los compradores pujan por lotes de animales y el mejor postor se adjudica la compra. Puede ser presencial, televisado o por streaming.',
  },
  {
    term: 'SENASA',
    definition: 'Servicio Nacional de Sanidad y Calidad Agroalimentaria. Organismo estatal argentino que regula, controla y certifica la sanidad animal, vegetal y la inocuidad alimentaria. Habilita frigorificos, controla movimientos de hacienda y emite guias de transito.',
  },
  {
    term: 'Ternero',
    definition: 'Bovino joven de menos de 1 año de edad. Es una de las categorias mas demandadas en remates de invernada, ya que ofrece el mayor potencial de engorde.',
  },
  {
    term: 'Vaca',
    definition: 'Bovino hembra adulta. En el mercado ganadero se comercializa como vaca de descarte (para faena), vaca de cria (como vientre reproductor) o vaca con cria al pie.',
  },
  {
    term: 'Vaquillona',
    definition: 'Bovino hembra joven que aun no ha tenido su primer parto. Se comercializa tanto para invernada (engorde) como para cria (como futuro vientre reproductor).',
  },
]

function DefinedTermSetSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    name: 'Glosario Ganadero Argentino',
    description: 'Definiciones de terminos clave del mercado ganadero argentino.',
    url: 'https://www.consignatarias.com.ar/glosario',
    inLanguage: 'es',
    hasDefinedTerm: GLOSSARY_TERMS.map((entry) => ({
      '@type': 'DefinedTerm',
      name: entry.term,
      description: entry.definition,
      inDefinedTermSet: 'https://www.consignatarias.com.ar/glosario',
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

export default function GlosarioPage() {
  return (
    <>
      <SectionBreadcrumbSchema section="glosario" sectionName="Glosario" />
      <DefinedTermSetSchema />
      <div className="max-w-3xl mx-auto px-4 py-8 text-sm leading-relaxed">
        {/* Title */}
        <h1 className="text-zinc-100 text-2xl font-medium mb-6">Glosario Ganadero</h1>

        <p className="text-zinc-400 mb-8">
          Definiciones de los terminos mas usados en el mercado ganadero argentino:
          remates, categorias de hacienda, organismos reguladores e indicadores de precios.
        </p>

        {/* Glossary entries */}
        <dl className="space-y-6">
          {GLOSSARY_TERMS.map((entry) => (
            <div key={entry.term} className="border-l-2 border-zinc-700 pl-4">
              <dt className="text-accent font-medium text-base mb-1">{entry.term}</dt>
              <dd className="text-zinc-400">{entry.definition}</dd>
            </div>
          ))}
        </dl>

        {/* Related links */}
        <div className="mt-10 border-t border-zinc-800 pt-4 flex flex-wrap gap-4 text-xs">
          <Link href="/calidad" className="text-zinc-500 hover:text-accent transition-colors">Calidad de datos</Link>
          <Link href="/quienes-somos" className="text-zinc-500 hover:text-accent transition-colors">Quiénes somos</Link>
          <Link href="/planes" className="text-zinc-500 hover:text-accent transition-colors">Planes</Link>
          <Link href="/remates" className="text-zinc-500 hover:text-accent transition-colors">Ver remates</Link>
        </div>

        {/* Footer */}
        <p className="text-zinc-600 text-xs mt-4">
          Ultima actualizacion: Marzo 2026. Memola Medios S.A.S. &mdash; Todos los derechos reservados.
        </p>
      </div>
    </>
  )
}
