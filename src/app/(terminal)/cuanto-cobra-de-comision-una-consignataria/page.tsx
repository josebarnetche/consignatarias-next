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
const PAGE_URL = `${BASE_URL}/cuanto-cobra-de-comision-una-consignataria`

// Números vivos — interpolados en build; el JSON lo actualiza el scraper 14:00 ART.
const cats = marketPrices.categories as Record<string, { current: number }>
const lastUpdate = marketPrices.lastUpdate
const fmt = (n: number) => n.toLocaleString('es-AR')
const price = (key: string) => Math.round(cats[key].current)

const novillo = price('novillos')

// Lote testigo para ilustrar comisión y gastos: 50 novillos de 450 kg.
const cabezasTipo = 50
const pesoTipo = 450
const valorLoteTipo = novillo * pesoTipo * cabezasTipo // $/kg × kg × cabezas
const comisionVentaPct = 5 // referencia habitual sobre el vendedor (%), no fijada por esta página
const comisionCompraPct = 3 // referencia habitual sobre el comprador (%), no fijada por esta página
const comisionVentaTipo = Math.round((valorLoteTipo * comisionVentaPct) / 100)
const comisionCompraTipo = Math.round((valorLoteTipo * comisionCompraPct) / 100)

// TERMINOS — alimenta DefinedTermSetSchema (entidades citables con @id estable).
const TERMINOS = [
  {
    name: 'Comisión de consignación',
    description:
      'Porcentaje que cobra la consignataria por comercializar la hacienda de un tercero: recibe los animales en consignación, los vende en remate o de forma particular y descuenta su comisión del importe de la operación. Es la retribución del servicio de intermediación entre vendedor y comprador.',
    url: PAGE_URL,
  },
  {
    name: 'Comisión de compra',
    description:
      'Porcentaje que abona el comprador a la consignataria por la hacienda que adquiere. En muchas plazas convive con la comisión de venta: ambas partes remuneran a la firma que organizó la operación. Su valor lo fija cada consignataria, no esta página.',
    url: PAGE_URL,
  },
  {
    name: 'Comisión de venta',
    description:
      'Porcentaje que paga el vendedor sobre el importe de la hacienda comercializada. Se descuenta en la liquidación junto con el IVA y los gastos. Es el concepto principal del costo de vender por consignación y ronda habitualmente el 3% al 5% más IVA.',
    url: `${BASE_URL}/como-leer-una-liquidacion-de-hacienda`,
  },
  {
    name: 'Gastos de comercialización',
    description:
      'Costos que se suman a la comisión y se descuentan de la liquidación: IVA, gastos de venta (guía de traslado, DT-e, sanidad), sellado, tasas y, si corresponde, flete. Varían según la operación y la jurisdicción; la consignataria los discrimina en la liquidación.',
    url: `${BASE_URL}/como-vender-hacienda`,
  },
  {
    name: 'Martillero / consignatario',
    description:
      'Persona o firma matriculada que recibe la hacienda en consignación, la comercializa —por remate o venta particular—, representa al vendedor y emite la liquidación. Cobra una comisión por su servicio. Consignatario y martillero suelen ser la misma figura en la venta de hacienda.',
    url: `${BASE_URL}/que-es-una-consignataria`,
  },
]

// FAQ — answer-first, interpola números vivos. Mismo array en schema y en el <dl>.
const FAQ = [
  {
    question: '¿Cuánto cobra de comisión una consignataria?',
    answer: `Una consignataria de hacienda cobra habitualmente una comisión en torno al 3% al 5% del importe de la operación más IVA, y su valor lo fija cada firma —no lo determina esta página. Sobre un lote testigo de ${cabezasTipo} novillos de ${pesoTipo} kg al precio de referencia de hoy ($${fmt(novillo)}/kg vivo, ${lastUpdate}), el lote vale unos $${fmt(valorLoteTipo)} y una comisión de venta del ${comisionVentaPct}% equivale a cerca de $${fmt(comisionVentaTipo)}. Es un ejemplo orientativo con precio de referencia del mercado (INMAG/MAG), no una cotización.`,
  },
  {
    question: '¿La comisión la paga el comprador o el vendedor?',
    answer:
      'La comisión la paga principalmente el vendedor: la consignataria la descuenta del importe de la venta en la liquidación. En muchas plazas el comprador también abona una comisión de compra sobre la hacienda que adquiere. Quién paga qué y en qué porcentaje se pacta con la consignataria antes de la operación; conviene acordarlo por escrito para que no haya sorpresas en la liquidación.',
  },
  {
    question: '¿Se puede negociar la comisión?',
    answer:
      'Sí. La comisión no es una tarifa fija: cada consignataria establece la suya y suele haber margen de negociación según el volumen de hacienda, la categoría, la relación comercial y la modalidad de venta. Conviene pedir el porcentaje por escrito antes de consignar y comparar entre firmas; el porcentaje más bajo no siempre implica el mejor resultado neto si el servicio o el precio de venta son inferiores.',
  },
  {
    question: '¿Qué incluye la comisión?',
    answer:
      'La comisión remunera el servicio de comercialización: recibir la hacienda en consignación, ofrecerla al mercado, conducir la venta o el remate, cobrar al comprador y liquidar al vendedor. No incluye los gastos de comercialización —IVA, guía y DT-e, sanidad, sellado, tasas y flete—, que se descuentan aparte y se detallan discriminados en la liquidación. Por eso el costo total de vender es la comisión más esos gastos.',
  },
]

export const metadata: Metadata = {
  title: `Cuánto cobra de comisión una consignataria de hacienda (${lastUpdate.slice(0, 4)})`,
  description: `La comisión de una consignataria de hacienda se ubica habitualmente en torno al 3% al 5% del importe de la operación más IVA, y la fija cada firma —no esta página. Comisión de venta vs compra, gastos de comercialización y ejemplo sobre un lote al precio de referencia (novillo $${fmt(novillo)}/kg vivo, ${lastUpdate}).`,
  keywords: [
    'cuanto cobra de comision una consignataria de hacienda',
    'cuanto cobra una consignataria',
    'comision consignataria hacienda',
    'cuanto cobra el martillero',
    'porcentaje comision venta ganado',
    'comision de compra y venta de hacienda',
    'gastos de comercializacion de hacienda',
    'que incluye la comision de una consignataria',
    'quien paga la comision de la consignataria',
    'se puede negociar la comision de la consignataria',
  ],
  openGraph: {
    title: 'Cuánto cobra de comisión una consignataria de hacienda',
    description: `La comisión ronda habitualmente el 3% al 5% del importe de la operación más IVA, y la fija cada firma. Venta vs compra, gastos y ejemplo sobre un lote al precio de referencia (${lastUpdate}).`,
    url: PAGE_URL,
    type: 'article',
    images: [{ url: '/og-mercado.png', width: 1200, height: 630 }],
  },
  alternates: {
    canonical: PAGE_URL,
  },
}

export default function CuantoCobraDeComisionUnaConsignatariaPage() {
  return (
    <>
      <SectionBreadcrumbSchema
        section="cuanto-cobra-de-comision-una-consignataria"
        sectionName="Comisión"
      />
      <DefinedTermSetSchema
        name="Glosario de la comisión de una consignataria"
        description="Términos del costo de comercializar hacienda por consignación: comisión de consignación, comisión de compra, comisión de venta, gastos de comercialización y martillero/consignatario."
        url={PAGE_URL}
        terms={TERMINOS}
      />
      <FAQPageSchema items={FAQ} />
      <SpeakableSchema
        url={PAGE_URL}
        headline="Cuánto cobra de comisión una consignataria de hacienda"
      />
      <TechArticleSchema
        name="Cuánto cobra de comisión una consignataria de hacienda"
        description="Rangos habituales de la comisión de venta y de compra de una consignataria de hacienda, gastos de comercialización y ejemplo sobre un lote testigo, con precio de referencia del mercado (INMAG/MAG)."
        url={PAGE_URL}
        datePublished="2024-01-01"
        dateModified={lastUpdate}
        citations={[
          {
            name: 'Mercado Agroganadero de Cañuelas (MAG) — precios de referencia',
            url: 'https://www.mercadoagroganadero.com.ar',
          },
        ]}
      />

      <article className="px-4 pt-4 pb-8 max-w-3xl mx-auto text-zinc-300 text-sm leading-relaxed">
        <nav className="text-xxs font-terminal uppercase tracking-wider text-zinc-500 mb-3">
          <Link href="/consignatarias" className="hover:text-accent transition-colors">
            Consignatarias
          </Link>{' '}
          / Comisión
        </nav>

        <h1 className="text-zinc-100 text-2xl font-medium mb-3">
          Cuánto cobra de comisión una consignataria de hacienda
        </h1>

        {/* Answer-first: primera oración autocontenida y citable */}
        <p className="speakable-content text-zinc-200 text-base mb-4">
          La <strong>comisión de una consignataria de hacienda</strong> se ubica habitualmente{' '}
          <strong>en torno al 3% al 5% del importe de la operación</strong> más IVA, y la fija cada
          firma —es un porcentaje de <strong>referencia del mercado</strong>, no fijado por esta
          página.
        </p>

        <p className="mb-4">
          Ese porcentaje se aplica sobre el valor de la hacienda comercializada, que se forma en{' '}
          <strong>pesos por kilo vivo</strong>. Hoy ({lastUpdate}) el novillo cotiza a{' '}
          <strong>${fmt(novillo)}/kg vivo</strong> como precio de referencia del mercado
          (INMAG/MAG), no fijado por esta página: sobre ese valor se calcula tanto el importe de la
          operación como la comisión y los gastos que se descuentan en la liquidación.
        </p>

        <h2 className="text-zinc-200 text-lg font-medium mb-2">
          Comisión de venta vs comisión de compra
        </h2>
        <p className="mb-4">
          La <strong>comisión de venta</strong> la paga el vendedor: la consignataria la descuenta
          del importe de la venta cuando emite la{' '}
          <Link
            href="/como-leer-una-liquidacion-de-hacienda"
            className="text-accent hover:text-accent-bright transition-colors"
          >
            liquidación
          </Link>
          . La <strong>comisión de compra</strong> la abona el comprador sobre la hacienda que
          adquiere. En muchas plazas ambas conviven: las dos partes remuneran a la firma que
          organizó la operación. Quién paga qué y en qué porcentaje se pacta antes de la venta;
          conviene acordarlo por escrito.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          Rangos habituales del mercado
        </h2>
        <p className="mb-2">
          Los porcentajes de abajo son <strong>referencias orientativas del mercado</strong>, no una
          tarifa: cada consignataria fija sus valores y los discrimina en la liquidación.
        </p>
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-data border border-terminal-border">
            <thead>
              <tr className="bg-terminal-panel/60 text-zinc-400 text-xxs uppercase tracking-wider">
                <th className="text-left px-3 py-2 border-b border-terminal-border">Concepto</th>
                <th className="text-left px-3 py-2 border-b border-terminal-border">
                  Quién lo paga
                </th>
                <th className="text-left px-3 py-2 border-b border-terminal-border">
                  Sobre qué se aplica
                </th>
                <th className="text-right px-3 py-2 border-b border-terminal-border">
                  Referencia habitual
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-terminal-border/60 align-top">
                <td className="px-3 py-2 text-zinc-200 font-medium">Comisión de venta</td>
                <td className="px-3 py-2 text-zinc-400">Vendedor</td>
                <td className="px-3 py-2 text-zinc-400">Importe de la venta</td>
                <td className="px-3 py-2 text-right text-zinc-300">3%–5% + IVA</td>
              </tr>
              <tr className="border-b border-terminal-border/60 align-top">
                <td className="px-3 py-2 text-zinc-200 font-medium">Comisión de compra</td>
                <td className="px-3 py-2 text-zinc-400">Comprador (según plaza)</td>
                <td className="px-3 py-2 text-zinc-400">Importe de la compra</td>
                <td className="px-3 py-2 text-right text-zinc-300">1%–3% + IVA</td>
              </tr>
              <tr className="border-b border-terminal-border/60 align-top">
                <td className="px-3 py-2 text-zinc-200 font-medium">Gastos de venta</td>
                <td className="px-3 py-2 text-zinc-400">Vendedor</td>
                <td className="px-3 py-2 text-zinc-400">Guía, DT-e, sanidad</td>
                <td className="px-3 py-2 text-right text-zinc-300">Variable</td>
              </tr>
              <tr className="border-b border-terminal-border/60 align-top">
                <td className="px-3 py-2 text-zinc-200 font-medium">Sellado y tasas</td>
                <td className="px-3 py-2 text-zinc-400">Según jurisdicción</td>
                <td className="px-3 py-2 text-zinc-400">Importe de la operación</td>
                <td className="px-3 py-2 text-right text-zinc-300">Variable</td>
              </tr>
              <tr className="align-top">
                <td className="px-3 py-2 text-zinc-200 font-medium">Flete</td>
                <td className="px-3 py-2 text-zinc-400">A convenir</td>
                <td className="px-3 py-2 text-zinc-400">Traslado de hacienda</td>
                <td className="px-3 py-2 text-right text-zinc-300">Según distancia</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 className="text-zinc-200 text-lg font-medium mb-2">
          Comisión + gastos: el costo total de comercializar
        </h2>
        <p className="mb-4">
          La comisión es solo una parte del costo de vender por consignación. Al porcentaje se suman
          los <strong>gastos de comercialización</strong>: IVA, gastos de venta (guía de traslado,{' '}
          <Link href="/que-es-el-dte" className="text-accent hover:text-accent-bright transition-colors">
            DT-e
          </Link>
          , sanidad), sellado, tasas y, si corresponde, flete. El{' '}
          <strong>costo total de comercializar</strong> es entonces la comisión más esos gastos, y
          todo debe figurar discriminado en la liquidación. Conviene mirar el{' '}
          <strong>neto en mano</strong> —lo que efectivamente se acredita— y no solo el porcentaje
          de comisión: una firma con comisión algo mayor puede dejar un neto superior si logra un
          mejor precio de venta.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">Ejemplo sobre un lote</h2>
        <p className="mb-2">
          Un lote testigo de <strong>{cabezasTipo} novillos de {pesoTipo} kg</strong> al precio de
          referencia de hoy (${fmt(novillo)}/kg vivo, {lastUpdate}) vale unos{' '}
          <strong>${fmt(valorLoteTipo)}</strong> ({cabezasTipo} × {pesoTipo} kg × ${fmt(novillo)}).
          Sobre ese importe:
        </p>
        <ul className="mb-2 space-y-1 list-none">
          <li className="border-l-2 border-terminal-border pl-3">
            <span className="text-zinc-200 font-medium">
              Comisión de venta {comisionVentaPct}%
            </span>{' '}
            <span className="text-zinc-400">≈ ${fmt(comisionVentaTipo)} (la paga el vendedor)</span>
          </li>
          <li className="border-l-2 border-terminal-border pl-3">
            <span className="text-zinc-200 font-medium">
              Comisión de compra {comisionCompraPct}%
            </span>{' '}
            <span className="text-zinc-400">
              ≈ ${fmt(comisionCompraTipo)} (la paga el comprador, según plaza)
            </span>
          </li>
        </ul>
        <p className="text-xxs text-zinc-500 mb-4">
          Ejemplo orientativo: a esas comisiones hay que sumarles IVA y los gastos de
          comercialización, y restarlos del importe para obtener el neto en mano. Precio de
          referencia del mercado (INMAG/MAG), no fijado por esta página.
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
            <Link href="/como-elegir-consignataria" className="text-accent hover:text-accent-bright transition-colors">
              Cómo elegir consignataria →
            </Link>
            <Link href="/que-es-una-consignataria" className="text-accent hover:text-accent-bright transition-colors">
              Qué es una consignataria →
            </Link>
            <Link href="/como-leer-una-liquidacion-de-hacienda" className="text-accent hover:text-accent-bright transition-colors">
              Cómo leer una liquidación →
            </Link>
            <Link href="/como-vender-hacienda" className="text-accent hover:text-accent-bright transition-colors">
              Cómo vender hacienda →
            </Link>
            <Link href="/como-funciona-un-remate-ganadero" className="text-accent hover:text-accent-bright transition-colors">
              Cómo funciona un remate →
            </Link>
          </p>
          <p className="text-data text-zinc-300 pt-1">
            <Link href="/vender-hacienda-guia" className="text-accent hover:text-accent-bright transition-colors">
              Guía para vender hacienda →
            </Link>{' '}
            ·{' '}
            <Link href="/consignatarias" className="text-accent hover:text-accent-bright transition-colors">
              Directorio de consignatarias →
            </Link>
          </p>
        </div>

        <footer className="mt-6 pt-4 border-t border-terminal-border text-xxs text-zinc-500">
          <p>
            Los porcentajes de comisión y los gastos son referencias del mercado; cada consignataria
            fija sus valores y los detalla en la liquidación. Esta página no fija precios ni tarifas.
          </p>
          <p className="mt-1">Actualizado: {lastUpdate} · Memola Medios S.A.S.</p>
        </footer>
      </article>
    </>
  )
}
