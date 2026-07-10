import { Metadata } from 'next'
import Link from 'next/link'
import {
  SectionBreadcrumbSchema,
  FAQPageSchema,
  SpeakableSchema,
  DatasetSchema,
  DefinedTermSetSchema,
} from '@/components/seo/JsonLd'
import marketPrices from '@/lib/data/market-prices.json'

export const revalidate = 86400 // daily rebuild via Vercel

const PAGE_URL = 'https://www.consignatarias.com.ar/cuanto-pesa-un-novillo'

// Live values interpolated at build time for the SERP snippet + answer-first sentence
const novillo = Math.round(marketPrices.categories.novillos.current)
const lastUpdate = marketPrices.lastUpdate
const fmt = (n: number) => n.toLocaleString('es-AR')
const novillo450 = novillo * 450

// Precio vivo por categoría (Mercado Agroganadero, del día) — se interpola en build
const precios = {
  ternero: Math.round(marketPrices.categories.terneros.current),
  novillito: Math.round(marketPrices.categories.novillitos.current),
  novillo: novillo,
  vaquillona: Math.round(marketPrices.categories.vaquillonas.current),
  vaca: Math.round(marketPrices.categories.vacas.current),
  toro: Math.round(marketPrices.categories.toros.current),
}

// Tabla de peso por categoría. `ref` = peso representativo del rango para estimar el valor.
const PESOS = [
  { cat: 'Ternero', rango: '160 – 200 kg', ref: 180, precio: precios.ternero },
  { cat: 'Novillito', rango: '300 – 390 kg', ref: 345, precio: precios.novillito },
  { cat: 'Novillo', rango: '400 – 500+ kg', ref: 450, precio: precios.novillo },
  { cat: 'Vaquillona', rango: '300 – 380 kg', ref: 340, precio: precios.vaquillona },
  { cat: 'Vaca', rango: '380 – 460 kg', ref: 420, precio: precios.vaca },
  { cat: 'Toro', rango: '700 – 1000 kg', ref: 850, precio: precios.toro },
]

// FAQ — preguntas que el usuario tipea literalmente en Google / recibe la IA
const NOVILLO_FAQ = [
  {
    question: '¿Cuánto pesa un novillo?',
    answer: `Un novillo terminado pesa entre 400 y 500 kg de peso vivo (en pie). A la referencia del INMAG del ${lastUpdate} ($${fmt(novillo)}/kg vivo), un novillo de 450 kg equivale a unos $${fmt(novillo450)} por cabeza. El peso vivo es el que se usa para calcular el valor a partir del precio por kilo del Mercado Agroganadero.`,
  },
  {
    question: '¿Cuánto pesa un novillo gordo?',
    answer: `Un novillo gordo o terminado —listo para faena— pesa habitualmente entre 440 y 500+ kg de peso vivo. Los novillos pesados de exportación pueden superar los 520 kg. A $${fmt(novillo)}/kg vivo (INMAG, ${lastUpdate}), un novillo gordo de 480 kg ronda los $${fmt(novillo * 480)}. Por debajo de ~400 kg todavía se lo categoriza como novillito.`,
  },
  {
    question: '¿Cuánto pesa un novillo en kilos vivos vs faenado?',
    answer: `Un novillo de 450 kg vivos rinde en gancho (res con hueso, sin cuero, cabeza ni vísceras) alrededor de un 56–58% de su peso vivo, es decir unos 252 a 261 kg de res faenada. Ese rinde al gancho es lo que separa el peso vivo del peso de la media res; por eso el kilo vivo del animal y el kilo de carne al público no son comparables directamente.`,
  },
  {
    question: '¿Cuánto pesa cada categoría de hacienda?',
    answer: `En pesos vivos de referencia: ternero 160–200 kg, novillito 300–390 kg, novillo 400–500+ kg, vaquillona 300–380 kg, vaca 380–460 kg y toro 700–1000 kg. Son rangos típicos de razas de carne (Angus, Hereford y cruzas) en Argentina; el peso exacto depende de la raza, la edad, la alimentación y el grado de terminación.`,
  },
]

// Entidades citables — definiciones canónicas de peso/categoría
const NOVILLO_TERMS = [
  {
    name: 'Peso vivo',
    description:
      'Peso del animal en pie, medido en la báscula antes de la faena. Es la base sobre la que se cotiza la hacienda por kilo en el Mercado Agroganadero: el valor de un animal sale de multiplicar el precio por kilo vivo de su categoría por su peso vivo. Se distingue del peso al gancho o peso de la res, que es menor por el rendimiento de faena.',
    url: 'https://www.consignatarias.com.ar/glosario',
  },
  {
    name: 'Novillo',
    description:
      'Macho bovino castrado, terminado para faena, que pesa habitualmente entre 400 y 500+ kg de peso vivo. Es la categoría de referencia del mercado de carne argentino y del índice INMAG del Mercado Agroganadero. Por debajo de ~400 kg se lo categoriza como novillito.',
    url: 'https://www.consignatarias.com.ar/mercado/novillos',
  },
  {
    name: 'Novillito',
    description:
      'Macho bovino castrado joven, de menor peso que el novillo, que se comercializa habitualmente entre 300 y 390 kg de peso vivo. Es una de las categorías del panel de hacienda del Mercado Agroganadero y se cotiza por kilo vivo.',
    url: 'https://www.consignatarias.com.ar/categorias-de-hacienda',
  },
  {
    name: 'Kilo gancho',
    description:
      'Kilo de la res faenada colgada del gancho (con hueso, sin cuero, cabeza ni vísceras). Un novillo rinde en gancho alrededor del 56–58% de su peso vivo, así que el kilo gancho no equivale al kilo vivo del animal ni al kilo de carne al público.',
    url: 'https://www.consignatarias.com.ar/rendimiento-al-gancho',
  },
]

export const metadata: Metadata = {
  // Gana el cluster "cuánto pesa un novillo / cada categoría de hacienda en kilos".
  title: `Cuánto Pesa un Novillo: 400–500 kg (y cada categoría de hacienda)`,
  description: `Un novillo terminado pesa entre 400 y 500 kg en pie. A la referencia del INMAG (${lastUpdate}) de $${fmt(novillo)}/kg vivo equivale a ~$${fmt(novillo450)} por cabeza de 450 kg. Tabla de peso por categoría: ternero, novillito, vaquillona, vaca y toro.`,
  keywords: [
    'cuanto pesa un novillo',
    'cuanto pesa un novillo gordo',
    'peso de un novillo en kilos',
    'cuanto pesa un novillo en pie',
    'peso vivo novillo',
    'cuanto pesa una vaca',
    'cuanto pesa un ternero',
    'cuanto pesa un toro',
    'peso categorias de hacienda',
    'peso vivo vs peso al gancho',
  ],
  openGraph: {
    title: `Cuánto pesa un novillo — 400 a 500 kg de peso vivo`,
    description: `Un novillo de 450 kg a $${fmt(novillo)}/kg vivo (INMAG, ${lastUpdate}) vale ~$${fmt(novillo450)}. Tabla de peso por categoría de hacienda.`,
    url: PAGE_URL,
    type: 'article',
    images: [{ url: '/og-mercado.png', width: 1200, height: 630 }],
  },
  alternates: {
    canonical: PAGE_URL,
  },
}

export default function CuantoPesaUnNovilloPage() {
  return (
    <>
      <SectionBreadcrumbSchema section="cuanto-pesa-un-novillo" sectionName="Cuánto pesa un novillo" />
      <DefinedTermSetSchema
        name="Peso de la hacienda — categorías del mercado ganadero argentino"
        description="Definiciones de peso vivo, peso al gancho y las categorías de hacienda (novillo, novillito) en Argentina."
        url={PAGE_URL}
        terms={NOVILLO_TERMS}
      />
      <FAQPageSchema items={NOVILLO_FAQ} />
      <SpeakableSchema
        url={PAGE_URL}
        headline={`Cuánto pesa un novillo: entre 400 y 500 kg de peso vivo`}
      />
      <DatasetSchema
        name="Pesos de referencia de hacienda bovina"
        description={`Rango de peso vivo por categoría de hacienda en Argentina (ternero, novillito, novillo, vaquillona, vaca y toro) y su valor estimado a la referencia de precios del Mercado Agroganadero del ${lastUpdate}. Un novillo pesa entre 400 y 500 kg y a $${fmt(novillo)}/kg vivo equivale a ~$${fmt(novillo450)} por cabeza de 450 kg.`}
        url={PAGE_URL}
        keywords={['peso novillo', 'peso vivo', 'categorías de hacienda', 'mercado agroganadero', 'Argentina']}
        dateModified={lastUpdate}
      />

      <article className="px-4 pt-4 pb-8 max-w-3xl mx-auto text-zinc-300 text-sm leading-relaxed">
        <nav className="text-xxs font-terminal uppercase tracking-wider text-zinc-500 mb-3">
          <Link href="/mercado" className="hover:text-accent transition-colors">
            Mercado
          </Link>{' '}
          / Cuánto pesa un novillo
        </nav>

        <h1 className="text-zinc-100 text-2xl font-medium mb-3">
          Cuánto pesa un novillo (y cada categoría de hacienda)
        </h1>

        {/* Answer-first: primera oración = la que gana el featured snippet */}
        <p className="speakable-content text-zinc-200 text-base mb-4">
          Un novillo terminado pesa entre <strong>400 y 500 kg en pie</strong> (peso vivo), y a la
          referencia del INMAG ({lastUpdate}) de <strong>${fmt(novillo)}/kg vivo</strong> equivale a
          unos <strong>${fmt(novillo450)}</strong> por cabeza de 450 kg.
        </p>

        <p className="mb-4">
          El <strong>peso vivo</strong> es el del animal en pie, sobre la báscula antes de la faena,
          y es la base con la que se cotiza la hacienda: el valor de una cabeza sale de multiplicar el
          precio por kilo vivo de su categoría por su peso. Ese precio por kilo es el mayorista de
          referencia del Mercado Agroganadero de Buenos Aires (INMAG), no un valor fijado por esta
          página. El peso exacto de cada animal depende de la raza, la edad, la alimentación y el
          grado de terminación.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          Cuánto pesa cada categoría de hacienda
        </h2>
        <div className="overflow-x-auto mb-2">
          <table className="w-full text-data border border-terminal-border">
            <thead>
              <tr className="bg-terminal-panel/60 text-zinc-400 text-xxs uppercase tracking-wider">
                <th className="text-left px-3 py-2 border-b border-terminal-border">Categoría</th>
                <th className="text-left px-3 py-2 border-b border-terminal-border">Peso vivo</th>
                <th className="text-right px-3 py-2 border-b border-terminal-border">$/kg vivo</th>
                <th className="text-right px-3 py-2 border-b border-terminal-border">
                  Valor estimado
                </th>
              </tr>
            </thead>
            <tbody>
              {PESOS.map((p) => (
                <tr key={p.cat} className="border-b border-terminal-border/60">
                  <td className="px-3 py-2 text-zinc-300">{p.cat}</td>
                  <td className="px-3 py-2 text-zinc-300">{p.rango}</td>
                  <td className="px-3 py-2 text-right text-zinc-400">${fmt(p.precio)}</td>
                  <td className="px-3 py-2 text-right text-zinc-200">${fmt(p.precio * p.ref)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xxs text-zinc-500 mb-4">
          Precios por kilo vivo de cada categoría del Mercado Agroganadero ({lastUpdate}). El valor
          estimado toma un peso representativo del rango (ternero 180 kg, novillito 345 kg, novillo
          450 kg, vaquillona 340 kg, vaca 420 kg, toro 850 kg); el peso y el precio reales de cada
          operación varían por calidad, tipificación y negociación.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          Peso vivo vs. peso al gancho
        </h2>
        <p className="mb-4">
          El peso vivo no es el peso de la carne. Al faenarlo, un novillo de 450 kg vivos rinde en
          gancho —la res con hueso, sin cuero, cabeza ni vísceras— alrededor de un{' '}
          <strong>56–58%</strong> de su peso vivo, unos 252 a 261 kg de res. Esa diferencia es el{' '}
          <Link href="/rendimiento-al-gancho" className="text-accent hover:text-accent-bright transition-colors">
            rendimiento al gancho
          </Link>
          , y es lo que separa el kilo vivo del kilo de la res. Del gancho a la carnicería todavía
          falta el desposte, así que el kilo de carne al público no equivale ni al kilo vivo ni al
          kilo gancho del animal.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          De qué depende el peso
        </h2>
        <p className="mb-4">
          Dentro de cada categoría el peso varía por <strong>raza y frame</strong> (un Angus
          británico termina más liviano que una cruza continental de mayor tamaño),{' '}
          <strong>edad</strong>, <strong>alimentación</strong> (un animal a corral gana estado más
          rápido que uno a pasto) y <strong>grado de terminación</strong>. Por eso los rangos son
          orientativos: un novillo puede estar terminado a 430 kg o pesar más de 520 kg si es un
          novillo pesado de exportación. La categoría se define por el peso y el grado de engrasamiento
          al momento de la venta, no por una cifra fija.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">Preguntas frecuentes</h2>
        <dl className="mb-6 space-y-3">
          {NOVILLO_FAQ.map((f) => (
            <div key={f.question} className="border border-terminal-border bg-terminal-panel/40 px-panel py-3">
              <dt className="text-zinc-200 font-medium mb-1">{f.question}</dt>
              <dd className="text-zinc-400 text-data">{f.answer}</dd>
            </div>
          ))}
        </dl>

        <div className="border border-terminal-border bg-terminal-panel/40 px-panel py-3 space-y-2">
          <p className="text-xxs font-terminal uppercase tracking-wider text-zinc-500">
            Seguir con el dato
          </p>
          <p className="text-data text-zinc-300">
            <Link href="/mercado/novillos" className="text-accent hover:text-accent-bright transition-colors">
              Precio del novillo en el Mercado Agroganadero →
            </Link>{' '}
            serie diaria del kilo vivo, histórico y variación.
          </p>
          <p className="text-data text-zinc-300">
            <Link href="/cuanto-vale-una-vaca" className="text-accent hover:text-accent-bright transition-colors">
              Cuánto vale una vaca →
            </Link>{' '}
            precio por kilo vivo y valor por peso de la vaca de faena.
          </p>
          <p className="text-data text-zinc-300">
            <Link href="/categorias-de-hacienda" className="text-accent hover:text-accent-bright transition-colors">
              Categorías de hacienda →
            </Link>{' '}
            qué es cada categoría del mercado y cómo se clasifica.
          </p>
          <p className="text-data text-zinc-300">
            <Link href="/rendimiento-al-gancho" className="text-accent hover:text-accent-bright transition-colors">
              Rendimiento al gancho →
            </Link>{' '}
            del peso vivo al peso de la res: cómo se calcula el rinde.
          </p>
          <p className="text-data text-zinc-300">
            <Link href="/cuanto-pesa-una-media-res" className="text-accent hover:text-accent-bright transition-colors">
              Cuánto pesa una media res →
            </Link>{' '}
            del novillo entero a la media res que llega a la carnicería.
          </p>
          <p className="text-data text-zinc-300">
            <Link href="/glosario" className="text-accent hover:text-accent-bright transition-colors">
              Glosario ganadero →
            </Link>{' '}
            peso vivo, kilo gancho y demás términos del mercado.
          </p>
        </div>

        <footer className="mt-8 pt-4 border-t border-terminal-border text-xxs text-zinc-500 space-y-1">
          <p>
            Esta página no fija precios ni pesos: informa rangos de peso vivo típicos de la hacienda
            argentina y su valor estimado a la referencia de mercado del Mercado Agroganadero (INMAG).
            El peso y el precio de cada animal se acuerdan en cada operación.
          </p>
          <p>Actualizado: {lastUpdate} · Memola Medios S.A.S.</p>
        </footer>
      </article>
    </>
  )
}
