import { Metadata } from 'next'
import Link from 'next/link'
import {
  SectionBreadcrumbSchema,
  DefinedTermSetSchema,
  FAQPageSchema,
  SpeakableSchema,
  DatasetSchema,
} from '@/components/seo/JsonLd'
import marketPrices from '@/lib/data/market-prices.json'
import { INMAG_DATE } from '@/lib/inmag'

export const revalidate = 86400 // daily rebuild via Vercel

const PAGE_URL = 'https://www.consignatarias.com.ar/categorias-de-hacienda'

// Números vivos — interpolados en build; el JSON lo actualiza el scraper 14:00 ART.
const cats = marketPrices.categories as Record<string, { current: number }>
const lastUpdate = marketPrices.lastUpdate
const fmt = (n: number) => n.toLocaleString('es-AR')
const price = (key: string) => Math.round(cats[key].current)

const novillo = price('novillos')
const novillito = price('novillitos')
const vaquillona = price('vaquillonas')
const vaca = price('vacas')
const toro = price('toros')
const ternero = price('terneros')

// Molde estándar de la tabla: una fila por categoría, precio $/kg = .current,
// valor de referencia = peso medio × $/kg (redondeado). MEJ no tiene serie propia
// en el panel INMAG: se cotiza como novillo/novillito según terminación, sin dato directo.
type Row = {
  label: string
  slug: string | null // /mercado/<slug> — null para MEJ (sin serie propia)
  sexoEdad: string
  peso: string
  pesoMedio: number | null
  priceKey: string | null
  live: number | null
}

const ROWS: Row[] = [
  {
    label: 'Ternero / Ternera',
    slug: 'terneros',
    sexoEdad: 'Macho o hembra, menos de 1 año (destete)',
    peso: '160–200 kg',
    pesoMedio: 180,
    priceKey: 'terneros',
    live: ternero,
  },
  {
    label: 'Novillito',
    slug: 'novillitos',
    sexoEdad: 'Macho castrado, 1–2 años',
    peso: '300–390 kg',
    pesoMedio: 345,
    priceKey: 'novillitos',
    live: novillito,
  },
  {
    label: 'Novillo',
    slug: 'novillos',
    sexoEdad: 'Macho castrado, más de 2 años',
    peso: '400–500 kg',
    pesoMedio: 450,
    priceKey: 'novillos',
    live: novillo,
  },
  {
    label: 'Vaquillona',
    slug: 'vaquillonas',
    sexoEdad: 'Hembra que aún no parió',
    peso: '300–380 kg',
    pesoMedio: 340,
    priceKey: 'vaquillonas',
    live: vaquillona,
  },
  {
    label: 'Vaca',
    slug: 'vacas',
    sexoEdad: 'Hembra que ya parió (cría, descarte o manufactura)',
    peso: '380–460 kg',
    pesoMedio: 420,
    priceKey: 'vacas',
    live: vaca,
  },
  {
    label: 'Toro',
    slug: 'toros',
    sexoEdad: 'Macho entero reproductor adulto',
    peso: '700–1000 kg',
    pesoMedio: 850,
    priceKey: 'toros',
    live: toro,
  },
  {
    label: 'MEJ',
    slug: null,
    sexoEdad: 'Macho Entero Joven (no castrado, terminación joven)',
    peso: '380–460 kg',
    pesoMedio: null,
    priceKey: null,
    live: null,
  },
]

// Entidad citable — cada categoría como DefinedTerm con @id estable (name + edad + peso + destino).
const TERMINOS = [
  {
    name: 'Ternero',
    description:
      'Bovino macho o hembra de menos de 1 año, generalmente al destete, de 160 a 200 kg de peso vivo. Es la categoría de invernada por excelencia: se vende para recría o engorde, no para faena inmediata. Suele liderar el precio por kilo vivo por su potencial de crecimiento.',
    url: 'https://www.consignatarias.com.ar/mercado/terneros',
  },
  {
    name: 'Novillito',
    description:
      'Macho bovino castrado de entre 1 y 2 años, de 300 a 390 kg de peso vivo. Categoría de faena liviana, muy demandada por el consumo interno argentino por su terminación más temprana que la del novillo.',
    url: 'https://www.consignatarias.com.ar/mercado/novillitos',
  },
  {
    name: 'Novillo',
    description:
      'Macho bovino castrado de más de 2 años, de 400 a 500 kg de peso vivo. Es la categoría de referencia del mercado —el INMAG (Índice Novillo Mercado Agroganadero) se construye sobre ella— y la base de la exportación y el consumo pesado.',
    url: 'https://www.consignatarias.com.ar/mercado/novillos',
  },
  {
    name: 'Vaquillona',
    description:
      'Hembra bovina que aún no ha parido, de 300 a 380 kg de peso vivo. Según su destino se cría para reposición del rodeo (futura vaca de cría) o se termina para faena. Vale más por kilo que la vaca por su carne más tierna.',
    url: 'https://www.consignatarias.com.ar/mercado/vaquillonas',
  },
  {
    name: 'Vaca',
    description:
      'Hembra bovina adulta que ya ha parido, de 380 a 460 kg de peso vivo. Como categoría de mercado agrupa a las vacas de descarte, conserva y manufactura que se comercializan para faena; la vaca de cría preñada o con ternero al pie se valúa aparte por su función reproductiva.',
    url: 'https://www.consignatarias.com.ar/mercado/vacas',
  },
  {
    name: 'Toro',
    description:
      'Macho bovino entero (no castrado) reproductor adulto, de 700 a 1000 kg de peso vivo. Los toros de pedigrí se comercializan por genética en remates de reproductores; los toros de descarte van a faena de manufactura, con el menor precio por kilo del panel.',
    url: 'https://www.consignatarias.com.ar/mercado/toros',
  },
  {
    name: 'MEJ',
    description:
      'Macho Entero Joven: bovino macho sin castrar, terminado a edad joven (similar peso al novillo, 380–460 kg). Se faena entero para aprovechar su mayor velocidad de engorde; no tiene serie propia en el panel INMAG y en el mercado se cotiza en relación al novillo o novillito según su terminación.',
    url: 'https://www.consignatarias.com.ar/glosario',
  },
]

// FAQ — cada respuesta arranca con el dato (answer-first) e interpola números vivos.
const FAQ = [
  {
    question: '¿Cuáles son las categorías de hacienda bovina en Argentina?',
    answer: `Las categorías de hacienda bovina en Argentina son ternero/a, novillito, novillo, vaquillona, vaca, toro y MEJ (Macho Entero Joven), y se clasifican por sexo, edad y peso. Hoy (${lastUpdate}), el precio de referencia por kilo vivo en el Mercado Agroganadero va desde $${fmt(vaca)}/kg (vaca) hasta $${fmt(ternero)}/kg (ternero), pasando por novillo $${fmt(novillo)}, novillito $${fmt(novillito)}, vaquillona $${fmt(vaquillona)} y toro $${fmt(toro)}. Son valores de referencia del mercado, no fijados por esta página.`,
  },
  {
    question: '¿Qué es un MEJ?',
    answer: `MEJ significa Macho Entero Joven: un bovino macho sin castrar terminado a edad joven (peso similar al novillo, 380–460 kg). Se faena entero porque el animal sin castrar engorda más rápido. No tiene una serie propia en el panel INMAG: en el mercado se cotiza en relación al novillo (hoy $${fmt(novillo)}/kg vivo, ${INMAG_DATE}) o al novillito (hoy $${fmt(novillito)}/kg) según su grado de terminación.`,
  },
  {
    question: '¿Cuál es la diferencia entre novillo y novillito?',
    answer: `La diferencia entre novillo y novillito es la edad y el peso: ambos son machos castrados, pero el novillito tiene 1–2 años y 300–390 kg, mientras que el novillo supera los 2 años y llega a 400–500 kg. El novillo es la categoría de referencia del mercado (sobre la que se calcula el INMAG) y hoy vale $${fmt(novillo)}/kg vivo; el novillito, de faena más liviana, cotiza a $${fmt(novillito)}/kg (Mercado Agroganadero, ${INMAG_DATE}).`,
  },
  {
    question: '¿Qué categoría de hacienda vale más por kilo?',
    answer: `El ternero suele ser la categoría que más vale por kilo vivo: hoy cotiza a $${fmt(ternero)}/kg en el Mercado Agroganadero (${lastUpdate}), por encima del novillo ($${fmt(novillo)}), el novillito ($${fmt(novillito)}), la vaquillona ($${fmt(vaquillona)}), la vaca ($${fmt(vaca)}) y el toro ($${fmt(toro)}). Se paga más caro porque es hacienda de invernada con potencial de crecimiento por delante, no un animal terminado para faena.`,
  },
]

export const metadata: Metadata = {
  title: `Categorías de Hacienda Bovina en Argentina: Peso, Edad y Precio ${lastUpdate.slice(0, 4)}`,
  description: `Las categorías de hacienda bovina son ternero, novillito, novillo, vaquillona, vaca, toro y MEJ, clasificadas por sexo, edad y peso. Precio de referencia por kilo vivo hoy (${INMAG_DATE}): desde $${fmt(vaca)}/kg (vaca) hasta $${fmt(ternero)}/kg (ternero) según el INMAG.`,
  keywords: [
    'categorias de hacienda',
    'categorias de hacienda ganado bovino',
    'categorias de ganado bovino',
    'categorias de hacienda bovina argentina',
    'ternero novillito novillo vaquillona vaca toro',
    'que es un MEJ',
    'diferencia entre novillo y novillito',
    'peso de las categorias de hacienda',
    'precio por categoria de hacienda',
    'clasificacion de hacienda por edad y peso',
  ],
  openGraph: {
    title: `Categorías de hacienda bovina en Argentina: peso, edad y precio`,
    description: `Ternero, novillito, novillo, vaquillona, vaca, toro y MEJ — clasificadas por sexo, edad y peso, con precio de referencia por kilo vivo (${lastUpdate}).`,
    url: PAGE_URL,
    type: 'article',
    images: [{ url: '/og-mercado.png', width: 1200, height: 630 }],
  },
  alternates: {
    canonical: PAGE_URL,
  },
}

export default function CategoriasDeHaciendaPage() {
  return (
    <>
      <SectionBreadcrumbSchema section="categorias-de-hacienda" sectionName="Categorías de hacienda" />
      <DefinedTermSetSchema
        name="Categorías de hacienda bovina en Argentina"
        description="Las categorías de comercialización del ganado bovino argentino —ternero, novillito, novillo, vaquillona, vaca, toro y MEJ— clasificadas por sexo, edad y peso."
        url={PAGE_URL}
        terms={TERMINOS}
      />
      <FAQPageSchema items={FAQ} />
      <SpeakableSchema
        url={PAGE_URL}
        headline="Categorías de hacienda bovina en Argentina: peso, edad y precio"
      />
      <DatasetSchema
        name="Precio por categoría de hacienda bovina — Mercado Agroganadero"
        description={`Precio de referencia por kilo vivo de cada categoría de hacienda bovina en el Mercado Agroganadero de Buenos Aires al ${lastUpdate}: novillo $${fmt(novillo)}, novillito $${fmt(novillito)}, vaquillona $${fmt(vaquillona)}, vaca $${fmt(vaca)}, toro $${fmt(toro)}, ternero $${fmt(ternero)} ($/kg vivo).`}
        url={PAGE_URL}
        keywords={['categorias de hacienda', 'novillo', 'ternero', 'vaca', 'precio kilo vivo', 'mercado agroganadero', 'INMAG']}
        dateModified={lastUpdate}
      />

      <article className="px-4 pt-4 pb-8 max-w-3xl mx-auto text-zinc-300 text-sm leading-relaxed">
        <nav className="text-xxs font-terminal uppercase tracking-wider text-zinc-500 mb-3">
          <Link href="/mercado" className="hover:text-accent transition-colors">
            Mercado
          </Link>{' '}
          / Categorías de hacienda
        </nav>

        <h1 className="text-zinc-100 text-2xl font-medium mb-3">
          Categorías de hacienda bovina: peso, edad y precio
        </h1>

        {/* Answer-first: primera oración autocontenida y citable */}
        <p className="speakable-content text-zinc-200 text-base mb-4">
          Las categorías de hacienda bovina en Argentina son <strong>ternero, novillito, novillo,
          vaquillona, vaca, toro y MEJ</strong>, y se clasifican por sexo, edad y peso; hoy (
          {INMAG_DATE}) van desde <strong>${fmt(vaca)}/kg</strong> (vaca) hasta{' '}
          <strong>${fmt(ternero)}/kg</strong> (ternero) según el INMAG.
        </p>

        <p className="mb-4">
          Esos son <strong>precios de referencia del mercado</strong>, medidos por kilo vivo en el
          Mercado Agroganadero de Buenos Aires y actualizados a diario ({lastUpdate}); no los fija
          esta página. Cada categoría responde a una combinación de <strong>sexo</strong> (macho o
          hembra), <strong>edad</strong> (del destete al animal adulto) y{' '}
          <strong>peso vivo</strong>, y tiene un destino distinto —invernada, faena o
          reproducción— que explica por qué unas valen más por kilo que otras.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          Tabla de categorías: sexo, edad, peso y precio de referencia
        </h2>
        <div className="overflow-x-auto mb-2">
          <table className="w-full text-data border border-terminal-border">
            <thead>
              <tr className="bg-terminal-panel/60 text-zinc-400 text-xxs uppercase tracking-wider">
                <th className="text-left px-3 py-2 border-b border-terminal-border">Categoría</th>
                <th className="text-left px-3 py-2 border-b border-terminal-border">Sexo / edad</th>
                <th className="text-left px-3 py-2 border-b border-terminal-border">Peso aprox.</th>
                <th className="text-right px-3 py-2 border-b border-terminal-border">
                  Precio ref. $/kg
                </th>
                <th className="text-right px-3 py-2 border-b border-terminal-border">
                  Valor ref. animal tipo
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.label} className="border-b border-terminal-border/60 align-top">
                  <td className="px-3 py-2 text-zinc-200 font-medium">
                    {r.slug ? (
                      <Link
                        href={`/mercado/${r.slug}`}
                        className="text-accent hover:text-accent-bright transition-colors"
                      >
                        {r.label}
                      </Link>
                    ) : (
                      r.label
                    )}
                  </td>
                  <td className="px-3 py-2 text-zinc-400">{r.sexoEdad}</td>
                  <td className="px-3 py-2 text-zinc-300">{r.peso}</td>
                  <td className="px-3 py-2 text-right text-zinc-200">
                    {r.live !== null ? `$${fmt(r.live)}` : 's/serie propia'}
                  </td>
                  <td className="px-3 py-2 text-right text-zinc-400">
                    {r.live !== null && r.pesoMedio !== null
                      ? `$${fmt(r.live * r.pesoMedio)}`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xxs text-zinc-500 mb-4">
          Precio por kilo vivo del Mercado Agroganadero (INMAG y panel de categorías, {INMAG_DATE}).
          El &quot;valor ref. animal tipo&quot; es el precio por kilo por el peso medio del rango, redondeado;
          es una referencia orientativa, no una cotización. El MEJ no tiene serie propia en el
          panel INMAG y se cotiza en relación al novillo o novillito.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          Cómo se clasifica la hacienda: sexo, edad y peso
        </h2>
        <p className="mb-4">
          La clasificación combina tres ejes. Por <strong>sexo</strong>: los terneros pueden ser
          machos o hembras; las hembras siguen como vaquillona (sin parir) y vaca (con parición);
          los machos, castrados, pasan a novillito y novillo, y sin castrar quedan como toro
          (reproductor) o MEJ (terminación joven para faena). Por <strong>edad</strong>: del ternero
          al destete (menos de 1 año) al novillito (1–2 años) y el novillo (más de 2 años). Por{' '}
          <strong>peso vivo</strong>: es el dato que, multiplicado por el precio por kilo de la
          categoría, da el valor del animal en el mercado.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          Qué categoría vale más por kilo
        </h2>
        <p className="mb-4">
          Hoy el <strong>ternero</strong> lidera el precio por kilo vivo (${fmt(ternero)}/kg,{' '}
          {lastUpdate}) porque es hacienda de invernada: se compra por su potencial de crecimiento,
          no por carne terminada. Le siguen el novillo (${fmt(novillo)}), el novillito (
          ${fmt(novillito)}) y la vaquillona (${fmt(vaquillona)}); la <strong>vaca</strong> (
          ${fmt(vaca)}) y el <strong>toro</strong> (${fmt(toro)}), animales adultos de manufactura,
          cierran el panel con el menor valor por kilo. Es el patrón habitual del mercado, sujeto a
          la oferta y demanda de cada rueda.
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

        {/* Rol pilar — enlazado interno denso a cada categoría y a las páginas relacionadas */}
        <div className="border border-terminal-border bg-terminal-panel/40 px-panel py-3 space-y-2">
          <p className="text-xxs font-terminal uppercase tracking-wider text-zinc-500">
            Precio en vivo por categoría
          </p>
          <p className="text-data text-zinc-300 flex flex-wrap gap-x-3 gap-y-1">
            <Link href="/mercado/novillos" className="text-accent hover:text-accent-bright transition-colors">
              Novillo →
            </Link>
            <Link href="/mercado/novillitos" className="text-accent hover:text-accent-bright transition-colors">
              Novillito →
            </Link>
            <Link href="/mercado/vaquillonas" className="text-accent hover:text-accent-bright transition-colors">
              Vaquillona →
            </Link>
            <Link href="/mercado/vacas" className="text-accent hover:text-accent-bright transition-colors">
              Vaca →
            </Link>
            <Link href="/mercado/toros" className="text-accent hover:text-accent-bright transition-colors">
              Toro →
            </Link>
            <Link href="/mercado/terneros" className="text-accent hover:text-accent-bright transition-colors">
              Ternero →
            </Link>
          </p>
          <p className="text-data text-zinc-300 pt-1">
            <Link href="/cuanto-pesa-un-novillo" className="text-accent hover:text-accent-bright transition-colors">
              ¿Cuánto pesa un novillo? →
            </Link>{' '}
            ·{' '}
            <Link href="/cuanto-vale-una-vaca" className="text-accent hover:text-accent-bright transition-colors">
              ¿Cuánto vale una vaca? →
            </Link>{' '}
            ·{' '}
            <Link href="/glosario" className="text-accent hover:text-accent-bright transition-colors">
              Glosario ganadero →
            </Link>{' '}
            ·{' '}
            <Link href="/precios" className="text-accent hover:text-accent-bright transition-colors">
              Precios por categoría →
            </Link>
          </p>
        </div>

        <footer className="mt-6 pt-4 border-t border-terminal-border text-xxs text-zinc-500">
          <p>
            Precios de referencia del mercado (Mercado Agroganadero / INMAG); cada firma acuerda el
            precio final con el productor. Esta página no fija precios.
          </p>
          <p className="mt-1">
            Actualizado: {lastUpdate} · Memola Medios S.A.S.
          </p>
        </footer>
      </article>
    </>
  )
}
