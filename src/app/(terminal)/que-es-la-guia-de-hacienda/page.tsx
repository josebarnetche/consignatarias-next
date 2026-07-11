import { Metadata } from 'next'
import Link from 'next/link'
import {
  SectionBreadcrumbSchema,
  DefinedTermSetSchema,
  FAQPageSchema,
  SpeakableSchema,
  TechArticleSchema,
} from '@/components/seo/JsonLd'
import marketPrices from '@/lib/data/market-prices.json'

export const revalidate = 86400 // rebuild diario vía Vercel

const BASE_URL = 'https://www.consignatarias.com.ar'
const PAGE_URL = `${BASE_URL}/que-es-la-guia-de-hacienda`

/* ------------------------------------------------------------------ */
/*  Número vivo: página conceptual, sin serie numérica obligatoria.    */
/*  El único dato vivo es la fecha de actualización (sello de frescura).*/
/* ------------------------------------------------------------------ */
const lastUpdate = marketPrices.lastUpdate

/* ------------------------------------------------------------------ */
/*  Términos definidos — fuente única para DefinedTermSet y glosario    */
/*  visible. Distinguen la guía (documento comercial de propiedad y     */
/*  traslado) del DT-e (documento sanitario de SENASA).                 */
/* ------------------------------------------------------------------ */
const TERMINOS = [
  {
    name: 'Guía de hacienda',
    description:
      'Documento municipal o provincial que autoriza y acredita el traslado y la propiedad del ganado. Emitida por el municipio o la autoridad provincial, respalda que quien mueve la hacienda es su legítimo propietario. Es un documento de índole comercial y de propiedad, distinto del DT-e sanitario de SENASA.',
    url: PAGE_URL,
  },
  {
    name: 'Guía única de traslado',
    description:
      'Denominación que reciben en varias provincias los sistemas unificados de guía de hacienda. Integran en un solo trámite la autorización de movimiento y la acreditación de propiedad del ganado dentro de la jurisdicción provincial. El nombre y el circuito varían según la provincia.',
    url: PAGE_URL,
  },
  {
    name: 'DT-e',
    description:
      'Documento de Tránsito Electrónico animal. Guía sanitaria obligatoria que emite SENASA para trasladar hacienda entre establecimientos o hacia el remate y el frigorífico. Acredita la condición sanitaria del movimiento, no la propiedad; requiere RENSPA vigente en origen y destino.',
    url: `${BASE_URL}/que-es-el-dte`,
  },
  {
    name: 'Tránsito de hacienda',
    description:
      'Movimiento físico de ganado entre un origen y un destino. Para ser legal exige, según la jurisdicción, el DT-e sanitario de SENASA y la guía municipal o provincial que acredita propiedad y traslado. Ambos documentos cumplen funciones diferentes y suelen convivir en el mismo viaje.',
  },
  {
    name: 'Boleto de marca',
    description:
      'Certificado provincial que acredita la propiedad de la hacienda a nombre del titular de la marca o señal registrada. Es la base documental de la propiedad del ganado y suele ser antecedente exigido para emitir la guía de traslado.',
    url: `${BASE_URL}/como-sacar-el-boleto-de-marca`,
  },
]

/* ------------------------------------------------------------------ */
/*  FAQ — answer-first: cada respuesta arranca con el dato.            */
/*  Mismo array para FAQPageSchema y el <dl> visible.                  */
/* ------------------------------------------------------------------ */
const FAQ = [
  {
    question: '¿Qué es la guía de hacienda?',
    answer:
      'La guía de hacienda es el documento municipal o provincial que autoriza y acredita el traslado y la propiedad del ganado. La emite el municipio o la autoridad provincial y respalda que quien mueve la hacienda es su legítimo propietario. Es un documento de índole comercial y de propiedad, distinto del DT-e, que es el documento sanitario que emite SENASA.',
  },
  {
    question: '¿Guía y DT-e son lo mismo?',
    answer:
      'No. Son dos documentos distintos que cumplen funciones diferentes y suelen convivir en el mismo traslado. La guía de hacienda es municipal o provincial y acredita la propiedad y el traslado del ganado; el DT-e es el documento sanitario que emite SENASA y acredita la condición sanitaria del movimiento, con RENSPA vigente en origen y destino. Uno responde a la autoridad comercial local; el otro, a la autoridad sanitaria nacional.',
  },
  {
    question: '¿Quién emite la guía?',
    answer:
      'La guía de hacienda la emite el municipio o la autoridad provincial competente, según la jurisdicción donde se origina el traslado. En varias provincias se tramita a través de sistemas de guía única de traslado. El DT-e, en cambio, lo emite SENASA. Como el circuito y la denominación varían por provincia y municipio, el trámite formal se gestiona ante el organismo local correspondiente.',
  },
  {
    question: '¿Para qué sirve la guía al vender?',
    answer:
      'Al vender, la guía de hacienda acredita ante el comprador y las autoridades de control que el vendedor es el legítimo propietario del ganado y que el traslado está autorizado. Es la pieza documental que respalda la titularidad en la operación, complementaria del DT-e sanitario y del boleto de marca. Esta página es informativa; el trámite se realiza ante el municipio o la provincia.',
  },
]

export const metadata: Metadata = {
  title: 'Qué es la guía de hacienda (guía única de traslado)',
  description:
    'La guía de hacienda es el documento municipal o provincial que autoriza y acredita el traslado y la propiedad del ganado, distinto del DT-e sanitario de SENASA. Diferencia entre guía y DT-e, cuándo se necesita y cómo se tramita.',
  keywords: [
    'que es la guia de hacienda',
    'guia unica de traslado',
    'diferencia guia y dte',
    'guia para trasladar ganado',
    'guia de hacienda o dte',
    'quien emite la guia de hacienda',
    'guia municipal de hacienda',
    'guia provincial de ganado',
    'documento para mover hacienda',
    'guia de traslado de hacienda',
  ],
  openGraph: {
    title: 'Qué es la guía de hacienda (guía única de traslado)',
    description:
      'La guía de hacienda es el documento municipal o provincial que acredita el traslado y la propiedad del ganado, distinto del DT-e sanitario de SENASA. Guía vs DT-e, cuándo se necesita y cómo se tramita.',
    url: PAGE_URL,
    type: 'article',
    images: ['https://www.consignatarias.com.ar/og.png'],
  },
  alternates: {
    canonical: PAGE_URL,
  },
}

export default function QueEsLaGuiaDeHaciendaPage() {
  return (
    <>
      <SectionBreadcrumbSchema
        section="que-es-la-guia-de-hacienda"
        sectionName="Guía de hacienda"
      />
      <DefinedTermSetSchema
        name="Guía de hacienda — definiciones"
        description="Definiciones citables de guía de hacienda, guía única de traslado, DT-e, tránsito de hacienda y boleto de marca en el traslado y la comercialización de ganado en Argentina."
        url={PAGE_URL}
        terms={TERMINOS}
      />
      <FAQPageSchema items={FAQ} />
      <SpeakableSchema
        url={PAGE_URL}
        headline="Qué es la guía de hacienda"
        cssSelectors={['h1', '.speakable-content']}
      />
      <TechArticleSchema
        name="Qué es la guía de hacienda (guía única de traslado)"
        description="La guía de hacienda es el documento municipal o provincial que acredita el traslado y la propiedad del ganado, distinto del DT-e sanitario de SENASA. Diferencia entre guía y DT-e, cuándo se necesita y cómo se tramita."
        url={PAGE_URL}
        proficiencyLevel="Beginner"
        dateModified={lastUpdate}
        citations={[
          { name: 'SENASA — DT-e (Documento de Tránsito Electrónico)', url: 'https://www.senasa.gob.ar' },
        ]}
      />

      <div className="max-w-3xl mx-auto px-4 py-8 text-sm leading-relaxed">
        {/* Breadcrumb terminal */}
        <nav className="text-xxs font-terminal uppercase text-zinc-500 mb-6 tracking-wide">
          <Link href="/" className="hover:text-accent transition-colors">
            Inicio
          </Link>
          {' / '}
          <span className="text-zinc-400">Guía de hacienda</span>
        </nav>

        {/* Title */}
        <h1 className="text-zinc-100 text-2xl font-medium mb-6">
          Qué es la guía de hacienda
        </h1>

        {/* Answer-first: primera oración autocontenida y citable por asistentes IA */}
        <p className="speakable-content text-zinc-300 text-base mb-6">
          La <span className="text-zinc-100 font-medium">guía de hacienda</span> es el documento
          municipal o provincial que autoriza y acredita el traslado y la propiedad del ganado,
          distinto del <span className="text-zinc-100 font-medium">DT-e</span>, que es el documento
          sanitario que emite SENASA. Ambos suelen convivir en el mismo viaje, pero cumplen
          funciones diferentes: la guía responde a la autoridad comercial local; el DT-e, a la
          autoridad sanitaria nacional. Esta página es informativa y no fija precios ni tarifas.
        </p>

        <p className="text-zinc-400 mb-8">
          La confusión entre guía y DT-e es frecuente porque los dos «acompañan» a la hacienda
          cuando se mueve. La diferencia es de fondo: la guía acredita <span className="text-zinc-300">quién es dueño</span> y
          que el movimiento está autorizado por el municipio o la provincia; el DT-e acredita la <span className="text-zinc-300">condición sanitaria</span> del
          traslado ante SENASA. Como el circuito de la guía varía por jurisdicción, el trámite formal
          se gestiona ante el municipio o la provincia correspondiente.
        </p>

        {/* Qué es */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">Qué es la guía de hacienda</h2>
        <p className="text-zinc-400 mb-4">
          La guía de hacienda es un documento de índole comercial y de propiedad. La emite el
          municipio o la autoridad provincial y su función es doble:
        </p>
        <ul className="text-zinc-400 mb-8 space-y-2 list-disc pl-5">
          <li>
            <span className="text-zinc-300">Acredita la propiedad:</span> respalda que quien mueve o
            vende la hacienda es su legítimo propietario, en línea con la marca o señal registrada y
            el boleto de marca.
          </li>
          <li>
            <span className="text-zinc-300">Autoriza el traslado:</span> habilita el movimiento del
            ganado dentro de la jurisdicción, dejando registro del origen, el destino y el titular.
          </li>
          <li>
            <span className="text-zinc-300">Guía única de traslado:</span> en varias provincias el
            trámite se unifica en un sistema de guía única, que integra en un solo circuito la
            autorización de movimiento y la acreditación de propiedad.
          </li>
        </ul>

        {/* Guía vs DT-e */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">Guía vs DT-e: cuál es cuál</h2>
        <p className="text-zinc-400 mb-4">
          Son dos documentos distintos, con emisores, funciones y ámbitos diferentes. La tabla los
          separa:
        </p>
        <div className="overflow-x-auto mb-8">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-700">
                <th className="py-2 pr-4 text-zinc-500 font-terminal uppercase tracking-wide">
                  &nbsp;
                </th>
                <th className="py-2 pr-4 text-zinc-300 font-medium">Guía de hacienda</th>
                <th className="py-2 text-zinc-300 font-medium">DT-e</th>
              </tr>
            </thead>
            <tbody className="text-zinc-400">
              <tr className="border-b border-zinc-800">
                <td className="py-2 pr-4 text-zinc-500">Emisor</td>
                <td className="py-2 pr-4">Municipio o autoridad provincial</td>
                <td className="py-2">SENASA (organismo nacional)</td>
              </tr>
              <tr className="border-b border-zinc-800">
                <td className="py-2 pr-4 text-zinc-500">Qué acredita</td>
                <td className="py-2 pr-4">Propiedad del ganado y autorización de traslado</td>
                <td className="py-2">Condición sanitaria del movimiento</td>
              </tr>
              <tr className="border-b border-zinc-800">
                <td className="py-2 pr-4 text-zinc-500">Ámbito</td>
                <td className="py-2 pr-4">Comercial / propiedad (municipal o provincial)</td>
                <td className="py-2">Sanitario (nacional, con RENSPA)</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Cuándo se necesita */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">
          Cuándo se necesita la guía
        </h2>
        <p className="text-zinc-400 mb-4">
          La guía de hacienda interviene cuando el ganado cambia de lugar o de dueño dentro de la
          jurisdicción. Los casos típicos:
        </p>
        <ul className="text-zinc-400 mb-8 space-y-2 list-disc pl-5">
          <li>
            <span className="text-zinc-300">Venta de hacienda:</span> acredita ante el comprador y
            los controles que el vendedor es el propietario y que el traslado está autorizado.
          </li>
          <li>
            <span className="text-zinc-300">Traslado entre campos o hacia el remate:</span> respalda
            el movimiento junto con el DT-e sanitario de SENASA.
          </li>
          <li>
            <span className="text-zinc-300">Envío a faena:</span> acompaña a la hacienda que va al
            frigorífico, sumándose a la documentación sanitaria.
          </li>
        </ul>

        {/* Cómo se tramita */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">Cómo se tramita</h2>
        <p className="text-zinc-400 mb-8">
          El circuito de la guía varía por provincia y por municipio: en algunas jurisdicciones se
          gestiona en la oficina municipal, en otras a través de un sistema provincial de guía única
          de traslado. Por eso el trámite formal se realiza ante el municipio o la autoridad
          provincial competente, que definen requisitos, aranceles y modalidad. El DT-e sanitario, en
          cambio, se tramita en línea ante SENASA (senasa.gob.ar). Esta página es informativa y no
          reemplaza al organismo emisor.
        </p>

        {/* FAQ visible (refuerza el schema y da respuesta extraíble) */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">Preguntas frecuentes</h2>
        <dl className="space-y-5 mb-8">
          {FAQ.map((item) => (
            <div key={item.question} className="border-l-2 border-zinc-700 pl-4">
              <dt className="text-accent font-medium text-base mb-1">{item.question}</dt>
              <dd className="text-zinc-400">{item.answer}</dd>
            </div>
          ))}
        </dl>

        {/* Links internos — ancla el cluster de traslado y comercialización */}
        <div className="border border-terminal-border rounded-md p-4 mb-8">
          <p className="text-xxs font-terminal uppercase tracking-wide text-zinc-500 mb-3">
            Seguir leyendo
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
            <Link href="/que-es-el-dte" className="text-accent hover:text-accent-bright transition-colors">
              Qué es el DT-e →
            </Link>
            <Link href="/que-es-el-renspa" className="text-accent hover:text-accent-bright transition-colors">
              Qué es el RENSPA
            </Link>
            <Link href="/como-sacar-el-boleto-de-marca" className="text-accent hover:text-accent-bright transition-colors">
              Cómo sacar el boleto de marca
            </Link>
            <Link href="/que-es-una-tropa-de-hacienda" className="text-accent hover:text-accent-bright transition-colors">
              Qué es una tropa de hacienda
            </Link>
            <Link href="/que-es-senasa" className="text-accent hover:text-accent-bright transition-colors">
              Qué es SENASA
            </Link>
            <Link href="/vender-hacienda-guia" className="text-accent hover:text-accent-bright transition-colors">
              Guía para vender hacienda
            </Link>
            <Link href="/como-vender-hacienda" className="text-accent hover:text-accent-bright transition-colors">
              Cómo vender hacienda
            </Link>
          </div>
        </div>

        {/* Footer institucional — sello de frescura */}
        <footer className="border-t border-terminal-border pt-4">
          <p className="text-xxs text-zinc-500 mb-1">
            Los precios y comisiones que se muestran en el sitio son de referencia del mercado
            (INMAG/MAG); esta página no fija precios ni tarifas. La guía de hacienda es un trámite del
            municipio o la provincia y el DT-e se gestiona en senasa.gob.ar.
          </p>
          <p className="text-xxs text-zinc-500">
            Actualizado:{' '}{lastUpdate}{' · '}Memola Medios S.A.S.
          </p>
        </footer>
      </div>
    </>
  )
}
