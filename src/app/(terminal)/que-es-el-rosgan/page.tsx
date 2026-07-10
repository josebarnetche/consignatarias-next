import { Metadata } from 'next'
import Link from 'next/link'
import {
  SectionBreadcrumbSchema,
  DefinedTermSetSchema,
  FAQPageSchema,
  SpeakableSchema,
  HowToSchema,
} from '@/components/seo/JsonLd'
import marketPrices from '@/lib/data/market-prices.json'

export const revalidate = 86400 // rebuild diario vía Vercel

const BASE_URL = 'https://www.consignatarias.com.ar'
const PAGE_URL = `${BASE_URL}/que-es-el-rosgan`

/* ------------------------------------------------------------------ */
/*  Números vivos — el ROSGAN concentra invernada, así que el dato de  */
/*  referencia es la categoría ternero/novillito del panel INMAG/MAG.  */
/*  Es precio de mercado de referencia, NO el resultado del ROSGAN.    */
/* ------------------------------------------------------------------ */
const cats = marketPrices.categories as Record<string, { current: number }>
const lastUpdate = marketPrices.lastUpdate
const fmt = (n: number) => n.toLocaleString('es-AR')
const price = (key: string) => Math.round(cats[key].current)

const ternero = price('terneros')
const novillito = price('novillitos')

/* ------------------------------------------------------------------ */
/*  Cómo participar — mismo array para HowToSchema y HTML visible      */
/* ------------------------------------------------------------------ */
const PASOS = [
  {
    name: 'Inscribirte con el organizador o una consignataria',
    text:
      'Contactá al organizador del remate o a una de las consignatarias que operan en el ROSGAN. La compra y la venta se canalizan siempre a través de una firma consignataria matriculada, no de forma directa entre particulares.',
  },
  {
    name: 'Revisar el catálogo de lotes',
    text:
      'Estudiá el catálogo publicado antes de la fecha: cada lote trae cantidad de cabezas, categoría, peso promedio, procedencia (RENSPA) y estado sanitario. El catálogo es lo que permite comprar por pantalla sin ver los animales en persona.',
  },
  {
    name: 'Registrarte como comprador',
    text:
      'Registrate como comprador ante el organizador y acreditá tu condición fiscal y sanitaria (CUIT, RENSPA de destino) para quedar habilitado a ofertar durante la transmisión.',
  },
  {
    name: 'Pujar durante la transmisión televisada',
    text:
      'Seguí la transmisión y ofertá por los lotes que te interesan, en general a través de tu consignataria, que levanta la mano por vos según el precio que le indicás. La puja se resuelve en vivo, lote por lote.',
  },
  {
    name: 'Liquidar la operación',
    text:
      'Cerrada la subasta, la consignataria liquida la compraventa: emite la documentación, cobra la comisión pactada y coordina la logística. Recién ahí se emite el DT-e y se traslada la hacienda del campo de origen al de destino.',
  },
]

/* ------------------------------------------------------------------ */
/*  Términos definidos — patrón /glosario, citables por asistentes IA  */
/* ------------------------------------------------------------------ */
const TERMINOS = [
  {
    name: 'ROSGAN',
    description:
      'Mercado Ganadero de Rosario. Sistema de remate ganadero televisado, con sede en Rosario (Santa Fe), donde se subastan lotes de hacienda por pantalla y video sin trasladar los animales antes de la venta. Concentra principalmente invernada (terneros y novillitos) y ofrece categorías estandarizadas a través de consignatarias matriculadas.',
    url: PAGE_URL,
  },
  {
    name: 'Remate televisado',
    description:
      'Modalidad de subasta de hacienda transmitida por televisión y video, en la que los compradores ofertan a distancia sobre lotes que ven en pantalla. Reemplaza la concentración física de los animales en un predio por la exhibición audiovisual y el catálogo previo.',
  },
  {
    name: 'Remate por pantalla',
    description:
      'Venta de hacienda en la que el lote se ofrece mediante imágenes y datos en pantalla en lugar de exponerse físicamente. El animal permanece en el campo de origen hasta después de vendido, lo que evita el desgaste, el transporte y el riesgo sanitario del traslado previo.',
  },
  {
    name: 'Lote',
    description:
      'Conjunto homogéneo de animales que se vende como una unidad en el remate. En el ROSGAN cada lote se describe en el catálogo por cantidad de cabezas, categoría, peso promedio, procedencia y estado sanitario, de modo que sea comparable entre sí.',
  },
  {
    name: 'Catálogo',
    description:
      'Documento que publica el organizador antes del remate con el detalle de cada lote a subastar: cabezas, categoría, kilos, procedencia (RENSPA) y datos sanitarios. Es la base para comprar por pantalla; el catálogo oficial siempre lo emite el organizador del remate.',
  },
  {
    name: 'Consignatario',
    description:
      'Firma matriculada que intermedia la compraventa de hacienda por cuenta de terceros y cobra una comisión. En el ROSGAN la operación se canaliza a través de consignatarias: ofrecen los lotes del vendedor y levantan la oferta del comprador durante la transmisión.',
    url: `${BASE_URL}/consignatarias`,
  },
  {
    name: 'Invernada',
    description:
      'Hacienda joven —terneros, terneras y novillitos— destinada a seguir engordando en otro campo o feedlot antes de la terminación. Es la categoría que más se opera en el ROSGAN, porque el remate por pantalla se adapta bien a lotes homogéneos de recría.',
    url: `${BASE_URL}/que-es-la-invernada`,
  },
]

/* ------------------------------------------------------------------ */
/*  FAQ — copian lo que la gente busca / le pregunta a un asistente.   */
/*  Cada respuesta arranca con el dato.                                */
/* ------------------------------------------------------------------ */
const FAQ = [
  {
    question: '¿Qué es el ROSGAN?',
    answer:
      'El ROSGAN es el Mercado Ganadero de Rosario: un remate ganadero televisado donde se subastan lotes de hacienda por pantalla y video, sin trasladar los animales antes de la venta. Los animales quedan en el campo de origen y se venden a partir del catálogo y las imágenes; la operación se canaliza siempre a través de consignatarias matriculadas.',
  },
  {
    question: '¿Cuál es la diferencia con un remate físico?',
    answer:
      'La diferencia es que en el ROSGAN la hacienda no se concentra en un predio: se vende por pantalla a partir del catálogo, mientras que en el remate físico los animales se trasladan al lugar de la subasta y el comprador los ve en persona. El remate por pantalla evita el transporte, el desbaste y el riesgo sanitario del traslado previo; el DT-e recién se emite una vez cerrada y liquidada la operación.',
  },
  {
    question: '¿Cómo comprar en el ROSGAN?',
    answer:
      'Para comprar en el ROSGAN te inscribís con el organizador o una consignataria, revisás el catálogo de lotes, te registrás como comprador acreditando CUIT y RENSPA de destino, y pujás durante la transmisión televisada —en general a través de tu consignataria—. Cerrada la subasta, la consignataria liquida la operación y coordina el traslado. Es hacienda de invernada: como referencia de mercado, el ternero cotiza hoy $${fmt(ternero)}/kg vivo y el novillito $${fmt(novillito)}/kg vivo (precio de referencia del mercado INMAG/MAG, no fijado por esta página ni por el ROSGAN).',
  },
  {
    question: '¿Dónde se ve el catálogo del ROSGAN?',
    answer:
      'El catálogo oficial del ROSGAN lo publica el organizador del remate antes de cada fecha, con el detalle de cada lote (cabezas, categoría, kilos, procedencia y sanidad). Esta página es información de referencia; para el catálogo vigente y las condiciones de cada subasta hay que remitirse al material del organizador.',
  },
]

export const metadata: Metadata = {
  title: `Qué es el ROSGAN: remate ganadero televisado y catálogo (${lastUpdate})`,
  description:
    'El ROSGAN es el Mercado Ganadero de Rosario: un remate ganadero televisado donde se subastan lotes de hacienda por pantalla y video, sin trasladar los animales antes de la venta. Qué es, diferencia con el remate físico, cómo comprar paso a paso y dónde ver el catálogo.',
  keywords: [
    'que es el rosgan',
    'rosgan',
    'rosgan remate',
    'rosgan catalogo',
    'remate ganadero televisado',
    'remate por pantalla',
    'mercado ganadero de rosario',
    'como comprar en el rosgan',
    'rosgan invernada',
    'remate hacienda por video',
  ],
  openGraph: {
    title: 'Qué es el ROSGAN: remate ganadero televisado y catálogo',
    description:
      'El ROSGAN es el Mercado Ganadero de Rosario: se rematan lotes de hacienda por pantalla y video sin trasladar los animales. Diferencia con el remate físico, cómo comprar y dónde ver el catálogo.',
    url: PAGE_URL,
    type: 'article',
    images: ['https://www.consignatarias.com.ar/og.png'],
  },
  alternates: {
    canonical: PAGE_URL,
  },
}

export default function QueEsElRosganPage() {
  return (
    <>
      <SectionBreadcrumbSchema section="que-es-el-rosgan" sectionName="Qué es el ROSGAN" />
      <DefinedTermSetSchema
        name="ROSGAN — definiciones"
        description="Definiciones citables de ROSGAN, remate televisado, remate por pantalla, lote, catálogo, consignatario e invernada en el mercado ganadero argentino."
        url={PAGE_URL}
        terms={TERMINOS}
      />
      <HowToSchema
        name="Cómo participar en el ROSGAN paso a paso"
        description="Cómo comprar en el ROSGAN, el remate ganadero televisado de Rosario: inscribirse con una consignataria, revisar el catálogo, registrarse como comprador, pujar en la transmisión y liquidar la operación."
        steps={PASOS}
      />
      <FAQPageSchema items={FAQ} />
      <SpeakableSchema
        url={PAGE_URL}
        headline="Qué es el ROSGAN"
        cssSelectors={['h1', '.speakable-content']}
      />

      <div className="max-w-3xl mx-auto px-4 py-8 text-sm leading-relaxed">
        {/* Title */}
        <h1 className="text-zinc-100 text-2xl font-medium mb-6">
          Qué es el ROSGAN: remate ganadero televisado
        </h1>

        {/* Answer-first: respuesta extraíble por asistentes IA en la 1ª oración */}
        <p className="speakable-content text-zinc-300 text-base mb-6">
          El ROSGAN es el Mercado Ganadero de Rosario: un remate ganadero televisado donde se
          subastan lotes de hacienda por pantalla y video, sin trasladar los animales antes de la
          venta.
        </p>

        <p className="text-zinc-400 mb-8">
          En lugar de concentrar la hacienda en un predio, los animales quedan en el campo de origen
          y se venden a partir de un catálogo y de imágenes que se ven en pantalla durante la
          transmisión. La operación se canaliza siempre a través de consignatarias matriculadas, que
          ofrecen los lotes del vendedor y levantan la oferta del comprador. Concentra sobre todo
          invernada —terneros y novillitos— con categorías estandarizadas para que cada lote sea
          comparable. Esta página es información de referencia; el catálogo oficial es del
          organizador del remate.
        </p>

        {/* Cómo funciona */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">Cómo funciona el remate por pantalla</h2>
        <p className="text-zinc-400 mb-4">
          El remate por pantalla reemplaza la exhibición física del animal por su descripción en el
          catálogo y el video. El esquema básico es:
        </p>
        <ul className="text-zinc-400 mb-8 space-y-2 list-disc pl-5">
          <li>
            <span className="text-zinc-300">Sin traslado previo:</span> la hacienda permanece en el
            campo de origen hasta después de vendida, lo que evita el desbaste, el flete y el riesgo
            sanitario de mover animales que quizá no se vendan.
          </li>
          <li>
            <span className="text-zinc-300">Catálogo estandarizado:</span> cada lote se publica con
            cabezas, categoría, peso promedio, procedencia (RENSPA) y estado sanitario, de modo que
            se pueda comparar y ofertar a distancia.
          </li>
          <li>
            <span className="text-zinc-300">Consignatarias como intermediarias:</span> la
            compraventa se hace a través de firmas matriculadas que cobran comisión; no es una venta
            directa entre particulares.
          </li>
          <li>
            <span className="text-zinc-300">Puja en vivo:</span> los lotes se resuelven uno por uno
            durante la transmisión televisada, con el precio que se forma en la subasta.
          </li>
        </ul>

        {/* Cómo participar */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">Cómo participar paso a paso</h2>
        <p className="text-zinc-400 mb-4">
          La compra se resuelve en cinco pasos, siempre a través de una consignataria:
        </p>
        <ol className="text-zinc-400 mb-8 space-y-3 list-decimal pl-5">
          {PASOS.map((paso) => (
            <li key={paso.name}>
              <span className="text-zinc-300">{paso.name}.</span> {paso.text}
            </li>
          ))}
        </ol>

        {/* Referencia de precio */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">Qué se opera y a qué precio de referencia</h2>
        <p className="text-zinc-400 mb-8">
          El ROSGAN concentra hacienda de invernada, la categoría que mejor se adapta al remate por
          pantalla porque son lotes homogéneos de recría. Como referencia de mercado —no como
          resultado del ROSGAN— el ternero cotiza hoy{' '}
          <span className="text-zinc-300">${fmt(ternero)}/kg vivo</span> y el novillito{' '}
          <span className="text-zinc-300">${fmt(novillito)}/kg vivo</span>. Es precio de referencia
          del mercado (INMAG/MAG), no fijado por esta página ni por el ROSGAN: el valor de cada lote
          lo forma la puja en la subasta.
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

        {/* Links internos */}
        <div className="border-t border-zinc-800 pt-4 flex flex-wrap gap-4 text-xs">
          <Link href="/como-funciona-un-remate-ganadero" className="text-zinc-500 hover:text-accent transition-colors">
            Cómo funciona un remate ganadero →
          </Link>
          <Link href="/remates" className="text-zinc-500 hover:text-accent transition-colors">
            Calendario de remates
          </Link>
          <Link href="/consignatarias" className="text-zinc-500 hover:text-accent transition-colors">
            Directorio de consignatarias
          </Link>
          <Link href="/como-elegir-consignataria" className="text-zinc-500 hover:text-accent transition-colors">
            Cómo elegir consignataria
          </Link>
          <Link href="/que-es-la-invernada" className="text-zinc-500 hover:text-accent transition-colors">
            Qué es la invernada
          </Link>
        </div>

        {/* Footer */}
        <p className="text-zinc-500 text-xs mt-4">
          Información de referencia; el catálogo oficial es del organizador del remate. Actualizado:{' '}
          {lastUpdate}. Memola Medios S.A.S.
        </p>
      </div>
    </>
  )
}
