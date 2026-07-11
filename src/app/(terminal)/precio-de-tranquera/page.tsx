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
const PAGE_URL = `${BASE_URL}/precio-de-tranquera`

/* ------------------------------------------------------------------ */
/*  Número vivo — derivado de market-prices.json, nunca hardcodeado    */
/* ------------------------------------------------------------------ */
const cats = marketPrices.categories as Record<string, { current: number }>
const lastUpdate = marketPrices.lastUpdate
const fmt = (n: number) => n.toLocaleString('es-AR')
const price = (key: string) => Math.round(cats[key].current)
const novillo = price('novillos')

/* ------------------------------------------------------------------ */
/*  Términos definidos — glosario citable por asistentes IA            */
/* ------------------------------------------------------------------ */
const TERMINOS = [
  {
    name: 'Precio de tranquera',
    description:
      'Valor neto que efectivamente recibe el productor por su hacienda una vez descontados el desbaste, la comisión de la consignataria, el flete y los demás gastos de comercialización. Es el precio « puerta del campo »: lo que queda en mano después de que la operación pasó por el remate o la venta directa. Siempre es menor al precio de pizarra o de mercado.',
    url: PAGE_URL,
  },
  {
    name: 'Precio de pizarra',
    description:
      'Precio de referencia que publica el mercado —típicamente el promedio del Mercado Agroganadero (INMAG/MAG)— expresado en pesos por kilo vivo. Es un valor bruto, antes de descuentos, que sirve para orientar la operación pero que no equivale a lo que finalmente cobra el productor.',
  },
  {
    name: 'Precio de mercado',
    description:
      'Valor de referencia del ganado en una plaza determinada, formado por la oferta y la demanda en el remate o en la operación directa. Se informa en kilo vivo y es la base sobre la cual se aplican desbaste, comisión y gastos para llegar al precio de tranquera.',
  },
  {
    name: 'Precio neto',
    description:
      'Importe final que arroja la liquidación a favor del productor, después de restar todos los conceptos (desbaste, comisión, flete, sellos, tasas e IVA según corresponda) del valor bruto de la hacienda. En términos prácticos, el precio neto por kilo es el precio de tranquera.',
  },
  {
    name: 'Gastos de comercialización',
    description:
      'Conjunto de descuentos que separan el precio de mercado del precio de tranquera: desbaste (merma comercial por ayuno y viaje), comisión de venta de la consignataria, flete de la hacienda, sellos y tasas provinciales, y otros conceptos que figuran en la liquidación.',
    url: `${BASE_URL}/como-leer-una-liquidacion-de-hacienda`,
  },
]

/* ------------------------------------------------------------------ */
/*  FAQ — mismo array para el schema y el <dl> visible                 */
/* ------------------------------------------------------------------ */
const FAQ = [
  {
    question: '¿Qué es el precio de tranquera?',
    answer:
      'El precio de tranquera es el valor neto que efectivamente recibe el productor por su hacienda, una vez descontados el desbaste, la comisión de la consignataria, el flete y los demás gastos de comercialización. Es lo que queda en mano « en la puerta del campo », a diferencia del precio de pizarra o de mercado, que es un valor bruto de referencia.',
  },
  {
    question: '¿Por qué el precio de tranquera es menor al precio de pizarra?',
    answer:
      'Porque el precio de pizarra es un valor bruto por kilo vivo y del bruto se descuentan varios conceptos antes de que el dinero llegue al productor: el desbaste reduce el peso comercial, la comisión de la consignataria y el flete restan sobre el total, y a eso se suman sellos, tasas e IVA según la operación. La diferencia entre uno y otro es, justamente, la suma de los gastos de comercialización.',
  },
  {
    question: '¿Cómo calculo mi precio de tranquera?',
    answer:
      `Se parte del precio de mercado por kilo vivo —hoy el novillo se referencia en $${fmt(novillo)}/kg (${lastUpdate}) según INMAG/MAG— y se le restan, en orden, el desbaste sobre el peso, la comisión de la consignataria y el flete sobre el importe, más sellos y tasas. El resultado, dividido por los kilos, es el precio neto por kilo o precio de tranquera. La liquidación de la consignataria muestra cada concepto discriminado.`,
  },
  {
    question: '¿Conviene comparar el precio de tranquera entre consignatarias?',
    answer:
      'Sí. Dos consignatarias pueden anunciar un precio de mercado similar y dejar un precio de tranquera distinto según la comisión que cobren, el desbaste que apliquen y los gastos que trasladen. Comparar el neto en mano —y no solo el valor por kilo anunciado— es lo que permite dimensionar la operación completa. Los valores de referencia de esta página ayudan a estimarlo, pero cada firma fija sus condiciones y las detalla en la liquidación.',
  },
]

export const metadata: Metadata = {
  title: `Precio de tranquera vs precio de mercado: el neto real (${lastUpdate})`,
  description:
    `El precio de tranquera es el valor neto que recibe el productor por su hacienda, tras descontar desbaste, comisión, flete y gastos; el precio de mercado o de pizarra es el valor bruto de referencia. Cómo se pasa de uno al otro, con el novillo a $${fmt(novillo)}/kg como referencia.`,
  keywords: [
    'precio de tranquera',
    'precio de tranquera vs pizarra',
    'precio de tranquera vs precio de mercado',
    'cuánto cobra el productor por el novillo',
    'precio neto venta hacienda',
    'qué es el precio de tranquera',
    'precio de pizarra ganado',
    'gastos de comercialización hacienda',
    'precio neto por kilo vivo',
    'cómo calcular el precio de tranquera',
  ],
  openGraph: {
    title: 'Precio de tranquera vs precio de mercado: el neto real que cobra el productor',
    description:
      'El precio de tranquera es el neto que recibe el productor tras desbaste, comisión, flete y gastos; el de pizarra es el bruto de referencia. Cómo se pasa de uno al otro.',
    url: PAGE_URL,
    type: 'article',
    images: ['https://www.consignatarias.com.ar/og.png'],
  },
  alternates: {
    canonical: PAGE_URL,
  },
}

export default function PrecioDeTranqueraPage() {
  return (
    <>
      <SectionBreadcrumbSchema
        section="precio-de-tranquera"
        sectionName="Precio de tranquera"
      />
      <DefinedTermSetSchema
        name="Precio de tranquera — definiciones"
        description="Definiciones citables de precio de tranquera, precio de pizarra, precio de mercado, precio neto y gastos de comercialización en la venta de hacienda en Argentina."
        url={PAGE_URL}
        terms={TERMINOS}
      />
      <FAQPageSchema items={FAQ} />
      <SpeakableSchema
        url={PAGE_URL}
        headline="Precio de tranquera vs precio de mercado: qué cobra el productor"
        cssSelectors={['h1', '.speakable-content']}
      />
      <TechArticleSchema
        name="Precio de tranquera vs precio de mercado en la venta de hacienda"
        description="El precio de tranquera es el neto que recibe el productor una vez descontados desbaste, comisión, flete y gastos; el precio de pizarra o de mercado es el valor bruto de referencia. Cómo se pasa del bruto al neto."
        url={PAGE_URL}
        proficiencyLevel="Beginner"
        dateModified={lastUpdate}
        citations={[
          { name: 'Mercado Agroganadero (INMAG/MAG)', url: 'https://www.mercadoagroganadero.com.ar' },
        ]}
      />

      <article className="px-4 pt-4 pb-8 max-w-3xl mx-auto text-zinc-300 text-sm leading-relaxed">
        {/* Breadcrumb terminal */}
        <nav className="text-xxs font-terminal uppercase tracking-wider text-zinc-500 mb-3">
          <Link href="/precio-de-tranquera" className="hover:text-accent transition-colors">
            Precio de tranquera
          </Link>
        </nav>

        {/* Title */}
        <h1 className="text-zinc-100 text-2xl font-medium mb-3">
          Precio de tranquera vs precio de mercado
        </h1>

        {/* Answer-first: primera oración autocontenida y citable */}
        <p className="speakable-content text-zinc-200 text-base mb-4">
          El <strong>precio de tranquera</strong> es el valor neto que efectivamente recibe el
          productor por su hacienda, una vez descontados el <strong>desbaste</strong>, la{' '}
          <strong>comisión</strong>, el <strong>flete</strong> y los gastos, a diferencia del{' '}
          <strong>precio de mercado o de pizarra</strong>, que es el valor bruto de referencia por
          kilo vivo. Hoy ({lastUpdate}) el novillo se referencia en{' '}
          <strong>${fmt(novillo)}/kg vivo</strong> como precio de referencia del mercado
          (INMAG/MAG), no fijado por esta página.
        </p>

        <p className="mb-6">
          Dicho de otro modo: la pizarra dice cuánto vale el kilo en la plaza, pero lo que llega « a
          la tranquera » es siempre menos, porque entre el remate y el bolsillo del productor se
          interponen la merma comercial y los gastos de comercialización. Entender esa distancia es
          una decisión de venta central: dos operaciones con el mismo precio de mercado pueden dejar
          un neto distinto según los descuentos aplicados.
        </p>

        {/* H2 — comparativa */}
        <h2 className="text-zinc-100 text-lg font-medium mb-3">
          Precio de tranquera vs precio de pizarra/mercado
        </h2>
        <p className="mb-4">
          La diferencia no es de opinión sino de qué incluye cada valor. La pizarra es un promedio
          bruto de referencia; la tranquera es el neto individual de esa operación:
        </p>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-data border border-terminal-border">
            <thead>
              <tr>
                <th className="text-left px-3 py-2 border-b border-terminal-border">Concepto</th>
                <th className="text-left px-3 py-2 border-b border-terminal-border">
                  Precio de pizarra/mercado
                </th>
                <th className="text-left px-3 py-2 border-b border-terminal-border">
                  Precio de tranquera
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-terminal-border/60 align-top">
                <td className="px-3 py-2 text-zinc-200 font-medium">Qué mide</td>
                <td className="px-3 py-2 text-zinc-400">
                  Valor bruto por kilo vivo en la plaza
                </td>
                <td className="px-3 py-2 text-zinc-400">
                  Neto en mano del productor por esa hacienda
                </td>
              </tr>
              <tr className="border-b border-terminal-border/60 align-top">
                <td className="px-3 py-2 text-zinc-200 font-medium">Desbaste</td>
                <td className="px-3 py-2 text-zinc-400">No lo incluye</td>
                <td className="px-3 py-2 text-zinc-400">Ya descontado del peso</td>
              </tr>
              <tr className="border-b border-terminal-border/60 align-top">
                <td className="px-3 py-2 text-zinc-200 font-medium">Comisión</td>
                <td className="px-3 py-2 text-zinc-400">No la incluye</td>
                <td className="px-3 py-2 text-zinc-400">Ya restada (3%–5% + IVA típico)</td>
              </tr>
              <tr className="border-b border-terminal-border/60 align-top">
                <td className="px-3 py-2 text-zinc-200 font-medium">Flete</td>
                <td className="px-3 py-2 text-zinc-400">No lo incluye</td>
                <td className="px-3 py-2 text-zinc-400">Ya restado (según distancia)</td>
              </tr>
              <tr className="border-b border-terminal-border/60 align-top">
                <td className="px-3 py-2 text-zinc-200 font-medium">Sellos y tasas</td>
                <td className="px-3 py-2 text-zinc-400">No los incluye</td>
                <td className="px-3 py-2 text-zinc-400">Ya restados según jurisdicción</td>
              </tr>
              <tr className="align-top">
                <td className="px-3 py-2 text-zinc-200 font-medium">Uso</td>
                <td className="px-3 py-2 text-zinc-400">Orientar y comparar la plaza</td>
                <td className="px-3 py-2 text-zinc-400">
                  Decidir la venta y comparar consignatarias
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* H2 — del mercado a la tranquera */}
        <h2 className="text-zinc-100 text-lg font-medium mb-3">
          Del precio de mercado al precio de tranquera: los descuentos
        </h2>
        <p className="mb-4">
          El camino del bruto al neto atraviesa cuatro conceptos, en este orden:
        </p>
        <ul className="mb-6 space-y-2 list-disc pl-5 text-zinc-400">
          <li>
            <span className="text-zinc-200">Desbaste:</span> la merma comercial que se aplica al
            peso vivo por el ayuno y el viaje. Reduce los kilos sobre los que se cobra, antes que
            nada.
          </li>
          <li>
            <span className="text-zinc-200">Comisión de la consignataria:</span> un porcentaje sobre
            el importe de venta —habitualmente del 3% al 5% más IVA— por intermediar y liquidar la
            operación.
          </li>
          <li>
            <span className="text-zinc-200">Flete:</span> el traslado de la hacienda al remate o al
            comprador, que varía según la distancia y la cantidad de animales.
          </li>
          <li>
            <span className="text-zinc-200">Sellos, tasas e IVA:</span> el impuesto de sellos y las
            tasas provinciales según jurisdicción, más el tratamiento del IVA según la condición del
            productor.
          </li>
        </ul>
        <p className="mb-6">
          Cada uno de estos conceptos figura discriminado en la liquidación de hacienda: leerla es la
          forma de verificar cómo se pasó del precio de mercado al precio de tranquera en una
          operación concreta.
        </p>

        {/* H2 — cómo estimar */}
        <h2 className="text-zinc-100 text-lg font-medium mb-3">
          Cómo estimar el precio de tranquera
        </h2>
        <p className="mb-4">
          A modo de ejemplo ilustrativo se puede partir del valor de referencia del novillo —hoy{' '}
          <strong>${fmt(novillo)}/kg vivo</strong> ({lastUpdate}, INMAG/MAG)— y aplicar los
          descuentos, sabiendo que cada consignataria fija sus condiciones:
        </p>
        <ul className="mb-6 space-y-2 list-disc pl-5 text-zinc-400">
          <li>
            <span className="text-zinc-200">Valor bruto:</span> ${fmt(novillo)}/kg vivo como punto de
            partida de la plaza.
          </li>
          <li>
            <span className="text-zinc-200">Menos desbaste:</span> una merma sobre el peso comercial
            reduce los kilos efectivamente pagados.
          </li>
          <li>
            <span className="text-zinc-200">Menos comisión:</span> un 3%–5% + IVA sobre el importe de
            venta.
          </li>
          <li>
            <span className="text-zinc-200">Menos flete, sellos e IVA:</span> el traslado y los
            conceptos impositivos según la operación.
          </li>
          <li>
            <span className="text-zinc-200">Resultado:</span> el neto dividido por los kilos es el
            precio de tranquera por kilo, siempre inferior a los ${fmt(novillo)}/kg de la pizarra.
          </li>
        </ul>
        <p className="mb-6 text-zinc-400">
          Los porcentajes exactos dependen del desbaste acordado, de la comisión de la firma y de la
          distancia del flete; por eso el resultado es una estimación y no una cotización. La cifra
          firme surge de la liquidación de cada operación.
        </p>

        {/* FAQ */}
        <h2 className="text-zinc-100 text-lg font-medium mb-3">Preguntas frecuentes</h2>
        <dl className="space-y-4 mb-8">
          {FAQ.map((item) => (
            <div key={item.question} className="border-l-2 border-terminal-border pl-3">
              <dt className="text-accent font-medium text-base mb-1">{item.question}</dt>
              <dd className="text-zinc-400">{item.answer}</dd>
            </div>
          ))}
        </dl>

        {/* Enlazado interno denso a páginas hermanas */}
        <div className="border border-terminal-border bg-terminal-panel/40 px-panel py-3 space-y-2">
          <p className="text-xxs font-terminal uppercase tracking-wider text-zinc-500">
            Seguir por acá
          </p>
          <p className="text-data text-zinc-300 flex flex-wrap gap-x-3 gap-y-1">
            <Link href="/desbaste-de-la-hacienda" className="text-accent hover:text-accent-bright transition-colors">
              Desbaste de la hacienda →
            </Link>
            <Link href="/cuanto-cobra-de-comision-una-consignataria" className="text-accent hover:text-accent-bright transition-colors">
              Comisión de la consignataria →
            </Link>
            <Link href="/cuanto-cuesta-el-flete-de-hacienda" className="text-accent hover:text-accent-bright transition-colors">
              Flete de hacienda →
            </Link>
            <Link href="/como-leer-una-liquidacion-de-hacienda" className="text-accent hover:text-accent-bright transition-colors">
              Cómo leer una liquidación →
            </Link>
          </p>
          <p className="text-data text-zinc-300 pt-1">
            <Link href="/precio-del-novillo-en-pie" className="text-accent hover:text-accent-bright transition-colors">
              Precio del novillo en pie →
            </Link>{' '}
            ·{' '}
            <Link href="/indices" className="text-accent hover:text-accent-bright transition-colors">
              Índices del mercado →
            </Link>{' '}
            ·{' '}
            <Link href="/mercado/arrendamiento" className="text-accent hover:text-accent-bright transition-colors">
              Índice de arrendamiento →
            </Link>{' '}
            ·{' '}
            <Link href="/vender-hacienda-guia" className="text-accent hover:text-accent-bright transition-colors">
              Guía para vender hacienda →
            </Link>
          </p>
        </div>

        {/* Footer — sello de frescura obligatorio */}
        <footer className="mt-6 pt-4 border-t border-terminal-border text-xxs text-zinc-500">
          <p>
            Los precios, comisiones y gastos son referencias del mercado (INMAG/MAG); cada
            consignataria fija sus valores y los detalla en la liquidación. Esta página no fija
            precios ni tarifas.
          </p>
          <p className="mt-1">Actualizado: {lastUpdate} · Memola Medios S.A.S.</p>
        </footer>
      </article>
    </>
  )
}
