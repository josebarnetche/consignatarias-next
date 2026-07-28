import { Metadata } from 'next'
import Link from 'next/link'
import {
  SectionBreadcrumbSchema,
  DefinedTermSetSchema,
  HowToSchema,
  FAQPageSchema,
  SpeakableSchema,
} from '@/components/seo/JsonLd'
import marketPrices from '@/lib/data/market-prices.json'
import { INMAG_DATE } from '@/lib/inmag'

export const revalidate = 86400 // rebuild diario vía Vercel

const BASE_URL = 'https://www.consignatarias.com.ar'
const PAGE_URL = `${BASE_URL}/como-funciona-un-remate-ganadero`

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
const comisionPct = 5 // referencia habitual sobre el vendedor (%), no fijada por esta página
const comisionTipo = Math.round((valorLoteTipo * comisionPct) / 100)

// PASOS — alimenta HowToSchema + el <ol> visible (fuente única).
const PASOS = [
  {
    name: 'Inscripción del comprador',
    text: 'Antes de pujar, el comprador se registra con la consignataria o martillero: presenta CUIT, condición de IVA y forma de pago. En el remate físico se retira una paleta o número; en el televisado se habilita el usuario en la plataforma (ROSGAN, Plaza Rural, etc.). Sin inscripción no se puede ofertar.',
    url: `${BASE_URL}/como-elegir-consignataria`,
  },
  {
    name: 'Recorrido de los lotes',
    text: 'El comprador recorre los corrales (remate físico) o mira el video y la ficha de cada lote (televisado): cantidad de cabezas, categoría, peso promedio, sanidad, procedencia y RENSPA de origen. Es el momento de evaluar la hacienda antes de que salga a pista.',
    url: `${BASE_URL}/categorias-de-hacienda`,
  },
  {
    name: 'La puja',
    text: 'El martillero abre cada lote con un precio base por kilo vivo (o por cabeza) y los interesados ofertan hacia arriba. La puja avanza en incrementos hasta que no hay más ofertas. El precio se cierra en pesos por kilo vivo, la unidad de referencia del mercado.',
    url: `${BASE_URL}/precios/hacienda-en-pie`,
  },
  {
    name: 'Adjudicación',
    text: 'El martillero baja el martillo al mejor postor: ese comprador se adjudica el lote al precio de la última oferta. La adjudicación cierra la operación de compraventa entre el vendedor (representado por la consignataria) y el comprador.',
  },
  {
    name: 'Pesaje',
    text: 'La hacienda adjudicada pasa por la balanza para determinar el peso final sobre el que se factura. En el remate físico el pesaje suele ser en el predio; en el televisado se pacta el peso de origen o de entrega según las condiciones del lote. El importe total es peso final × precio por kilo.',
    url: `${BASE_URL}/cuanto-pesa-un-novillo`,
  },
  {
    name: 'Liquidación',
    text: 'La consignataria emite la liquidación: al vendedor le acredita el importe de la venta menos la comisión, el IVA y los gastos de remate; al comprador le factura la hacienda más su comisión si corresponde. El pago se cursa en los plazos pactados y la hacienda se traslada con su DT-e.',
    url: `${BASE_URL}/dte`,
  },
]

// TERMINOS — alimenta DefinedTermSetSchema (entidades citables con @id estable).
const TERMINOS = [
  {
    name: 'Remate de hacienda',
    description:
      'Venta pública de ganado por el sistema de pujas: la consignataria ofrece los lotes en pista o pantalla y el mejor postor se adjudica la hacienda. Es el mecanismo tradicional de formación de precio en la comercialización de hacienda en pie en Argentina.',
    url: PAGE_URL,
  },
  {
    name: 'Martillero / consignatario',
    description:
      'Persona o firma matriculada que organiza el remate, representa al vendedor, conduce la puja y adjudica los lotes. Cobra una comisión por su servicio y emite la liquidación de la operación. Consignatario y martillero suelen ser la misma figura en la venta de hacienda.',
    url: `${BASE_URL}/como-elegir-consignataria`,
  },
  {
    name: 'Puja',
    description:
      'Ofrecimiento creciente de precio que hacen los compradores sobre un lote. El martillero abre con un precio base y las ofertas suben hasta que no aparecen más; la última oferta define el precio de adjudicación.',
    url: PAGE_URL,
  },
  {
    name: 'Lote',
    description:
      'Conjunto homogéneo de animales que se remata como una unidad: misma categoría, peso promedio y procedencia similares. El precio se cierra por lote, en pesos por kilo vivo o por cabeza.',
    url: `${BASE_URL}/categorias-de-hacienda`,
  },
  {
    name: 'Comisión',
    description:
      'Porcentaje que cobra la consignataria sobre el precio de venta por organizar el remate y comercializar la hacienda. Se calcula sobre el importe de la operación y se descuenta en la liquidación; su valor lo fija cada firma, no esta página.',
    url: PAGE_URL,
  },
  {
    name: 'Gastos de remate',
    description:
      'Costos que se descuentan de la liquidación además de la comisión: IVA, gastos de venta (guía, DT-e, sanidad), sellado, tasas y, si corresponde, flete. Varían según la operación y la jurisdicción.',
    url: `${BASE_URL}/como-vender-hacienda`,
  },
  {
    name: 'Remate físico',
    description:
      'Modalidad presencial: la hacienda se concentra en un predio o feria, los compradores la recorren y la puja se hace a viva voz en la pista, con paleta o número. El animal se ve en vivo antes de ofertar.',
    url: PAGE_URL,
  },
  {
    name: 'Remate televisado',
    description:
      'Modalidad a distancia: los lotes se muestran por video y ficha desde el campo de origen y la puja se hace por pantalla o teléfono. Evita el traslado previo de la hacienda y amplía el universo de compradores. ROSGAN y Plaza Rural son ejemplos.',
    url: `${BASE_URL}/que-es-el-rosgan`,
  },
  {
    name: 'ROSGAN',
    description:
      'Mercado Ganadero de Rosario: pantalla de remates televisados de hacienda de la Bolsa de Comercio de Rosario. Es una de las referencias del remate televisado en Argentina, con jornadas periódicas y precios publicados por categoría.',
    url: `${BASE_URL}/que-es-el-rosgan`,
  },
]

// FAQ — answer-first, interpola números vivos. Mismo array en schema y en el <dl>.
const FAQ = [
  {
    question: '¿Cuánto cobra de comisión una consignataria en un remate?',
    answer: `La comisión de una consignataria en un remate de hacienda ronda habitualmente el 3% al 5% del precio de venta más IVA, y la fija cada firma —no la determina esta página. Sobre un lote testigo de ${cabezasTipo} novillos de ${pesoTipo} kg al precio de referencia de hoy ($${fmt(novillo)}/kg vivo, ${INMAG_DATE}), el lote vale unos $${fmt(valorLoteTipo)} y una comisión del ${comisionPct}% equivale a cerca de $${fmt(comisionTipo)}. Es un ejemplo orientativo con precio de referencia del mercado (INMAG/MAG), no una cotización.`,
  },
  {
    question: '¿Qué gastos tiene un remate de hacienda además de la comisión?',
    answer:
      'Además de la comisión, un remate descuenta de la liquidación el IVA, los gastos de venta (guía de traslado, DT-e, sanidad), el sellado y las tasas que correspondan y, según el caso, el flete de la hacienda. Los conceptos y montos varían por operación y jurisdicción; la consignataria los detalla en la liquidación. Desconfiá de cargos sin respaldo: cada concepto debe figurar discriminado.',
  },
  {
    question: '¿Cuál es la diferencia entre remate físico y remate televisado?',
    answer:
      'En el remate físico la hacienda se concentra en un predio, los compradores la ven en vivo y la puja es a viva voz en la pista. En el remate televisado los lotes se muestran por video desde el campo de origen y la puja se hace por pantalla o teléfono, sin trasladar los animales antes de la venta. El televisado (por ejemplo ROSGAN) reduce estrés y flete y amplía el universo de compradores; el físico permite revisar el animal en persona.',
  },
  {
    question: '¿Quién paga la comisión en un remate, el comprador o el vendedor?',
    answer:
      'La comisión del remate la paga principalmente el vendedor: la consignataria la descuenta de la liquidación de venta. En muchas plazas el comprador también abona una comisión sobre su compra. Quién paga qué y en qué porcentaje se pacta con la consignataria antes del remate; conviene acordarlo por escrito para que no haya sorpresas en la liquidación.',
  },
]

export const metadata: Metadata = {
  title: `Cómo funciona un remate de hacienda: pujas, comisión y gastos (${lastUpdate.slice(0, 4)})`,
  description: `Un remate de hacienda es la venta pública por pujas donde la consignataria ofrece los lotes y el mejor postor compra, cobrándose comisión sobre el precio. Pasos, comisión (3–5% habitual) y gastos, con precio de referencia por kilo vivo (novillo $${fmt(novillo)}/kg, ${lastUpdate}).`,
  keywords: [
    'como funciona un remate de hacienda ganadero',
    'como funciona un remate ganadero',
    'remate de hacienda',
    'comision consignataria remate',
    'gastos de remate ganadero',
    'quien paga la comision en un remate',
    'remate fisico vs televisado',
    'que es una puja en un remate',
    'remate de ganado por pantalla',
    'rosgan remate televisado',
  ],
  openGraph: {
    title: 'Cómo funciona un remate de hacienda: pujas, comisión y gastos',
    description: `Venta pública por pujas: la consignataria ofrece los lotes y el mejor postor compra, con comisión sobre el precio. Pasos, gastos y precio de referencia (${lastUpdate}).`,
    url: PAGE_URL,
    type: 'article',
    images: [{ url: '/og-mercado.png', width: 1200, height: 630 }],
  },
  alternates: {
    canonical: PAGE_URL,
  },
}

export default function ComoFuncionaUnRemateGanaderoPage() {
  return (
    <>
      <SectionBreadcrumbSchema section="remates" sectionName="Remates" />
      <DefinedTermSetSchema
        name="Glosario del remate de hacienda"
        description="Términos del remate de hacienda argentino: remate, martillero/consignatario, puja, lote, comisión, gastos de remate, remate físico, remate televisado y ROSGAN."
        url={PAGE_URL}
        terms={TERMINOS}
      />
      <HowToSchema
        name="Cómo funciona un remate de hacienda ganadero, paso a paso"
        description="Del registro del comprador a la liquidación: los seis pasos de un remate de hacienda en Argentina, en modalidad física o televisada."
        steps={PASOS}
      />
      <FAQPageSchema items={FAQ} />
      <SpeakableSchema
        url={PAGE_URL}
        headline="Cómo funciona un remate de hacienda ganadero: pujas, comisión y gastos"
      />

      <article className="px-4 pt-4 pb-8 max-w-3xl mx-auto text-zinc-300 text-sm leading-relaxed">
        <nav className="text-xxs font-terminal uppercase tracking-wider text-zinc-500 mb-3">
          <Link href="/remates" className="hover:text-accent transition-colors">
            Remates
          </Link>{' '}
          / Cómo funciona un remate
        </nav>

        <h1 className="text-zinc-100 text-2xl font-medium mb-3">
          Cómo funciona un remate de hacienda ganadero
        </h1>

        {/* Answer-first: primera oración autocontenida y citable */}
        <p className="speakable-content text-zinc-200 text-base mb-4">
          Un remate de hacienda es la <strong>venta pública por pujas</strong> en la que la
          consignataria ofrece los lotes de ganado y el <strong>mejor postor</strong> se los queda,
          cobrándose una <strong>comisión sobre el precio de venta</strong> —habitualmente del 3% al
          5% más IVA, según la firma.
        </p>

        <p className="mb-4">
          El precio se forma en la pista o en la pantalla: el martillero abre cada lote con un valor
          base por <strong>kilo vivo</strong> y los compradores ofertan hacia arriba hasta que no
          hay más pujas. El animal se comercializa así en pesos por kilo, la unidad de referencia
          del mercado. Hoy ({INMAG_DATE}) el novillo cotiza a{' '}
          <strong>${fmt(novillo)}/kg vivo</strong> como precio de referencia del mercado
          (INMAG/MAG), no fijado por esta página.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          Los seis pasos de un remate, del registro a la liquidación
        </h2>
        <ol className="mb-4 space-y-3 list-none">
          {PASOS.map((p, i) => (
            <li key={p.name} className="border-l-2 border-terminal-border pl-3">
              <span className="text-accent text-xxs font-terminal uppercase tracking-wider">
                Paso {i + 1}
              </span>
              <p className="text-zinc-200 font-medium">
                {p.url ? (
                  <Link
                    href={p.url.replace(BASE_URL, '')}
                    className="text-accent hover:text-accent-bright transition-colors"
                  >
                    {p.name}
                  </Link>
                ) : (
                  p.name
                )}
              </p>
              <p className="text-zinc-400">{p.text}</p>
            </li>
          ))}
        </ol>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          Comisión y gastos: qué se descuenta de la liquidación
        </h2>
        <p className="mb-2">
          La <strong>comisión</strong> es lo que cobra la consignataria por organizar el remate y
          comercializar la hacienda; se calcula sobre el importe de venta y ronda el 3% al 5% más
          IVA, un valor que fija cada firma. A la comisión se suman los <strong>gastos de
          remate</strong>: IVA, gastos de venta (guía, DT-e, sanidad), sellado, tasas y, si
          corresponde, flete. Todo se detalla en la liquidación.
        </p>
        <div className="overflow-x-auto mb-2">
          <table className="w-full text-data border border-terminal-border">
            <thead>
              <tr className="bg-terminal-panel/60 text-zinc-400 text-xxs uppercase tracking-wider">
                <th className="text-left px-3 py-2 border-b border-terminal-border">Concepto</th>
                <th className="text-left px-3 py-2 border-b border-terminal-border">Quién lo paga</th>
                <th className="text-right px-3 py-2 border-b border-terminal-border">
                  Referencia habitual
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-terminal-border/60 align-top">
                <td className="px-3 py-2 text-zinc-200 font-medium">Comisión de venta</td>
                <td className="px-3 py-2 text-zinc-400">Vendedor</td>
                <td className="px-3 py-2 text-right text-zinc-300">3%–5% + IVA</td>
              </tr>
              <tr className="border-b border-terminal-border/60 align-top">
                <td className="px-3 py-2 text-zinc-200 font-medium">Comisión de compra</td>
                <td className="px-3 py-2 text-zinc-400">Comprador (según plaza)</td>
                <td className="px-3 py-2 text-right text-zinc-300">1%–3% + IVA</td>
              </tr>
              <tr className="border-b border-terminal-border/60 align-top">
                <td className="px-3 py-2 text-zinc-200 font-medium">Gastos de venta</td>
                <td className="px-3 py-2 text-zinc-400">Vendedor</td>
                <td className="px-3 py-2 text-right text-zinc-300">Guía, DT-e, sanidad</td>
              </tr>
              <tr className="border-b border-terminal-border/60 align-top">
                <td className="px-3 py-2 text-zinc-200 font-medium">Sellado y tasas</td>
                <td className="px-3 py-2 text-zinc-400">Según jurisdicción</td>
                <td className="px-3 py-2 text-right text-zinc-300">Variable</td>
              </tr>
              <tr className="align-top">
                <td className="px-3 py-2 text-zinc-200 font-medium">Flete</td>
                <td className="px-3 py-2 text-zinc-400">A convenir</td>
                <td className="px-3 py-2 text-right text-zinc-300">Según distancia</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xxs text-zinc-500 mb-4">
          Referencias orientativas, no una tarifa: cada consignataria fija sus valores y los discrimina
          en la liquidación. Sobre un lote testigo de {cabezasTipo} novillos de {pesoTipo} kg al precio
          de referencia de hoy (${fmt(novillo)}/kg vivo, {INMAG_DATE}), el lote vale unos{' '}
          ${fmt(valorLoteTipo)} y una comisión del {comisionPct}% equivale a cerca de ${fmt(comisionTipo)}.
          Precio de referencia del mercado (INMAG/MAG), no fijado por esta página.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          Remate físico y remate televisado
        </h2>
        <p className="mb-4">
          En el <strong>remate físico</strong> la hacienda se concentra en un predio o feria, los
          compradores la recorren y la puja es a viva voz en la pista. En el{' '}
          <strong>remate televisado</strong> los lotes se muestran por video desde el campo de
          origen y la puja se hace por pantalla o teléfono, sin trasladar los animales antes de la
          venta —el caso de{' '}
          <Link href="/que-es-el-rosgan" className="text-accent hover:text-accent-bright transition-colors">
            ROSGAN
          </Link>{' '}
          y otras pantallas. El televisado reduce estrés y flete y suma compradores a distancia; el
          físico permite ver el animal en persona antes de ofertar.
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
            <Link href="/como-vender-hacienda" className="text-accent hover:text-accent-bright transition-colors">
              Cómo vender hacienda →
            </Link>
            <Link href="/como-elegir-consignataria" className="text-accent hover:text-accent-bright transition-colors">
              Cómo elegir consignataria →
            </Link>
            <Link href="/que-es-el-rosgan" className="text-accent hover:text-accent-bright transition-colors">
              Qué es el ROSGAN →
            </Link>
            <Link href="/consignatarias" className="text-accent hover:text-accent-bright transition-colors">
              Directorio de consignatarias →
            </Link>
            <Link href="/remates" className="text-accent hover:text-accent-bright transition-colors">
              Calendario de remates →
            </Link>
          </p>
          <p className="text-data text-zinc-300 pt-1">
            <Link href="/precios/hacienda-en-pie" className="text-accent hover:text-accent-bright transition-colors">
              Precio de la hacienda en pie →
            </Link>{' '}
            ·{' '}
            <Link href="/categorias-de-hacienda" className="text-accent hover:text-accent-bright transition-colors">
              Categorías de hacienda →
            </Link>{' '}
            ·{' '}
            <Link href="/dte" className="text-accent hover:text-accent-bright transition-colors">
              Qué es el DT-e →
            </Link>
          </p>
        </div>

        <footer className="mt-6 pt-4 border-t border-terminal-border text-xxs text-zinc-500">
          <p>
            Las comisiones y gastos son referencias del mercado; cada consignataria fija sus valores
            y los detalla en la liquidación. Esta página no fija precios ni tarifas.
          </p>
          <p className="mt-1">Actualizado: {lastUpdate} · Memola Medios S.A.S.</p>
        </footer>
      </article>
    </>
  )
}
