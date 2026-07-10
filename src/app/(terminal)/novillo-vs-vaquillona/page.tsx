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

export const revalidate = 86400 // rebuild diario vía Vercel; el JSON lo commitea el scraper 14:00 ART

const PAGE_URL = 'https://www.consignatarias.com.ar/novillo-vs-vaquillona'

// Números vivos — interpolados en build; el scraper reescribe el JSON 14:00 ART.
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

// Fuente única de la tabla comparativa cara a cara: una fila por categoría con
// sexo, edad, peso, uso y precio de referencia por kilo vivo (INMAG/panel MAG).
type Row = {
  label: string
  slug: string | null // /mercado/<slug> — precio en vivo por categoría
  sexo: string
  edad: string
  peso: string
  uso: string
  priceKey: string | null
  live: number | null
}

const ROWS: Row[] = [
  {
    label: 'Ternero',
    slug: 'terneros',
    sexo: 'Macho',
    edad: 'Menos de 1 año (destete)',
    peso: '160–200 kg',
    uso: 'Invernada / recría',
    priceKey: 'terneros',
    live: ternero,
  },
  {
    label: 'Ternera',
    slug: 'terneros',
    sexo: 'Hembra',
    edad: 'Menos de 1 año (destete)',
    peso: '150–190 kg',
    uso: 'Invernada / reposición',
    priceKey: 'terneros',
    live: ternero,
  },
  {
    label: 'Novillito',
    slug: 'novillitos',
    sexo: 'Macho castrado',
    edad: '1–2 años',
    peso: '300–390 kg',
    uso: 'Faena liviana (consumo)',
    priceKey: 'novillitos',
    live: novillito,
  },
  {
    label: 'Novillo',
    slug: 'novillos',
    sexo: 'Macho castrado',
    edad: 'Más de 2 años',
    peso: '400–500 kg',
    uso: 'Faena pesada / exportación',
    priceKey: 'novillos',
    live: novillo,
  },
  {
    label: 'Vaquillona',
    slug: 'vaquillonas',
    sexo: 'Hembra',
    edad: 'Aún no parió',
    peso: '300–380 kg',
    uso: 'Reposición del rodeo o faena',
    priceKey: 'vaquillonas',
    live: vaquillona,
  },
  {
    label: 'Vaca',
    slug: 'vacas',
    sexo: 'Hembra',
    edad: 'Ya parió (adulta)',
    peso: '380–460 kg',
    uso: 'Cría, descarte o manufactura',
    priceKey: 'vacas',
    live: vaca,
  },
  {
    label: 'Toro',
    slug: 'toros',
    sexo: 'Macho entero',
    edad: 'Adulto reproductor',
    peso: '700–1000 kg',
    uso: 'Reproducción o manufactura',
    priceKey: 'toros',
    live: toro,
  },
]

// Entidad citable — cada categoría como DefinedTerm con @id estable (name + edad + peso + uso).
const TERMINOS = [
  {
    name: 'Ternero',
    description:
      'Bovino macho de menos de 1 año, al destete, de 160 a 200 kg de peso vivo. Es hacienda de invernada: se vende para recría o engorde, no para faena. Suele liderar el precio por kilo vivo por su potencial de crecimiento.',
    url: 'https://www.consignatarias.com.ar/mercado/terneros',
  },
  {
    name: 'Ternera',
    description:
      'Bovino hembra de menos de 1 año, al destete, de 150 a 190 kg de peso vivo. Según su destino se cría para reposición del rodeo (futura vaquillona) o se vende para invernada. Se cotiza junto al ternero en el panel de invernada.',
    url: 'https://www.consignatarias.com.ar/mercado/terneros',
  },
  {
    name: 'Novillito',
    description:
      'Macho bovino castrado de 1 a 2 años, de 300 a 390 kg de peso vivo. Categoría de faena liviana, muy demandada por el consumo interno argentino por su terminación más temprana que la del novillo.',
    url: 'https://www.consignatarias.com.ar/mercado/novillitos',
  },
  {
    name: 'Novillo',
    description:
      'Macho bovino castrado de más de 2 años, de 400 a 500 kg de peso vivo. Es la categoría de referencia del mercado —el INMAG se calcula sobre ella— y la base de la exportación y el consumo pesado. Pesa más que la vaquillona.',
    url: 'https://www.consignatarias.com.ar/mercado/novillos',
  },
  {
    name: 'Vaquillona',
    description:
      'Hembra bovina que aún no ha parido, de 300 a 380 kg de peso vivo. Según su destino se cría para reposición del rodeo (futura vaca de cría) o se termina para faena. Vale más por kilo que la vaca por su carne más tierna, y pesa menos que el novillo.',
    url: 'https://www.consignatarias.com.ar/mercado/vaquillonas',
  },
  {
    name: 'Vaca',
    description:
      'Hembra bovina adulta que ya ha parido, de 380 a 460 kg de peso vivo. Como categoría de mercado agrupa a las vacas de descarte, conserva y manufactura que van a faena; la vaca de cría preñada se valúa aparte por su función reproductiva.',
    url: 'https://www.consignatarias.com.ar/mercado/vacas',
  },
  {
    name: 'Toro',
    description:
      'Macho bovino entero (no castrado) reproductor adulto, de 700 a 1000 kg de peso vivo. Los toros de pedigrí se comercializan por genética; los de descarte van a faena de manufactura, con el menor precio por kilo del panel.',
    url: 'https://www.consignatarias.com.ar/mercado/toros',
  },
]

// FAQ — cada respuesta arranca con el dato (answer-first) e interpola números vivos.
const FAQ = [
  {
    question: '¿Cuál es la diferencia entre novillo y novillito?',
    answer: `La diferencia entre novillo y novillito es la edad y el peso: ambos son machos castrados, pero el novillito tiene 1–2 años y 300–390 kg, mientras que el novillo supera los 2 años y llega a 400–500 kg. El novillo es la categoría de referencia del mercado (sobre la que se calcula el INMAG) y hoy vale $${fmt(novillo)}/kg vivo; el novillito, de faena más liviana, cotiza a $${fmt(novillito)}/kg (Mercado Agroganadero, ${lastUpdate}). Son precios de referencia del mercado, no fijados por esta página.`,
  },
  {
    question: '¿Novillo o vaquillona, cuál pesa más?',
    answer: `El novillo pesa más que la vaquillona: un novillo terminado ronda los 400–500 kg de peso vivo, mientras que la vaquillona (hembra que aún no parió) se ubica en 300–380 kg. Además de pesar más, el novillo cotiza más caro por kilo: hoy $${fmt(novillo)}/kg vivo contra $${fmt(vaquillona)}/kg de la vaquillona (Mercado Agroganadero, ${lastUpdate}).`,
  },
  {
    question: '¿Qué categoría es más cara por kilo?',
    answer: `El ternero es la categoría más cara por kilo vivo: hoy cotiza a $${fmt(ternero)}/kg en el Mercado Agroganadero (${lastUpdate}), por encima del novillo ($${fmt(novillo)}), el novillito ($${fmt(novillito)}), la vaquillona ($${fmt(vaquillona)}), la vaca ($${fmt(vaca)}) y el toro ($${fmt(toro)}). Se paga más caro porque es hacienda de invernada con potencial de crecimiento por delante, no un animal terminado para faena.`,
  },
  {
    question: '¿A qué edad pasa de ternero a novillito?',
    answer: `Un ternero macho pasa a novillito alrededor del año de vida, una vez destetado y castrado: el ternero es la categoría de menos de 1 año (160–200 kg) y el novillito la de 1 a 2 años (300–390 kg). El límite no es un día exacto sino el tramo de peso y terminación; a partir de los 2 años y 400 kg el animal ya se clasifica como novillo.`,
  },
]

export const metadata: Metadata = {
  title: `Novillo, novillito, vaquillona, ternero y vaca: diferencias y precios ${lastUpdate.slice(0, 4)}`,
  description: `Sexo, edad y peso definen cada categoría de hacienda. Novillo (macho castrado +2 años, 400–500 kg) $${fmt(novillo)}/kg, novillito (1–2 años) $${fmt(novillito)}/kg, vaquillona (hembra sin parir) $${fmt(vaquillona)}/kg, ternero $${fmt(ternero)}/kg y vaca $${fmt(vaca)}/kg vivo, con precio de referencia del INMAG (${lastUpdate}).`,
  keywords: [
    'diferencia entre novillo novillito vaquillona ternero y vaca',
    'diferencia entre novillo y novillito',
    'diferencia entre novillo y vaquillona',
    'diferencia entre vaquillona y vaca',
    'diferencia entre ternero y novillito',
    'novillo vs vaquillona',
    'que pesa mas novillo o vaquillona',
    'que categoria de hacienda es mas cara por kilo',
    'a que edad pasa de ternero a novillito',
    'novillo novillito vaquillona ternero vaca diferencias',
  ],
  openGraph: {
    title: 'Novillo, novillito, vaquillona, ternero y vaca: diferencias y precios',
    description: `Sexo, edad y peso definen cada categoría de hacienda, con distinto destino de faena o exportación. Comparativa cara a cara con precio de referencia por kilo vivo (${lastUpdate}).`,
    url: PAGE_URL,
    type: 'article',
    images: [{ url: '/og-mercado.png', width: 1200, height: 630 }],
  },
  alternates: {
    canonical: PAGE_URL,
  },
}

export default function NovilloVsVaquillonaPage() {
  return (
    <>
      <SectionBreadcrumbSchema
        section="categorias-de-hacienda"
        sectionName="Categorías de hacienda"
      />
      <DefinedTermSetSchema
        name="Novillo, novillito, vaquillona, ternero, ternera, vaca y toro"
        description="Las categorías de hacienda bovina argentina comparadas cara a cara por sexo, edad, peso y uso —novillo, novillito, vaquillona, ternero, ternera, vaca y toro."
        url={PAGE_URL}
        terms={TERMINOS}
      />
      <FAQPageSchema items={FAQ} />
      <SpeakableSchema
        url={PAGE_URL}
        headline="Novillo, novillito, vaquillona, ternero y vaca: diferencias y precios"
      />
      <DatasetSchema
        name="Precio de referencia por categoría de hacienda bovina — Mercado Agroganadero"
        description={`Precio de referencia por kilo vivo de cada categoría de hacienda bovina en el Mercado Agroganadero de Buenos Aires al ${lastUpdate}: novillo $${fmt(novillo)}, novillito $${fmt(novillito)}, vaquillona $${fmt(vaquillona)}, vaca $${fmt(vaca)}, toro $${fmt(toro)}, ternero $${fmt(ternero)} ($/kg vivo).`}
        url={PAGE_URL}
        keywords={['novillo', 'novillito', 'vaquillona', 'ternero', 'vaca', 'precio kilo vivo', 'mercado agroganadero', 'INMAG']}
        dateModified={lastUpdate}
      />

      <article className="px-4 pt-4 pb-8 max-w-3xl mx-auto text-zinc-300 text-sm leading-relaxed">
        <nav className="text-xxs font-terminal uppercase tracking-wider text-zinc-500 mb-3">
          <Link href="/categorias-de-hacienda" className="hover:text-accent transition-colors">
            Categorías de hacienda
          </Link>{' '}
          / Novillo vs vaquillona
        </nav>

        <h1 className="text-zinc-100 text-2xl font-medium mb-3">
          Novillo, novillito, vaquillona, ternero y vaca: diferencias y precios
        </h1>

        {/* Answer-first: primera oración autocontenida y citable */}
        <p className="speakable-content text-zinc-200 text-base mb-4">
          La diferencia entre novillo, novillito, vaquillona, ternero y vaca está en el{' '}
          <strong>sexo, la edad y el peso</strong>: esos tres criterios definen la categoría y su
          destino —faena liviana, faena pesada, exportación o reproducción—. Hoy ({lastUpdate}) el
          precio de referencia por kilo vivo va desde <strong>${fmt(vaca)}/kg</strong> (vaca) hasta{' '}
          <strong>${fmt(ternero)}/kg</strong> (ternero) según el INMAG.
        </p>

        <p className="mb-4">
          En una línea: el <strong>ternero</strong> es la cría de menos de 1 año (macho o hembra,
          hacienda de invernada); el <strong>novillito</strong> es el macho castrado de 1 a 2 años
          que va a faena liviana; el <strong>novillo</strong> es el macho castrado de más de 2 años,
          la categoría de referencia del mercado y base de la exportación; la{' '}
          <strong>vaquillona</strong> es la hembra que todavía no parió; y la <strong>vaca</strong>{' '}
          es la hembra adulta que ya parió. Todos los precios de esta página son{' '}
          <strong>de referencia del mercado</strong> (INMAG / panel MAG, por kilo vivo), no los fija
          esta página.
        </p>

        <p className="mb-4">
          Esta es la comparación cara a cara categoría por categoría. Si buscás la ficha completa de
          cada una con su rol en el rodeo, está en{' '}
          <Link
            href="/categorias-de-hacienda"
            className="text-accent hover:text-accent-bright transition-colors"
          >
            categorías de hacienda
          </Link>
          .
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          Tabla comparativa: sexo, edad, peso, uso y precio
        </h2>
        <div className="overflow-x-auto mb-2">
          <table className="w-full text-data border border-terminal-border">
            <thead>
              <tr className="bg-terminal-panel/60 text-zinc-400 text-xxs uppercase tracking-wider">
                <th className="text-left px-3 py-2 border-b border-terminal-border">Categoría</th>
                <th className="text-left px-3 py-2 border-b border-terminal-border">Sexo</th>
                <th className="text-left px-3 py-2 border-b border-terminal-border">Edad</th>
                <th className="text-left px-3 py-2 border-b border-terminal-border">Peso aprox.</th>
                <th className="text-left px-3 py-2 border-b border-terminal-border">Uso</th>
                <th className="text-right px-3 py-2 border-b border-terminal-border">
                  Precio ref. $/kg
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
                  <td className="px-3 py-2 text-zinc-400">{r.sexo}</td>
                  <td className="px-3 py-2 text-zinc-400">{r.edad}</td>
                  <td className="px-3 py-2 text-zinc-300">{r.peso}</td>
                  <td className="px-3 py-2 text-zinc-400">{r.uso}</td>
                  <td className="px-3 py-2 text-right text-zinc-200">
                    {r.live !== null ? `$${fmt(r.live)}` : 's/serie propia'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xxs text-zinc-500 mb-4">
          Precio por kilo vivo del Mercado Agroganadero (INMAG y panel de categorías, {lastUpdate}).
          Ternero y ternera comparten el panel de invernada. Es precio de referencia del mercado, no
          fijado por esta página; cada firma acuerda el precio final con el productor.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">Novillo vs novillito</h2>
        <p className="mb-4">
          Ambos son <strong>machos castrados</strong>; los separa la edad y el peso. El{' '}
          <strong>novillito</strong> tiene 1–2 años y 300–390 kg, y va a faena liviana para el
          consumo interno (hoy ${fmt(novillito)}/kg vivo). El <strong>novillo</strong> supera los 2
          años y llega a 400–500 kg, es la categoría de referencia del mercado —sobre la que se
          calcula el INMAG— y la base de la exportación y el consumo pesado (hoy ${fmt(novillo)}/kg).
          El novillo pesa más y cotiza más caro por kilo que el novillito ({lastUpdate}).
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">Novillo vs vaquillona</h2>
        <p className="mb-4">
          Se diferencian por el <strong>sexo</strong>: el novillo es macho castrado, la vaquillona
          es hembra que aún no parió. El novillo <strong>pesa más</strong> (400–500 kg contra 300–380
          kg de la vaquillona) y cotiza más caro por kilo (hoy ${fmt(novillo)}/kg vivo contra{' '}
          ${fmt(vaquillona)}/kg, {lastUpdate}). La vaquillona, según su destino, se guarda para
          reposición del rodeo —será una futura vaca de cría— o se termina para faena.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">Vaquillona vs vaca</h2>
        <p className="mb-4">
          Las dos son <strong>hembras</strong>; la línea que las separa es la{' '}
          <strong>parición</strong>. La vaquillona todavía no parió; la vaca ya parió y es un animal
          adulto. La vaquillona vale más por kilo (hoy ${fmt(vaquillona)}/kg vivo) por su carne más
          tierna; la vaca de descarte, conserva o manufactura cierra más abajo (hoy ${fmt(vaca)}/kg,{' '}
          {lastUpdate}). La vaca de cría preñada o con ternero al pie se valúa aparte por su función
          reproductiva.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">Ternero vs novillito</h2>
        <p className="mb-4">
          El <strong>ternero</strong> es la cría de menos de 1 año al destete (160–200 kg), macho o
          hembra, y es hacienda de <strong>invernada</strong>: se compra por su potencial de
          crecimiento, no por carne terminada, por eso lidera el precio por kilo (hoy ${fmt(ternero)}
          /kg vivo). Alrededor del año, destetado y castrado, el macho pasa a{' '}
          <strong>novillito</strong> (1–2 años, 300–390 kg); a partir de los 2 años y 400 kg ya es
          novillo. No es un día exacto sino el tramo de peso y terminación lo que define el salto de
          categoría.
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

        {/* Enlazado interno denso — precio en vivo por categoría + páginas hermanas */}
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
            <Link href="/mercado/terneros" className="text-accent hover:text-accent-bright transition-colors">
              Ternero →
            </Link>
            <Link href="/mercado/toros" className="text-accent hover:text-accent-bright transition-colors">
              Toro →
            </Link>
          </p>
          <p className="text-data text-zinc-300 pt-1">
            <Link href="/categorias-de-hacienda" className="text-accent hover:text-accent-bright transition-colors">
              Categorías de hacienda (ficha completa) →
            </Link>{' '}
            ·{' '}
            <Link href="/cuanto-pesa-un-novillo" className="text-accent hover:text-accent-bright transition-colors">
              ¿Cuánto pesa un novillo? →
            </Link>{' '}
            ·{' '}
            <Link href="/cuanto-vale-una-vaca" className="text-accent hover:text-accent-bright transition-colors">
              ¿Cuánto vale una vaca? →
            </Link>{' '}
            ·{' '}
            <Link href="/precio-del-ternero-en-pie" className="text-accent hover:text-accent-bright transition-colors">
              Precio del ternero en pie →
            </Link>
          </p>
        </div>

        <footer className="mt-6 pt-4 border-t border-terminal-border text-xxs text-zinc-500">
          <p>
            Precios de referencia del mercado (Mercado Agroganadero / INMAG); cada firma acuerda el
            precio final con el productor. Esta página no fija precios.
          </p>
          <p className="mt-1">Actualizado: {lastUpdate} · Memola Medios S.A.S.</p>
        </footer>
      </article>
    </>
  )
}
