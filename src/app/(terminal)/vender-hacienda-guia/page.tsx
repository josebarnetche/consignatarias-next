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
const PAGE_URL = `${BASE_URL}/vender-hacienda-guia`

/* ------------------------------------------------------------------ */
/*  Número vivo — derivado de market-prices.json (nunca hardcodear).   */
/*  El precio se piso a diario con el scraper 14:00 ART → rebuild.     */
/* ------------------------------------------------------------------ */
const cats = marketPrices.categories as Record<string, { current: number }>
const lastUpdate = marketPrices.lastUpdate
const fmt = (n: number) => n.toLocaleString('es-AR')
const novillo = Math.round(cats.novillos.current)
const vaca = Math.round(cats.vacas.current)
const ternero = Math.round(cats.terneros.current)

/* ------------------------------------------------------------------ */
/*  Términos definidos — fuente única para DefinedTermSet y glosario.   */
/*  Glosario citable del circuito de venta de hacienda; @id estable.    */
/* ------------------------------------------------------------------ */
const TERMINOS = [
  {
    name: 'Canal de venta',
    description:
      'Vía por la que el productor comercializa su hacienda: remate (feria física o pantalla), venta directa a frigorífico o invernador, o consignación a través de una consignataria. Cada canal tiene distinta transparencia de precio, velocidad de cobro y costo de comercialización.',
    url: `${PAGE_URL}#canal-de-venta`,
  },
  {
    name: 'Liquidación',
    description:
      'Documento que emite la consignataria al productor tras la venta, donde se detalla el precio obtenido, el peso, los descuentos por desbaste y los gastos de comercialización (comisión, fletes, sanidad, sellos, IVA). Es la rendición de cuentas de la operación: del bruto vendido al neto que cobra el productor.',
    url: `${PAGE_URL}#liquidacion`,
  },
  {
    name: 'Desbaste',
    description:
      'Descuento porcentual que se aplica al peso de la hacienda para compensar el contenido gástrico y la pérdida de peso por el ayuno y el transporte. Suele ubicarse en ~5% a 8% del peso vivo (puede superar el 10% en traslados largos), según el estado del animal y la distancia al destino; incide directamente sobre el precio de tranquera.',
    url: `${PAGE_URL}#desbaste`,
  },
  {
    name: 'Comisión de consignación',
    description:
      'Porcentaje sobre el precio de venta que cobra la consignataria por intermediar la operación. En el mercado ronda el 3% al 5% más IVA, según la firma y el canal. Es de referencia del mercado: cada consignataria fija su valor y lo detalla en la liquidación.',
    url: `${PAGE_URL}#comision-de-consignacion`,
  },
  {
    name: 'Precio de tranquera',
    description:
      'Precio neto que efectivamente percibe el productor por su hacienda, ya descontados el desbaste y todos los gastos de comercialización. Es el número que importa para comparar canales: no el precio de pizarra, sino lo que queda en la tranquera del campo.',
    url: `${PAGE_URL}#precio-de-tranquera`,
  },
  {
    name: 'Tropa',
    description:
      'Conjunto de animales de una misma especie y categoría que se mueven o comercializan juntos bajo una misma documentación. En la venta define el lote, el peso total y el destino sanitario; ordena tanto el remate como la venta directa a frigorífico.',
    url: `${PAGE_URL}#tropa`,
  },
  {
    name: 'Guía de hacienda',
    description:
      'Documento que ampara la propiedad y el traslado de la hacienda entre establecimientos o hacia el remate y el frigorífico. Emitida por la autoridad provincial, acredita la legítima tenencia del ganado; sin guía la hacienda no puede circular ni venderse dentro del circuito legal.',
    url: `${PAGE_URL}#guia-de-hacienda`,
  },
  {
    name: 'DT-e',
    description:
      'Documento de Tránsito Electrónico animal que emite SENASA para trasladar hacienda. Requiere RENSPA vigente en origen y destino y es la pieza sanitaria que habilita el movimiento del ganado hacia el remate, otro campo o el frigorífico.',
    url: `${PAGE_URL}#dt-e`,
  },
  {
    name: 'Gastos de comercialización',
    description:
      'Conjunto de descuentos que separan el bruto vendido del neto que cobra el productor: comisión de la consignataria, fletes, gastos de sanidad y guía, impuesto de sellos e IVA. Todos figuran, línea por línea, en la liquidación.',
    url: `${PAGE_URL}#gastos-de-comercializacion`,
  },
]

/* ------------------------------------------------------------------ */
/*  FAQ — answer-first, interpola números vivos.                       */
/*  Mismo array para FAQPageSchema y el <dl> visible.                  */
/* ------------------------------------------------------------------ */
const FAQ = [
  {
    question: '¿Cuánto cuesta vender un novillo por consignación?',
    answer:
      `El costo central es la comisión de la consignataria, de referencia del mercado, que suele ubicarse entre el 3% y el 5% más IVA sobre el precio de venta; a eso se suman flete, gastos de sanidad y guía, e impuesto de sellos. Sobre un novillo de referencia a $${fmt(novillo)}/kg vivo (${lastUpdate}), la comisión es el descuento más visible, pero el peso final tras el desbaste y los demás gastos también inciden en el precio de tranquera. Cada firma fija su comisión y la detalla en la liquidación; es precio de referencia del mercado (INMAG/MAG), no fijado por esta página.`,
  },
  {
    question: '¿Qué me descuentan de la liquidación?',
    answer:
      'La liquidación descuenta, sobre el bruto vendido, cinco conceptos: el desbaste sobre el peso, la comisión de la consignataria, los fletes, los gastos de sanidad y guía, y el impuesto de sellos, además del IVA que corresponda. La resta de todos esos gastos de comercialización sobre el precio bruto arroja el precio de tranquera, que es el neto que percibe el productor.',
  },
  {
    question: '¿Cuál es el canal de venta más conveniente?',
    answer:
      'No hay un canal universalmente más conveniente: depende de la categoría, el volumen y la urgencia de cobro del productor. El remate ofrece transparencia de precio por puja pública y comisión conocida; la venta directa a frigorífico suele ser más rápida pero con menos referencia de precio; la consignación combina intermediación profesional y liquidación detallada. Lo que corresponde comparar entre canales no es el precio de pizarra sino el precio de tranquera neto de cada uno.',
  },
  {
    question: '¿Qué es el precio de tranquera?',
    answer:
      `El precio de tranquera es el valor neto que efectivamente percibe el productor por su hacienda, ya descontados el desbaste sobre el peso y todos los gastos de comercialización (comisión, fletes, sanidad, guía, sellos, IVA). Sobre un novillo de referencia a $${fmt(novillo)}/kg vivo (${lastUpdate}), el precio de tranquera es siempre inferior al precio de pizarra: es el número que conviene usar para comparar canales de venta. Es precio de referencia del mercado (INMAG/MAG), no fijado por esta página.`,
  },
]

export const metadata: Metadata = {
  title: `Cómo vender hacienda: guía del productor ganadero (novillo $${fmt(novillo)}/kg)`,
  description:
    `Guía completa para vender hacienda en Argentina: los tres canales de venta (remate, venta directa y consignación), cómo se compone el precio de tranquera, el desbaste, los gastos de comercialización y la documentación obligatoria (RENSPA, DT-e, guía, boleto de marca). Novillo de referencia a $${fmt(novillo)}/kg vivo (${lastUpdate}).`,
  keywords: [
    'cómo vender hacienda',
    'guía del productor ganadero',
    'pasos para vender ganado',
    'vender novillos consignación',
    'canales de venta de hacienda',
    'precio de tranquera',
    'gastos de comercialización hacienda',
    'cómo leer una liquidación de hacienda',
    'documentación para vender hacienda',
    'vender hacienda en remate o venta directa',
  ],
  openGraph: {
    title: 'Cómo vender hacienda: guía del productor ganadero',
    description:
      `Los tres canales de venta, la composición del precio de tranquera, el desbaste, los gastos de comercialización y la documentación obligatoria. Novillo de referencia a $${fmt(novillo)}/kg vivo (${lastUpdate}).`,
    url: PAGE_URL,
    type: 'article',
    images: ['https://www.consignatarias.com.ar/og-image.png'],
  },
  alternates: {
    canonical: PAGE_URL,
  },
}

export default function VenderHaciendaGuiaPage() {
  return (
    <>
      <SectionBreadcrumbSchema section="vender-hacienda-guia" sectionName="Vender hacienda" />
      <DefinedTermSetSchema
        name="Vender hacienda — definiciones"
        description="Definiciones citables del circuito de venta de hacienda en Argentina: canal de venta, liquidación, desbaste, comisión de consignación, precio de tranquera, tropa, guía de hacienda, DT-e y gastos de comercialización."
        url={PAGE_URL}
        terms={TERMINOS}
      />
      <FAQPageSchema items={FAQ} />
      <SpeakableSchema
        url={PAGE_URL}
        headline="Cómo vender hacienda: guía del productor ganadero"
        cssSelectors={['h1', '.speakable-content']}
      />
      <TechArticleSchema
        name="Cómo vender hacienda: guía del productor ganadero"
        description="Guía completa de la venta de hacienda en Argentina: canales de venta, composición del precio de tranquera, desbaste, gastos de comercialización y documentación obligatoria."
        url={PAGE_URL}
        proficiencyLevel="Beginner"
        dateModified={lastUpdate}
        citations={[
          { name: 'SENASA — Servicio Nacional de Sanidad y Calidad Agroalimentaria', url: 'https://www.senasa.gob.ar' },
        ]}
      />

      <article className="px-4 pt-4 pb-8 max-w-3xl mx-auto text-zinc-300 text-sm leading-relaxed">
        <nav className="text-xxs font-terminal uppercase tracking-wider text-zinc-500 mb-3">
          <Link href="/vender-hacienda-guia" className="hover:text-accent transition-colors">
            Vender hacienda
          </Link>{' '}
          / Guía del productor
        </nav>

        <h1 className="text-zinc-100 text-2xl font-medium mb-3">
          Cómo vender hacienda: guía del productor ganadero
        </h1>

        {/* Answer-first: primera oración autocontenida y citable por asistentes IA */}
        <p className="speakable-content text-zinc-200 text-base mb-4">
          Vender hacienda en Argentina es comercializar el ganado por uno de tres{' '}
          <strong>canales de venta</strong> —remate, venta directa a frigorífico o{' '}
          <strong>consignación</strong>— donde el productor obtiene un precio por{' '}
          <strong>kilo vivo</strong> al que se le descuentan el <strong>desbaste</strong> y los{' '}
          <strong>gastos de comercialización</strong> hasta llegar al{' '}
          <strong>precio de tranquera</strong> que efectivamente cobra. El novillo de referencia se
          ubica en ${fmt(novillo)}/kg vivo ({lastUpdate}) —precio de referencia del mercado
          (INMAG/MAG), no fijado por esta página.
        </p>

        <p className="mb-6">
          Esta guía ordena el circuito completo de la venta: cuáles son los tres canales y cómo se
          comparan, de qué se compone el precio que finalmente percibe el productor, y qué
          documentación resulta obligatoria para que la hacienda pueda circular y venderse dentro del
          circuito legal. Cada tramo enlaza a la página específica del tema. La vaca de referencia se
          ubica en ${fmt(vaca)}/kg y el ternero en ${fmt(ternero)}/kg vivo ({lastUpdate}); son
          valores de referencia del mercado, no cotizaciones fijadas por esta página.
        </p>

        {/* Los tres canales */}
        <h2 id="canal-de-venta" className="text-zinc-100 text-lg font-medium mb-3">
          Los tres canales de venta
        </h2>
        <p className="mb-4">
          El productor comercializa su <Link href="/que-es-una-tropa-de-hacienda" className="text-accent hover:text-accent-bright transition-colors">tropa</Link>{' '}
          por uno de tres canales, cada uno con distinta transparencia de precio, velocidad de cobro
          y costo de comercialización:
        </p>
        <ul className="mb-4 space-y-2 list-disc pl-5 text-zinc-400">
          <li>
            <span className="text-zinc-300">Remate:</span> venta pública por pujas, en feria física o
            por pantalla, donde el mejor postor se queda el lote. Ofrece la referencia de precio más
            transparente y una comisión conocida. Ver{' '}
            <Link href="/como-funciona-un-remate-ganadero" className="text-accent hover:text-accent-bright transition-colors">
              cómo funciona un remate ganadero
            </Link>.
          </li>
          <li>
            <span className="text-zinc-300">Venta directa:</span> el productor negocia el precio
            directamente con un frigorífico o invernador, sin puja pública. Suele ser más rápida en el
            cobro, con menos referencia de precio de mercado.
          </li>
          <li>
            <span className="text-zinc-300">Consignación:</span> la{' '}
            <Link href="/que-es-una-consignataria" className="text-accent hover:text-accent-bright transition-colors">
              consignataria
            </Link>{' '}
            intermedia la venta, coloca la hacienda y rinde la operación en una liquidación detallada,
            cobrando una comisión sobre el precio de venta.
          </li>
        </ul>

        <div className="overflow-x-auto mb-6">
          <table className="w-full text-data border border-terminal-border">
            <thead>
              <tr className="bg-terminal-panel/60 text-zinc-400 text-xxs uppercase tracking-wider">
                <th className="text-left px-3 py-2 border-b border-terminal-border">Canal</th>
                <th className="text-left px-3 py-2 border-b border-terminal-border">Comisión</th>
                <th className="text-left px-3 py-2 border-b border-terminal-border">Transparencia de precio</th>
                <th className="text-left px-3 py-2 border-b border-terminal-border">Velocidad de cobro</th>
              </tr>
            </thead>
            <tbody className="text-zinc-400">
              <tr className="border-b border-terminal-border/60 align-top">
                <td className="px-3 py-2 text-zinc-300">Remate</td>
                <td className="px-3 py-2">3%–5% + IVA (ref.)</td>
                <td className="px-3 py-2">Alta (puja pública)</td>
                <td className="px-3 py-2">Media</td>
              </tr>
              <tr className="border-b border-terminal-border/60 align-top">
                <td className="px-3 py-2 text-zinc-300">Venta directa</td>
                <td className="px-3 py-2">Sin comisión de terceros</td>
                <td className="px-3 py-2">Baja (precio negociado)</td>
                <td className="px-3 py-2">Alta</td>
              </tr>
              <tr className="align-top">
                <td className="px-3 py-2 text-zinc-300">Consignación</td>
                <td className="px-3 py-2">3%–5% + IVA (ref.)</td>
                <td className="px-3 py-2">Media–alta</td>
                <td className="px-3 py-2">Media</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xxs text-zinc-500 mb-6">
          Las comisiones son de referencia del mercado; cada consignataria fija su valor y lo detalla
          en la liquidación. Detalle en{' '}
          <Link href="/vender-en-remate-vs-venta-directa-vs-consignacion" className="text-accent hover:text-accent-bright transition-colors">
            remate vs. venta directa vs. consignación
          </Link>.
        </p>

        {/* Composición del precio */}
        <h2 id="precio-de-tranquera" className="text-zinc-100 text-lg font-medium mb-3">
          De qué se compone el precio que cobra el productor
        </h2>
        <p className="mb-4">
          El número de pizarra no es lo que percibe el productor. Del{' '}
          <Link href="/precio-del-novillo-en-pie" className="text-accent hover:text-accent-bright transition-colors">
            precio del novillo en pie
          </Link>{' '}
          al neto que queda en la tranquera hay una secuencia de descuentos:
        </p>
        <ul className="mb-6 space-y-2 list-disc pl-5 text-zinc-400">
          <li>
            <span className="text-zinc-300">Peso vivo:</span> el peso de la hacienda tal como sale del
            campo o llega a la balanza, base de toda la operación por{' '}
            <Link href="/rendimiento-al-gancho" className="text-accent hover:text-accent-bright transition-colors">
              kilo vivo y rendimiento al gancho
            </Link>.
          </li>
          <li>
            <span className="text-zinc-300">Desbaste:</span> descuento de ~5% a 8% (puede superar el 10% en traslados largos) sobre el peso para
            compensar el contenido gástrico y la merma por ayuno y transporte. Ver{' '}
            <Link href="/desbaste-de-la-hacienda" className="text-accent hover:text-accent-bright transition-colors">
              el desbaste de la hacienda
            </Link>.
          </li>
          <li>
            <span className="text-zinc-300">Precio:</span> el valor por kilo acordado o alcanzado en
            la puja, aplicado sobre el peso ya desbastado.
          </li>
          <li>
            <span id="gastos-de-comercializacion" className="text-zinc-300">Gastos de comercialización:</span>{' '}
            <Link href="/cuanto-cobra-de-comision-una-consignataria" className="text-accent hover:text-accent-bright transition-colors">
              comisión de la consignataria
            </Link>,{' '}
            <Link href="/cuanto-cuesta-el-flete-de-hacienda" className="text-accent hover:text-accent-bright transition-colors">
              flete de hacienda
            </Link>, sanidad, guía e impuesto de sellos, más el IVA.
          </li>
          <li>
            <span className="text-zinc-300">Precio de tranquera:</span> el neto final. Cómo leer cada
            línea en{' '}
            <Link href="/como-leer-una-liquidacion-de-hacienda" className="text-accent hover:text-accent-bright transition-colors">
              cómo leer una liquidación de hacienda
            </Link>{' '}
            y el concepto en{' '}
            <Link href="/precio-de-tranquera" className="text-accent hover:text-accent-bright transition-colors">
              precio de tranquera
            </Link>.
          </li>
        </ul>

        {/* Documentación */}
        <h2 id="guia-de-hacienda" className="text-zinc-100 text-lg font-medium mb-3">
          La documentación obligatoria
        </h2>
        <p className="mb-4">
          Para que la hacienda pueda circular y venderse dentro del circuito legal, el productor debe
          tener en regla cuatro piezas documentales:
        </p>
        <ul className="mb-6 space-y-2 list-disc pl-5 text-zinc-400">
          <li>
            <span className="text-zinc-300">RENSPA:</span> el registro que vincula al productor con su
            establecimiento; sin RENSPA vigente no se emite el tránsito. Ver{' '}
            <Link href="/que-es-el-renspa" className="text-accent hover:text-accent-bright transition-colors">
              qué es el RENSPA
            </Link>.
          </li>
          <li>
            <span id="dt-e" className="text-zinc-300">DT-e:</span> el Documento de Tránsito
            Electrónico de SENASA que habilita mover la hacienda. Ver{' '}
            <Link href="/que-es-el-dte" className="text-accent hover:text-accent-bright transition-colors">
              qué es el DT-e
            </Link>.
          </li>
          <li>
            <span className="text-zinc-300">Guía de hacienda:</span> el documento provincial que
            ampara la propiedad y el traslado del ganado. Ver{' '}
            <Link href="/que-es-la-guia-de-hacienda" className="text-accent hover:text-accent-bright transition-colors">
              qué es la guía de hacienda
            </Link>.
          </li>
          <li>
            <span className="text-zinc-300">Boleto de marca:</span> acredita la titularidad de la
            marca a fuego del ganado. Ver{' '}
            <Link href="/como-sacar-el-boleto-de-marca" className="text-accent hover:text-accent-bright transition-colors">
              cómo sacar el boleto de marca
            </Link>.
          </li>
        </ul>
        <p className="text-xxs text-zinc-500 mb-6">
          Los trámites sanitarios oficiales se realizan en senasa.gob.ar y ante la autoridad
          provincial; esta página es informativa.
        </p>

        {/* FAQ visible — refuerza el schema y da respuesta extraíble */}
        <h2 className="text-zinc-100 text-lg font-medium mb-3">Preguntas frecuentes</h2>
        <dl className="space-y-5 mb-8">
          {FAQ.map((item) => (
            <div key={item.question} className="border-l-2 border-terminal-border pl-3">
              <dt className="text-accent font-medium text-base mb-1">{item.question}</dt>
              <dd className="text-zinc-400">{item.answer}</dd>
            </div>
          ))}
        </dl>

        {/* Hub — enlazado interno denso a todo el cluster de venta */}
        <div id="liquidacion" className="border border-terminal-border bg-terminal-panel/40 px-panel py-3 space-y-2">
          <p className="text-xxs font-terminal uppercase tracking-wider text-zinc-500">
            El circuito de venta, tema por tema
          </p>
          <p className="text-zinc-400">
            <span id="comision-de-consignacion" />
            <span id="desbaste" />
            <span id="tropa" />
            Proceso y decisión:{' '}
            <Link href="/como-vender-hacienda" className="text-accent hover:text-accent-bright transition-colors">
              cómo vender hacienda
            </Link>{' · '}
            <Link href="/como-elegir-consignataria" className="text-accent hover:text-accent-bright transition-colors">
              cómo elegir consignataria
            </Link>{' · '}
            <Link href="/como-funciona-un-remate-ganadero" className="text-accent hover:text-accent-bright transition-colors">
              cómo funciona un remate ganadero
            </Link>{' · '}
            <Link href="/que-es-una-consignataria" className="text-accent hover:text-accent-bright transition-colors">
              qué es una consignataria
            </Link>{' · '}
            <Link href="/vender-en-remate-vs-venta-directa-vs-consignacion" className="text-accent hover:text-accent-bright transition-colors">
              remate vs. venta directa vs. consignación
            </Link>.
          </p>
          <p className="text-zinc-400">
            Precio y liquidación:{' '}
            <Link href="/desbaste-de-la-hacienda" className="text-accent hover:text-accent-bright transition-colors">
              desbaste de la hacienda
            </Link>{' · '}
            <Link href="/como-leer-una-liquidacion-de-hacienda" className="text-accent hover:text-accent-bright transition-colors">
              cómo leer una liquidación
            </Link>{' · '}
            <Link href="/cuanto-cobra-de-comision-una-consignataria" className="text-accent hover:text-accent-bright transition-colors">
              cuánto cobra de comisión una consignataria
            </Link>{' · '}
            <Link href="/cuanto-cuesta-el-flete-de-hacienda" className="text-accent hover:text-accent-bright transition-colors">
              cuánto cuesta el flete de hacienda
            </Link>{' · '}
            <Link href="/precio-de-tranquera" className="text-accent hover:text-accent-bright transition-colors">
              precio de tranquera
            </Link>{' · '}
            <Link href="/rendimiento-al-gancho" className="text-accent hover:text-accent-bright transition-colors">
              rendimiento al gancho
            </Link>{' · '}
            <Link href="/precio-del-novillo-en-pie" className="text-accent hover:text-accent-bright transition-colors">
              precio del novillo en pie
            </Link>.
          </p>
          <p className="text-zinc-400">
            Documentación y tenencia:{' '}
            <Link href="/que-es-la-guia-de-hacienda" className="text-accent hover:text-accent-bright transition-colors">
              qué es la guía de hacienda
            </Link>{' · '}
            <Link href="/que-es-una-tropa-de-hacienda" className="text-accent hover:text-accent-bright transition-colors">
              qué es una tropa de hacienda
            </Link>{' · '}
            <Link href="/como-sacar-el-boleto-de-marca" className="text-accent hover:text-accent-bright transition-colors">
              cómo sacar el boleto de marca
            </Link>{' · '}
            <Link href="/que-es-el-dte" className="text-accent hover:text-accent-bright transition-colors">
              qué es el DT-e
            </Link>{' · '}
            <Link href="/que-es-el-renspa" className="text-accent hover:text-accent-bright transition-colors">
              qué es el RENSPA
            </Link>.
          </p>
        </div>

        <footer className="mt-6 pt-4 border-t border-terminal-border text-xxs text-zinc-500">
          <p>
            Los precios y comisiones son de referencia del mercado; esta página no fija precios ni
            tarifas.
          </p>
          <p className="mt-1">Actualizado: {lastUpdate} · Memola Medios S.A.S.</p>
        </footer>
      </article>
    </>
  )
}
