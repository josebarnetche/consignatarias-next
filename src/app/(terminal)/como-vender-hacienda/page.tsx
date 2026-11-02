import { Metadata } from 'next'
import Link from 'next/link'
import { GuiasVentaHacienda } from '@/components/guias/GuiasVentaHacienda'
import { OfrecerGuia } from '@/components/guias/OfrecerGuia'
import {
  SectionBreadcrumbSchema,
  DefinedTermSetSchema,
  FAQPageSchema,
  SpeakableSchema,
  HowToSchema,
} from '@/components/seo/JsonLd'
import marketPrices from '@/lib/data/market-prices.json'
import { INMAG_DATE } from '@/lib/inmag'

export const revalidate = 86400 // rebuild diario vía Vercel

const BASE_URL = 'https://www.consignatarias.com.ar'
const PAGE_URL = `${BASE_URL}/como-vender-hacienda`

/* ------------------------------------------------------------------ */
/*  Número vivo: precio de referencia del novillo, fechado con la      */
/*  fecha del INMAG. Sirve de ancla al ejemplo de comisión.            */
/* ------------------------------------------------------------------ */
const novillo = Math.round(marketPrices.categories.novillos.current)
const lastUpdate = marketPrices.lastUpdate
const fmt = (n: number) => n.toLocaleString('es-AR')

// Ejemplo de operación: novillo de 450 kg vivo a precio de mercado.
const EJEMPLO_PESO = 450
const ejemploValor = novillo * EJEMPLO_PESO
const ejemploComisionMin = Math.round(ejemploValor * 0.03)
const ejemploComisionMax = Math.round(ejemploValor * 0.05)

/* ------------------------------------------------------------------ */
/*  Términos definidos — citables por asistentes IA (patrón /glosario) */
/* ------------------------------------------------------------------ */
const TERMINOS = [
  {
    name: 'Consignación de hacienda',
    description:
      'Canal de venta en el que el productor entrega su hacienda a una consignataria habilitada, que la vende por cuenta y orden del productor —en remate o de forma particular—, garantiza la cobranza al comprador y liquida el neto. La consignataria no compra el ganado para sí: cobra una comisión sobre el valor de venta.',
    url: `${BASE_URL}/que-es-una-consignataria`,
  },
  {
    name: 'Remate feria',
    description:
      'Subasta pública de ganado en pie organizada por una consignataria, donde los compradores pujan por los lotes y el martillero adjudica al mejor postor. Puede ser presencial, televisado o por streaming. El precio lo fija la puja del mercado en el momento del remate.',
    url: `${BASE_URL}/remates`,
  },
  {
    name: 'Venta directa',
    description:
      'Operación cerrada entre el productor y el comprador final —frigorífico o invernador— sin subasta, con precio acordado de forma particular. Puede hacerse en forma privada o a través de una consignataria que intermedia la operación.',
  },
  {
    name: 'Comisión de venta',
    description:
      'Honorario que cobra la consignataria por intermediar la operación, calculado como porcentaje sobre el valor de venta de la hacienda —de referencia del mercado, habitualmente entre 3% y 5%—. Se descuenta de la liquidación al productor. Cada firma la acuerda con el productor.',
  },
  {
    name: 'Gastos de comercialización',
    description:
      'Costos que se descuentan de la liquidación además de la comisión: fletes, sanidad, guías de traslado, DT-e, impuesto de sellos e IVA cuando corresponde. Todos figuran, línea por línea, en la liquidación. El productor recibe el neto: valor de venta menos comisión menos gastos.',
    url: `${PAGE_URL}#gastos-de-comercializacion`,
  },
  // Los cinco que siguen venían de /vender-hacienda-guia (301 hacia acá desde la v1.255.1).
  {
    name: 'Liquidación',
    description:
      'Documento que emite la consignataria al productor tras la venta, donde se detalla el precio obtenido, el peso, los descuentos por desbaste y los gastos de comercialización (comisión, fletes, sanidad, sellos, IVA). Es la rendición de cuentas de la operación: del bruto vendido al neto que cobra el productor.',
    url: `${BASE_URL}/como-leer-una-liquidacion-de-hacienda`,
  },
  {
    name: 'Desbaste',
    description:
      'Descuento porcentual que se aplica al peso de la hacienda para compensar el contenido gástrico y la pérdida de peso por el ayuno y el transporte. Suele ubicarse en ~5% a 8% del peso vivo (puede superar el 10% en traslados largos), según el estado del animal y la distancia al destino; incide directamente sobre el precio de tranquera.',
    url: `${BASE_URL}/desbaste-de-la-hacienda`,
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
    url: `${BASE_URL}/que-es-una-tropa-de-hacienda`,
  },
  {
    name: 'Guía de hacienda',
    description:
      'Documento que ampara la propiedad y el traslado de la hacienda entre establecimientos o hacia el remate y el frigorífico. Emitida por la autoridad provincial, acredita la legítima tenencia del ganado; sin guía la hacienda no puede circular ni venderse dentro del circuito legal.',
    url: `${BASE_URL}/que-es-la-guia-de-hacienda`,
  },
  {
    name: 'DT-e (Documento de Tránsito electrónico)',
    description:
      'Documento sanitario electrónico de SENASA que ampara el traslado de hacienda entre establecimientos y hacia el destino de venta (remate, feria o frigorífico). Es distinto de la guía de traslado provincial —ligada al boleto de marca—, que acredita la propiedad: la DT-e es sanitaria y la emite SENASA. Es requisito para mover y vender ganado en Argentina.',
    url: `${BASE_URL}/dte`,
  },
]

/* ------------------------------------------------------------------ */
/*  HowTo — pasos para vender la hacienda, con enlaces a las páginas   */
/*  operativas del sitio.                                              */
/* ------------------------------------------------------------------ */
const HOWTO_STEPS = [
  {
    name: 'Tener el RENSPA y las DT-e al día',
    text: 'Antes de vender, el establecimiento debe tener el RENSPA vigente y las DT-e (el documento sanitario de tránsito de SENASA) en regla, además de la guía de traslado provincial que acredita la propiedad. Sin RENSPA activo y sin la documentación sanitaria, la hacienda no puede moverse ni venderse.',
    url: `${BASE_URL}/que-es-el-renspa`,
  },
  {
    name: 'Elegir el canal de venta',
    text: 'Definir el canal según la categoría, la urgencia y el apetito de riesgo: consignación (la firma vende por cuenta y orden), remate feria (subasta pública, el precio lo fija la puja) o venta directa a frigorífico o invernador (precio acordado de forma particular).',
    url: PAGE_URL,
  },
  {
    name: 'Elegir la consignataria',
    text: 'Seleccionar una consignataria habilitada por matrícula que opere la categoría y la zona, comparando trayectoria, comisión y plazos de cobro. El directorio permite filtrar por provincia y ver el historial de remates de cada firma.',
    url: `${BASE_URL}/como-elegir-consignataria`,
  },
  {
    name: 'Acordar comisión y gastos',
    text: `Acordar por escrito la comisión de venta —de referencia del mercado, habitualmente entre 3% y 5% sobre el valor de venta— y qué gastos se descuentan (fletes, sanidad, guías, sellados). Cada firma acuerda estas condiciones con el productor antes de la operación.`,
    url: `${BASE_URL}/que-es-una-consignataria`,
  },
  {
    name: 'Cobrar tras la venta',
    text: 'Una vez vendida la hacienda, la consignataria garantiza la cobranza al comprador y liquida al productor el neto: valor de venta menos comisión menos gastos. El plazo de cobro depende del canal y de lo acordado con la firma.',
    url: `${BASE_URL}/precios`,
  },
]

/* ------------------------------------------------------------------ */
/*  FAQ — preguntas reales; cada respuesta arranca con el dato.        */
/* ------------------------------------------------------------------ */
const FAQ = [
  {
    question: '¿Cuánto cobra una consignataria?',
    answer: `Una consignataria cobra una comisión de referencia del mercado de entre 3% y 5% sobre el valor de venta de la hacienda, que se descuenta de la liquidación al productor junto con los gastos de venta (fletes, sanidad, guías, sellados). Cada firma la acuerda con el productor. Ejemplo con precio actual: un novillo de ${EJEMPLO_PESO} kg vivo a $${fmt(novillo)}/kg (INMAG del ${INMAG_DATE}) vale $${fmt(ejemploValor)}; la comisión ronda entre $${fmt(ejemploComisionMin)} (3%) y $${fmt(ejemploComisionMax)} (5%).`,
  },
  {
    question: '¿Qué necesito para vender hacienda?',
    answer:
      'Para vender hacienda en Argentina necesitás el RENSPA del establecimiento vigente, las DT-e (el documento sanitario de tránsito de SENASA) que amparen el traslado, la guía de traslado provincial que acredita la propiedad, y elegir un canal de venta (consignación, remate feria o venta directa). Si vendés por consignación o remate, la consignataria habilitada organiza la operación, garantiza la cobranza y liquida el neto tras descontar comisión y gastos.',
  },
  {
    question: '¿Cuál conviene, remate o venta directa?',
    answer:
      'Depende de la categoría, la urgencia y el apetito de riesgo. En el remate feria el precio lo fija la puja del mercado en el momento —hay competencia entre compradores, pero el resultado no está garantizado de antemano—. En la venta directa a frigorífico o invernador el precio se acuerda de forma particular antes de mover la hacienda, con más previsibilidad pero sin la competencia de la subasta. La consignación cubre ambos: la firma vende por cuenta y orden del productor por el canal que más convenga.',
  },
  {
    question: '¿Qué me descuentan de la liquidación?',
    answer:
      'La liquidación descuenta, sobre el bruto vendido, cinco conceptos: el desbaste sobre el peso, la comisión de la consignataria, los fletes, los gastos de sanidad y guía, y el impuesto de sellos, además del IVA que corresponda. La resta de todos esos gastos de comercialización sobre el precio bruto arroja el precio de tranquera, que es el neto que percibe el productor.',
  },
  {
    question: '¿Qué es el precio de tranquera?',
    answer: `El precio de tranquera es el valor neto que efectivamente percibe el productor por su hacienda, ya descontados el desbaste sobre el peso y todos los gastos de comercialización (comisión, fletes, sanidad, guía, sellos, IVA). Sobre un novillo de referencia a $${fmt(novillo)}/kg vivo (${INMAG_DATE}), el precio de tranquera es siempre inferior al precio de pizarra: es el número que conviene usar para comparar canales de venta.`,
  },
]

export const metadata: Metadata = {
  // LA guía de venta: elegir el canal y el paso a paso (papeles, descuentos, cobro).
  // /vender-hacienda-guia es un 301 hacia acá desde la v1.255.1. La comparativa lado
  // a lado sigue aparte: /vender-en-remate-vs-venta-directa-vs-consignacion.
  title: 'Cómo vender hacienda: canal, papeles, gastos y cobro',
  description: `Para vender hacienda hay tres canales: consignación, remate feria o venta directa a frigorífico o invernador. Precio de referencia hoy $${fmt(novillo)}/kg vivo para el novillo (INMAG del ${INMAG_DATE}). Comisión de referencia 3-5%, desbaste, precio de tranquera, documentación necesaria y cómo elegir consignataria.`,
  keywords: [
    'cómo vender hacienda',
    'como vender hacienda',
    'cómo vender ganado',
    'como vender ganado',
    'vender hacienda argentina',
    'consignación de hacienda',
    'remate feria hacienda',
    'venta directa hacienda',
    'cuánto cobra una consignataria',
    'comisión consignataria hacienda',
    'documentación para vender hacienda',
    'vender vacas argentina',
    'pasos para vender ganado',
    'precio de tranquera',
    'gastos de comercialización hacienda',
  ],
  openGraph: {
    title: 'Cómo vender hacienda: canal, papeles, gastos y cobro',
    description: `Los tres canales para vender hacienda en Argentina, la comisión de referencia (3-5%), la documentación necesaria y cómo elegir consignataria. Precio de referencia del novillo hoy: $${fmt(novillo)}/kg vivo (INMAG del ${INMAG_DATE}).`,
    url: PAGE_URL,
    type: 'article',
    images: ['https://www.consignatarias.com.ar/og-image.png'],
  },
  alternates: {
    canonical: PAGE_URL,
  },
}

export default function ComoVenderHaciendaPage() {
  return (
    <>
      <SectionBreadcrumbSchema section="como-vender-hacienda" sectionName="Cómo vender hacienda" />
      <DefinedTermSetSchema
        name="Cómo vender hacienda — definiciones"
        description="Definiciones citables de los canales de venta de hacienda en Argentina: consignación, remate feria, venta directa, comisión, gastos de venta y DT-e."
        url={PAGE_URL}
        terms={TERMINOS}
      />
      <FAQPageSchema items={FAQ} />
      <SpeakableSchema
        url={PAGE_URL}
        headline="Cómo vender hacienda: consignación, remate feria o venta directa"
        cssSelectors={['h1', '.speakable-content']}
      />
      <HowToSchema
        name="Cómo vender tu hacienda"
        description="Pasos para vender hacienda en Argentina: documentación, elección de canal y de consignataria, acuerdo de comisión y cobranza."
        steps={HOWTO_STEPS}
      />

      <div className="max-w-3xl mx-auto px-4 py-8 text-sm leading-relaxed">
        {/* Title */}
        <h1 className="text-zinc-100 text-2xl font-medium mb-6">
          Cómo vender hacienda: por dónde, con qué papeles y cuánto te queda
        </h1>

        {/* Answer-first: respuesta extraíble por asistentes IA en la 1ª oración */}
        <p className="speakable-content text-zinc-300 text-base mb-6">
          Para vender hacienda en Argentina hay tres canales principales: por consignación a través de
          una consignataria, en un remate feria, o por venta directa a frigorífico o invernador; en los
          tres, el precio de referencia hoy ({INMAG_DATE}) es de ${fmt(novillo)}/kg vivo para el novillo
          según el INMAG.
        </p>

        <p className="text-zinc-400 mb-8">
          Cada canal cambia quién fija el precio, cuánto se descuenta de comisión y cuándo cobrás. Sobre
          una venta, la firma cobra una comisión de referencia del mercado de aproximadamente 3-5% sobre
          el valor de venta —cada firma la acuerda con el productor—. A precio actual es tangible: un
          novillo de {EJEMPLO_PESO} kg vivo a ${fmt(novillo)}/kg (INMAG del {INMAG_DATE}) vale $
          {fmt(ejemploValor)}; la comisión ronda entre ${fmt(ejemploComisionMin)} (3%) y $
          {fmt(ejemploComisionMax)} (5%), más los gastos de venta. Esta página no fija el precio ni la
          comisión: son valores de referencia del mercado.
        </p>

        {/* Comparativa de canales */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">
          Consignación vs remate feria vs venta directa
        </h2>
        <p className="text-zinc-400 mb-4">
          Los tres canales sirven para lo mismo —convertir hacienda en pesos— pero se diferencian en
          quién fija el precio, la comisión, el plazo de cobro y el riesgo que asume el productor.
        </p>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-700 text-zinc-300">
                <th className="py-2 pr-4 font-medium"></th>
                <th className="py-2 pr-4 font-medium">Consignación</th>
                <th className="py-2 pr-4 font-medium">Remate feria</th>
                <th className="py-2 pr-4 font-medium">Venta directa</th>
              </tr>
            </thead>
            <tbody className="text-zinc-400">
              <tr className="border-b border-zinc-800">
                <td className="py-2 pr-4 text-zinc-300">Quién fija el precio</td>
                <td className="py-2 pr-4">La operación que arma la firma (remate o particular)</td>
                <td className="py-2 pr-4">La puja del mercado en el momento del remate</td>
                <td className="py-2 pr-4">Acuerdo particular con el comprador</td>
              </tr>
              <tr className="border-b border-zinc-800">
                <td className="py-2 pr-4 text-zinc-300">Comisión</td>
                <td className="py-2 pr-4">3-5% de referencia sobre el valor de venta</td>
                <td className="py-2 pr-4">3-5% de referencia sobre el valor de venta</td>
                <td className="py-2 pr-4">Sin comisión si es directa; 3-5% si media una firma</td>
              </tr>
              <tr className="border-b border-zinc-800">
                <td className="py-2 pr-4 text-zinc-300">Plazo de cobro</td>
                <td className="py-2 pr-4">Tras la venta; la firma garantiza la cobranza</td>
                <td className="py-2 pr-4">Tras el remate; la firma garantiza la cobranza</td>
                <td className="py-2 pr-4">El acordado con el comprador; riesgo propio si es directa</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-zinc-300">Riesgo para el productor</td>
                <td className="py-2 pr-4">Bajo: la firma responde por la cobranza</td>
                <td className="py-2 pr-4">Precio incierto de antemano; cobranza cubierta</td>
                <td className="py-2 pr-4">Precio previsible; riesgo de cobranza si es sin intermediario</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-zinc-500 text-xs mb-6">
          Comisión y precios de referencia del mercado; cada firma acuerda las condiciones con el
          productor. Valores al {lastUpdate}.
        </p>

        {/* Qué comisión cobra */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">
          Qué comisión cobra una consignataria
        </h2>
        <p className="text-zinc-400 mb-4">
          El ingreso de la consignataria es la comisión de venta: un porcentaje sobre el valor de venta
          de la hacienda, de referencia del mercado, habitualmente entre 3% y 5%. Se descuenta de la
          liquidación al productor junto con los gastos de venta —fletes, sanidad, guías de traslado,
          DT-e, sellados e IVA cuando corresponde—. El productor recibe el neto: valor de venta menos comisión
          menos gastos. La comisión no la fija esta página: la acuerda cada firma con el productor antes
          de la operación.
        </p>

        {/* Del precio de pizarra al neto — venía de /vender-hacienda-guia */}
        <h2 id="precio-de-tranquera" className="text-zinc-200 text-lg font-medium mb-3 scroll-mt-24">
          De qué se compone el precio que cobrás
        </h2>
        <p className="text-zinc-400 mb-4">
          El número de pizarra no es lo que percibe el productor. Del{' '}
          <Link href="/precio-del-novillo-en-pie" className="text-accent hover:underline">
            precio del novillo en pie
          </Link>{' '}
          al neto que queda en la tranquera hay una secuencia de descuentos:
        </p>
        <ul className="text-zinc-400 mb-6 space-y-2 list-disc pl-5">
          <li>
            <span className="text-zinc-300">Peso vivo:</span> el peso de la hacienda tal como sale del
            campo o llega a la balanza, base de toda la operación por{' '}
            <Link href="/rendimiento-al-gancho" className="text-accent hover:underline">
              kilo vivo y rendimiento al gancho
            </Link>
            .
          </li>
          <li>
            <span className="text-zinc-300">Desbaste:</span> descuento de ~5% a 8% (puede superar el 10%
            en traslados largos) sobre el peso para compensar el contenido gástrico y la merma por ayuno y
            transporte. Ver{' '}
            <Link href="/desbaste-de-la-hacienda" className="text-accent hover:underline">
              el desbaste de la hacienda
            </Link>
            .
          </li>
          <li>
            <span className="text-zinc-300">Precio:</span> el valor por kilo acordado o alcanzado en la
            puja, aplicado sobre el peso ya desbastado.
          </li>
          <li id="gastos-de-comercializacion">
            <span className="text-zinc-300">Gastos de comercialización:</span>{' '}
            <Link href="/cuanto-cobra-de-comision-una-consignataria" className="text-accent hover:underline">
              comisión de la consignataria
            </Link>
            ,{' '}
            <Link href="/cuanto-cuesta-el-flete-de-hacienda" className="text-accent hover:underline">
              flete de hacienda
            </Link>
            , sanidad, guía e impuesto de sellos, más el IVA.
          </li>
          <li>
            <span className="text-zinc-300">Precio de tranquera:</span> el neto final. Cómo leer cada
            línea en{' '}
            <Link href="/como-leer-una-liquidacion-de-hacienda" className="text-accent hover:underline">
              cómo leer una liquidación de hacienda
            </Link>{' '}
            y el concepto en{' '}
            <Link href="/precio-de-tranquera" className="text-accent hover:underline">
              precio de tranquera
            </Link>
            .
          </li>
        </ul>

        {/* Documentación */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">Documentación necesaria</h2>
        <ul className="text-zinc-400 mb-6 space-y-2 list-disc pl-5">
          <li>
            <span className="text-zinc-300">RENSPA vigente:</span> el registro del establecimiento ante
            SENASA debe estar activo. Sin RENSPA no se puede mover ni vender hacienda.{' '}
            <Link href="/que-es-el-renspa" className="text-accent hover:underline">
              Qué es el RENSPA
            </Link>
            .
          </li>
          <li>
            <span className="text-zinc-300">DT-e (Documento de Tránsito electrónico):</span> el
            documento sanitario de SENASA que ampara el traslado de la hacienda hacia el remate, la
            feria o el frigorífico.{' '}
            <Link href="/dte" className="text-accent hover:underline">
              Qué es la DT-e
            </Link>
            .
          </li>
          <li>
            <span className="text-zinc-300">Guía de traslado:</span> documento provincial —ligado al
            boleto de marca— que acredita la propiedad de la hacienda. Es distinto de la DT-e: la guía
            es provincial y prueba la titularidad; la DT-e es sanitaria y la emite SENASA.{' '}
            <Link href="/que-es-la-guia-de-hacienda" className="text-accent hover:underline">
              Qué es la guía de hacienda
            </Link>
            .
          </li>
          <li>
            <span className="text-zinc-300">Boleto de marca:</span> acredita la titularidad de la marca
            a fuego del ganado.{' '}
            <Link href="/como-sacar-el-boleto-de-marca" className="text-accent hover:underline">
              Cómo sacar el boleto de marca
            </Link>
            .
          </li>
          <li>
            <span className="text-zinc-300">Documentación sanitaria:</span> planes de vacunación al día
            (aftosa, brucelosis según categoría) y la caravana / identificación individual cuando
            corresponde.
          </li>
          <li>
            <span className="text-zinc-300">Situación fiscal:</span> condición ante ARCA (ex-AFIP) e IVA
            para la liquidación; la consignataria emite la liquidación de venta con los descuentos.
          </li>
        </ul>

        <GuiasVentaHacienda actual="/como-vender-hacienda" />

        {/* FAQ visible */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">Preguntas frecuentes</h2>
        <dl className="space-y-5 mb-8">
          {FAQ.map((item) => (
            <div key={item.question} className="border-l-2 border-zinc-700 pl-4">
              <dt className="text-accent font-medium text-base mb-1">{item.question}</dt>
              <dd className="text-zinc-400">{item.answer}</dd>
            </div>
          ))}
        </dl>

        <OfrecerGuia
          desde="como-vender-hacienda"
          titulo="Del otro lado del mostrador: cómo se abre una consignataria"
          loQueAgrega={[
            'Qué hace falta para ser la firma que vende: matrícula, sociedad y ARCA, SIOCAL (ex RUCA), SENASA.',
            'La liquidación renglón por renglón: los 17 códigos de gasto que ARCA define y cómo se llama de verdad el comprobante.',
            'DT-e, RENSPA y guías: quién responde por qué, con el circuito de identificación electrónica vigente desde enero de 2026.',
            'Cobranza y descalce financiero con números, y los seis modos de perder plata en una consignataria.',
          ]}
          gratisAca="Todo lo de arriba sigue gratis: cómo vender, cuánto se descuenta y qué documentación hace falta. La guía es para el que quiere estar del lado que liquida."
        />

        {/* El circuito de venta, tema por tema — venía de /vender-hacienda-guia */}
        <div className="border border-terminal-border bg-terminal-panel/40 px-panel py-3 space-y-2 mb-6 text-zinc-400">
          <p className="text-xxs font-terminal uppercase tracking-wider text-zinc-500">
            El circuito de venta, tema por tema
          </p>
          <p>
            Proceso:{' '}
            <Link href="/como-funciona-un-remate-ganadero" className="text-accent hover:underline">cómo funciona un remate ganadero</Link>{' · '}
            <Link href="/vender-en-remate-vs-venta-directa-vs-consignacion" className="text-accent hover:underline">remate vs. venta directa vs. consignación</Link>{' · '}
            <Link href="/conviene-vender-la-hacienda-ahora-o-esperar" className="text-accent hover:underline">¿vender ahora o esperar?</Link>.
          </p>
          <p>
            Precio y liquidación:{' '}
            <Link href="/desbaste-de-la-hacienda" className="text-accent hover:underline">desbaste</Link>{' · '}
            <Link href="/como-leer-una-liquidacion-de-hacienda" className="text-accent hover:underline">cómo leer una liquidación</Link>{' · '}
            <Link href="/cuanto-cobra-de-comision-una-consignataria" className="text-accent hover:underline">comisión de una consignataria</Link>{' · '}
            <Link href="/cuanto-cuesta-el-flete-de-hacienda" className="text-accent hover:underline">flete de hacienda</Link>{' · '}
            <Link href="/precio-de-tranquera" className="text-accent hover:underline">precio de tranquera</Link>.
          </p>
          <p>
            Documentación y tenencia:{' '}
            <Link href="/que-es-la-guia-de-hacienda" className="text-accent hover:underline">guía de hacienda</Link>{' · '}
            <Link href="/que-es-una-tropa-de-hacienda" className="text-accent hover:underline">tropa de hacienda</Link>{' · '}
            <Link href="/como-sacar-el-boleto-de-marca" className="text-accent hover:underline">boleto de marca</Link>{' · '}
            <Link href="/que-es-el-dte" className="text-accent hover:underline">DT-e</Link>{' · '}
            <Link href="/que-es-el-renspa" className="text-accent hover:underline">RENSPA</Link>.
          </p>
        </div>

        {/* Links internos — al negocio */}
        <div className="border-t border-zinc-800 pt-4 flex flex-wrap gap-4 text-xs">
          <Link href="/consignatarias" className="text-zinc-500 hover:text-accent transition-colors">
            Directorio de consignatarias →
          </Link>
          <Link href="/como-elegir-consignataria" className="text-zinc-500 hover:text-accent transition-colors">
            Cómo elegir una consignataria
          </Link>
          <Link href="/que-es-una-consignataria" className="text-zinc-500 hover:text-accent transition-colors">
            Qué es una consignataria
          </Link>
          <Link href="/remates" className="text-zinc-500 hover:text-accent transition-colors">
            Calendario de remates
          </Link>
          <Link href="/que-es-el-renspa" className="text-zinc-500 hover:text-accent transition-colors">
            Qué es el RENSPA
          </Link>
          <Link href="/dte" className="text-zinc-500 hover:text-accent transition-colors">
            Qué es la DT-e
          </Link>
          <Link href="/precios" className="text-zinc-500 hover:text-accent transition-colors">
            Precios del mercado
          </Link>
        </div>

        {/* Footer */}
        <p className="text-zinc-500 text-xs mt-4">
          Comisión de referencia del mercado; cada firma la acuerda con el productor. Esta página no
          fija el precio ni la comisión. Actualizado: {lastUpdate}. Memola Medios S.A.S.
        </p>
      </div>
    </>
  )
}
