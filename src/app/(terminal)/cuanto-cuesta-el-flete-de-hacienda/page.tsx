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
const PAGE_URL = `${BASE_URL}/cuanto-cuesta-el-flete-de-hacienda`

// Números vivos — interpolados en build; el JSON lo actualiza el scraper 14:00 ART.
const cats = marketPrices.categories as Record<string, { current: number }>
const lastUpdate = marketPrices.lastUpdate
const fmt = (n: number) => n.toLocaleString('es-AR')
const price = (key: string) => Math.round(cats[key].current)

const novillo = price('novillos')
// Valor testigo de un novillo terminado de 450 kg al precio de referencia de hoy.
const pesoNovillo = 450
const valorNovillo = novillo * pesoNovillo // $/kg vivo × kg

// PASOS — alimenta HowToSchema + el <ol> visible (fuente única).
const PASOS = [
  {
    name: 'Determinar cabezas y categoría',
    text: 'El primer dato es cuántos animales se transportan y de qué categoría: no ocupa lo mismo un ternero de destete que un novillo terminado o una vaca de invernada. La categoría define el peso promedio y, con él, cuántos animales entran por piso de jaula sin exceder el peso legal por eje.',
    url: `${BASE_URL}/que-es-una-tropa-de-hacienda`,
  },
  {
    name: 'Calcular los pisos de jaula necesarios',
    text: 'Con la cantidad de cabezas y su categoría se estima cuántos pisos de jaula se necesitan. Una jaula ganadera doble tiene dos pisos; según el peso de la hacienda, en cada piso entran distinta cantidad de animales. Los pisos necesarios determinan si alcanza con un solo camión o hacen falta varios.',
    url: `${BASE_URL}/categorias-de-hacienda`,
  },
  {
    name: 'Estimar los kilómetros al destino',
    text: 'Se mide la distancia entre el campo de origen y el destino —feria, frigorífico, otro establecimiento o el punto de embarque. La distancia en kilómetros, junto con el estado del camino, es la variable que más pesa en la tarifa del flete.',
  },
  {
    name: 'Aplicar la tarifa de referencia por km o por piso',
    text: 'El transportista cotiza combinando una tarifa por kilómetro recorrido y un valor por piso de jaula ocupado; en tramos cortos suele haber un mínimo por viaje. Conviene pedir dos o tres cotizaciones: la tarifa la fija cada fletero según gasoil, distancia y disponibilidad, no esta página.',
    url: `${BASE_URL}/vender-hacienda-guia`,
  },
  {
    name: 'Sumar el flete a los gastos de comercialización',
    text: 'El flete se incorpora al resto de los gastos de comercialización —comisión de la consignataria, IVA, sellado, sanidad, guía y DT-e— para llegar al precio neto de tranquera. Al costo del viaje se le suma el desbaste o merma de traslado, que reduce el peso facturado.',
    url: `${BASE_URL}/como-leer-una-liquidacion-de-hacienda`,
  },
]

// TERMINOS — alimenta DefinedTermSetSchema (entidades citables con @id estable).
const TERMINOS = [
  {
    name: 'Flete de hacienda',
    description:
      'Servicio de transporte de ganado en pie entre dos puntos —campo, feria, frigorífico o embarque— en camión jaula. Su costo se cobra por kilómetro recorrido y por piso de jaula ocupado, con un mínimo por viaje en tramos cortos, y se descuenta como gasto de comercialización en la liquidación.',
    url: PAGE_URL,
  },
  {
    name: 'Jaula',
    description:
      'Carrocería del camión ganadero, dividida en compartimentos y en pisos, diseñada para transportar hacienda en pie. La jaula simple tiene un piso y la doble dos; el equipo puede ser chasis, semirremolque o tren jaula-acoplado, con distinta capacidad de cabezas según el peso de los animales.',
    url: PAGE_URL,
  },
  {
    name: 'Piso de jaula',
    description:
      'Cada nivel de carga de la jaula ganadera. La cantidad de animales por piso depende de su peso: a mayor peso, menos cabezas por piso para no superar el límite de carga por eje. El piso es una de las unidades sobre las que se cotiza el flete de hacienda.',
    url: PAGE_URL,
  },
  {
    name: 'Tarifa por kilómetro',
    description:
      'Valor que cobra el transportista por cada kilómetro recorrido entre origen y destino. Es el componente principal del costo del flete: se combina con el valor por piso de jaula y varía según el precio del gasoil, el estado del camino y la disponibilidad de equipos.',
    url: PAGE_URL,
  },
  {
    name: 'Gastos de comercialización',
    description:
      'Conjunto de costos que se descuentan del importe de venta para llegar al precio neto de tranquera: comisión de la consignataria, IVA, sellado, tasas, sanidad, guía, DT-e y el flete de la hacienda. Se detallan discriminados en la liquidación de la operación.',
    url: `${BASE_URL}/como-leer-una-liquidacion-de-hacienda`,
  },
]

// FAQ — answer-first, interpola números vivos. Mismo array en schema y en el <dl>.
const FAQ = [
  {
    question: '¿Cuánto cuesta el flete de hacienda?',
    answer: `El flete de hacienda se cobra por kilómetro recorrido y por piso de jaula ocupado, con un mínimo por viaje en tramos cortos: no tiene un precio único, sino que depende de la distancia, la cantidad de pisos y el precio del gasoil. Como referencia de magnitud, sobre un novillo de ${pesoNovillo} kg que hoy (${lastUpdate}) vale unos $${fmt(valorNovillo)} al precio de referencia de $${fmt(novillo)}/kg vivo, el flete suele incidir en un porcentaje bajo pero no despreciable del valor del animal en viajes de media y larga distancia. La tarifa la fija cada transportista —precio de referencia del mercado, no fijado por esta página.`,
  },
  {
    question: '¿Cuántos novillos entran en una jaula?',
    answer:
      'Depende del peso de la hacienda y del tipo de equipo. En una jaula ganadera doble, un novillo terminado de unos 450 kg entra en el orden de varias cabezas por piso, mientras que con terneros de destete —mucho más livianos— entran bastantes más por piso. Lo que manda es el peso total por eje permitido, no la cantidad de animales: por eso la misma jaula lleva menos novillos pesados que terneros livianos. El transportista calcula la capacidad exacta según la categoría y el peso promedio de la tropa.',
  },
  {
    question: '¿Quién paga el flete, el comprador o el vendedor?',
    answer:
      'Depende de lo pactado en la operación. En muchas ventas de hacienda el flete lo paga el vendedor cuando entrega en destino, y el comprador cuando retira en origen; también se acuerda repartirlo. Quién asume el flete y en qué condiciones se define antes de cerrar la venta y conviene dejarlo por escrito, porque cambia el precio neto que recibe cada parte.',
  },
  {
    question: '¿El flete sale de mi liquidación?',
    answer:
      'Si el flete corre por cuenta del vendedor, la consignataria lo descuenta como un gasto de comercialización más en la liquidación, junto con la comisión, el IVA, el sellado, la sanidad y la guía. Cada concepto debe figurar discriminado; el flete se resta del importe de venta para llegar al neto de tranquera. Si el flete lo paga el comprador, no aparece en la liquidación del vendedor.',
  },
]

export const metadata: Metadata = {
  title: `Cuánto cuesta el flete de hacienda: precio de la jaula por km y por piso (${lastUpdate.slice(0, 4)})`,
  description: `El flete de hacienda se cobra por kilómetro y por piso de jaula, con mínimo por viaje en tramos cortos. Cómo se calcula, cuántos animales entran por piso y cómo incide en el precio de tranquera, con valor de referencia del novillo ($${fmt(novillo)}/kg vivo, ${lastUpdate}).`,
  keywords: [
    'cuánto cuesta el flete de hacienda',
    'precio de la jaula ganado',
    'flete de novillos por km',
    'cuántos animales entran en una jaula',
    'costo del flete de hacienda por kilometro',
    'precio del flete ganadero',
    'cuántos novillos entran en una jaula',
    'quién paga el flete de la hacienda',
    'tarifa flete de hacienda argentina',
    'flete de hacienda por piso de jaula',
  ],
  openGraph: {
    title: 'Cuánto cuesta el flete de hacienda: precio de la jaula por km y por piso',
    description: `Cómo se cobra el flete ganadero (por km, por piso, por cabeza), cuántos animales entran por piso y cómo incide en el precio de tranquera. Valores de referencia (${lastUpdate}).`,
    url: PAGE_URL,
    type: 'article',
    images: [{ url: '/og-mercado.png', width: 1200, height: 630 }],
  },
  alternates: {
    canonical: PAGE_URL,
  },
}

export default function CuantoCuestaElFleteDeHaciendaPage() {
  return (
    <>
      <SectionBreadcrumbSchema section="cuanto-cuesta-el-flete-de-hacienda" sectionName="Flete" />
      <DefinedTermSetSchema
        name="Glosario del flete de hacienda"
        description="Términos del transporte de hacienda argentino: flete de hacienda, jaula, piso de jaula, tarifa por kilómetro y gastos de comercialización."
        url={PAGE_URL}
        terms={TERMINOS}
      />
      <HowToSchema
        name="Cómo se calcula el costo del flete de hacienda, paso a paso"
        description="De la cantidad de cabezas al neto de tranquera: cómo estimar el costo del flete de hacienda por kilómetro y por piso de jaula, e incorporarlo a los gastos de comercialización."
        steps={PASOS}
      />
      <FAQPageSchema items={FAQ} />
      <SpeakableSchema
        url={PAGE_URL}
        headline="Cuánto cuesta el flete de hacienda: precio de la jaula por km y por piso"
      />

      <article className="px-4 pt-4 pb-8 max-w-3xl mx-auto text-zinc-300 text-sm leading-relaxed">
        <nav className="text-xxs font-terminal uppercase tracking-wider text-zinc-500 mb-3">
          <Link href="/cuanto-cuesta-el-flete-de-hacienda" className="hover:text-accent transition-colors">
            Flete
          </Link>{' '}
          / Cuánto cuesta el flete de hacienda
        </nav>

        <h1 className="text-zinc-100 text-2xl font-medium mb-3">
          Cuánto cuesta el flete de hacienda
        </h1>

        {/* Answer-first: primera oración autocontenida y citable */}
        <p className="speakable-content text-zinc-200 text-base mb-4">
          El flete de hacienda es el <strong>transporte de ganado en pie en camión jaula</strong>, y su
          costo se cobra <strong>por kilómetro recorrido y por piso de jaula</strong> ocupado —con un
          mínimo por viaje en tramos cortos—, por lo que no tiene un precio único: depende de la
          distancia, de cuántos pisos se llenan y del precio del gasoil. Es un{' '}
          <strong>precio de referencia del mercado, no fijado por esta página</strong>.
        </p>

        <p className="mb-4">
          Como referencia de magnitud, un novillo terminado de {pesoNovillo} kg vale hoy ({INMAG_DATE})
          alrededor de <strong>${fmt(valorNovillo)}</strong> al precio de referencia de{' '}
          <strong>${fmt(novillo)}/kg vivo</strong> (INMAG/MAG). Sobre ese valor, el flete incide en un
          porcentaje bajo en viajes cortos y más sensible en la media y larga distancia; siempre se
          descuenta como un gasto de comercialización más para llegar al precio neto de tranquera.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          Cómo se cobra el flete: por km, por piso de jaula y por cabeza
        </h2>
        <p className="mb-4">
          El flete de hacienda se cotiza combinando tres unidades. La principal es la{' '}
          <strong>tarifa por kilómetro</strong> recorrido entre origen y destino; a ella se suma un
          valor por <strong>piso de jaula</strong> ocupado, porque cada piso que se llena es carga que
          el camión traslada. En tramos cortos se aplica un <strong>mínimo por viaje</strong> que cubre
          la salida del equipo aunque la distancia sea baja. Algunos transportistas cotizan también{' '}
          <strong>por cabeza</strong> para tropas chicas o cargas parciales. Sobre todos estos
          componentes pesan el precio del gasoil, el estado del camino y la disponibilidad de equipos;
          por eso conviene pedir dos o tres cotizaciones antes de cargar.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          Qué es la jaula y cuántos animales entran por piso
        </h2>
        <p className="mb-4">
          La <strong>jaula</strong> es la carrocería del camión ganadero, dividida en compartimentos y
          en <strong>pisos</strong>: la jaula simple tiene un piso y la doble, dos. Cuántos animales
          entran por piso depende sobre todo del <strong>peso</strong> de la hacienda, no de la cantidad:
          lo que limita la carga es el peso total permitido por eje. Por eso, en el mismo piso entran
          menos novillos pesados que terneros livianos de destete. El transportista calcula la capacidad
          exacta según la <Link href="/categorias-de-hacienda" className="text-accent hover:text-accent-bright transition-colors">categoría</Link>{' '}
          y el peso promedio de la <Link href="/que-es-una-tropa-de-hacienda" className="text-accent hover:text-accent-bright transition-colors">tropa</Link>.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          Cómo incide el flete en el precio de tranquera
        </h2>
        <p className="mb-4">
          El <Link href="/precio-de-tranquera" className="text-accent hover:text-accent-bright transition-colors">precio de tranquera</Link>{' '}
          es lo que efectivamente le queda al productor después de restar todos los{' '}
          <strong>gastos de comercialización</strong>. El flete es uno de ellos: cuando corre por cuenta
          del vendedor, se descuenta del importe de venta junto con la comisión, el IVA, el sellado, la
          sanidad, la guía y el DT-e. A ese costo se le suma el <strong>desbaste o merma de traslado</strong>,
          que reduce el peso facturado. La incidencia sube con la distancia y con la merma: cuanto más
          lejos el destino, más pesa el flete en el neto que recibe el productor.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          Ejemplo estimado por rangos de distancia
        </h2>
        <p className="mb-2">
          A modo ilustrativo, se ordenan tres rangos de distancia con un costo estimado por jaula. Son
          valores de referencia variables —dependen del gasoil, la ruta y el equipo—, no una tarifa
          fijada por esta página.
        </p>
        <div className="overflow-x-auto mb-2">
          <table className="w-full text-data border border-terminal-border">
            <thead>
              <tr className="bg-terminal-panel/60 text-zinc-400 text-xxs uppercase tracking-wider">
                <th className="text-left px-3 py-2 border-b border-terminal-border">Rango</th>
                <th className="text-left px-3 py-2 border-b border-terminal-border">Distancia</th>
                <th className="text-left px-3 py-2 border-b border-terminal-border">Cómo se cotiza</th>
                <th className="text-right px-3 py-2 border-b border-terminal-border">
                  Costo por jaula
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-terminal-border/60 align-top">
                <td className="px-3 py-2 text-zinc-200 font-medium">Corto</td>
                <td className="px-3 py-2 text-zinc-400">Hasta ~100 km</td>
                <td className="px-3 py-2 text-zinc-400">Mínimo por viaje + pisos</td>
                <td className="px-3 py-2 text-right text-zinc-300">Menor · pesa el mínimo</td>
              </tr>
              <tr className="border-b border-terminal-border/60 align-top">
                <td className="px-3 py-2 text-zinc-200 font-medium">Medio</td>
                <td className="px-3 py-2 text-zinc-400">~100 a 400 km</td>
                <td className="px-3 py-2 text-zinc-400">Tarifa por km × pisos</td>
                <td className="px-3 py-2 text-right text-zinc-300">Intermedio</td>
              </tr>
              <tr className="align-top">
                <td className="px-3 py-2 text-zinc-200 font-medium">Largo</td>
                <td className="px-3 py-2 text-zinc-400">Más de ~400 km</td>
                <td className="px-3 py-2 text-zinc-400">Tarifa por km × pisos + vuelta</td>
                <td className="px-3 py-2 text-right text-zinc-300">Mayor · más incidencia</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xxs text-zinc-500 mb-4">
          Rangos orientativos, no una tarifa: el costo real lo cotiza cada transportista según distancia,
          pisos de jaula, gasoil y disponibilidad. Referencia del mercado, no fijada por esta página.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          Cómo se calcula el flete, paso a paso
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
            <Link href="/como-leer-una-liquidacion-de-hacienda" className="text-accent hover:text-accent-bright transition-colors">
              Cómo leer una liquidación →
            </Link>
            <Link href="/precio-de-tranquera" className="text-accent hover:text-accent-bright transition-colors">
              Precio de tranquera →
            </Link>
            <Link href="/cuanto-cobra-de-comision-una-consignataria" className="text-accent hover:text-accent-bright transition-colors">
              Comisión de la consignataria →
            </Link>
            <Link href="/vender-hacienda-guia" className="text-accent hover:text-accent-bright transition-colors">
              Guía para vender hacienda →
            </Link>
          </p>
          <p className="text-data text-zinc-300 pt-1">
            <Link href="/que-es-una-tropa-de-hacienda" className="text-accent hover:text-accent-bright transition-colors">
              Qué es una tropa →
            </Link>{' '}
            ·{' '}
            <Link href="/que-es-la-guia-de-hacienda" className="text-accent hover:text-accent-bright transition-colors">
              Qué es la guía de hacienda →
            </Link>{' '}
            ·{' '}
            <Link href="/que-es-el-dte" className="text-accent hover:text-accent-bright transition-colors">
              Qué es el DT-e →
            </Link>
          </p>
        </div>

        <footer className="mt-6 pt-4 border-t border-terminal-border text-xxs text-zinc-500">
          <p>
            Las tarifas de flete son referencias del mercado; cada transportista fija sus valores según
            distancia, pisos de jaula, gasoil y disponibilidad. Esta página no fija precios ni tarifas.
          </p>
          <p className="mt-1">Actualizado: {lastUpdate} · Memola Medios S.A.S.</p>
        </footer>
      </article>
    </>
  )
}
