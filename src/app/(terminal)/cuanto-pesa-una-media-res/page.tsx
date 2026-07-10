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

const PAGE_URL = 'https://www.consignatarias.com.ar/cuanto-pesa-una-media-res'

// Live values interpolated at build time — precio vivo del novillo para el ejemplo de "precio de la res"
const novillo = Math.round(marketPrices.categories.novillos.current)
const lastUpdate = marketPrices.lastUpdate
const usdBlue = marketPrices.usdBlue.current
const fmt = (n: number) => n.toLocaleString('es-AR')

// Rinde de referencia del novillo gordo terminado (peso res / peso vivo)
const RINDE_NOVILLO = 0.57
const PESO_VIVO_NOVILLO = 450
const resEnteraNovillo = Math.round(PESO_VIVO_NOVILLO * RINDE_NOVILLO) // ~256 kg
const mediaResNovillo = Math.round(resEnteraNovillo / 2) // ~128 kg

// Ejemplo precio res = precio vivo / rinde → $/kg de res "en gancho"
const precioResKg = Math.round(novillo / RINDE_NOVILLO)
const valorAnimalNovillo = novillo * PESO_VIVO_NOVILLO // animal entero en pie
const valorMediaResNovillo = Math.round(valorAnimalNovillo / 2) // costo mayorista de la media res
const valorMediaResUsd = Math.round(valorMediaResNovillo / usdBlue)

// Tabla answer-first: peso vivo → rinde → res entera → media res, por categoría
type Fila = {
  categoria: string
  pesoVivo: number
  rinde: number
}
const FILAS: Fila[] = [
  { categoria: 'Novillo', pesoVivo: 450, rinde: 0.57 },
  { categoria: 'Vaquillona', pesoVivo: 380, rinde: 0.56 },
  { categoria: 'Vaca', pesoVivo: 420, rinde: 0.52 },
  { categoria: 'Ternero', pesoVivo: 200, rinde: 0.55 },
]
const resEntera = (f: Fila) => Math.round(f.pesoVivo * f.rinde)
const mediaRes = (f: Fila) => Math.round((f.pesoVivo * f.rinde) / 2)

// FAQ — preguntas que el usuario tipea literalmente en Google / le pregunta a la IA
const FAQ = [
  {
    question: '¿Cuánto pesa una media res de novillo?',
    answer:
      'Una media res de novillo pesa entre 100 y 130 kg (una res entera pesa el doble, 200–260 kg). El valor típico ronda los 128 kg: un novillo de 450 kg vivos rinde alrededor del 57%, es decir una res entera de ~256 kg, que partida al medio da dos medias reses de ~128 kg cada una.',
  },
  {
    question: '¿Cuánta carne rinde una media res?',
    answer:
      'Una media res de novillo de ~128 kg rinde en carne comercializable aproximadamente el 70–75% de su peso, es decir unos 90–100 kg de cortes con hueso una vez descontados el desposte, el sebo y las mermas. El resto es hueso, grasa y recortes. En res entera de novillo (~256 kg) equivale a unos 180–200 kg de carne. El rinde final depende del tipo de animal, la terminación y el nivel de desposte.',
  },
  {
    question: '¿Cuánto pesa un cuarto trasero?',
    answer:
      'Un cuarto trasero de novillo pesa aproximadamente entre 55 y 70 kg: es un poco más pesado que el cuarto delantero porque concentra los cortes de mayor valor (peceto, nalga, cuadril, lomo, bife). Una media res de ~128 kg se divide en cuarto delantero (~58–62 kg) y cuarto trasero (~62–70 kg). Los pesos exactos varían según dónde se haga el corte entre costillas.',
  },
  {
    question: '¿Cuánto cuesta una media res de novillo?',
    answer: `A valor mayorista, una media res de novillo cuesta el equivalente a la mitad del animal en pie. Con el novillo a $${fmt(novillo)} por kilo vivo (Mercado Agroganadero, ${lastUpdate}), un animal de 450 kg vale ~$${fmt(valorAnimalNovillo)}, así que la media res ronda los $${fmt(valorMediaResNovillo)} (unos USD ${fmt(valorMediaResUsd)}). Llevado a kilo de res "en gancho", equivale a ~$${fmt(precioResKg)}/kg (precio vivo dividido por el rinde). Es una referencia mayorista del animal, no el precio de la carne al público en la carnicería.`,
  },
]

// Entidades citables — definiciones canónicas estilo /glosario
const TERMINOS = [
  {
    name: 'Media res',
    description:
      'Cada una de las dos mitades en que se divide longitudinalmente (por la columna) la res de un animal faenado. Una media res de novillo pesa habitualmente entre 100 y 130 kg. Es la unidad estándar en que los frigoríficos entregan la carne con hueso a carnicerías y distribuidores.',
    url: 'https://www.consignatarias.com.ar/cuanto-pesa-una-media-res',
  },
  {
    name: 'Res',
    description:
      'Cuerpo del animal bovino faenado, sin cuero, cabeza, patas ni vísceras, listo para el desposte. Una res entera de novillo pesa alrededor de 200–260 kg y equivale al peso vivo multiplicado por el rinde (~57% en un novillo gordo terminado). La res se divide en dos medias reses.',
    url: 'https://www.consignatarias.com.ar/glosario',
  },
  {
    name: 'Rinde (al gancho)',
    description:
      'Relación entre el peso de la res y el peso vivo del animal, expresada en porcentaje. Un novillo terminado rinde alrededor del 56–58%; las vacas de conserva rinden menos (~50–53%). Es el factor que convierte kilos vivos en kilos de res y explica por qué la media res pesa bastante menos que la mitad del animal en pie.',
    url: 'https://www.consignatarias.com.ar/rendimiento-al-gancho',
  },
  {
    name: 'Peso vivo',
    description:
      'Peso del animal en pie, tal como sube a la balanza en el mercado o el remate. Es la base sobre la que se cotiza la hacienda en pesos por kilo vivo en el Mercado Agroganadero. Del peso vivo se llega al peso de la res aplicando el rinde.',
    url: 'https://www.consignatarias.com.ar/glosario',
  },
  {
    name: 'Cuarto (delantero / trasero)',
    description:
      'Cada media res se divide en dos cuartos. El cuarto delantero incluye paleta, aguja, asado y cogote; el cuarto trasero concentra los cortes de mayor valor (peceto, nalga, cuadril, lomo, bife). En un novillo, el cuarto delantero pesa ~58–62 kg y el trasero ~62–70 kg.',
    url: 'https://www.consignatarias.com.ar/glosario',
  },
]

export const metadata: Metadata = {
  // Gana el cluster "cuánto pesa una media res (de novillo / vaca / ternero)".
  // Cruce consumidor + carnicero + trade; puente hacia rinde al gancho y precio por kg.
  title: 'Cuánto Pesa una Media Res de Novillo, Vaca y Ternero (kg y rinde)',
  description:
    'Una media res de novillo pesa entre 100 y 130 kg (res entera 200–260 kg), un rinde del 56–58% sobre un animal de 450 kg vivos. Tabla por categoría, cuántos kg de carne salen y a cuánto sale la media res.',
  keywords: [
    'cuanto pesa una media res',
    'cuanto pesa una media res de novillo',
    'cuanto pesa una media res de vaca',
    'cuanto pesa una res entera',
    'peso media res kg',
    'cuanta carne rinde una media res',
    'cuanto pesa un cuarto trasero',
    'rinde al gancho novillo',
    'cuanto sale una media res',
    'peso res novillo vaca ternero',
  ],
  openGraph: {
    title: 'Cuánto pesa una media res de novillo, vaca y ternero',
    description:
      'Media res de novillo: 100–130 kg (res entera 200–260 kg), rinde 56–58% sobre 450 kg vivos. Tabla por categoría + cuánta carne rinde + precio de referencia.',
    url: PAGE_URL,
    type: 'article',
    images: [{ url: '/og-mercado.png', width: 1200, height: 630 }],
  },
  alternates: {
    canonical: PAGE_URL,
  },
}

export default function CuantoPesaUnaMediaResPage() {
  return (
    <>
      <SectionBreadcrumbSchema
        section="cuanto-pesa-una-media-res"
        sectionName="Cuánto pesa una media res"
      />
      <DefinedTermSetSchema
        name="Media res, res y rinde — glosario de faena"
        description="Definiciones de media res, res, rinde al gancho, peso vivo y cuarto en el mercado ganadero argentino."
        url={PAGE_URL}
        terms={TERMINOS}
      />
      <FAQPageSchema items={FAQ} />
      <SpeakableSchema
        url={PAGE_URL}
        headline="Cuánto pesa una media res de novillo, vaca y ternero"
      />
      <DatasetSchema
        name="Pesos de media res por categoría"
        description={`Peso vivo, rinde al gancho, peso de res entera y peso de media res para novillo, vaquillona, vaca y ternero. El novillo (450 kg vivos, rinde ${Math.round(
          RINDE_NOVILLO * 100
        )}%) da una res de ${resEnteraNovillo} kg y una media res de ${mediaResNovillo} kg. Precio de referencia derivado del kilo vivo del Mercado Agroganadero al ${lastUpdate}.`}
        url={PAGE_URL}
        keywords={['media res', 'res', 'rinde al gancho', 'peso vivo', 'novillo', 'vaca', 'ternero']}
        dateModified={lastUpdate}
      />

      <article className="px-4 pt-4 pb-8 max-w-3xl mx-auto text-zinc-300 text-sm leading-relaxed">
        <nav className="text-xxs font-terminal uppercase tracking-wider text-zinc-500 mb-3">
          <Link href="/mercado" className="hover:text-accent transition-colors">
            Mercado
          </Link>{' '}
          / Cuánto pesa una media res
        </nav>

        <h1 className="text-zinc-100 text-2xl font-medium mb-3">
          Cuánto pesa una media res de novillo, vaca y ternero
        </h1>

        {/* Answer-first: primera oración = la que gana el featured snippet / respuesta de voz */}
        <p className="speakable-content text-zinc-200 text-base mb-4">
          Una media res de novillo pesa <strong>entre 100 y 130 kg</strong> (una res entera{' '}
          <strong>200–260 kg</strong>), lo que equivale a un <strong>rinde del 56–58%</strong> sobre
          un animal de 450 kg vivos.
        </p>

        <p className="mb-4">
          La media res es cada una de las dos mitades en que se parte la res —el animal faenado, sin
          cuero, cabeza, patas ni vísceras— cortada a lo largo de la columna. Es la unidad estándar
          con la que los <Link href="/frigorificos" className="text-accent hover:text-accent-bright transition-colors">frigoríficos</Link>{' '}
          entregan la carne con hueso a carnicerías y distribuidores. El peso depende de dos cosas:
          cuánto pesaba el animal vivo y cuánto rinde al gancho, es decir qué porcentaje de ese peso
          queda como res.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          Peso de la media res por categoría
        </h2>
        <div className="overflow-x-auto mb-2">
          <table className="w-full text-data border border-terminal-border">
            <thead>
              <tr className="bg-terminal-panel/60 text-zinc-400 text-xxs uppercase tracking-wider">
                <th className="text-left px-3 py-2 border-b border-terminal-border">Categoría</th>
                <th className="text-right px-3 py-2 border-b border-terminal-border">Peso vivo</th>
                <th className="text-right px-3 py-2 border-b border-terminal-border">Rinde %</th>
                <th className="text-right px-3 py-2 border-b border-terminal-border">Res entera</th>
                <th className="text-right px-3 py-2 border-b border-terminal-border">Media res</th>
              </tr>
            </thead>
            <tbody>
              {FILAS.map((f) => (
                <tr key={f.categoria} className="border-b border-terminal-border/60">
                  <td className="px-3 py-2 text-zinc-300">{f.categoria}</td>
                  <td className="px-3 py-2 text-right text-zinc-200">{f.pesoVivo} kg</td>
                  <td className="px-3 py-2 text-right text-zinc-400">
                    {Math.round(f.rinde * 100)}%
                  </td>
                  <td className="px-3 py-2 text-right text-zinc-300">~{resEntera(f)} kg</td>
                  <td className="px-3 py-2 text-right text-zinc-100">~{mediaRes(f)} kg</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xxs text-zinc-500 mb-4">
          Pesos de referencia para animales terminados de razas de carne. El rinde y el peso reales
          varían por tipo de animal, terminación, grado de engrasamiento y dónde se hace el corte.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          De peso vivo a media res (el rinde)
        </h2>
        <p className="mb-4">
          El <strong>rinde al gancho</strong> es la relación entre el peso de la res y el peso vivo
          del animal. Un novillo gordo terminado rinde alrededor del <strong>57%</strong>: de 450 kg
          vivos quedan ~{resEnteraNovillo} kg de res entera, que partida al medio da dos medias reses
          de ~{mediaResNovillo} kg. Las vacas de conserva rinden menos (~50–53%) porque tienen más
          hueso y menos músculo en proporción, y los terneros rinden intermedio. Por eso la media res
          nunca pesa la mitad del animal en pie: pesa la mitad de la res, que ya es bastante menos que
          el peso vivo.{' '}
          <Link href="/rendimiento-al-gancho" className="text-accent hover:text-accent-bright transition-colors">
            Cómo se calcula el rinde al gancho →
          </Link>
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          Cuántos kg de carne salen de una media res
        </h2>
        <p className="mb-4">
          No todos los kilos de la media res son carne para vender: parte es hueso, grasa y mermas
          del desposte. De una media res de novillo de ~{mediaResNovillo} kg salen aproximadamente{' '}
          <strong>90–100 kg de cortes con hueso</strong> (un 70–75% de la media res); en res entera
          de ~{resEnteraNovillo} kg son unos 180–200 kg. La media res se divide primero en{' '}
          <strong>cuarto delantero</strong> (~58–62 kg: paleta, aguja, asado, cogote) y{' '}
          <strong>cuarto trasero</strong> (~62–70 kg: peceto, nalga, cuadril, lomo, bife), y de ahí
          al desposte fino. El rendimiento en carne depende del nivel de desposte y de cuánto hueso y
          grasa se descarten.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">Precio de la media res</h2>
        <p className="mb-4">
          A valor mayorista, la media res cuesta la mitad del animal en pie. Con el novillo a{' '}
          <strong>${fmt(novillo)} por kilo vivo</strong> (Mercado Agroganadero, {lastUpdate}), un
          animal de 450 kg vale ~${fmt(valorAnimalNovillo)}, así que una media res de novillo ronda
          los <strong>${fmt(valorMediaResNovillo)}</strong> (unos USD {fmt(valorMediaResUsd)} al dólar
          blue de ${fmt(usdBlue)}). Llevado a kilo de res «en gancho», equivale a ~$
          {fmt(precioResKg)}/kg —el precio vivo dividido por el rinde—. Es una{' '}
          <strong>referencia mayorista del animal</strong>, no el precio de la carne al público: esta
          página no fija el precio, cada operación se acuerda entre las partes. El kilo de carne en la
          carnicería es varias veces el kilo vivo una vez sumados faena, desposte, transporte y
          márgenes de comercio.{' '}
          <Link href="/precios" className="text-accent hover:text-accent-bright transition-colors">
            Ver precios por categoría →
          </Link>
        </p>

        {/* FAQ visible — mismo array que el FAQPageSchema */}
        <h2 className="text-zinc-100 text-lg font-medium mb-2">Preguntas frecuentes</h2>
        <dl className="mb-6 space-y-3">
          {FAQ.map((item) => (
            <div key={item.question} className="border border-terminal-border bg-terminal-panel/40 px-panel py-3">
              <dt className="text-zinc-100 font-medium mb-1">{item.question}</dt>
              <dd className="text-zinc-400">{item.answer}</dd>
            </div>
          ))}
        </dl>

        <div className="border border-terminal-border bg-terminal-panel/40 px-panel py-3 space-y-2 mb-6">
          <p className="text-xxs font-terminal uppercase tracking-wider text-zinc-500">
            Seguir con el dato
          </p>
          <p className="text-data text-zinc-300">
            <Link href="/rendimiento-al-gancho" className="text-accent hover:text-accent-bright transition-colors">
              Rendimiento al gancho →
            </Link>{' '}
            cómo se pasa de peso vivo a peso de res y por qué el rinde manda.
          </p>
          <p className="text-data text-zinc-300">
            <Link href="/cuanto-pesa-un-novillo" className="text-accent hover:text-accent-bright transition-colors">
              Cuánto pesa un novillo →
            </Link>{' '}
            el peso vivo del que arranca el cálculo de la media res.
          </p>
          <p className="text-data text-zinc-300">
            <Link href="/precios" className="text-accent hover:text-accent-bright transition-colors">
              Precios por categoría →
            </Link>{' '}
            novillo, vaca, vaquillona y ternero, kilo vivo actualizado a diario desde el MAG.
          </p>
          <p className="text-data text-zinc-300">
            <Link href="/glosario" className="text-accent hover:text-accent-bright transition-colors">
              Glosario del mercado ganadero →
            </Link>{' '}
            res, media res, rinde, cuarto y el resto de los términos de faena.
          </p>
        </div>

        <footer className="border-t border-terminal-border pt-4 text-xxs text-zinc-500 space-y-1">
          <p>
            Los pesos son de referencia para animales terminados de razas de carne; el rinde y el
            precio reales varían por animal y operación. Esta página no fija el precio: el valor de la
            hacienda es referencia del Mercado Agroganadero y cada firma lo acuerda con el productor.
          </p>
          <p>Actualizado: {lastUpdate} · Memola Medios S.A.S.</p>
        </footer>
      </article>
    </>
  )
}
