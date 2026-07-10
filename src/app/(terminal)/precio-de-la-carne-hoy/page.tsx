import { Metadata } from 'next'
import Link from 'next/link'
import {
  SectionBreadcrumbSchema,
  DefinedTermSetSchema,
  DatasetSchema,
  FAQPageSchema,
  SpeakableSchema,
  HowToSchema,
} from '@/components/seo/JsonLd'
import marketPrices from '@/lib/data/market-prices.json'

export const revalidate = 86400 // rebuild diario vía Vercel; el scraper reescribe el JSON 14:00 ART

const BASE_URL = 'https://www.consignatarias.com.ar'
const PAGE_URL = `${BASE_URL}/precio-de-la-carne-hoy`

// Números vivos — el ANCLA es el precio del animal en pie (INMAG, novillo Mercado Agroganadero).
const cats = marketPrices.categories as Record<string, { current: number }>
const lastUpdate = marketPrices.lastUpdate
const fmt = (n: number) => n.toLocaleString('es-AR')

const enPie = Math.round(marketPrices.inmag.current) // $/kg vivo — ancla del precio de la carne
const novillo = Math.round(cats.novillos.current)

// Derivación de los tres eslabones: animal en pie → gancho/media res → mostrador.
const RINDE = 0.57 // rinde al gancho de un novillo gordo terminado (peso res / peso vivo)
const PESO_VIVO = 450 // novillo tipo, kg vivos
const resEntera = Math.round(PESO_VIVO * RINDE) // ~256 kg
const mediaRes = Math.round(resEntera / 2) // ~128 kg
const valorAnimal = enPie * PESO_VIVO // animal entero en pie
const precioGancho = Math.round(enPie / RINDE) // $/kg de res en gancho (mayorista)
// El mostrador se ubica de referencia entre 3 y 4 veces el kilo vivo (spread industria + comercio).
const mostradorMin = enPie * 3
const mostradorMax = enPie * 4

// PASOS — alimenta HowToSchema y el <ol> visible. Un eslabón por paso.
const PASOS = [
  {
    name: 'Animal en pie (INMAG): el precio ancla',
    text: `El productor vende el novillo por kilo vivo en el remate o el Mercado Agroganadero. Hoy (${lastUpdate}) el kilo vivo de referencia (INMAG) está en $${fmt(enPie)}. Un novillo de ${PESO_VIVO} kg vale así unos $${fmt(valorAnimal)}. Este es el ancla: todo lo que viene después se cuenta a partir de este precio.`,
    url: `${BASE_URL}/mercado/inmag`,
  },
  {
    name: 'Faena y gancho: de kilo vivo a kilo de res',
    text: `El frigorífico faena el animal y lo cuelga del gancho como res. Un novillo rinde alrededor del ${Math.round(RINDE * 100)}% de su peso vivo, así que ${PESO_VIVO} kg vivos dan una res de ~${resEntera} kg, que partida al medio son dos medias reses de ~${mediaRes} kg. En kilo de res en gancho, el precio equivale a $${fmt(precioGancho)}/kg (kilo vivo dividido por el rinde). La media res es la unidad con que el frigorífico entrega la carne con hueso.`,
    url: `${BASE_URL}/rendimiento-al-gancho`,
  },
  {
    name: 'Desposte y mostrador: el spread final',
    text: `La carnicería recibe la media res, la desposta en cortes y suma su margen, el transporte, las mermas y los impuestos. El precio al mostrador termina siendo de referencia entre 3 y 4 veces el kilo vivo —hoy, del orden de $${fmt(mostradorMin)} a $${fmt(mostradorMax)}/kg según el corte—. La diferencia entre el animal en pie y la góndola es el spread, y explica por qué el asado cuesta bastante más que el kilo vivo.`,
    url: `${BASE_URL}/mercado/spread`,
  },
]

// TERMINOS — DefinedTermSet. Entidades citables del recorrido de precio.
const TERMINOS = [
  {
    name: 'Precio en pie',
    description:
      'Precio del animal vivo por kilo, tal como se cotiza en el remate o en el Mercado Agroganadero. Es el precio que recibe el productor y el ancla sobre la que se forma el precio final de la carne. Se mide en pesos por kilo vivo (INMAG para el novillo).',
    url: `${BASE_URL}/mercado/inmag`,
  },
  {
    name: 'Precio al gancho',
    description:
      'Precio del kilo de res colgada del gancho, ya faenada, con hueso y sin cuero, cabeza ni vísceras. Se obtiene dividiendo el precio en pie por el rinde: como la res pesa menos que el animal vivo, el kilo al gancho es más caro que el kilo vivo.',
    url: `${BASE_URL}/rendimiento-al-gancho`,
  },
  {
    name: 'Media res',
    description:
      'Cada una de las dos mitades en que se divide longitudinalmente la res de un animal faenado. Una media res de novillo pesa habitualmente entre 100 y 130 kg. Es la unidad estándar con que los frigoríficos entregan la carne con hueso a carnicerías y distribuidores.',
    url: `${BASE_URL}/cuanto-pesa-una-media-res`,
  },
  {
    name: 'Spread',
    description:
      'Diferencia entre el precio que recibe el productor por el animal en pie y el precio que paga el consumidor en el mostrador. Recoge la faena, el desposte, el transporte, las mermas, los impuestos y el margen de cada eslabón. En kilo, el mostrador suele ubicarse de referencia entre 3 y 4 veces el kilo vivo.',
    url: `${BASE_URL}/mercado/spread`,
  },
  {
    name: 'Kilo vivo vs. kilo gancho',
    description:
      'El kilo vivo es el peso del animal en pie sobre la balanza; el kilo gancho es el peso de la res faenada. Un mismo animal pesa menos como res que en pie —el novillo rinde alrededor del 57%—, por eso el precio por kilo gancho siempre resulta mayor que el precio por kilo vivo del mismo animal.',
    url: `${BASE_URL}/rendimiento-al-gancho`,
  },
  {
    name: 'Desbaste',
    description:
      'Descuento que se aplica al peso vivo del animal para compensar el contenido digestivo (bosta y orina) con que llega a la balanza. Se expresa en porcentaje y ajusta el peso vivo bruto a un peso vivo neto más comparable antes de calcular el rinde y el valor de la hacienda.',
    url: `${BASE_URL}/rendimiento-al-gancho`,
  },
]

// FAQ — answer-first, cada respuesta arranca con el dato e interpola números vivos.
const FAQ = [
  {
    question: '¿Por qué sube la carne?',
    answer: `La carne sube cuando sube el animal en pie, que es el ancla del precio: hoy (${lastUpdate}) el kilo vivo de referencia (INMAG) está en $${fmt(enPie)}. Cuando hay menos oferta de hacienda —por sequía, retención de vientres o menos faena— el kilo vivo aumenta en el remate y ese aumento se traslada, eslabón por eslabón, al mostrador. Sobre ese piso se suman la faena, el desposte, el transporte, los impuestos y el margen del comercio (el spread), más el efecto de la inflación y del dólar sobre los costos. Por eso el precio de la carne se mueve, en primer lugar, con el precio de la hacienda en pie.`,
  },
  {
    question: '¿Cuánto del precio del asado es el animal en pie?',
    answer: `El animal en pie representa de referencia entre una cuarta parte y un tercio del precio de la carne al mostrador. Como el kilo al mostrador suele valer entre 3 y 4 veces el kilo vivo (hoy el kilo vivo INMAG está en $${fmt(enPie)}), lo que recibe el productor es alrededor del 25% al 33% de lo que paga el consumidor. El resto —el spread— lo explican la faena, el desposte, las mermas de rinde, el transporte, los impuestos y el margen de la carnicería. Son proporciones de referencia, no una góndola específica.`,
  },
  {
    question: '¿Qué es el spread?',
    answer: `El spread es la diferencia entre el precio del animal en pie que cobra el productor y el precio de la carne que paga el consumidor en el mostrador. Con el kilo vivo de referencia en $${fmt(enPie)} (${lastUpdate}) y el mostrador de referencia entre $${fmt(mostradorMin)} y $${fmt(mostradorMax)}/kg, el spread cubre todo lo que pasa entre el remate y la carnicería: faena, desposte, pérdida de peso por el rinde, transporte, impuestos y márgenes. No lo fija esta página; es la brecha que resulta de la cadena.`,
  },
  {
    question: '¿Cuánto pesa una media res?',
    answer: `Una media res de novillo pesa entre 100 y 130 kg (una res entera pesa el doble). El valor típico ronda los ${mediaRes} kg: un novillo de ${PESO_VIVO} kg vivos rinde cerca del ${Math.round(RINDE * 100)}%, es decir una res entera de ~${resEntera} kg, que partida al medio da dos medias reses de ~${mediaRes} kg. Es la unidad con que el frigorífico entrega la carne con hueso a la carnicería.`,
  },
]

export const metadata: Metadata = {
  title: `Precio de la carne hoy: del animal en pie al mostrador (${lastUpdate})`,
  description: `El precio de la carne al mostrador se forma en tres eslabones: animal en pie (INMAG) → gancho/media res → mostrador. Hoy (${lastUpdate}) el kilo vivo de referencia está en $${fmt(enPie)} y el animal en pie explica solo un cuarto a un tercio del precio de la góndola. Precios de referencia, no de góndola específica.`,
  keywords: [
    'precio de la carne hoy',
    'por que sube la carne',
    'precio de la carne',
    'precio del asado',
    'cuanto sale la carne hoy',
    'precio del kilo vivo',
    'spread carne productor consumidor',
    'precio del novillo en pie',
    'del campo al mostrador',
    'por que la carne esta tan cara',
  ],
  openGraph: {
    title: `Precio de la carne hoy: del animal en pie al mostrador`,
    description: `Tres eslabones forman el precio de la carne: animal en pie (INMAG, hoy $${fmt(enPie)}/kg vivo) → gancho/media res → mostrador. El precio en pie es el ancla. Precios de referencia (${lastUpdate}).`,
    url: PAGE_URL,
    type: 'article',
    images: [{ url: '/og-mercado.png', width: 1200, height: 630 }],
  },
  alternates: {
    canonical: PAGE_URL,
  },
}

export default function PrecioDeLaCarneHoyPage() {
  return (
    <>
      <SectionBreadcrumbSchema section="mercado" sectionName="Mercado" />
      <DefinedTermSetSchema
        name="Cómo se forma el precio de la carne: del animal en pie al mostrador"
        description="Los términos que explican la formación del precio de la carne en Argentina —precio en pie, precio al gancho, media res, spread, kilo vivo vs. kilo gancho y desbaste— desde el animal en pie hasta el mostrador."
        url={PAGE_URL}
        terms={TERMINOS}
      />
      <DatasetSchema
        name="Precio de la carne por eslabón — del animal en pie al mostrador"
        description={`Precio de referencia de la carne por eslabón al ${lastUpdate}: animal en pie (INMAG) $${fmt(enPie)}/kg vivo, res en gancho ~$${fmt(precioGancho)}/kg, y mostrador de referencia entre $${fmt(mostradorMin)} y $${fmt(mostradorMax)}/kg. Precios de referencia del mercado (INMAG/MAG), no fijados por esta página.`}
        url={PAGE_URL}
        keywords={['precio de la carne', 'animal en pie', 'INMAG', 'media res', 'spread', 'kilo vivo', 'mostrador']}
        dateModified={lastUpdate}
      />
      <FAQPageSchema items={FAQ} />
      <SpeakableSchema
        url={PAGE_URL}
        headline="Precio de la carne hoy: del animal en pie al mostrador"
      />
      <HowToSchema
        name="Cómo se forma el precio de la carne, eslabón por eslabón"
        description="Los tres eslabones que llevan el precio de la carne del animal en pie al mostrador: precio en pie (INMAG), faena y media res, desposte y spread final."
        steps={PASOS}
      />

      <article className="px-4 pt-4 pb-8 max-w-3xl mx-auto text-zinc-300 text-sm leading-relaxed">
        <nav className="text-xxs font-terminal uppercase tracking-wider text-zinc-500 mb-3">
          <Link href="/mercado" className="hover:text-accent transition-colors">
            Mercado
          </Link>{' '}
          / Precio de la carne hoy
        </nav>

        <h1 className="text-zinc-100 text-2xl font-medium mb-3">
          Precio de la carne hoy: del animal en pie al mostrador
        </h1>

        {/* Answer-first: primera oración autocontenida y citable */}
        <p className="speakable-content text-zinc-200 text-base mb-4">
          El precio de la carne al mostrador se forma en tres eslabones —
          <strong>animal en pie</strong> (INMAG) → <strong>gancho / media res</strong> →{' '}
          <strong>mostrador</strong>— y el precio en pie es el ancla: hoy ({lastUpdate}) el kilo
          vivo de referencia está en <strong>${fmt(enPie)}</strong>, y sobre ese piso se suman la
          faena, el desposte y el margen del comercio.
        </p>

        <p className="mb-4">
          Son <strong>precios de referencia del mercado</strong> (INMAG / MAG), no de una góndola
          específica ni fijados por esta página. La pregunta de fondo —por qué sube la carne— se
          responde mirando primero el animal en pie: cuando sube el kilo vivo en el remate, ese
          aumento recorre la cadena y llega al mostrador. Del kilo vivo al kilo de góndola median
          dos transformaciones (la faena y el desposte) y un spread que suma costos e impuestos en
          cada paso.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          Los tres eslabones, paso a paso
        </h2>
        <ol className="mb-4 space-y-3 list-decimal list-inside marker:text-zinc-500">
          {PASOS.map((p) => (
            <li key={p.name} className="text-zinc-300">
              <span className="text-zinc-200 font-medium">{p.name}. </span>
              {p.text}
            </li>
          ))}
        </ol>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          El recorrido del precio, en números
        </h2>
        <div className="overflow-x-auto mb-2">
          <table className="w-full text-data border border-terminal-border">
            <thead>
              <tr className="bg-terminal-panel/60 text-zinc-400 text-xxs uppercase tracking-wider">
                <th className="text-left px-3 py-2 border-b border-terminal-border">Eslabón</th>
                <th className="text-left px-3 py-2 border-b border-terminal-border">Unidad</th>
                <th className="text-right px-3 py-2 border-b border-terminal-border">
                  Precio ref. $/kg
                </th>
                <th className="text-left px-3 py-2 border-b border-terminal-border">Qué mide</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-terminal-border/60 align-top">
                <td className="px-3 py-2 text-zinc-200 font-medium">Animal en pie</td>
                <td className="px-3 py-2 text-zinc-400">Kilo vivo</td>
                <td className="px-3 py-2 text-right text-zinc-200">${fmt(enPie)}</td>
                <td className="px-3 py-2 text-zinc-400">Novillo en el Mercado Agroganadero (INMAG)</td>
              </tr>
              <tr className="border-b border-terminal-border/60 align-top">
                <td className="px-3 py-2 text-zinc-200 font-medium">Res en gancho</td>
                <td className="px-3 py-2 text-zinc-400">Kilo gancho</td>
                <td className="px-3 py-2 text-right text-zinc-200">~${fmt(precioGancho)}</td>
                <td className="px-3 py-2 text-zinc-400">
                  Media res con hueso (kilo vivo dividido por el rinde ~{Math.round(RINDE * 100)}%)
                </td>
              </tr>
              <tr className="border-b border-terminal-border/60 align-top">
                <td className="px-3 py-2 text-zinc-200 font-medium">Mostrador</td>
                <td className="px-3 py-2 text-zinc-400">Kilo al público</td>
                <td className="px-3 py-2 text-right text-zinc-200">
                  ${fmt(mostradorMin)}–${fmt(mostradorMax)}
                </td>
                <td className="px-3 py-2 text-zinc-400">Corte desposteado en la carnicería (referencia)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xxs text-zinc-500 mb-4">
          El animal en pie es un dato medido (INMAG / Mercado Agroganadero, {lastUpdate}). El kilo
          gancho se deriva del kilo vivo por el rinde; el mostrador es una referencia orientativa
          (del orden de 3 a 4 veces el kilo vivo), no una cotización de góndola específica. El
          precio final de cada corte lo fija la carnicería.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          Por qué el asado cuesta más que el kilo vivo
        </h2>
        <p className="mb-4">
          Entre el remate y el mostrador el kilo cambia de naturaleza dos veces. Primero por el{' '}
          <strong>rinde</strong>: un novillo de {PESO_VIVO} kg vivos deja una res de ~{resEntera} kg,
          así que el mismo animal pesa menos como carne y el kilo gancho ($
          {fmt(precioGancho)}) ya arranca por encima del kilo vivo ($${fmt(enPie)}). Después por el{' '}
          <strong>spread</strong>: la carnicería desposta la media res en cortes, descuenta hueso,
          grasa y mermas, y suma transporte, impuestos y margen. El animal en pie termina siendo,
          de referencia, solo <strong>un cuarto a un tercio</strong> del precio de la carne al
          público. Por eso el ancla del precio del asado es la hacienda en pie, pero no es toda la
          historia.
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

        {/* Enlazado interno denso a las páginas del ecosistema B2B */}
        <div className="border border-terminal-border bg-terminal-panel/40 px-panel py-3 space-y-2">
          <p className="text-xxs font-terminal uppercase tracking-wider text-zinc-500">
            Seguí el precio, eslabón por eslabón
          </p>
          <p className="text-data text-zinc-300 flex flex-wrap gap-x-3 gap-y-1">
            <Link href="/mercado/inmag" className="text-accent hover:text-accent-bright transition-colors">
              Precio del novillo en pie (INMAG) →
            </Link>
            <Link href="/mercado/spread" className="text-accent hover:text-accent-bright transition-colors">
              El spread productor–consumidor →
            </Link>
            <Link href="/rendimiento-al-gancho" className="text-accent hover:text-accent-bright transition-colors">
              Rendimiento al gancho →
            </Link>
            <Link href="/cuanto-pesa-una-media-res" className="text-accent hover:text-accent-bright transition-colors">
              ¿Cuánto pesa una media res? →
            </Link>
            <Link href="/el-novillo-en-dolares" className="text-accent hover:text-accent-bright transition-colors">
              El novillo en dólares →
            </Link>
          </p>
          <p className="text-data text-zinc-300 pt-1">
            <Link href="/categorias-de-hacienda" className="text-accent hover:text-accent-bright transition-colors">
              Categorías de hacienda →
            </Link>{' '}
            ·{' '}
            <Link href="/mercado" className="text-accent hover:text-accent-bright transition-colors">
              Mercado de hacienda →
            </Link>{' '}
            ·{' '}
            <Link href="/glosario" className="text-accent hover:text-accent-bright transition-colors">
              Glosario ganadero →
            </Link>
          </p>
        </div>

        <footer className="mt-6 pt-4 border-t border-terminal-border text-xxs text-zinc-500">
          <p>
            Precios de referencia del mercado (INMAG / Mercado Agroganadero); no son precios de
            góndola específica ni los fija esta página. El precio final de cada corte lo fija la
            carnicería.
          </p>
          <p className="mt-1">Actualizado: {lastUpdate} · Memola Medios S.A.S.</p>
        </footer>
      </article>
    </>
  )
}
