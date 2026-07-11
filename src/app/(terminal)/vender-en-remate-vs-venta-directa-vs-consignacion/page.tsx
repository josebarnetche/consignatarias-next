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
const PAGE_URL = `${BASE_URL}/vender-en-remate-vs-venta-directa-vs-consignacion`

// Número vivo — interpolado en build; el JSON lo actualiza el scraper 14:00 ART.
const cats = marketPrices.categories as Record<string, { current: number }>
const lastUpdate = marketPrices.lastUpdate
const fmt = (n: number) => n.toLocaleString('es-AR')
const price = (key: string) => Math.round(cats[key].current)

const novillo = price('novillos')

// TERMINOS — alimenta DefinedTermSetSchema (entidades citables con @id estable).
const TERMINOS = [
  {
    name: 'Remate',
    description:
      'Venta pública de hacienda por el sistema de pujas: la consignataria ofrece los lotes en pista o pantalla y el mejor postor se los adjudica. El precio se forma por competencia de compradores en el momento, en pesos por kilo vivo o por cabeza.',
    url: `${BASE_URL}/como-funciona-un-remate-ganadero`,
  },
  {
    name: 'Venta directa',
    description:
      'Operación acordada entre el productor y un comprador —frigorífico, invernador, criador u otro productor— sin puja pública. El precio se negocia entre las partes; puede haber o no un intermediario, y las condiciones de peso, sanidad y pago se pactan caso por caso.',
    url: `${BASE_URL}/como-vender-hacienda`,
  },
  {
    name: 'Consignación',
    description:
      'Modalidad en la que el productor entrega la hacienda a una consignataria para que la comercialice en su nombre, cobrando una comisión. La consignataria representa al vendedor, busca comprador —en remate o en directo— y emite la liquidación de la operación.',
    url: `${BASE_URL}/que-es-una-consignataria`,
  },
  {
    name: 'Comisión de consignación',
    description:
      'Porcentaje que cobra la consignataria sobre el precio de venta por comercializar la hacienda del productor. Se calcula sobre el importe de la operación y se descuenta en la liquidación; su valor lo fija cada firma, no esta página.',
    url: `${BASE_URL}/cuanto-cobra-de-comision-una-consignataria`,
  },
  {
    name: 'Formación de precio',
    description:
      'Mecanismo por el que se determina el valor de la hacienda. En el remate el precio surge de la puja pública; en la venta directa, de la negociación bilateral; en la consignación depende del canal que use la consignataria. La referencia es el kilo vivo del mercado.',
    url: `${BASE_URL}/precio-del-novillo-en-pie`,
  },
]

// FAQ — answer-first, interpola el número vivo. Mismo array en schema y en el <dl>.
const FAQ = [
  {
    question: '¿Qué conviene: remate, venta directa o consignación?',
    answer:
      'No hay un canal que convenga siempre: depende de la categoría de hacienda, el volumen, la urgencia de cobro y cuánta transparencia se busque en el precio. El remate suele dar el precio más transparente porque lo forma la puja pública y conviene para lotes homogéneos con varios compradores potenciales; la venta directa da control sobre la negociación y suele ser más ágil cuando ya hay un comprador de confianza; la consignación delega toda la comercialización en una firma matriculada a cambio de una comisión. Esta página informa las diferencias, no recomienda un canal ni fija precios.',
  },
  {
    question: '¿Cuál tiene menor comisión?',
    answer:
      'La venta directa entre productor y comprador puede no tener comisión de intermediario si las partes operan sin consignataria, mientras que el remate y la consignación descuentan la comisión de la firma —habitualmente del 3% al 5% más IVA sobre el vendedor, un valor que fija cada consignataria, no esta página. Menor comisión no significa mejor resultado: un remate con varios compradores puede cerrar un precio más alto que compense la comisión, y la venta directa sin intermediario traslada al productor la búsqueda de comprador y la gestión del cobro.',
  },
  {
    question: '¿Cuál da precio más transparente?',
    answer:
      'El remate suele dar la formación de precio más transparente porque el valor surge de una puja pública y observable: varios compradores ofertan y el precio de cierre queda a la vista. En la venta directa el precio se acuerda en privado entre las partes, con menos referencia externa. La consignación hereda la transparencia del canal que use la consignataria. En todos los casos conviene contrastar contra el precio de referencia del mercado —el novillo cotiza hoy a $' +
      fmt(novillo) +
      '/kg vivo (' +
      lastUpdate +
      '), precio de referencia del mercado (INMAG/MAG), no fijado por esta página.',
  },
  {
    question: '¿Cuál paga más rápido?',
    answer:
      'La velocidad de cobro depende más de las condiciones pactadas que del canal en sí: tanto en remate como en consignación el pago se cursa según los plazos que fije la consignataria en la liquidación, y en la venta directa según lo acordado con el comprador. Como referencia, la venta directa a un comprador de confianza puede acelerar el cobro cuando se pacta pago contra entrega, mientras que remate y consignación suelen liquidar en los plazos habituales de plaza. Conviene acordar el plazo por escrito antes de entregar la hacienda.',
  },
]

export const metadata: Metadata = {
  title: `Vender en remate, venta directa o consignación: comparativa (${lastUpdate.slice(0, 4)})`,
  description: `Los tres canales para vender hacienda —remate, venta directa y consignación— comparados por comisión, transparencia en la formación de precio y velocidad de cobro, con el novillo de referencia a $${fmt(novillo)}/kg vivo (${lastUpdate}).`,
  keywords: [
    'vender en remate o directo',
    'remate vs consignación',
    'mejor forma de vender hacienda',
    'canales de venta de ganado',
    'diferencia entre remate y venta directa',
    'que conviene remate o consignación',
    'como vender hacienda con menor comisión',
    'venta directa de hacienda',
    'consignación de hacienda que es',
    'formación de precio de la hacienda',
  ],
  openGraph: {
    title: 'Vender en remate, venta directa o consignación: comparativa',
    description: `Tres canales para vender hacienda comparados por comisión, transparencia y velocidad de cobro, con precio de referencia por kilo vivo (${lastUpdate}).`,
    url: PAGE_URL,
    type: 'article',
    images: [{ url: '/og-mercado.png', width: 1200, height: 630 }],
  },
  alternates: {
    canonical: PAGE_URL,
  },
}

export default function VenderEnRemateVsVentaDirectaVsConsignacionPage() {
  return (
    <>
      <SectionBreadcrumbSchema
        section="vender-en-remate-vs-venta-directa-vs-consignacion"
        sectionName="Canales de venta"
      />
      <DefinedTermSetSchema
        name="Glosario de los canales de venta de hacienda"
        description="Términos de la comercialización de hacienda: remate, venta directa, consignación, comisión de consignación y formación de precio."
        url={PAGE_URL}
        terms={TERMINOS}
      />
      <FAQPageSchema items={FAQ} />
      <SpeakableSchema
        url={PAGE_URL}
        headline="Vender en remate, venta directa o consignación: comparativa"
      />
      <TechArticleSchema
        name="Vender en remate, venta directa o consignación: comparativa de canales"
        description="Comparativa de los tres canales de venta de hacienda en Argentina —remate, venta directa y consignación— por quién fija el precio, comisión, transparencia y velocidad de cobro."
        url={PAGE_URL}
        datePublished="2024-01-01"
        dateModified={lastUpdate}
        citations={[
          { name: 'Mercado Agroganadero (INMAG)', url: 'https://www.mercadoagroganadero.com.ar' },
          { name: 'ROSGAN — Mercado Ganadero de Rosario', url: 'https://www.rosgan.com.ar' },
        ]}
      />

      <article className="px-4 pt-4 pb-8 max-w-3xl mx-auto text-zinc-300 text-sm leading-relaxed">
        <nav className="text-xxs font-terminal uppercase tracking-wider text-zinc-500 mb-3">
          <Link href="/como-vender-hacienda" className="hover:text-accent transition-colors">
            Canales de venta
          </Link>{' '}
          / Remate vs venta directa vs consignación
        </nav>

        <h1 className="text-zinc-100 text-2xl font-medium mb-3">
          Vender en remate, venta directa o consignación
        </h1>

        {/* Answer-first: primera oración autocontenida y citable */}
        <p className="speakable-content text-zinc-200 text-base mb-4">
          La hacienda puede venderse por tres canales —<strong>remate</strong>,{' '}
          <strong>venta directa</strong> y <strong>consignación</strong>— que se diferencian en{' '}
          <strong>comisión</strong>, <strong>transparencia en la formación del precio</strong> y{' '}
          <strong>velocidad de cobro</strong>: el remate forma el precio por puja pública, la venta
          directa por negociación entre partes y la consignación delega la comercialización en una
          firma matriculada a cambio de una comisión. Como referencia, el novillo cotiza hoy a{' '}
          <strong>${fmt(novillo)}/kg vivo</strong> ({lastUpdate}), precio de referencia del mercado
          (INMAG/MAG), no fijado por esta página.
        </p>

        <p className="mb-4">
          Ninguno es mejor en abstracto: la elección depende de la categoría de hacienda, el
          volumen, la urgencia de cobro y cuánta transparencia se busque en el precio. Abajo se
          comparan los tres canales concepto por concepto. Para el detalle de cada uno hay páginas
          dedicadas —{' '}
          <Link
            href="/como-funciona-un-remate-ganadero"
            className="text-accent hover:text-accent-bright transition-colors"
          >
            cómo funciona un remate
          </Link>{' '}
          y{' '}
          <Link
            href="/como-vender-hacienda"
            className="text-accent hover:text-accent-bright transition-colors"
          >
            cómo vender hacienda
          </Link>
          — y esta compara los canales entre sí.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">Remate: cómo se forma el precio</h2>
        <p className="mb-4">
          En el <strong>remate</strong> el precio surge de una <strong>puja pública</strong>: la
          consignataria ofrece cada lote y varios compradores ofertan hacia arriba hasta que no hay
          más pujas; la última oferta define el valor de adjudicación, en pesos por kilo vivo. Es la
          modalidad de <strong>formación de precio</strong> más observable, porque la competencia
          entre compradores queda a la vista y el cierre es público. Conviene para lotes homogéneos y
          bien presentados, donde varios compradores potenciales pueden hacer subir el precio. La
          consignataria cobra su comisión y descuenta los gastos de remate en la liquidación. Ver{' '}
          <Link
            href="/como-funciona-un-remate-ganadero"
            className="text-accent hover:text-accent-bright transition-colors"
          >
            cómo funciona un remate ganadero
          </Link>{' '}
          y{' '}
          <Link
            href="/que-es-el-rosgan"
            className="text-accent hover:text-accent-bright transition-colors"
          >
            qué es el ROSGAN
          </Link>{' '}
          para el remate televisado.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          Venta directa: negociación entre partes
        </h2>
        <p className="mb-4">
          En la <strong>venta directa</strong> el productor y un comprador —frigorífico, invernador,
          criador u otro productor— acuerdan la operación sin puja pública: el precio se{' '}
          <strong>negocia entre las partes</strong>, junto con las condiciones de peso, sanidad y
          pago. Puede operarse con o sin intermediario. Da <strong>control sobre la negociación</strong>{' '}
          y suele ser el camino más ágil cuando ya existe un comprador de confianza, con la
          posibilidad de pactar pago contra entrega. A cambio, el precio se forma en privado, con
          menos referencia externa que la puja: por eso conviene contrastarlo contra el{' '}
          <Link
            href="/precio-de-tranquera"
            className="text-accent hover:text-accent-bright transition-colors"
          >
            precio de tranquera
          </Link>{' '}
          y el{' '}
          <Link
            href="/precio-del-novillo-en-pie"
            className="text-accent hover:text-accent-bright transition-colors"
          >
            precio del novillo en pie
          </Link>{' '}
          del mercado antes de cerrar.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          Consignación: el rol de la consignataria
        </h2>
        <p className="mb-4">
          En la <strong>consignación</strong> el productor entrega la hacienda a una{' '}
          <Link
            href="/que-es-una-consignataria"
            className="text-accent hover:text-accent-bright transition-colors"
          >
            consignataria
          </Link>{' '}
          para que la comercialice en su nombre, a cambio de una{' '}
          <strong>comisión de consignación</strong>. La firma representa al vendedor, busca comprador
          —puede canalizarla a remate o venta directa—, gestiona la operación y emite la{' '}
          <Link
            href="/como-leer-una-liquidacion-de-hacienda"
            className="text-accent hover:text-accent-bright transition-colors"
          >
            liquidación
          </Link>
          . Delega en un tercero matriculado toda la comercialización, útil cuando el productor no
          quiere buscar comprador ni conducir la venta. La contrapartida es la comisión —habitualmente
          del 3% al 5% más IVA sobre el vendedor, que fija cada firma, no esta página. Ver{' '}
          <Link
            href="/cuanto-cobra-de-comision-una-consignataria"
            className="text-accent hover:text-accent-bright transition-colors"
          >
            cuánto cobra de comisión una consignataria
          </Link>{' '}
          y{' '}
          <Link
            href="/como-elegir-consignataria"
            className="text-accent hover:text-accent-bright transition-colors"
          >
            cómo elegir consignataria
          </Link>
          .
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">Comparativa lado a lado</h2>
        <div className="overflow-x-auto mb-2">
          <table className="w-full text-data border border-terminal-border">
            <thead>
              <tr className="bg-terminal-panel/60 text-zinc-400 text-xxs uppercase tracking-wider">
                <th className="text-left px-3 py-2 border-b border-terminal-border">Criterio</th>
                <th className="text-left px-3 py-2 border-b border-terminal-border">Remate</th>
                <th className="text-left px-3 py-2 border-b border-terminal-border">
                  Venta directa
                </th>
                <th className="text-left px-3 py-2 border-b border-terminal-border">
                  Consignación
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-terminal-border/60 align-top">
                <td className="px-3 py-2 text-zinc-200 font-medium">Quién fija el precio</td>
                <td className="px-3 py-2 text-zinc-400">La puja pública de compradores</td>
                <td className="px-3 py-2 text-zinc-400">Las partes, por negociación</td>
                <td className="px-3 py-2 text-zinc-400">
                  El canal que use la consignataria
                </td>
              </tr>
              <tr className="border-b border-terminal-border/60 align-top">
                <td className="px-3 py-2 text-zinc-200 font-medium">Comisión</td>
                <td className="px-3 py-2 text-zinc-400">3%–5% + IVA (según firma)</td>
                <td className="px-3 py-2 text-zinc-400">
                  Puede no haber si es sin intermediario
                </td>
                <td className="px-3 py-2 text-zinc-400">3%–5% + IVA (según firma)</td>
              </tr>
              <tr className="border-b border-terminal-border/60 align-top">
                <td className="px-3 py-2 text-zinc-200 font-medium">Transparencia</td>
                <td className="px-3 py-2 text-zinc-400">Alta: precio público y observable</td>
                <td className="px-3 py-2 text-zinc-400">Menor: precio acordado en privado</td>
                <td className="px-3 py-2 text-zinc-400">Hereda la del canal usado</td>
              </tr>
              <tr className="border-b border-terminal-border/60 align-top">
                <td className="px-3 py-2 text-zinc-200 font-medium">Velocidad de cobro</td>
                <td className="px-3 py-2 text-zinc-400">Plazos de liquidación de plaza</td>
                <td className="px-3 py-2 text-zinc-400">
                  Según lo pactado (puede ser contra entrega)
                </td>
                <td className="px-3 py-2 text-zinc-400">Plazos de liquidación de plaza</td>
              </tr>
              <tr className="align-top">
                <td className="px-3 py-2 text-zinc-200 font-medium">Para qué hacienda conviene</td>
                <td className="px-3 py-2 text-zinc-400">
                  Lotes homogéneos, varios compradores
                </td>
                <td className="px-3 py-2 text-zinc-400">
                  Comprador de confianza ya identificado
                </td>
                <td className="px-3 py-2 text-zinc-400">
                  Quien delega toda la comercialización
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xxs text-zinc-500 mb-4">
          Referencias orientativas del mercado, no una tarifa ni una recomendación: cada firma fija
          su comisión y sus plazos, y los discrimina en la liquidación. Precio de referencia del
          mercado (INMAG/MAG), no fijado por esta página.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">Cuándo conviene cada canal</h2>
        <ul className="mb-4 space-y-2 list-none">
          <li className="border-l-2 border-terminal-border pl-3">
            <span className="text-zinc-200 font-medium">Remate</span> — cuando el lote es homogéneo,
            está bien presentado y hay varios compradores potenciales que pueden hacer competir el
            precio, y se prioriza la transparencia de una formación de precio pública.
          </li>
          <li className="border-l-2 border-terminal-border pl-3">
            <span className="text-zinc-200 font-medium">Venta directa</span> — cuando ya existe un
            comprador de confianza, se busca control sobre la negociación y agilidad de cobro, y se
            está dispuesto a contrastar el precio contra la referencia del mercado.
          </li>
          <li className="border-l-2 border-terminal-border pl-3">
            <span className="text-zinc-200 font-medium">Consignación</span> — cuando el productor
            prefiere delegar toda la comercialización en una firma matriculada, sin buscar comprador
            ni conducir la venta, aceptando la comisión como contrapartida del servicio.
          </li>
        </ul>
        <p className="mb-4">
          En la práctica los canales no son excluyentes: una consignataria puede vender en remate o
          en directo según convenga al lote, y un mismo productor puede combinar canales por
          categoría. La guía completa está en{' '}
          <Link
            href="/vender-hacienda-guia"
            className="text-accent hover:text-accent-bright transition-colors"
          >
            la guía para vender hacienda
          </Link>
          .
        </p>

        {/* FAQ visible — mismo array que el schema */}
        <h2 className="text-zinc-100 text-lg font-medium mb-2">Preguntas frecuentes</h2>
        <dl className="mb-6 space-y-3">
          {FAQ.map((f) => (
            <div key={f.question} className="border-l-2 border-terminal-border pl-3">
              <dt className="text-zinc-200 font-medium mb-1">{f.question}</dt>
              <dd className="text-zinc-400">{f.answer}</dd>
            </div>
          ))}
        </dl>

        {/* Enlazado interno denso a páginas hermanas */}
        <div className="border border-terminal-border bg-terminal-panel/40 px-panel py-3 space-y-2">
          <p className="text-xxs font-terminal uppercase tracking-wider text-zinc-500">
            Seguir por acá
          </p>
          <p className="text-data text-zinc-300 flex flex-wrap gap-x-3 gap-y-1">
            <Link
              href="/como-funciona-un-remate-ganadero"
              className="text-accent hover:text-accent-bright transition-colors"
            >
              Cómo funciona un remate →
            </Link>
            <Link
              href="/como-vender-hacienda"
              className="text-accent hover:text-accent-bright transition-colors"
            >
              Cómo vender hacienda →
            </Link>
            <Link
              href="/que-es-una-consignataria"
              className="text-accent hover:text-accent-bright transition-colors"
            >
              Qué es una consignataria →
            </Link>
            <Link
              href="/como-elegir-consignataria"
              className="text-accent hover:text-accent-bright transition-colors"
            >
              Cómo elegir consignataria →
            </Link>
            <Link
              href="/cuanto-cobra-de-comision-una-consignataria"
              className="text-accent hover:text-accent-bright transition-colors"
            >
              Comisión de una consignataria →
            </Link>
          </p>
          <p className="text-data text-zinc-300 flex flex-wrap gap-x-3 gap-y-1 pt-1">
            <Link
              href="/como-leer-una-liquidacion-de-hacienda"
              className="text-accent hover:text-accent-bright transition-colors"
            >
              Cómo leer una liquidación →
            </Link>
            <Link
              href="/precio-de-tranquera"
              className="text-accent hover:text-accent-bright transition-colors"
            >
              Precio de tranquera →
            </Link>
            <Link
              href="/vender-hacienda-guia"
              className="text-accent hover:text-accent-bright transition-colors"
            >
              Guía para vender hacienda →
            </Link>
            <Link
              href="/que-es-el-rosgan"
              className="text-accent hover:text-accent-bright transition-colors"
            >
              Qué es el ROSGAN →
            </Link>
            <Link
              href="/mercado/canuelas"
              className="text-accent hover:text-accent-bright transition-colors"
            >
              Mercado de Cañuelas →
            </Link>
          </p>
        </div>

        <footer className="mt-6 pt-4 border-t border-terminal-border text-xxs text-zinc-500">
          <p>
            Las comisiones, plazos y precios son referencias del mercado; cada consignataria y cada
            comprador fija sus condiciones y las detalla en la liquidación. Esta página no fija
            precios ni tarifas ni recomienda un canal de venta.
          </p>
          <p className="mt-1">Actualizado: {lastUpdate} · Memola Medios S.A.S.</p>
        </footer>
      </article>
    </>
  )
}
