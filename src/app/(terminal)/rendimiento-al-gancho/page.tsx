import { Metadata } from 'next'
import Link from 'next/link'
import {
  SectionBreadcrumbSchema,
  DefinedTermSetSchema,
  FAQPageSchema,
  SpeakableSchema,
  HowToSchema,
} from '@/components/seo/JsonLd'
import marketPrices from '@/lib/data/market-prices.json'

export const revalidate = 86400 // rebuild diario vía Vercel

const BASE_URL = 'https://www.consignatarias.com.ar'
const PAGE_URL = `${BASE_URL}/rendimiento-al-gancho`

/* ------------------------------------------------------------------ */
/*  Número vivo: precio del novillo (kg vivo) para convertir vivo →    */
/*  gancho a valor de mercado, fechado. Se interpola en build.         */
/* ------------------------------------------------------------------ */
const novillo = Math.round(marketPrices.categories.novillos.current)
const lastUpdate = marketPrices.lastUpdate
const fmt = (n: number) => n.toLocaleString('es-AR')

// Cálculo de referencia: novillo de 450 kg vivos con 57% de rinde.
const PESO_VIVO = 450
const RINDE = 0.57 // 57% — punto medio del rango del novillo (56-58%)
const kgGancho = Math.round(PESO_VIVO * RINDE) // ~256 kg de res
const precioGancho = Math.round(novillo / RINDE) // $/kg gancho equivalente

// Conversión por rinde (columna de tabla) — precio vivo → gancho equivalente.
const RINDES = [
  { pct: 56, label: '56%' },
  { pct: 57, label: '57%' },
  { pct: 58, label: '58%' },
]

/* ------------------------------------------------------------------ */
/*  Entidades citables — definiciones canónicas (patrón /glosario)     */
/* ------------------------------------------------------------------ */
const TERMINOS = [
  {
    name: 'Rendimiento al gancho',
    description:
      'Porcentaje del peso vivo de un animal que queda como res (carcasa) una vez faenado, colgado del gancho en la playa de faena. Se calcula dividiendo el peso de la res por el peso vivo y multiplicando por cien. En un novillo ronda el 56-58%. También llamado rinde o rendimiento de faena.',
    url: PAGE_URL,
  },
  {
    name: 'Peso vivo',
    description:
      'Peso del animal en pie, medido en la balanza antes de la faena. Es la base sobre la que se cotiza la hacienda por kilo vivo en el Mercado Agroganadero. Del peso vivo se descuenta la merma para llegar al peso neto de venta.',
    url: `${BASE_URL}/cuanto-pesa-un-novillo`,
  },
  {
    name: 'Kilo gancho',
    description:
      'Kilo de res (carcasa) colgada del gancho tras la faena, medido en peso caliente o frío. El precio por kilo gancho es siempre mayor que el precio por kilo vivo porque la res pesa menos que el animal entero: solo la fracción del peso vivo que da el rinde.',
  },
  {
    name: 'Media res',
    description:
      'Cada una de las dos mitades en que se divide la res del animal faenado tras cortarla longitudinalmente por la columna. La suma de las dos medias reses es el peso de la res que define el rinde.',
    url: `${BASE_URL}/cuanto-pesa-una-media-res`,
  },
  {
    name: 'Merma',
    description:
      'Pérdida de peso vivo del animal por ayuno, transporte y estrés entre el establecimiento y la balanza o la faena. La merma reduce el peso vivo real y, por lo tanto, baja el rinde efectivo de la operación.',
  },
]

/* ------------------------------------------------------------------ */
/*  FAQ — preguntas reales; cada respuesta arranca con el dato.        */
/* ------------------------------------------------------------------ */
const FAQ = [
  {
    question: '¿Cuánto es el rinde de un novillo?',
    answer: `El rinde de un novillo ronda el 56-58% de su peso vivo. Es decir que de 450 kg vivos se obtienen unos ${kgGancho} kg de carne en la res (las dos medias reses). Un novillo bien terminado tiende al extremo alto del rango; uno más magro o con más transporte, al extremo bajo.`,
  },
  {
    question: '¿Cómo paso de precio vivo a precio gancho?',
    answer: `Para pasar de precio vivo a precio gancho se divide el precio por kilo vivo por el rinde. Con el novillo a $${fmt(novillo)}/kg vivo (Mercado Agroganadero, ${lastUpdate}) y un rinde del 57%, el precio equivalente al gancho es $${fmt(novillo)} ÷ 0,57 ≈ $${fmt(precioGancho)}/kg gancho. El precio gancho siempre es mayor que el vivo porque la res pesa menos que el animal entero.`,
  },
  {
    question: '¿Por qué baja el rinde con el transporte?',
    answer:
      'El rinde baja con el transporte por la merma: el ayuno, el estrés y las horas de viaje hacen que el animal pierda contenido digestivo y líquidos, bajando el peso vivo con el que llega a la balanza. Como el peso de la res casi no cambia pero el peso vivo de referencia baja, y a la vez el animal deshidratado rinde algo menos de carne, el porcentaje efectivo de faena se resiente. Por eso el rinde se mide sobre el peso vivo real al momento de pesar, no sobre el peso de partida en el campo.',
  },
]

/* ------------------------------------------------------------------ */
/*  Pasos del cálculo — reutilizados en HowToSchema y en el HTML.      */
/* ------------------------------------------------------------------ */
const PASOS = [
  {
    name: 'Pesar el animal vivo',
    text: 'Pesar el animal en pie en la balanza, antes de la faena, para obtener el peso vivo. Es la base del cálculo y el peso sobre el que se cotiza la hacienda por kilo vivo.',
  },
  {
    name: 'Faenar y pesar la res',
    text: 'Tras la faena, pesar la res colgada del gancho. La res se divide en dos medias reses cortadas por la columna; la suma de ambas es el peso de la res (carcasa).',
  },
  {
    name: 'Dividir peso res / peso vivo × 100',
    text: 'Dividir el peso de la res por el peso vivo y multiplicar por cien. El resultado es el rendimiento al gancho, expresado en porcentaje. Ejemplo: 256 kg de res ÷ 450 kg vivos × 100 = 57%.',
  },
]

export const metadata: Metadata = {
  title: `Rendimiento al gancho: qué es y cómo se calcula el rinde de un novillo (56-58%)`,
  description: `El rendimiento al gancho (o rinde) es el porcentaje del peso vivo que queda como res: en un novillo ronda el 56-58%, de 450 kg vivos se obtienen ~${kgGancho} kg de carne. Con el novillo a $${fmt(novillo)}/kg vivo (Mercado Agroganadero, ${lastUpdate}), el equivalente al gancho ≈ $${fmt(precioGancho)}/kg. Cómo calcularlo y convertir precio vivo a gancho.`,
  keywords: [
    'rendimiento al gancho',
    'que es el rendimiento al gancho',
    'rinde de un novillo',
    'como se calcula el rinde',
    'rendimiento de faena novillo',
    'cuanto rinde un novillo',
    'kilo vivo vs kilo gancho',
    'precio gancho novillo',
    'convertir precio vivo a gancho',
    'peso res media res',
  ],
  openGraph: {
    title: `Rendimiento al gancho: cómo se calcula el rinde de un novillo`,
    description: `El rinde de un novillo ronda el 56-58%: de 450 kg vivos salen ~${kgGancho} kg de res. A $${fmt(novillo)}/kg vivo, el equivalente al gancho ≈ $${fmt(precioGancho)}/kg (Mercado Agroganadero, ${lastUpdate}).`,
    url: PAGE_URL,
    type: 'article',
    images: ['https://www.consignatarias.com.ar/og.png'],
  },
  alternates: {
    canonical: PAGE_URL,
  },
}

export default function RendimientoAlGanchoPage() {
  return (
    <>
      <SectionBreadcrumbSchema section="rendimiento-al-gancho" sectionName="Rendimiento al gancho" />
      <DefinedTermSetSchema
        name="Rendimiento al gancho — definiciones"
        description="Definiciones citables de rendimiento al gancho, peso vivo, kilo gancho, media res y merma en el mercado ganadero argentino."
        url={PAGE_URL}
        terms={TERMINOS}
      />
      <FAQPageSchema items={FAQ} />
      <SpeakableSchema
        url={PAGE_URL}
        headline="Rendimiento al gancho: qué es y cómo se calcula el rinde de un novillo"
        cssSelectors={['h1', '.speakable-content']}
      />
      <HowToSchema
        name="Cómo calcular el rinde (rendimiento al gancho)"
        description="Cómo calcular el rendimiento al gancho de un animal: pesar el animal vivo, faenar y pesar la res, y dividir peso res sobre peso vivo por cien."
        steps={PASOS}
      />

      <div className="max-w-3xl mx-auto px-4 py-8 text-sm leading-relaxed">
        <nav className="text-xxs font-terminal uppercase tracking-wider text-zinc-500 mb-3">
          <Link href="/mercado" className="hover:text-accent transition-colors">
            Mercado
          </Link>{' '}
          / Rendimiento al gancho
        </nav>

        <h1 className="text-zinc-100 text-2xl font-medium mb-6">
          Rendimiento al gancho: cómo se calcula el rinde de un novillo
        </h1>

        {/* Answer-first: definición autocontenida y citable en la 1ª oración */}
        <p className="speakable-content text-zinc-200 text-base mb-6">
          El <strong>rendimiento al gancho</strong> (o rinde) es el porcentaje del peso vivo del
          animal que queda como res una vez faenado: en un novillo ronda el{' '}
          <strong>56-58%</strong>, es decir que de 450 kg vivos se obtienen unos{' '}
          <strong>{kgGancho} kg de carne</strong> en la media res.
        </p>

        <p className="text-zinc-400 mb-8">
          Ese rinde es lo que permite convertir el precio vivo en precio gancho. Con el novillo a{' '}
          <strong>${fmt(novillo)}/kg vivo</strong> (Mercado Agroganadero, {lastUpdate}) y un rinde
          del 57%, el precio equivalente al gancho es ${fmt(novillo)} ÷ 0,57 ≈{' '}
          <strong>${fmt(precioGancho)}/kg gancho</strong>. Estos son valores de referencia del
          mercado —esta página no fija el precio ni el rinde de ninguna operación—; el rinde real de
          cada animal depende de su categoría, terminación y del transporte.
        </p>

        {/* Diferencia vivo vs gancho */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">
          Diferencia entre kilo vivo y kilo gancho
        </h2>
        <p className="text-zinc-400 mb-4">
          El <strong>kilo vivo</strong> es el del animal en pie sobre la balanza; el{' '}
          <strong>kilo gancho</strong> es el de la res colgada tras la faena. Como la res pesa menos
          que el animal entero —solo la fracción que da el rinde—, el precio por kilo gancho es
          siempre mayor que el precio por kilo vivo. Con 450 kg vivos y 57% de rinde, se obtienen{' '}
          {kgGancho} kg de res: el productor cobra por 450 kg vivos, pero el frigorífico compra{' '}
          {kgGancho} kg de carne. Por eso comparar precios sin aclarar si son vivos o gancho lleva a
          error.
        </p>

        {/* Cómo se calcula — HowTo visible */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">Cómo calcular el rinde</h2>
        <ol className="text-zinc-400 mb-4 space-y-2 list-decimal pl-5">
          {PASOS.map((p) => (
            <li key={p.name}>
              <span className="text-zinc-300">{p.name}:</span> {p.text}
            </li>
          ))}
        </ol>
        <p className="text-xxs text-zinc-500 mb-8">
          Fórmula: <span className="text-zinc-400">rinde (%) = peso res ÷ peso vivo × 100</span>.
          Ejemplo: {kgGancho} kg de res ÷ {PESO_VIVO} kg vivos × 100 = {Math.round(RINDE * 100)}%.
        </p>

        {/* De qué depende el rinde */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">
          De qué depende el rinde (categoría, terminación, dieta, transporte)
        </h2>
        <ul className="text-zinc-400 mb-8 space-y-2 list-disc pl-5">
          <li>
            <span className="text-zinc-300">Categoría:</span> los novillos y novillitos bien
            musculados rinden más (56-58%) que una vaca de descarte o conserva, que suele rendir
            algo menos; el toro, por su estructura ósea, también tiene un patrón distinto.
          </li>
          <li>
            <span className="text-zinc-300">Terminación (grado de gordura):</span> un animal bien
            terminado, con la cobertura de grasa adecuada, rinde más que uno magro. El exceso de
            grasa, en cambio, se descuenta en la tipificación.
          </li>
          <li>
            <span className="text-zinc-300">Dieta:</span> el ganado de feedlot (grano) tiende a
            rendir algo más que el de pasto, porque llega con más peso de res sobre el mismo marco.
          </li>
          <li>
            <span className="text-zinc-300">Transporte y ayuno:</span> las horas de viaje, el ayuno
            y el estrés generan merma —pérdida de peso vivo y de contenido digestivo—, que baja el
            rinde efectivo respecto del que tenía el animal en el campo.
          </li>
        </ul>

        {/* Convertir precio vivo a gancho — tabla */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">Convertir precio vivo a precio gancho</h2>
        <p className="text-zinc-400 mb-3">
          Para pasar de precio vivo a precio gancho se divide el precio por kilo vivo por el rinde.
          Con el novillo a ${fmt(novillo)}/kg vivo (Mercado Agroganadero, {lastUpdate}), el
          equivalente al gancho según el rinde queda así:
        </p>
        <div className="overflow-x-auto mb-2">
          <table className="w-full text-data border border-terminal-border">
            <thead>
              <tr className="bg-terminal-panel/60 text-zinc-400 text-xxs uppercase tracking-wider">
                <th className="text-left px-3 py-2 border-b border-terminal-border">Rinde</th>
                <th className="text-right px-3 py-2 border-b border-terminal-border">
                  Precio gancho equiv. ($/kg)
                </th>
                <th className="text-right px-3 py-2 border-b border-terminal-border">
                  Res de 450 kg vivos
                </th>
              </tr>
            </thead>
            <tbody>
              {RINDES.map((r) => (
                <tr key={r.pct} className="border-b border-terminal-border/60">
                  <td className="px-3 py-2 text-zinc-300">{r.label}</td>
                  <td className="px-3 py-2 text-right text-zinc-200">
                    ${fmt(Math.round(novillo / (r.pct / 100)))}
                  </td>
                  <td className="px-3 py-2 text-right text-zinc-400">
                    {Math.round(PESO_VIVO * (r.pct / 100))} kg
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xxs text-zinc-500 mb-8">
          Novillo ${fmt(novillo)}/kg vivo (Mercado Agroganadero, {lastUpdate}). El precio gancho de
          cada operación lo acuerdan frigorífico y vendedor; estos son valores de referencia
          derivados del kilo vivo, no un precio fijado por esta página.
        </p>

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

        {/* Links internos */}
        <div className="border-t border-zinc-800 pt-4 flex flex-wrap gap-4 text-xs">
          <Link href="/cuanto-pesa-un-novillo" className="text-zinc-500 hover:text-accent transition-colors">
            Cuánto pesa un novillo →
          </Link>
          <Link href="/cuanto-pesa-una-media-res" className="text-zinc-500 hover:text-accent transition-colors">
            Cuánto pesa una media res
          </Link>
          <Link href="/calidad" className="text-zinc-500 hover:text-accent transition-colors">
            Calidad y tipificación
          </Link>
          <Link href="/mercado/novillos" className="text-zinc-500 hover:text-accent transition-colors">
            Precio del novillo hoy
          </Link>
          <Link href="/precios" className="text-zinc-500 hover:text-accent transition-colors">
            Precios por categoría
          </Link>
          <Link href="/glosario" className="text-zinc-500 hover:text-accent transition-colors">
            Glosario ganadero
          </Link>
        </div>

        {/* Footer */}
        <p className="text-zinc-500 text-xs mt-4">
          Rinde de referencia del mercado (56-58% en novillo); el rendimiento real depende de cada
          animal y operación. Precio del novillo del Mercado Agroganadero. Actualizado: {lastUpdate}.
          Memola Medios S.A.S.
        </p>
      </div>
    </>
  )
}
