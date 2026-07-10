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
const PAGE_URL = `${BASE_URL}/razas-bovinas-argentina`

/* ------------------------------------------------------------------ */
/*  Número vivo — el JSON lo reescribe el scraper 14:00 ART.           */
/*  El toro reproductor es el nexo con genética y remates.             */
/* ------------------------------------------------------------------ */
const cats = marketPrices.categories as Record<string, { current: number }>
const lastUpdate = marketPrices.lastUpdate
const fmt = (n: number) => n.toLocaleString('es-AR')
const price = (key: string) => Math.round(cats[key].current)

const toro = price('toros')
const ternero = price('terneros')

/* ------------------------------------------------------------------ */
/*  Tabla por raza — fuente única para el <table> visible.             */
/*  Origen, aptitud, zona y uso de cada raza dominante en Argentina.   */
/* ------------------------------------------------------------------ */
type Raza = {
  nombre: string
  grupo: string
  origen: string
  aptitud: string
  zona: string
  uso: string
}

const RAZAS: Raza[] = [
  {
    nombre: 'Angus',
    grupo: 'Británica',
    origen: 'Escocia (Aberdeen)',
    aptitud: 'Carne — marmoleo y terminación temprana',
    zona: 'Pampa húmeda, zona templada',
    uso: 'La raza carnicera más difundida del país; base del rodeo de invernada y feedlot.',
  },
  {
    nombre: 'Hereford',
    grupo: 'Británica',
    origen: 'Inglaterra (Herefordshire)',
    aptitud: 'Carne — rusticidad y facilidad de engorde',
    zona: 'Pampa, Patagonia y semiárido templado',
    uso: 'Cría y recría a pasto; muy usada en cruzamientos por su docilidad y aptitud materna.',
  },
  {
    nombre: 'Braford',
    grupo: 'Sintética (Hereford × Cebú)',
    origen: 'Argentina / EE.UU.',
    aptitud: 'Carne con resistencia al calor',
    zona: 'NEA y NOA (subtropical)',
    uso: 'Cría en ambientes cálidos con garrapata; combina carne británica y rusticidad índica.',
  },
  {
    nombre: 'Brangus',
    grupo: 'Sintética (Angus × Cebú)',
    origen: 'Argentina / EE.UU.',
    aptitud: 'Carne con adaptación tropical',
    zona: 'NEA, NOA y norte de la pampa',
    uso: 'La raza sintética de mayor crecimiento; cría y terminación en el norte ganadero.',
  },
  {
    nombre: 'Shorthorn',
    grupo: 'Británica',
    origen: 'Inglaterra (valle del Tees)',
    aptitud: 'Doble propósito — carne y leche',
    zona: 'Pampa húmeda',
    uso: 'Raza histórica del país, hoy más acotada; presente en cruzamientos y rodeos de carne.',
  },
  {
    nombre: 'Limousin',
    grupo: 'Continental (europea)',
    origen: 'Francia',
    aptitud: 'Carne magra — alto rendimiento al gancho',
    zona: 'Pampa y cruzamientos terminales',
    uso: 'Se usa como raza padre en cruzas para aportar músculo y rendimiento de res.',
  },
]

/* ------------------------------------------------------------------ */
/*  Términos definidos — @id estable url#slug por término (schema).    */
/* ------------------------------------------------------------------ */
const TERMINOS = [
  {
    name: 'Angus',
    description:
      'Raza bovina británica de carne originaria de Escocia (Aberdeen Angus), mocha (sin cuernos), de pelaje negro o colorado. Es la raza carnicera más difundida en Argentina por su marmoleo, terminación temprana y adaptación a la pampa húmeda templada. Base del rodeo de invernada y del feedlot.',
    url: PAGE_URL,
  },
  {
    name: 'Hereford',
    description:
      'Raza bovina británica de carne originaria de Inglaterra, de cara blanca y cuerpo colorado. Muy rústica, dócil y de buena aptitud materna; se cría a pasto en la pampa, la Patagonia y el semiárido templado, y es una de las bases más usadas en cruzamientos.',
    url: PAGE_URL,
  },
  {
    name: 'Braford',
    description:
      'Raza sintética argentina resultante del cruzamiento de Hereford con Cebú (índico). Combina la calidad de carne británica con la resistencia al calor y a la garrapata del cebú, por lo que se cría en el NEA y el NOA subtropicales.',
    url: PAGE_URL,
  },
  {
    name: 'Brangus',
    description:
      'Raza sintética resultante del cruzamiento de Angus con Cebú (aproximadamente 3/8 Cebú y 5/8 Angus). Es la raza sintética de mayor crecimiento en Argentina: aporta carne de calidad con adaptación tropical, y domina la cría y terminación en el norte ganadero.',
    url: PAGE_URL,
  },
  {
    name: 'Shorthorn',
    description:
      'Raza bovina británica de doble propósito (carne y leche) originaria del valle del Tees, en Inglaterra. Fue una de las razas fundacionales del rodeo argentino; hoy tiene menor difusión pero sigue presente en cruzamientos y rodeos de carne de la pampa húmeda.',
    url: PAGE_URL,
  },
  {
    name: 'Limousin',
    description:
      'Raza bovina continental europea originaria de Francia, de carne magra y alto rendimiento al gancho. En Argentina se usa principalmente como raza padre en cruzamientos terminales para aportar músculo y rendimiento de res.',
    url: PAGE_URL,
  },
  {
    name: 'Razas británicas',
    description:
      'Grupo de razas bovinas de carne originarias de las Islas Británicas —Angus, Hereford y Shorthorn— adaptadas al clima templado. En Argentina son la base del rodeo de la pampa húmeda por su calidad de carne, marmoleo y terminación temprana.',
    url: PAGE_URL,
  },
  {
    name: 'Razas índicas / cebú',
    description:
      'Razas bovinas del tipo Bos indicus (cebú), originarias de zonas tropicales, con giba, orejas largas y alta resistencia al calor y a la garrapata. En Argentina rara vez se crían puras: aportan rusticidad tropical a las razas sintéticas Braford y Brangus del norte.',
    url: PAGE_URL,
  },
  {
    name: 'Cruza (cruzamiento)',
    description:
      'Apareamiento de animales de razas distintas para combinar sus virtudes y aprovechar el vigor híbrido (heterosis). En Argentina es la práctica que dio origen a las razas sintéticas Braford y Brangus, y la que se usa para adaptar el rodeo a cada ambiente y destino comercial.',
    url: PAGE_URL,
  },
]

/* ------------------------------------------------------------------ */
/*  FAQ — answer-first, interpola número vivo del toro reproductor.    */
/* ------------------------------------------------------------------ */
const FAQ = [
  {
    question: '¿Cuál es la raza de ganado más común en Argentina?',
    answer:
      'La raza de ganado más común en Argentina es el Angus, una raza británica de carne originaria de Escocia. Domina la pampa húmeda por su marmoleo, su terminación temprana y su adaptación al clima templado, y es la base del rodeo de invernada y del feedlot. La siguen el Hereford (también británica) y, en el norte, las razas sintéticas Brangus y Braford.',
  },
  {
    question: '¿Qué raza de ganado conviene para el norte argentino?',
    answer:
      'Para el norte argentino (NEA y NOA) convienen las razas sintéticas Braford y Brangus, porque tienen sangre índica (cebú) que les da resistencia al calor, a la humedad y a la garrapata. El Braford deriva del cruzamiento Hereford × Cebú y el Brangus del cruzamiento Angus × Cebú; ambas combinan la calidad de carne británica con la rusticidad tropical del cebú.',
  },
  {
    question: '¿Angus o Hereford: cuál elegir?',
    answer:
      'Angus y Hereford son las dos razas británicas de carne más usadas en Argentina y la elección depende del ambiente y el objetivo. El Angus aporta más marmoleo y terminación temprana, ideal para invernada y feedlot en la pampa húmeda. El Hereford es más rústico, dócil y de mejor aptitud materna, lo que lo hace fuerte en cría a pasto, en zonas más frías o semiáridas y en cruzamientos. Muchos rodeos combinan ambas para sumar sus virtudes.',
  },
  {
    question: '¿Qué es una raza sintética?',
    answer:
      'Una raza sintética es una raza nueva creada y fijada a partir del cruzamiento planificado de dos o más razas, para combinar sus virtudes de forma estable y heredable. Braford (Hereford × Cebú) y Brangus (Angus × Cebú) son las razas sintéticas argentinas más importantes: unen la calidad de carne de las razas británicas con la resistencia al calor y a la garrapata de las razas índicas del norte.',
  },
  {
    question: '¿Cuánto vale un toro reproductor de estas razas?',
    answer: `Un toro reproductor de pedigrí se valúa por su genética en remates de reproductores, no por kilo de carne: un buen toro Angus, Hereford, Braford o Brangus puede multiplicar varias veces el valor de un toro de faena. Como referencia, hoy (${lastUpdate}) el toro de descarte para faena cotiza a $${fmt(toro)}/kg vivo en el Mercado Agroganadero; el precio de un reproductor lo define la cabaña en cada remate y está muy por encima de ese piso. Son valores de referencia del mercado, no fijados por esta página.`,
  },
]

export const metadata: Metadata = {
  title: `Razas bovinas de Argentina: Angus, Hereford, Braford y Brangus (${lastUpdate.slice(0, 4)})`,
  description: `Las razas bovinas dominantes en Argentina son Angus y Hereford (británicas, para el clima templado y la calidad de carne) y Braford y Brangus (sintéticas con sangre índica, para el norte por su resistencia al calor y la garrapata). Origen, aptitud, zona y uso de cada raza.`,
  keywords: [
    'razas bovinas de argentina',
    'razas de ganado en argentina',
    'razas de vacas argentina',
    'angus hereford braford brangus',
    'raza angus',
    'raza hereford',
    'raza braford',
    'raza brangus',
    'razas britanicas de carne',
    'razas sinteticas ganado',
    'que raza de ganado para el norte',
    'angus o hereford',
    'raza de ganado mas comun en argentina',
  ],
  openGraph: {
    title: `Razas bovinas de Argentina: Angus, Hereford, Braford y Brangus`,
    description: `Angus y Hereford (británicas, clima templado) y Braford y Brangus (sintéticas índicas, norte): origen, aptitud, zona y uso de las razas dominantes del rodeo argentino.`,
    url: PAGE_URL,
    type: 'article',
    images: [{ url: '/og-mercado.png', width: 1200, height: 630 }],
  },
  alternates: {
    canonical: PAGE_URL,
  },
}

export default function RazasBovinasArgentinaPage() {
  return (
    <>
      <SectionBreadcrumbSchema section="razas-bovinas-argentina" sectionName="Razas bovinas" />
      <DefinedTermSetSchema
        name="Razas bovinas de Argentina"
        description="Las razas bovinas dominantes del rodeo argentino —Angus, Hereford, Braford, Brangus, Shorthorn y Limousin— con su origen, grupo (británica, sintética, índica o continental) y aptitud."
        url={PAGE_URL}
        terms={TERMINOS}
      />
      <FAQPageSchema items={FAQ} />
      <SpeakableSchema
        url={PAGE_URL}
        headline="Razas bovinas de Argentina: Angus, Hereford, Braford y Brangus"
      />
      <TechArticleSchema
        name="Razas bovinas de Argentina: Angus, Hereford, Braford y Brangus"
        description="Guía de referencia de las razas bovinas dominantes en Argentina: las británicas Angus y Hereford para el clima templado y la calidad de carne, y las sintéticas Braford y Brangus para el norte por su resistencia al calor y la garrapata. Origen, aptitud, zona y uso de cada raza."
        url={PAGE_URL}
        dateModified={lastUpdate}
        citations={[
          { name: 'Asociación Argentina de Angus', url: 'https://www.angus.org.ar' },
          { name: 'Asociación Argentina Criadores de Hereford', url: 'https://www.hereford.org.ar' },
          { name: 'Asociación Argentina de Brangus', url: 'https://www.brangus.org.ar' },
        ]}
      />

      <article className="px-4 pt-4 pb-8 max-w-3xl mx-auto text-zinc-300 text-sm leading-relaxed">
        <nav className="text-xxs font-terminal uppercase tracking-wider text-zinc-500 mb-3">
          <Link href="/mercado" className="hover:text-accent transition-colors">
            Mercado
          </Link>{' '}
          / Razas bovinas
        </nav>

        <h1 className="text-zinc-100 text-2xl font-medium mb-3">
          Razas bovinas de Argentina: Angus, Hereford, Braford y Brangus
        </h1>

        {/* Answer-first: primera oración autocontenida y citable */}
        <p className="speakable-content text-zinc-200 text-base mb-4">
          Las razas bovinas dominantes en Argentina son las <strong>británicas Angus y Hereford</strong>,
          que se crían en la zona templada de la pampa por su calidad de carne, y las{' '}
          <strong>sintéticas Braford y Brangus</strong>, que se crían en el norte (NEA y NOA) porque
          su sangre índica les da resistencia al calor y a la garrapata.
        </p>

        <p className="mb-4">
          Esa es la lógica del rodeo argentino: <strong>ambiente y destino definen la raza</strong>. En
          el clima templado de la pampa húmeda mandan las <strong>razas británicas de carne</strong>{' '}
          —Angus, Hereford y, en menor medida, Shorthorn— por su marmoleo y su terminación temprana.
          En el subtropical del norte, donde el calor y la garrapata castigan al animal puro británico,
          mandan las <strong>razas sintéticas</strong> —Braford y Brangus— que cruzaron esas británicas
          con <strong>cebú</strong> (índico) para sumar rusticidad tropical sin perder calidad de carne.
          Las razas continentales como el <strong>Limousin</strong> entran sobre todo como raza padre en
          cruzamientos terminales.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          Tabla de razas: origen, aptitud, zona y uso
        </h2>
        <div className="overflow-x-auto mb-2">
          <table className="w-full text-data border border-terminal-border">
            <thead>
              <tr className="bg-terminal-panel/60 text-zinc-400 text-xxs uppercase tracking-wider">
                <th className="text-left px-3 py-2 border-b border-terminal-border">Raza</th>
                <th className="text-left px-3 py-2 border-b border-terminal-border">Grupo / origen</th>
                <th className="text-left px-3 py-2 border-b border-terminal-border">Aptitud</th>
                <th className="text-left px-3 py-2 border-b border-terminal-border">Zona</th>
                <th className="text-left px-3 py-2 border-b border-terminal-border">Uso</th>
              </tr>
            </thead>
            <tbody>
              {RAZAS.map((r) => (
                <tr key={r.nombre} className="border-b border-terminal-border/60 align-top">
                  <td className="px-3 py-2 text-zinc-200 font-medium">{r.nombre}</td>
                  <td className="px-3 py-2 text-zinc-400">
                    {r.grupo}
                    <span className="block text-zinc-500">{r.origen}</span>
                  </td>
                  <td className="px-3 py-2 text-zinc-300">{r.aptitud}</td>
                  <td className="px-3 py-2 text-zinc-400">{r.zona}</td>
                  <td className="px-3 py-2 text-zinc-400">{r.uso}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xxs text-zinc-500 mb-4">
          Cuadro de referencia de las razas dominantes del rodeo argentino. Las británicas (Angus,
          Hereford, Shorthorn) son Bos taurus de clima templado; Braford y Brangus son razas sintéticas
          que suman sangre de cebú (Bos indicus) para el norte; el Limousin es una raza continental de
          cruzamiento.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          Británicas: Angus y Hereford para el clima templado
        </h2>
        <p className="mb-4">
          El <strong>Angus</strong> —mocho, negro o colorado, originario de Escocia— es la raza
          carnicera más difundida del país: aporta <strong>marmoleo</strong> y terminación temprana, y
          es la base de la invernada y el feedlot de la pampa húmeda. El <strong>Hereford</strong> —cara
          blanca, cuerpo colorado, originario de Inglaterra— es más rústico y dócil, con buena aptitud
          materna, por lo que domina la cría a pasto en zonas más frías o semiáridas y aparece mucho en
          cruzamientos. El <strong>Shorthorn</strong>, raza fundacional de doble propósito, hoy tiene una
          difusión más acotada. Todas responden al mismo principio: en clima templado, la genética
          británica maximiza la calidad de carne.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          Sintéticas: Braford y Brangus para el norte
        </h2>
        <p className="mb-4">
          En el <strong>NEA y el NOA</strong> el calor, la humedad y la garrapata castigan al animal
          puro británico. La respuesta genética fueron las <strong>razas sintéticas</strong>: el{' '}
          <strong>Braford</strong> (Hereford × Cebú) y el <strong>Brangus</strong> (Angus × Cebú),
          fijadas como razas nuevas a partir del cruzamiento con <strong>cebú</strong> (Bos indicus). Ese
          aporte índico da resistencia al calor y a la garrapata sin resignar la calidad de carne
          británica. El Brangus es hoy la raza sintética de mayor crecimiento en el norte ganadero
          argentino. En Argentina el cebú rara vez se cría puro: su rol es aportar rusticidad tropical
          dentro de estas cruzas.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          Genética, toros y remates de reproductores
        </h2>
        <p className="mb-4">
          La raza es una decisión de <strong>genética</strong>, y esa genética se compra en los{' '}
          <strong>remates de reproductores</strong>: cabañas que venden toros de pedigrí Angus, Hereford,
          Braford o Brangus para mejorar el rodeo comercial. Un <strong>toro reproductor</strong> no se
          valúa por kilo de carne sino por su valor genético, muy por encima del toro de faena —que hoy (
          {lastUpdate}) cotiza a <strong>${fmt(toro)}/kg</strong> vivo en el Mercado Agroganadero como
          categoría de manufactura. La cría que ese toro genera se comercializa después como ternero de
          invernada, la categoría que suele liderar el precio por kilo (hoy ${fmt(ternero)}/kg). Son
          valores de referencia del mercado, no fijados por esta página.
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

        {/* Rol pilar — enlazado interno denso a genética, remates y precio */}
        <div className="border border-terminal-border bg-terminal-panel/40 px-panel py-3 space-y-2">
          <p className="text-xxs font-terminal uppercase tracking-wider text-zinc-500">
            Seguir por
          </p>
          <p className="text-data text-zinc-300 flex flex-wrap gap-x-3 gap-y-1">
            <Link href="/cuanto-vale-un-toro" className="text-accent hover:text-accent-bright transition-colors">
              ¿Cuánto vale un toro? →
            </Link>
            <Link href="/como-funciona-un-remate-ganadero" className="text-accent hover:text-accent-bright transition-colors">
              Cómo funciona un remate ganadero →
            </Link>
            <Link href="/categorias-de-hacienda" className="text-accent hover:text-accent-bright transition-colors">
              Categorías de hacienda →
            </Link>
            <Link href="/remates" className="text-accent hover:text-accent-bright transition-colors">
              Remates de hacienda →
            </Link>
          </p>
        </div>

        <footer className="mt-6 pt-4 border-t border-terminal-border text-xxs text-zinc-500">
          <p>
            Información de referencia sobre las razas del rodeo argentino. Los precios citados son de
            referencia del mercado (Mercado Agroganadero / INMAG); el valor de un reproductor lo fija
            cada cabaña en el remate. Esta página no fija precios.
          </p>
          <p className="mt-1">Actualizado: {lastUpdate} · Memola Medios S.A.S.</p>
        </footer>
      </article>
    </>
  )
}
