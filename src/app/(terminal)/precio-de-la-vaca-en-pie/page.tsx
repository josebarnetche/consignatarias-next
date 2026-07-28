import { Metadata } from 'next'
import Link from 'next/link'
import {
  SectionBreadcrumbSchema,
  DefinedTermSetSchema,
  DatasetSchema,
  FAQPageSchema,
  SpeakableSchema,
} from '@/components/seo/JsonLd'
import marketPrices from '@/lib/data/market-prices.json'
import { INMAG_DATE } from '@/lib/inmag'

export const revalidate = 86400 // rebuild diario vía Vercel; el JSON lo commitea el scraper 14:00 ART

const BASE_URL = 'https://www.consignatarias.com.ar'
const PAGE_URL = `${BASE_URL}/precio-de-la-vaca-en-pie`

// Números vivos — interpolados en build; el scraper reescribe market-prices.json 14:00 ART.
const cats = marketPrices.categories as Record<string, { current: number }>
const lastUpdate = marketPrices.lastUpdate
const anio = lastUpdate.slice(0, 4)
const fmt = (n: number) => n.toLocaleString('es-AR')
const price = (key: string) => Math.round(cats[key].current)

const vaca = price('vacas')
const novillo = price('novillos')
const vaquillona = price('vaquillonas')
const toro = price('toros')

// El MAG publica UNA sola cotización de vaca (categoría de faena). Los segmentos
// conserva/manufactura/buena son bandas orientativas alrededor de esa referencia,
// NO cotizaciones oficiales separadas: la vaca más flaca (conserva) paga por debajo,
// la terminada (buena/gorda) por encima. Se etiquetan como orientativas en el HTML.
const vacaConserva = Math.round(vaca * 0.92)
const vacaManufactura = vaca
const vacaBuena = Math.round(vaca * 1.08)

// Diferencia porcentual vaca vs novillo (por qué la vaca vale menos por kilo)
const gapNovillo = Math.round(((novillo - vaca) / novillo) * 100)

// Segmentos → tabla visible + contexto. Fuente única.
type Segmento = {
  label: string
  detalle: string
  live: number
  nota: string
}

const SEGMENTOS: Segmento[] = [
  {
    label: 'Vaca de conserva',
    detalle: 'Vaca de descarte flaca, poca terminación; el destino es carne procesada (conserva).',
    live: vacaConserva,
    nota: 'Piso de la banda',
  },
  {
    label: 'Vaca de manufactura',
    detalle: 'Vaca de descarte de estado medio; carne para elaboración y consumo de manufactura.',
    live: vacaManufactura,
    nota: 'Referencia MAG',
  },
  {
    label: 'Vaca buena / gorda',
    detalle: 'Vaca terminada, con grado de gordura; se acerca al valor de una hembra de consumo.',
    live: vacaBuena,
    nota: 'Techo de la banda',
  },
]

// Entidades citables — DefinedTermSet con @id estable por término.
const TERMINOS = [
  {
    name: 'Vaca',
    description:
      'Hembra bovina adulta que ya ha parido. Como categoría de mercado, la vaca de faena se cotiza en pesos por kilo vivo (peso en pie) en el Mercado Agroganadero de Buenos Aires. Es una categoría de manufactura: paga menos por kilo que el novillo o la vaquillona.',
    url: `${BASE_URL}/mercado/vacas`,
  },
  {
    name: 'Vaca de conserva',
    description:
      'Vaca de descarte de baja terminación y poco estado, destinada a carne procesada (conserva). Es el segmento más barato por kilo vivo dentro de la categoría vaca, porque rinde menos carne aprovechable en el gancho.',
    url: `${PAGE_URL}#segmentos`,
  },
  {
    name: 'Vaca de manufactura',
    description:
      'Vaca de descarte de estado medio cuya carne se destina a elaboración y consumo de manufactura. Cotiza alrededor de la referencia de vaca del Mercado Agroganadero, por debajo de una vaca terminada y muy por debajo del novillo.',
    url: `${PAGE_URL}#segmentos`,
  },
  {
    name: 'Kilo vivo',
    description:
      'Precio por kilogramo de peso del animal en pie (vivo), sin faenar. Es la unidad en la que se cotiza la hacienda en el Mercado Agroganadero. El valor total del animal surge de multiplicar el precio por kilo vivo por su peso.',
    url: `${PAGE_URL}#kilo-vivo`,
  },
  {
    name: 'Rendimiento al gancho',
    description:
      'Porcentaje del peso vivo que queda como res (carcasa) después de la faena. La vaca rinde menos al gancho que las categorías jóvenes, y ese menor rendimiento es una de las razones por las que se paga menos por kilo vivo.',
    url: `${BASE_URL}/rendimiento-al-gancho`,
  },
]

// FAQ — answer-first, cada respuesta arranca con el dato e interpola números vivos.
const FAQ = [
  {
    question: '¿A cuánto está el kilo de vaca en pie hoy?',
    answer: `Hoy (${INMAG_DATE}) el kilo de vaca en pie está en torno a $${fmt(vaca)}/kg vivo según la referencia del Mercado Agroganadero. Por segmento, la vaca de conserva ronda los $${fmt(vacaConserva)}/kg, la vaca de manufactura los $${fmt(vacaManufactura)}/kg y la vaca buena o gorda los $${fmt(vacaBuena)}/kg. Es un precio de referencia del mercado (INMAG/MAG), no fijado por esta página; cada operación se acuerda por calidad y negociación.`,
  },
  {
    question: '¿Cuánto pesa una vaca?',
    answer:
      'Una vaca adulta de razas de carne (Angus, Hereford y cruzas) en Argentina pesa habitualmente entre 380 y 500 kg de peso vivo; las vacas de descarte, conserva y manufactura que van a faena suelen rondar los 400 a 450 kg. El peso vivo es el que se multiplica por el precio por kilo para obtener el valor total del animal.',
  },
  {
    question: '¿Cuánto vale una vaca entera?',
    answer: `Una vaca entera vale su peso vivo multiplicado por el precio por kilo: a $${fmt(vaca)}/kg vivo (${lastUpdate}), una vaca de 420 kg ronda los $${fmt(vaca * 420)}. Esta página se enfoca en el precio por kilo vivo; el valor total del animal según el peso se detalla en la página ¿cuánto vale una vaca?, que trata el valor completo del animal.`,
  },
  {
    question: '¿Por qué la vaca vale menos por kilo que el novillo?',
    answer: `La vaca vale menos por kilo que el novillo porque es una categoría de manufactura: hoy la vaca cotiza a $${fmt(vaca)}/kg vivo frente a $${fmt(novillo)}/kg del novillo (${lastUpdate}), un ${gapNovillo}% menos. La vaca es un animal adulto de descarte con menor rendimiento al gancho y carne de menor valor comercial que el novillo, que es la categoría de referencia para consumo y exportación.`,
  },
]

export const metadata: Metadata = {
  title: `Precio de la Vaca en Pie Hoy: $${fmt(vaca)}/kg vivo (${anio})`,
  description: `A cuánto está el kilo de vaca en pie hoy (${lastUpdate}): ~$${fmt(vaca)}/kg vivo según el Mercado Agroganadero. Vaca de conserva $${fmt(vacaConserva)}, manufactura $${fmt(vacaManufactura)} y buena $${fmt(vacaBuena)} por kilo. Precio de referencia, no fijado por esta página.`,
  keywords: [
    'precio de la vaca en pie',
    'a cuanto esta el kilo de vaca en pie 2026',
    'precio kilo de vaca en pie',
    'cuanto sale una vaca viva argentina 2026',
    'cuanto cuesta una vaca 2026',
    'precio vaca de conserva',
    'precio vaca de manufactura',
    'precio por kilo vivo de vaca',
    'kilo de vaca en pie hoy',
    'cuanto vale el kilo de vaca viva',
  ],
  openGraph: {
    title: `Precio de la vaca en pie hoy: $${fmt(vaca)}/kg vivo`,
    description: `A cuánto está el kilo de vaca en pie (${lastUpdate}): ~$${fmt(vaca)}/kg vivo. Conserva, manufactura y vaca buena, con la diferencia entre precio por kilo y valor total del animal.`,
    url: PAGE_URL,
    type: 'article',
    images: [{ url: '/og-mercado.png', width: 1200, height: 630 }],
  },
  alternates: {
    canonical: PAGE_URL,
  },
}

export default function PrecioDeLaVacaEnPiePage() {
  return (
    <>
      <SectionBreadcrumbSchema section="precio-de-la-vaca-en-pie" sectionName="Precio de la vaca en pie" />
      <DefinedTermSetSchema
        name="Precio de la vaca en pie — términos"
        description="Vaca, vaca de conserva, vaca de manufactura, kilo vivo y rendimiento al gancho: los términos que definen el precio por kilo de la vaca en pie en Argentina."
        url={PAGE_URL}
        terms={TERMINOS}
      />
      <DatasetSchema
        name="Precio de la vaca en pie — Mercado Agroganadero"
        description={`Precio de referencia por kilo vivo de la vaca de faena en el Mercado Agroganadero de Buenos Aires al ${lastUpdate}: referencia $${fmt(vaca)}/kg, vaca de conserva $${fmt(vacaConserva)}/kg, manufactura $${fmt(vacaManufactura)}/kg y vaca buena $${fmt(vacaBuena)}/kg ($/kg vivo).`}
        url={PAGE_URL}
        keywords={['vaca en pie', 'precio kilo vivo', 'vaca de conserva', 'vaca de manufactura', 'mercado agroganadero', 'INMAG']}
        dateModified={lastUpdate}
      />
      <FAQPageSchema items={FAQ} />
      <SpeakableSchema
        url={PAGE_URL}
        headline={`Precio de la vaca en pie hoy: $${fmt(vaca)} por kilo vivo`}
      />

      <article className="px-4 pt-4 pb-8 max-w-3xl mx-auto text-zinc-300 text-sm leading-relaxed">
        <nav className="text-xxs font-terminal uppercase tracking-wider text-zinc-500 mb-3">
          <Link href="/mercado" className="hover:text-accent transition-colors">
            Mercado
          </Link>{' '}
          / Precio de la vaca en pie
        </nav>

        <h1 className="text-zinc-100 text-2xl font-medium mb-3">
          Precio de la vaca en pie hoy: $/kg vivo
        </h1>

        {/* Answer-first: primera oración autocontenida y citable con el número vivo */}
        <p className="speakable-content text-zinc-200 text-base mb-4">
          Hoy ({lastUpdate}) el kilo de vaca en pie está en torno a{' '}
          <strong>${fmt(vaca)}/kg vivo</strong> según la referencia del Mercado Agroganadero: la
          vaca de conserva ronda los <strong>${fmt(vacaConserva)}/kg</strong>, la de manufactura los{' '}
          <strong>${fmt(vacaManufactura)}/kg</strong> y la vaca buena o gorda los{' '}
          <strong>${fmt(vacaBuena)}/kg</strong>.
        </p>

        <p className="mb-4">
          Es un <strong>precio de referencia del mercado (INMAG/MAG), no fijado por esta página</strong>:
          se mide por kilo vivo en el Mercado Agroganadero de Buenos Aires y se actualiza a diario
          ({lastUpdate}). El MAG publica una sola cotización de vaca de faena; los segmentos de
          conserva, manufactura y buena son bandas orientativas alrededor de esa referencia según la
          terminación del animal, no cotizaciones oficiales separadas. Cada operación se acuerda por
          calidad, tipificación y negociación.
        </p>

        <p className="mb-4">
          Esta página responde <strong>a cuánto está el kilo de vaca en pie</strong>. Si lo que
          buscás es <strong>cuánto vale el animal completo</strong> (peso multiplicado por el precio
          por kilo), esa cuenta está en{' '}
          <Link href="/cuanto-vale-una-vaca" className="text-accent hover:text-accent-bright transition-colors">
            ¿cuánto vale una vaca?
          </Link>
          , que trata el valor total; acá el foco es el precio por kilo vivo {anio}.
        </p>

        <h2 id="segmentos" className="text-zinc-100 text-lg font-medium mb-2">
          Precio por kilo vivo por segmento de vaca
        </h2>
        <div className="overflow-x-auto mb-2">
          <table className="w-full text-data border border-terminal-border">
            <thead>
              <tr className="bg-terminal-panel/60 text-zinc-400 text-xxs uppercase tracking-wider">
                <th className="text-left px-3 py-2 border-b border-terminal-border">Segmento</th>
                <th className="text-left px-3 py-2 border-b border-terminal-border">Descripción</th>
                <th className="text-right px-3 py-2 border-b border-terminal-border">$/kg vivo</th>
                <th className="text-right px-3 py-2 border-b border-terminal-border">Banda</th>
              </tr>
            </thead>
            <tbody>
              {SEGMENTOS.map((s) => (
                <tr key={s.label} className="border-b border-terminal-border/60 align-top">
                  <td className="px-3 py-2 text-zinc-200 font-medium">{s.label}</td>
                  <td className="px-3 py-2 text-zinc-400">{s.detalle}</td>
                  <td className="px-3 py-2 text-right text-zinc-200">${fmt(s.live)}</td>
                  <td className="px-3 py-2 text-right text-zinc-500">{s.nota}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xxs text-zinc-500 mb-4">
          Precio por kilo vivo de vaca de faena. La referencia de manufactura es la cotización de
          vaca del Mercado Agroganadero ({lastUpdate}); las bandas de conserva y buena son
          orientativas alrededor de esa referencia según la terminación, no cotizaciones oficiales
          separadas. Valores de referencia, no fijados por esta página.
        </p>

        <h2 id="kilo-vivo" className="text-zinc-100 text-lg font-medium mb-2">
          Precio por kilo vivo vs. valor total del animal
        </h2>
        <p className="mb-4">
          El <strong>precio por kilo vivo</strong> y el <strong>valor total del animal</strong> son
          dos cosas distintas. El precio por kilo vivo es cuánto se paga por cada kilo de la vaca en
          pie: hoy ${fmt(vaca)}/kg. El valor total sale de multiplicar ese precio por el{' '}
          <strong>peso</strong> del animal: una vaca de 420 kg a ${fmt(vaca)}/kg ronda los{' '}
          <strong>${fmt(vaca * 420)}</strong>. Esta página cotiza el precio por kilo; el cálculo del
          valor completo según el peso vive en{' '}
          <Link href="/cuanto-vale-una-vaca" className="text-accent hover:text-accent-bright transition-colors">
            ¿cuánto vale una vaca?
          </Link>
          .
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          Por qué la vaca vale menos por kilo que el novillo
        </h2>
        <p className="mb-4">
          La vaca es una <strong>categoría de manufactura</strong>: cotiza a ${fmt(vaca)}/kg vivo,
          un {gapNovillo}% por debajo del novillo (${fmt(novillo)}/kg), y también por debajo de la
          vaquillona (${fmt(vaquillona)}/kg), aunque por encima del toro de descarte
          (${fmt(toro)}/kg). Paga menos porque es un animal adulto de descarte, con menor{' '}
          <Link href="/rendimiento-al-gancho" className="text-accent hover:text-accent-bright transition-colors">
            rendimiento al gancho
          </Link>{' '}
          y carne de menor valor comercial que el novillo, que es la categoría de referencia para
          consumo y exportación. El orden completo de categorías está en{' '}
          <Link href="/categorias-de-hacienda" className="text-accent hover:text-accent-bright transition-colors">
            categorías de hacienda
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
            Seguir con el dato
          </p>
          <p className="text-data text-zinc-300">
            <Link href="/mercado/vacas" className="text-accent hover:text-accent-bright transition-colors">
              Precio de la vaca en el Mercado Agroganadero →
            </Link>{' '}
            serie diaria del kilo vivo, histórico y variación.
          </p>
          <p className="text-data text-zinc-300 flex flex-wrap gap-x-3 gap-y-1">
            <Link href="/cuanto-vale-una-vaca" className="text-accent hover:text-accent-bright transition-colors">
              ¿Cuánto vale una vaca? (valor total) →
            </Link>
            <Link href="/categorias-de-hacienda" className="text-accent hover:text-accent-bright transition-colors">
              Categorías de hacienda →
            </Link>
            <Link href="/rendimiento-al-gancho" className="text-accent hover:text-accent-bright transition-colors">
              Rendimiento al gancho →
            </Link>
            <Link href="/mercado" className="text-accent hover:text-accent-bright transition-colors">
              Mercado e índices →
            </Link>
          </p>
        </div>

        <footer className="mt-6 pt-4 border-t border-terminal-border text-xxs text-zinc-500">
          <p>
            Precio de referencia del mercado (Mercado Agroganadero / INMAG); cada firma acuerda el
            precio final con el productor. Esta página no fija precios.
          </p>
          <p className="mt-1">Actualizado: {lastUpdate} · Memola Medios S.A.S.</p>
        </footer>
      </article>
    </>
  )
}
