import { Metadata } from 'next'
import Link from 'next/link'
import { getReferenciaPorPeso, getSlugsConBanda, vrCobertura, VR_VENTANA_DIAS } from '@/lib/vr'

/**
 * /valuar-hacienda — la puerta indexable de "cuánto vale mi hacienda".
 *
 * Mi Ganado es noindex (es la cuenta del productor), así que la búsqueda no tenía
 * dónde caer. Esta página explica en criollo cómo se calcula, muestra un ejemplo con
 * el dato del día y manda a Mi Ganado. Todo sale de vr-bandas.json: SSG, sin queries.
 */

const URL = 'https://www.consignatarias.com.ar/valuar-hacienda'

// Ejemplo fijo y común: un lote de vacas de descarte. Si un día no hay banda de
// vaca, el ejemplo se cae y la página lo dice (regla de degradación del VR).
const EJEMPLO = { categoria: 'vaca', nombre: 'vacas', cabezas: 20, kg: 420 }

const fmt = (n: number) => n.toLocaleString('es-AR')
const pesos = (n: number) => '$' + Math.round(n).toLocaleString('es-AR')

export const metadata: Metadata = {
  title: { absolute: 'Cuánto vale mi hacienda: cómo calcularlo con lo que se vendió' },
  description:
    'Cómo saber cuánto vale tu hacienda hoy: el precio por kilo que realmente se pagó por categoría y peso, por los kilos de tu lote. Con un ejemplo del día y gratis con Mi Ganado.',
  alternates: { canonical: URL },
  openGraph: {
    title: 'Cuánto vale mi hacienda: cómo calcularlo con lo que se vendió',
    description: 'Precio por kilo que realmente se pagó, por categoría y peso, por los kilos de tu lote. Con un ejemplo del día.',
    url: URL,
    type: 'article',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
}

export default function ValuarHaciendaPage() {
  const cob = vrCobertura()
  const ref = getReferenciaPorPeso(EJEMPLO.categoria, EJEMPLO.kg)
  const b = ref.banda
  const kgLote = EJEMPLO.cabezas * EJEMPLO.kg
  const conBanda = getSlugsConBanda()

  return (
    <article className="max-w-3xl mx-auto px-4 py-8 text-sm leading-relaxed text-zinc-300">
      <nav className="text-xs text-zinc-500 mb-4">
        <Link href="/" className="hover:text-zinc-300">Inicio</Link>
        <span className="mx-2">/</span>
        <Link href="/vr" className="hover:text-zinc-300">Precio por categoría y peso</Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-400">Cuánto vale mi hacienda</span>
      </nav>

      <h1 className="text-2xl md:text-3xl text-ink font-medium leading-tight mb-4">
        Cuánto vale mi hacienda: cómo calcularlo con lo que realmente se vendió
      </h1>
      <p className="text-base text-zinc-200 mb-6">
        Tu hacienda vale lo que se está pagando hoy por animales como los tuyos. Nosotros lo medimos con los
        lotes vendidos en el Mercado Agroganadero en los últimos {VR_VENTANA_DIAS} días, separados por
        categoría y por peso. Multiplicás ese precio por los kilos de tu lote y tenés el valor de hoy.
      </p>

      <h2 className="text-lg text-ink font-medium mb-2">Cómo se calcula, en tres pasos</h2>
      <ol className="list-decimal pl-5 space-y-2 mb-6 text-zinc-400">
        <li>
          <strong className="text-zinc-200">Categoría y peso.</strong> Una vaca de 420 kg no vale lo mismo por kilo
          que una de 300, ni que un novillo. Por eso el precio se mira por categoría y por rango de peso de 50 kg.
        </li>
        <li>
          <strong className="text-zinc-200">El rango de lo que se pagó.</strong> No es un número solo: es el precio
          de los lotes más baratos, el del medio y el de los más caros. Tu hacienda cae más arriba o más abajo según
          su estado, su sanidad y el flete hasta el comprador.
        </li>
        <li>
          <strong className="text-zinc-200">Por los kilos de tu lote.</strong> Precio por kilo vivo × kilos por
          cabeza × cantidad de cabezas. Eso es lo que vale tu lote hoy, antes de comisión y gastos.
        </li>
      </ol>

      <h2 className="text-lg text-ink font-medium mb-2">Un ejemplo con el dato de hoy</h2>
      {b ? (
        <section className="mb-6 rounded-terminal border border-accent/40 bg-accent/[0.05] p-4">
          <p className="mb-3">
            {EJEMPLO.cabezas} {EJEMPLO.nombre} de {EJEMPLO.kg} kg ({fmt(kgLote)} kg en total). En los últimos{' '}
            {VR_VENTANA_DIAS} días, las vacas de{' '}
            {ref.rango ? `${ref.rango.desde_kg} a ${ref.rango.hasta_kg} kg` : 'todos los pesos'} se vendieron así:
          </p>
          <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-terminal bg-terminal-border text-center">
            <div className="bg-terminal-panel p-3">
              <dt className="text-xs text-zinc-500">Los más baratos</dt>
              <dd className="font-terminal tabular-nums text-zinc-200">{pesos(b.p10)}/kg</dd>
              <dd className="text-xs text-zinc-500">{pesos(b.p10 * kgLote)}</dd>
            </div>
            <div className="bg-terminal-panel p-3">
              <dt className="text-xs text-zinc-500">El del medio</dt>
              <dd className="font-terminal tabular-nums text-ink">{pesos(b.mediana)}/kg</dd>
              <dd className="text-xs text-zinc-400">{pesos(b.mediana * kgLote)}</dd>
            </div>
            <div className="bg-terminal-panel p-3">
              <dt className="text-xs text-zinc-500">Los más caros</dt>
              <dd className="font-terminal tabular-nums text-zinc-200">{pesos(b.p90)}/kg</dd>
              <dd className="text-xs text-zinc-500">{pesos(b.p90 * kgLote)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-zinc-400">
            Ese lote vale hoy entre <strong className="text-zinc-200">{pesos(b.p10 * kgLote)}</strong> y{' '}
            <strong className="text-zinc-200">{pesos(b.p90 * kgLote)}</strong>, con{' '}
            <strong className="text-zinc-200">{pesos(b.mediana * kgLote)}</strong> en el medio. Sale de{' '}
            {fmt(b.lotes)} lotes vendidos, con datos hasta el {cob.hasta}.
          </p>
        </section>
      ) : (
        <p className="mb-6 text-zinc-400">
          Esta semana no hay lotes suficientes de vacas de ese peso para armar el ejemplo con un rango que el dato
          sostenga. Preferimos no mostrar un número inventado.
        </p>
      )}

      <section className="mb-8 rounded-terminal border border-terminal-border bg-terminal-panel p-4">
        <h2 className="text-base text-ink font-medium mb-1">Hacelo con tu rodeo</h2>
        <p className="text-zinc-400 mb-3">
          En Mi Ganado cargás tus categorías, cabezas y pesos, y te decimos cuánto vale hoy y cómo cambia cada
          semana. Es gratis, con tu cuenta.
        </p>
        <Link
          href="/mi-ganado"
          className="inline-flex min-h-[44px] items-center justify-center rounded-terminal bg-accent px-5 text-sm font-semibold text-terminal-bg hover:bg-accent-bright transition-colors"
        >
          Valuar mi rodeo gratis →
        </Link>
      </section>

      <h2 className="text-lg text-ink font-medium mb-2">Lo que hay que tener en cuenta</h2>
      <ul className="list-disc pl-5 space-y-2 mb-6 text-zinc-400">
        <li>No es una tasación: es lo que se pagó por lotes parecidos. El precio final lo define el remate o la negociación.</li>
        <li>Es antes de comisión, flete y gastos. Para lo que te queda en la mano, usá la <Link href="/calculadora" className="text-accent hover:underline">calculadora de neto</Link>.</li>
        <li>
          El ternero no entra: el Mercado Agroganadero no opera terneros. Su precio se ve en los{' '}
          <Link href="/remates/tipo/invernada" className="text-accent hover:underline">remates de invernada</Link>.
        </li>
      </ul>

      <p className="text-zinc-400">
        Precio por categoría y peso:{' '}
        {conBanda.map((s, i) => (
          <span key={s}>
            <Link href={`/vr/${s}`} className="text-accent hover:underline">{s === 'mej' ? 'macho entero joven' : s}</Link>
            {i < conBanda.length - 1 ? ' · ' : ''}
          </span>
        ))}
        . <Link href="/metodologia/vr" className="text-accent hover:underline">Cómo lo calculamos</Link>.
      </p>
    </article>
  )
}
