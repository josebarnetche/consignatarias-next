import type { Metadata } from 'next'
import Link from 'next/link'
import { armarParteSemanal } from '@/lib/informes/semanal'

const APP_URL = 'https://www.consignatarias.com.ar'

export const metadata: Metadata = {
  title: '¿El precio se movió de verdad? Cómo separar señal de ruido',
  description:
    'El índice del Mercado de Cañuelas se mueve solo: la mediana de cambio diario es 2,6 % y hay saltos reales de 21 %. Cómo saber si lo de esta semana fue algo o fue ruido.',
  keywords: [
    'el precio del novillo subió o bajó',
    'variación precio hacienda',
    'volatilidad precio del ganado',
    'cómo leer el precio del novillo',
    'señal o ruido precio hacienda',
  ],
  openGraph: {
    title: '¿El precio se movió de verdad? Cómo separar señal de ruido',
    description: 'La mayoría de los movimientos semanales no significan nada. Cómo distinguirlos.',
    url: `${APP_URL}/senal-o-ruido-precio-hacienda`,
    type: 'article',
  },
  alternates: { canonical: `${APP_URL}/senal-o-ruido-precio-hacienda` },
}

export const revalidate = 3600

const FAQ = [
  {
    q: '¿Por qué el precio se mueve tanto de un día para el otro?',
    a: 'Porque el índice es el promedio de lo que se operó ese día, y lo que se opera cambia. Un día de poco volumen con hacienda de peor calidad tira el promedio para abajo sin que el mercado se haya movido. No es un error del índice: es lo que pasa cuando se promedia lo que entró, y por eso una sola rueda no alcanza para concluir nada.',
  },
  {
    q: '¿Cuánto tiene que moverse para que importe?',
    a: 'Depende de cuánto se mueve normalmente. En esta serie, comparando el promedio de tres ruedas contra las tres anteriores, el desvío típico es de 3,5 %. Debajo de eso, el movimiento entra dentro de lo que la serie hace sola. Arriba, hay algo.',
  },
  {
    q: '¿Sirve para decidir cuándo vender?',
    a: 'Ayuda a no decidir por ruido, que ya es bastante. Pero la decisión de vender depende de tu hacienda, tu zona y tus tiempos: el índice es el novillo de Cañuelas, mercado de gordo y mayormente pampeano. Si tu producto es el ternero al destete, ese número no es el tuyo.',
  },
]

export default function Page() {
  const parte = armarParteSemanal('ejemplo@consignatarias.com.ar')

  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'Article',
                headline: '¿El precio se movió de verdad? Cómo separar señal de ruido',
                description:
                  'Cómo distinguir un movimiento real del ruido normal de la serie de precios.',
                url: `${APP_URL}/senal-o-ruido-precio-hacienda`,
                author: { '@type': 'Organization', name: 'Consignatarias.com.ar' },
                publisher: { '@type': 'Organization', name: 'Memola Medios S.A.S.' },
                inLanguage: 'es-AR',
              },
              {
                '@type': 'FAQPage',
                mainEntity: FAQ.map((f) => ({
                  '@type': 'Question',
                  name: f.q,
                  acceptedAnswer: { '@type': 'Answer', text: f.a },
                })),
              },
            ],
          }),
        }}
      />

      <nav className="mb-6 text-xs text-slate-500">
        <Link href="/guias" className="hover:text-sky-400">Guías</Link>
        <span className="mx-2">/</span>
        <span className="text-slate-400">Señal o ruido</span>
      </nav>

      <header>
        <h1 className="text-3xl font-semibold text-slate-100 sm:text-4xl">
          ¿El precio se movió de verdad?
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-slate-300">
          La mayoría de los movimientos que se comentan no significan nada. Hay una forma
          simple de saber cuáles sí.
        </p>
      </header>

      <section className="mt-10 space-y-4 text-base leading-relaxed text-slate-300">
        <h2 className="text-xl font-semibold text-slate-100">El índice se mueve solo</h2>
        <p>
          Medido sobre la serie del Mercado Agroganadero, la{' '}
          <strong className="text-slate-100">mediana de cambio de un día al otro es
          2,6 %</strong>. Uno de cada diez días se mueve más del 7 %. Y hay saltos reales
          de hasta 21 % entre dos ruedas consecutivas.
        </p>
        <p>
          Eso no es un error del índice. El índice promedia lo que se operó ese día, y lo
          que se opera cambia: un día de poco volumen, o con hacienda de peor terminación,
          corre el promedio sin que el mercado se haya movido un peso.
        </p>
        <p className="rounded-lg border border-amber-900/50 bg-amber-950/20 p-4 text-sm leading-relaxed text-slate-200">
          Consecuencia práctica: <strong className="text-amber-200">una sola rueda no
          alcanza para concluir nada</strong>. Cuando alguien dice «hoy subió 4 %», en esta
          serie eso está dentro de lo normal.
        </p>
      </section>

      <section className="mt-10 space-y-4 text-base leading-relaxed text-slate-300">
        <h2 className="text-xl font-semibold text-slate-100">Cómo se separa</h2>
        <p>
          Promediando. En vez de comparar una rueda contra la anterior, se compara el
          promedio de las últimas tres contra el de las tres anteriores. El ruido de un día
          flojo se diluye y queda el movimiento.
        </p>
        <p>
          Después hace falta una vara, y la vara tiene que salir de la misma medida: cuánto
          se mueve ese promedio semanal, normalmente. En esta serie el desvío típico es de{' '}
          <strong className="text-slate-100">3,5 %</strong>.
        </p>
        <ul className="ml-1 space-y-2">
          <li>· Menos de 3,5 % en la semana → entra dentro de lo que la serie hace sola.</li>
          <li>· Más de 3,5 % → pasó algo. Ocurre en aproximadamente una de cada tres semanas.</li>
        </ul>
        <p className="text-sm text-slate-400">
          El error clásico es comparar el movimiento de una semana contra la volatilidad de
          un día. Da una vara de ±10 % y con eso no hay noticia nunca.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-slate-100">Esta semana, sin ir más lejos</h2>
        <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/60 p-5">
          <p className="text-2xl font-semibold text-slate-100">{parte.novillo.valor}</p>
          <p
            className={`mt-2 text-base ${parte.novillo.esSenal ? 'font-medium text-sky-300' : 'text-slate-300'}`}
          >
            {parte.novillo.titular}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">{parte.novillo.contexto}</p>
          <p className="mt-3 text-xs text-slate-500">
            Cierre al {parte.fechaCorte} · Mercado Agroganadero de Cañuelas
          </p>
        </div>
      </section>

      <section className="mt-10 space-y-4 text-base leading-relaxed text-slate-300">
        <h2 className="text-xl font-semibold text-slate-100">El mismo precio, en dólares</h2>
        <p>
          Hay un segundo filtro que conviene mirar: el mismo novillo medido en dólares. En
          pesos, buena parte de lo que se mueve es el peso, no la hacienda. Cuando el precio
          en pesos sube y en dólares no, no subió el novillo — bajó la moneda.
        </p>
        <p className="text-sm text-slate-400">
          Hoy: {parte.dolarizado.valor}. {parte.dolarizado.titular}.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold text-slate-100">Preguntas</h2>
        <dl className="mt-5 space-y-6">
          {FAQ.map((f) => (
            <div key={f.q}>
              <dt className="font-medium text-slate-200">{f.q}</dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-slate-400">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-12 rounded-lg border border-slate-800 bg-slate-950/60 p-6">
        <h2 className="text-base font-semibold text-slate-200">Que te avisen cuando pase</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          La alerta del novillo en dólares suena sólo cuando el promedio del mes se aparta
          más de 12 % del anterior. Sobre once años de serie eso pasó unas cuatro veces por
          año. Es gratis y no hay nada que configurar.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/mercado/inmag-dolares"
            className="rounded bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-500"
          >
            Anotarme, gratis
          </Link>
          <Link
            href="/informes/parte-semanal"
            className="rounded border border-slate-700 px-5 py-2.5 text-sm text-slate-300 hover:border-slate-500"
          >
            El parte semanal
          </Link>
        </div>
      </section>

      <section className="mt-8 border-t border-slate-800 pt-6">
        <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <li>
            <Link href="/mercado/inmag" className="text-sky-400 underline underline-offset-2">
              El índice de hoy
            </Link>
          </li>
          <li>
            <Link href="/conviene-vender-la-hacienda-ahora-o-esperar" className="text-sky-400 underline underline-offset-2">
              ¿Vender ahora o esperar?
            </Link>
          </li>
          <li>
            <Link href="/metodologia" className="text-sky-400 underline underline-offset-2">
              Cómo medimos
            </Link>
          </li>
        </ul>
      </section>
    </article>
  )
}
