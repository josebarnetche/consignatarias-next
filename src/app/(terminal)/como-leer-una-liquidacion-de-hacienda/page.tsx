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

export const revalidate = 86400 // rebuild diario vía Vercel

const BASE_URL = 'https://www.consignatarias.com.ar'
const PAGE_URL = `${BASE_URL}/como-leer-una-liquidacion-de-hacienda`

// Números vivos — interpolados en build; el JSON lo actualiza el scraper 14:00 ART.
const cats = marketPrices.categories as Record<string, { current: number }>
const lastUpdate = marketPrices.lastUpdate
const fmt = (n: number) => n.toLocaleString('es-AR')
const price = (key: string) => Math.round(cats[key].current)

const novillo = price('novillos')

// Lote testigo para ilustrar los renglones: 50 novillos de 450 kg.
const cabezasTipo = 50
const pesoTipo = 450
const kgTotales = pesoTipo * cabezasTipo // kg vivos del lote
const importeBruto = novillo * kgTotales // $/kg × kg
const comisionPct = 4 // referencia habitual sobre el vendedor (%), no fijada por esta página
const comisionTipo = Math.round((importeBruto * comisionPct) / 100)

// PASOS — alimenta HowToSchema + el <ol> visible (fuente única).
const PASOS = [
  {
    name: 'Verificar cabezas y kilos netos',
    text: 'El primer control es la cantidad de cabezas y el peso. La liquidación parte del peso vivo de balanza y le aplica el desbaste pactado (la merma por ayuno y transporte). La merma física por ayuno y viaje ronda el 5% al 8%, aunque el desbaste comercial que se pacta —sobre todo en venta directa— puede ser menor, del 2% al 4%. Los kilos netos son el peso vivo menos ese desbaste: sobre esos kilos, no sobre el peso de balanza, se factura la operación. Conviene cotejar cabezas y kilos con el romaneo y el remito de pesada.',
    url: `${BASE_URL}/desbaste-de-la-hacienda`,
  },
  {
    name: 'Chequear el precio por kilo vivo',
    text: 'La liquidación indica el precio acordado por kilo vivo para cada categoría. Ese valor se contrasta con la referencia de mercado del día para la categoría vendida: si el novillo se pagó por debajo o por encima del promedio, el productor lo detecta comparando contra el índice publicado. El precio lo forma el remate o la operación particular, no lo fija esta página.',
    url: `${BASE_URL}/precio-del-novillo-en-pie`,
  },
  {
    name: 'Calcular el importe bruto',
    text: 'El importe bruto de cada renglón es kilos netos por precio por kilo. La suma de todos los renglones (por categoría o por lote) da el total bruto de la venta, la cifra sobre la que se calculan la comisión y varios gastos. Es el punto de partida antes de cualquier descuento.',
  },
  {
    name: 'Restar la comisión de consignación',
    text: 'La consignataria descuenta su comisión, un porcentaje sobre el importe bruto de venta que remunera el servicio de comercialización. Ronda habitualmente el 2% al 4% más IVA (a veces 5%) y lo fija cada firma. Es el renglón más grande después del bruto y conviene verificar que el porcentaje coincida con lo pactado.',
    url: `${BASE_URL}/cuanto-cobra-de-comision-una-consignataria`,
  },
  {
    name: 'Restar los gastos de comercialización',
    text: 'A la comisión se suman los gastos de venta: guía de traslado y DT-e, flete de la hacienda, impuesto de sellos, sanidad y tasas de la jurisdicción. Cada concepto debe figurar discriminado con su importe; son cargos con respaldo, no un monto global sin detalle.',
    url: `${BASE_URL}/cuanto-cuesta-el-flete-de-hacienda`,
  },
  {
    name: 'Aplicar el IVA',
    text: 'La venta de hacienda tributa IVA. Según la condición del productor frente al impuesto (responsable inscripto o monotributista), el IVA se discrimina sobre la venta y sobre los servicios de la consignataria. En la liquidación aparece el IVA débito de la venta y el IVA de la comisión y gastos; el neto fiscal depende de esa mecánica.',
  },
  {
    name: 'Leer el neto a cobrar (precio de tranquera)',
    text: 'El último renglón es el neto a cobrar: el importe bruto menos comisión, gastos e impuestos. Dividido por los kilos vendidos da el precio de tranquera, el valor que efectivamente le queda al productor por kilo, siempre inferior al precio bruto pactado. Es el número que define la rentabilidad real de la venta.',
    url: `${BASE_URL}/precio-de-tranquera`,
  },
]

// TERMINOS — alimenta DefinedTermSetSchema (entidades citables con @id estable).
const TERMINOS = [
  {
    name: 'Liquidación de hacienda',
    description:
      'Documento que emite la consignataria tras vender la hacienda y en el que rinde cuentas al productor: detalla cabezas, kilos, precio, importe bruto y cada descuento (comisión, gastos, impuestos) hasta llegar al neto a cobrar. Es la rendición de la operación y el respaldo del pago.',
    url: PAGE_URL,
  },
  {
    name: 'Romaneo',
    description:
      'Planilla de pesada donde se registran las cabezas, el peso de balanza y la categoría de cada tropa. Es la base física de la liquidación: los kilos del romaneo, menos el desbaste, definen los kilos que se facturan.',
    url: PAGE_URL,
  },
  {
    name: 'Desbaste',
    description:
      'Descuento porcentual que se aplica al peso vivo de balanza para reflejar la merma por ayuno y transporte. La merma física ronda el 5% al 8%, aunque el desbaste comercial pactado puede ser menor —del 2% al 4%, típico en venta directa—; se pacta antes de la operación y convierte el peso bruto en kilos netos facturables.',
    url: `${BASE_URL}/desbaste-de-la-hacienda`,
  },
  {
    name: 'Importe bruto',
    description:
      'Resultado de multiplicar los kilos netos por el precio por kilo vivo. Es el valor de la venta antes de descuentos y la base sobre la que se calculan la comisión y varios gastos de comercialización.',
    url: PAGE_URL,
  },
  {
    name: 'Comisión de consignación',
    description:
      'Porcentaje sobre el importe bruto que cobra la consignataria por comercializar la hacienda. Ronda el 2% al 4% más IVA (a veces 5%), lo fija cada firma y se descuenta en la liquidación; no lo determina esta página.',
    url: `${BASE_URL}/cuanto-cobra-de-comision-una-consignataria`,
  },
  {
    name: 'Gastos de comercialización',
    description:
      'Conjunto de cargos que se descuentan además de la comisión: guía y DT-e, flete, impuesto de sellos, sanidad y tasas. Cada concepto debe aparecer discriminado con su importe en la liquidación.',
    url: `${BASE_URL}/vender-hacienda-guia`,
  },
  {
    name: 'DT-e',
    description:
      'Documento de Tránsito electrónico de SENASA que ampara el movimiento de la hacienda entre establecimientos. Su emisión genera un costo que la consignataria suele incluir entre los gastos de la liquidación.',
    url: `${BASE_URL}/que-es-el-dte`,
  },
  {
    name: 'Neto a cobrar',
    description:
      'Importe final que percibe el productor: el bruto menos comisión, gastos e impuestos. Dividido por los kilos vendidos da el precio de tranquera, el valor real por kilo que le queda al vendedor.',
    url: `${BASE_URL}/precio-de-tranquera`,
  },
]

// FAQ — answer-first, interpola números vivos. Mismo array en schema y en el <dl>.
const FAQ = [
  {
    question: '¿Qué me descuentan de la liquidación de hacienda?',
    answer: `De la liquidación de hacienda se descuentan, sobre el importe bruto de venta, la comisión de la consignataria (habitualmente 2%–4% más IVA, a veces 5%), los gastos de comercialización (guía y DT-e, flete, impuesto de sellos, sanidad y tasas) y el IVA que corresponda según la condición fiscal del productor. Lo que queda es el neto a cobrar. Sobre un lote testigo de ${cabezasTipo} novillos de ${pesoTipo} kg al precio de referencia de hoy ($${fmt(novillo)}/kg vivo, ${lastUpdate}), el bruto ronda $${fmt(importeBruto)} y una comisión del ${comisionPct}% equivale a unos $${fmt(comisionTipo)}. Es un ejemplo orientativo con precio de referencia del mercado (INMAG/MAG), no una cotización.`,
  },
  {
    question: '¿Qué es la comisión de consignación?',
    answer:
      'La comisión de consignación es el porcentaje que cobra la consignataria por comercializar la hacienda del productor. Se calcula sobre el importe bruto de venta, ronda el 2% al 4% más IVA (a veces 5%) y lo fija cada firma —no esta página. Es el descuento más grande de la liquidación después del propio bruto y conviene verificar que el porcentaje coincida con lo pactado antes de la operación.',
  },
  {
    question: '¿Qué son los gastos de comercialización?',
    answer:
      'Son los cargos que se descuentan de la liquidación además de la comisión: la guía de traslado y el DT-e de SENASA, el flete de la hacienda, el impuesto de sellos, la sanidad y las tasas de la jurisdicción. Cada concepto debe figurar discriminado con su importe; no es un monto global sin respaldo. Sus valores varían por operación y por provincia.',
  },
  {
    question: '¿Cuánto tarda el pago de la liquidación?',
    answer:
      'El plazo de pago se pacta con la consignataria antes de la venta y suele ir de contado a unos días hábiles tras la operación, según la plaza y la modalidad (remate o venta directa). La liquidación indica la fecha y la forma de acreditación. Conviene acordar el plazo por escrito para evitar diferencias entre lo hablado y lo que figura en el documento.',
  },
]

export const metadata: Metadata = {
  title: `Cómo leer una liquidación de hacienda: renglón por renglón (${lastUpdate.slice(0, 4)})`,
  description: `La liquidación de hacienda es la rendición que emite la consignataria con cabezas, kilos netos, precio, comisión, gastos e IVA hasta el neto a cobrar. Guía renglón por renglón, con lote testigo y precio de referencia (novillo $${fmt(novillo)}/kg vivo, ${lastUpdate}).`,
  keywords: [
    'como leer una liquidacion de hacienda',
    'que me descuentan al vender ganado',
    'romaneo consignataria',
    'gastos de venta de hacienda',
    'comision de consignacion',
    'liquidacion de venta de hacienda',
    'precio de tranquera',
    'desbaste de la hacienda',
    'que descuenta la consignataria',
    'neto a cobrar por vender ganado',
  ],
  openGraph: {
    title: 'Cómo leer una liquidación de hacienda: renglón por renglón',
    description: `Del bruto al neto: cabezas, kilos, comisión, gastos e IVA de la liquidación de la consignataria, con lote testigo y precio de referencia (${lastUpdate}).`,
    url: PAGE_URL,
    type: 'article',
    images: [{ url: '/og-mercado.png', width: 1200, height: 630 }],
  },
  alternates: {
    canonical: PAGE_URL,
  },
}

export default function ComoLeerUnaLiquidacionDeHaciendaPage() {
  return (
    <>
      <SectionBreadcrumbSchema
        section="como-leer-una-liquidacion-de-hacienda"
        sectionName="Liquidación"
      />
      <DefinedTermSetSchema
        name="Glosario de la liquidación de hacienda"
        description="Términos de la liquidación de venta de hacienda: liquidación, romaneo, desbaste, importe bruto, comisión de consignación, gastos de comercialización, DT-e y neto a cobrar."
        url={PAGE_URL}
        terms={TERMINOS}
      />
      <HowToSchema
        name="Cómo leer una liquidación de hacienda, renglón por renglón"
        description="Del control de cabezas y kilos netos al neto a cobrar: los siete pasos para entender qué descuenta la consignataria en la liquidación de venta de hacienda."
        steps={PASOS}
      />
      <FAQPageSchema items={FAQ} />
      <SpeakableSchema
        url={PAGE_URL}
        headline="Cómo leer una liquidación de hacienda: renglón por renglón"
      />

      <article className="px-4 pt-4 pb-8 max-w-3xl mx-auto text-zinc-300 text-sm leading-relaxed">
        <nav className="text-xxs font-terminal uppercase tracking-wider text-zinc-500 mb-3">
          <Link
            href="/como-leer-una-liquidacion-de-hacienda"
            className="hover:text-accent transition-colors"
          >
            Liquidación
          </Link>{' '}
          / Cómo leer una liquidación de hacienda
        </nav>

        <h1 className="text-zinc-100 text-2xl font-medium mb-3">
          Cómo leer una liquidación de hacienda
        </h1>

        {/* Answer-first: primera oración autocontenida y citable */}
        <p className="speakable-content text-zinc-200 text-base mb-4">
          La <strong>liquidación de hacienda</strong> es la rendición que emite la consignataria
          después de vender la hacienda del productor: detalla{' '}
          <strong>cabezas, kilos netos, precio por kilo e importe bruto</strong>, y a partir de ahí
          resta <strong>comisión, gastos de comercialización e IVA</strong> hasta llegar al{' '}
          <strong>neto a cobrar</strong>. Ese neto, dividido por los kilos vendidos, es el precio de
          tranquera —siempre menor al precio bruto pactado, hoy con el novillo en{' '}
          <strong>${fmt(novillo)}/kg vivo</strong> como precio de referencia del mercado
          (INMAG/MAG), no fijado por esta página.
        </p>

        <p className="mb-4">
          Entender la liquidación renglón por renglón le permite al productor verificar que cada
          descuento tiene respaldo y que el precio pagado se corresponde con la referencia del
          mercado. El{' '}
          <Link
            href="/desbaste-de-la-hacienda"
            className="text-accent hover:text-accent-bright transition-colors"
          >
            desbaste
          </Link>
          , la comisión y los gastos no son cargos opacos: cada uno debe figurar discriminado y
          poder cotejarse contra el romaneo, el remito de pesada y lo pactado antes de la operación.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          Los renglones de una liquidación
        </h2>
        <p className="mb-2">
          Una liquidación se lee de arriba hacia abajo: arranca en el peso de balanza y termina en el
          neto a cobrar. Estos son los renglones que aparecen en casi toda liquidación de venta de
          hacienda y qué significa cada uno.
        </p>
        <div className="overflow-x-auto mb-2">
          <table className="w-full text-data border border-terminal-border">
            <thead>
              <tr className="bg-terminal-panel/60 text-zinc-400 text-xxs uppercase tracking-wider">
                <th className="text-left px-3 py-2 border-b border-terminal-border">Renglón</th>
                <th className="text-left px-3 py-2 border-b border-terminal-border">Qué es</th>
                <th className="text-left px-3 py-2 border-b border-terminal-border">Signo</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-terminal-border/60 align-top">
                <td className="px-3 py-2 text-zinc-200 font-medium">Cabezas y peso vivo</td>
                <td className="px-3 py-2 text-zinc-400">
                  Cantidad de animales y kilos de balanza por categoría, según el romaneo.
                </td>
                <td className="px-3 py-2 text-zinc-500">base</td>
              </tr>
              <tr className="border-b border-terminal-border/60 align-top">
                <td className="px-3 py-2 text-zinc-200 font-medium">Desbaste</td>
                <td className="px-3 py-2 text-zinc-400">
                  Merma que se descuenta del peso vivo para dar los kilos netos (física ~5%–8%;
                  desbaste comercial pactado 2%–4%).
                </td>
                <td className="px-3 py-2 text-zinc-500">−</td>
              </tr>
              <tr className="border-b border-terminal-border/60 align-top">
                <td className="px-3 py-2 text-zinc-200 font-medium">Precio por kilo</td>
                <td className="px-3 py-2 text-zinc-400">
                  Valor acordado por kilo vivo para cada categoría, a contrastar con la referencia.
                </td>
                <td className="px-3 py-2 text-zinc-500">×</td>
              </tr>
              <tr className="border-b border-terminal-border/60 align-top">
                <td className="px-3 py-2 text-zinc-200 font-medium">Importe bruto</td>
                <td className="px-3 py-2 text-zinc-400">
                  Kilos netos por precio por kilo: el total de la venta antes de descuentos.
                </td>
                <td className="px-3 py-2 text-emerald-500/80">+</td>
              </tr>
              <tr className="border-b border-terminal-border/60 align-top">
                <td className="px-3 py-2 text-zinc-200 font-medium">Comisión de consignación</td>
                <td className="px-3 py-2 text-zinc-400">
                  Porcentaje de la consignataria sobre el bruto (2%–4% + IVA, a veces 5%), lo fija
                  cada firma.
                </td>
                <td className="px-3 py-2 text-zinc-500">−</td>
              </tr>
              <tr className="border-b border-terminal-border/60 align-top">
                <td className="px-3 py-2 text-zinc-200 font-medium">Guía / boleto de marca</td>
                <td className="px-3 py-2 text-zinc-400">
                  Documento provincial o municipal que acredita la propiedad de la hacienda para su
                  traslado.
                </td>
                <td className="px-3 py-2 text-zinc-500">−</td>
              </tr>
              <tr className="border-b border-terminal-border/60 align-top">
                <td className="px-3 py-2 text-zinc-200 font-medium">DT-e</td>
                <td className="px-3 py-2 text-zinc-400">
                  Documento de Tránsito electrónico de SENASA (sanitario) que ampara el movimiento
                  entre establecimientos.
                </td>
                <td className="px-3 py-2 text-zinc-500">−</td>
              </tr>
              <tr className="border-b border-terminal-border/60 align-top">
                <td className="px-3 py-2 text-zinc-200 font-medium">Flete</td>
                <td className="px-3 py-2 text-zinc-400">
                  Transporte de la hacienda; varía por distancia y por cantidad de cabezas.
                </td>
                <td className="px-3 py-2 text-zinc-500">−</td>
              </tr>
              <tr className="border-b border-terminal-border/60 align-top">
                <td className="px-3 py-2 text-zinc-200 font-medium">Impuesto de sellos</td>
                <td className="px-3 py-2 text-zinc-400">
                  Tributo provincial sobre la instrumentación de la operación, según jurisdicción.
                </td>
                <td className="px-3 py-2 text-zinc-500">−</td>
              </tr>
              <tr className="border-b border-terminal-border/60 align-top">
                <td className="px-3 py-2 text-zinc-200 font-medium">IVA</td>
                <td className="px-3 py-2 text-zinc-400">
                  Débito sobre la venta y crédito sobre comisión y gastos, según condición fiscal.
                </td>
                <td className="px-3 py-2 text-zinc-500">±</td>
              </tr>
              <tr className="align-top">
                <td className="px-3 py-2 text-zinc-200 font-medium">Neto a cobrar</td>
                <td className="px-3 py-2 text-zinc-400">
                  El bruto menos todos los descuentos: lo que percibe el productor.
                </td>
                <td className="px-3 py-2 text-emerald-500/80">=</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xxs text-zinc-500 mb-4">
          Los renglones y su orden pueden variar según la consignataria y la plaza; los signos son
          orientativos. Esta página no fija precios ni tarifas.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          Leer la liquidación en siete pasos
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
          Comisión y gastos de comercialización
        </h2>
        <p className="mb-4">
          La <strong>comisión de consignación</strong> es el descuento mayor después del bruto: un
          porcentaje sobre el importe de venta —habitualmente del 2% al 4% más IVA, a veces 5%— que
          remunera a
          la consignataria por comercializar la hacienda, y que{' '}
          <Link
            href="/cuanto-cobra-de-comision-una-consignataria"
            className="text-accent hover:text-accent-bright transition-colors"
          >
            fija cada firma
          </Link>
          . A ella se suman los <strong>gastos de comercialización</strong>: la{' '}
          <Link
            href="/vender-hacienda-guia"
            className="text-accent hover:text-accent-bright transition-colors"
          >
            guía de traslado
          </Link>{' '}
          y el{' '}
          <Link
            href="/que-es-el-dte"
            className="text-accent hover:text-accent-bright transition-colors"
          >
            DT-e
          </Link>
          , el{' '}
          <Link
            href="/cuanto-cuesta-el-flete-de-hacienda"
            className="text-accent hover:text-accent-bright transition-colors"
          >
            flete
          </Link>
          , el{' '}
          <Link
            href="/impuesto-de-sellos-arrendamiento"
            className="text-accent hover:text-accent-bright transition-colors"
          >
            impuesto de sellos
          </Link>{' '}
          y las tasas de la jurisdicción. Cada concepto debe aparecer discriminado con su importe:
          son cargos con respaldo, no un monto global. Sobre el mismo lote testigo, con un bruto de{' '}
          $
          {fmt(importeBruto)} (
          {cabezasTipo} novillos × {pesoTipo} kg × ${fmt(novillo)}/kg vivo, {lastUpdate}), una
          comisión del {comisionPct}% equivale a unos ${fmt(comisionTipo)} antes de IVA y gastos.
          Precio de referencia del mercado (INMAG/MAG), no fijado por esta página.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          Del bruto al neto: el precio de tranquera
        </h2>
        <p className="mb-4">
          El <strong>neto a cobrar</strong> es el importe bruto menos comisión, gastos e impuestos.
          Dividido por los kilos vendidos da el{' '}
          <Link
            href="/precio-de-tranquera"
            className="text-accent hover:text-accent-bright transition-colors"
          >
            precio de tranquera
          </Link>
          : el valor real que le queda al productor por kilo, siempre inferior al precio bruto que se
          acordó en la venta. Comparar el precio de tranquera contra el{' '}
          <Link
            href="/precio-del-novillo-en-pie"
            className="text-accent hover:text-accent-bright transition-colors"
          >
            precio de referencia
          </Link>{' '}
          del día es lo que revela la rentabilidad efectiva de la operación —y ayuda a decidir con
          qué consignataria trabajar en la próxima venta.
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
              href="/como-elegir-consignataria"
              className="text-accent hover:text-accent-bright transition-colors"
            >
              Cómo elegir consignataria →
            </Link>
            <Link
              href="/que-es-una-consignataria"
              className="text-accent hover:text-accent-bright transition-colors"
            >
              Qué es una consignataria →
            </Link>
            <Link
              href="/cuanto-cobra-de-comision-una-consignataria"
              className="text-accent hover:text-accent-bright transition-colors"
            >
              Cuánto cobra de comisión →
            </Link>
            <Link
              href="/desbaste-de-la-hacienda"
              className="text-accent hover:text-accent-bright transition-colors"
            >
              Qué es el desbaste →
            </Link>
            <Link
              href="/precio-de-tranquera"
              className="text-accent hover:text-accent-bright transition-colors"
            >
              Precio de tranquera →
            </Link>
          </p>
          <p className="text-data text-zinc-300 flex flex-wrap gap-x-3 gap-y-1 pt-1">
            <Link
              href="/cuanto-cuesta-el-flete-de-hacienda"
              className="text-accent hover:text-accent-bright transition-colors"
            >
              Cuánto cuesta el flete →
            </Link>
            <Link
              href="/impuesto-de-sellos-arrendamiento"
              className="text-accent hover:text-accent-bright transition-colors"
            >
              Impuesto de sellos →
            </Link>
            <Link
              href="/que-es-el-dte"
              className="text-accent hover:text-accent-bright transition-colors"
            >
              Qué es el DT-e →
            </Link>
            <Link
              href="/vender-hacienda-guia"
              className="text-accent hover:text-accent-bright transition-colors"
            >
              Vender hacienda con guía →
            </Link>
          </p>
        </div>

        <footer className="mt-6 pt-4 border-t border-terminal-border text-xxs text-zinc-500">
          <p>
            Los precios, comisiones y gastos citados son referencias del mercado; cada consignataria
            fija sus valores y los detalla en la liquidación. Esta página no fija precios ni tarifas.
          </p>
          <p className="mt-1">Actualizado: {lastUpdate} · Memola Medios S.A.S.</p>
        </footer>
      </article>
    </>
  )
}
