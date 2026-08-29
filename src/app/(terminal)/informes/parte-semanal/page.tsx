import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { getProducto, rangoPrecio } from '@/lib/productos-datos'
import { ListaDeEspera } from '@/components/productos/ListaDeEspera'
import { armarParteSemanal } from '@/lib/informes/semanal'

const APP_URL = 'https://www.consignatarias.com.ar'
const P = getProducto('parte-semanal-mercado')!

export const metadata: Metadata = {
  title: 'Parte semanal del mercado ganadero — el cierre en PDF, por mail',
  description:
    'El cierre de cada semana en un PDF imprimible: el novillo en pesos y en dólares, la relación maíz/novillo con once años de contexto, si el movimiento fue señal o ruido, y los remates de los próximos siete días.',
  keywords: P.keywords,
  openGraph: {
    title: 'Parte semanal del mercado ganadero',
    description:
      'El cierre de la semana en PDF, con el contexto histórico al lado del número.',
    url: `${APP_URL}${P.landing}`,
    type: 'website',
  },
  alternates: { canonical: `${APP_URL}${P.landing}` },
}

export const revalidate = 3600

const FAQ = [
  {
    q: '¿En qué se diferencia del reporte gratuito?',
    a: 'El reporte gratis te da el precio del día y los remates. El parte semanal agrega lo que hace falta para interpretarlo: si el movimiento de la semana se distingue de la volatilidad normal de la serie, dónde cae la relación maíz/novillo dentro de once años de historia, y cuánto valía el novillo la misma semana de los años anteriores. Uno te dice el número; el otro, qué significa.',
  },
  {
    q: '¿Qué es eso de "señal o ruido"?',
    a: 'El índice del Mercado de Cañuelas se mueve solo, sin que pase nada: días de poco volumen corren el promedio. Medimos cuánto se mueve una semana típica y lo usamos de vara. Si lo de esta semana entra dentro de ese margen, el parte lo dice en vez de titularlo. Preferimos escribir "no pasó nada" cuando no pasó nada.',
  },
  {
    q: '¿Viene con recomendación de vender o no vender?',
    a: 'No. El parte dice qué pasó, con qué se compara y qué tan grande fue. La decisión de vender depende de tu hacienda, tu zona y tus tiempos, y nadie que no los conozca debería opinar sobre eso.',
  },
  {
    q: '¿Se puede imprimir?',
    a: 'Está hecho para eso: fondo blanco, dos hojas, sin bloques de tinta. Se dobla al medio y entra en la carpeta de la oficina.',
  },
  {
    q: '¿Cuándo llega?',
    a: 'Los lunes, con el cierre de la semana anterior. Y queda en tu cuenta: si lo bajás más tarde, se regenera con el dato de ese momento.',
  },
]

export default function Page() {
  // Se arma el parte real para mostrar de qué se trata. `revalidate` de una hora
  // mantiene la muestra fresca sin recalcular en cada visita.
  const muestra = armarParteSemanal('vista-previa@consignatarias.com.ar')

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'Product',
                name: P.nombre,
                description: P.tagline,
                url: `${APP_URL}${P.landing}`,
                brand: { '@type': 'Brand', name: 'Consignatarias.com.ar' },
                offers: {
                  '@type': 'Offer',
                  price: P.precio,
                  priceCurrency: 'ARS',
                  availability: P.publicado
                    ? 'https://schema.org/InStock'
                    : 'https://schema.org/PreOrder',
                  url: `${APP_URL}${P.landing}`,
                  seller: { '@type': 'Organization', name: 'Memola Medios S.A.S.' },
                },
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
        <Link href="/informes" className="hover:text-sky-400">Informes</Link>
        <span className="mx-2">/</span>
        <span className="text-slate-400">Parte semanal</span>
      </nav>

      <div className="overflow-hidden rounded-lg border border-slate-800">
        <Image
          src={P.ilustracion}
          alt={P.ilustracionAlt}
          width={1200}
          height={500}
          className="h-48 w-full object-cover sm:h-64"
          priority
        />
      </div>

      <header className="mt-8">
        <h1 className="text-3xl font-semibold text-slate-100 sm:text-4xl">
          ¿Lo de esta semana fue algo, o fue ruido?
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-slate-300">
          Dos hojas por mail, todos los lunes. El cierre de la semana con el contexto al
          lado del número, para poder leerlo sin tener que buscar nada más.
        </p>
      </header>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-slate-100">Así se lee el parte de esta semana</h2>
        <p className="mt-2 text-sm text-slate-400">
          Éste es el contenido real, calculado ahora mismo:
        </p>

        <div className="mt-5 space-y-4">
          {[muestra.novillo, muestra.dolarizado, muestra.maizNovillo].map((l, i) => (
            <div key={i} className="rounded-lg border border-slate-800 bg-slate-950/60 p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-xl font-semibold text-slate-100">{l.valor}</p>
                {l.esSenal ? (
                  <span className="rounded bg-sky-950 px-2 py-0.5 text-[10px] uppercase tracking-wide text-sky-300">
                    señal
                  </span>
                ) : (
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">
                    dentro del ruido
                  </span>
                )}
              </div>
              <p className={`mt-2 text-sm ${l.esSenal ? 'font-medium text-sky-300' : 'text-slate-300'}`}>
                {l.titular}
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{l.contexto}</p>
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs text-slate-500">
          Cierre al {muestra.fechaCorte} · semana {muestra.semanaISO}. El parte trae además
          las seis categorías, la misma semana de los años anteriores y los{' '}
          {muestra.agenda.length} remates de los próximos siete días.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold text-slate-100">Por qué existe</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          Todo esto está en el sitio y va a seguir estando gratis. Lo que se paga es que
          llegue armado, el lunes, en dos hojas que se pueden imprimir — y que alguien haya
          hecho el trabajo de decidir qué merece un titular y qué no.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          El{' '}
          <Link href="/reporte-semanal" className="text-sky-400 underline underline-offset-2">
            reporte gratuito
          </Link>{' '}
          sigue disponible y no se toca.
        </p>
      </section>

      <section className="mt-10 flex flex-wrap items-baseline justify-between gap-3 border-y border-slate-800 py-5">
        <div>
          <p className="text-sm text-slate-400">Suscripción mensual</p>
          <p className="text-xs text-slate-500">Cuatro o cinco partes por mes.</p>
        </div>
        <p className="text-lg font-semibold text-slate-100">
          {rangoPrecio(P)} <span className="text-sm font-normal text-slate-500">ARS por mes</span>
        </p>
      </section>

      <div className="mt-8">
        <ListaDeEspera slug={P.slug} nombre={P.nombre} />
      </div>

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

      <section className="mt-12 border-t border-slate-800 pt-6">
        <p className="text-xs leading-relaxed text-slate-500">{muestra.fuentes}</p>
        <ul className="mt-4 space-y-2 text-sm">
          <li>
            <Link href="/mercado/spread" className="text-sky-400 underline underline-offset-2">
              Maíz / novillo
            </Link>
            <span className="text-slate-500"> — la serie completa desde 2015, gratis</span>
          </li>
          <li>
            <Link href="/mercado/inmag" className="text-sky-400 underline underline-offset-2">
              El INMAG de hoy
            </Link>
          </li>
          <li>
            <Link href="/metodologia" className="text-sky-400 underline underline-offset-2">
              Cómo medimos
            </Link>
          </li>
        </ul>
      </section>
    </div>
  )
}
