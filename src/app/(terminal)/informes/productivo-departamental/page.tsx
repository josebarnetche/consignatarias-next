import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { getProducto } from '@/lib/productos-datos'
import { ComoSePaga } from '@/components/productos/ComoSePaga'
import { SelectorVariante } from '@/components/productos/SelectorVariante'
import { ListaDeEspera } from '@/components/productos/ListaDeEspera'
import { variantesDisponibles } from '@/lib/informes/departamental'
import {
  getDepartamentosPublicables,
  getProvincias,
  getDepartamento,
  indiceTernerosVaca,
  tendencia,
  ultimoAnio,
  META,
} from '@/lib/productividad/panel'

const APP_URL = 'https://www.consignatarias.com.ar'
const P = getProducto('informe-productivo-departamento')!

export const metadata: Metadata = {
  title: 'Informe productivo de tu departamento — 14 años de stock y eficiencia',
  description:
    'Cuántas cabezas hay en tu partido, cómo viene la serie desde 2012, cuántos terneros por vaca produce contra los departamentos vecinos, y qué dice INTA que se puede mejorar en tu ambiente.',
  keywords: P.keywords,
  openGraph: {
    title: 'Informe productivo de tu departamento',
    description:
      '14 años de stock, composición del rodeo y eficiencia de tu partido, con datos oficiales de MAGyP.',
    url: `${APP_URL}${P.landing}`,
    type: 'website',
  },
  alternates: { canonical: `${APP_URL}${P.landing}` },
}

export const revalidate = false

const FAQ = [
  {
    q: '¿De dónde salen los datos?',
    a: 'De la serie oficial de stock bovino por departamento de la Secretaría de Agricultura, Ganadería y Pesca, construida sobre los registros de SENASA. Es dato censal, no una muestra: cubre todos los establecimientos declarados de cada partido, año por año desde 2012.',
  },
  {
    q: '¿Qué es el índice de terneros por vaca?',
    a: 'Los terneros y terneras al 31 de diciembre sobre las vacas del mismo stock. Es el indicador más directo de eficiencia reproductiva que se puede construir con datos oficiales, y no está publicado como serie en ningún lado: aparece calculado suelto dentro de informes, nunca desagregado por departamento ni con catorce años de historia.',
  },
  {
    q: 'Mi zona engorda, no cría. ¿Sirve igual?',
    a: 'Sí, pero el informe lo dice de entrada y no calcula destete ahí. En una zona de engorde los terneros se compran, no se paren, así que el cociente supera lo que un rodeo puede parir y deja de medir eficiencia reproductiva. De los 455 departamentos publicables, 33 están en esa situación y el informe los trata como lo que son: zonas de invernada.',
  },
  {
    q: '¿Por qué no está mi departamento?',
    a: 'Puede ser por dos motivos. Uno: tiene menos de diez unidades productivas, y con esa escala el dato deja de ser un agregado y describe establecimientos concretos, así que no lo publicamos. Dos: no tiene rodeo declarado. Están los 455 departamentos que superan ese umbral, sobre 502 con datos.',
  },
  {
    q: '¿Cada cuánto se actualiza?',
    a: 'La fuente se publica una vez al año, en abril, con el cierre del año anterior. Cuando sale la edición nueva el informe la toma solo: si volvés a bajarlo, viene con el año nuevo y no pagás de nuevo.',
  },
]

export default function Page() {
  const anio = ultimoAnio()
  const publicables = getDepartamentosPublicables()

  // Tres casos reales para mostrar de qué se trata, calculados en build.
  const muestra = ['curuzu-cuatia', 'mercedes', 'general-paz']
    .map((slug) => getDepartamento('corrientes', slug))
    .filter((d): d is NonNullable<typeof d> => !!d)
    .map((d) => ({
      nombre: d.nombre,
      indice: indiceTernerosVaca(d.serie[anio]),
      t: tendencia(d, 2012, anio),
      up: d.up,
    }))

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
                  // PreOrder mientras no haya entregable: declarar InStock algo que no
                  // se puede comprar es un dato falso en el schema, y Google lo trata
                  // como tal.
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
        <span className="text-slate-400">Productivo departamental</span>
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
          ¿Tu zona produce lo que puede?
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-slate-300">
          Catorce años de stock de tu partido, cuántos terneros por vaca saca contra los
          departamentos de al lado, y qué dice la bibliografía de INTA que mueve la aguja
          en tu ambiente.
        </p>
      </header>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-slate-100">La diferencia que nadie está mirando</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          Tres departamentos de Corrientes, mismo año, misma provincia, misma fuente
          oficial:
        </p>

        <div className="mt-5 space-y-3">
          {muestra.map((m) => (
            <div
              key={m.nombre}
              className="flex flex-wrap items-baseline justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/60 px-5 py-4"
            >
              <div>
                <p className="font-medium text-slate-100">{m.nombre}</p>
                <p className="text-xs text-slate-500">
                  {m.up?.toLocaleString('es-AR')} establecimientos
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-semibold text-sky-300">
                  {m.indice != null ? `${(m.indice * 100).toFixed(1)}%` : '—'}
                </p>
                <p className="text-xs text-slate-500">
                  terneros por vaca
                  {m.t?.indiceDeltaPuntos != null && (
                    <>
                      {' · '}
                      <span className={m.t.indiceDeltaPuntos >= 0 ? 'text-emerald-400' : 'text-amber-400'}>
                        {m.t.indiceDeltaPuntos >= 0 ? '+' : ''}
                        {m.t.indiceDeltaPuntos.toFixed(1)} pts desde 2012
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-4 text-sm leading-relaxed text-slate-400">
          Curuzú Cuatiá casi duplica a General Paz. Y la serie cuenta algo más: el sur
          achicó el rodeo y ganó eficiencia, mientras que el norte perdió hacienda{' '}
          <strong className="text-slate-300">sin moverse un punto en trece años</strong>.
          Eso es exactamente el gradiente que INTA midió en el animal, y acá aparece
          departamento por departamento.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold text-slate-100">Qué trae el informe</h2>
        <ol className="mt-4 space-y-3 text-sm leading-relaxed text-slate-300">
          {[
            'El stock de tu departamento hoy, con el rodeo abierto por categoría: vacas, vaquillonas, novillos, novillitos, terneros, terneras, toros.',
            'La serie completa desde 2012: cuántas cabezas ganó o perdió tu partido, año por año.',
            'Tu índice de terneros por vaca y el puesto que ocupa tu departamento en el ranking de la provincia.',
            'La escala media: cuántas cabezas por establecimiento, que define a qué tipo de productor le habla cualquier plan.',
            'Si tu zona es de cría o de invernada, medido y no supuesto — y si es de invernada, el informe no te habla de destete.',
            'Qué dice la bibliografía de INTA para tu ambiente, con la cita: receptividad, carga, y qué escalón de manejo devuelve más.',
            'El límite honesto: dónde el dato no alcanza para afirmar algo, dicho en vez de disimulado.',
          ].map((t, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-0.5 shrink-0 font-mono text-xs text-slate-600">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span>{t}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12 grid gap-4 sm:grid-cols-3">
        {[
          { n: publicables.length.toString(), l: 'departamentos disponibles' },
          { n: `2012–${anio}`, l: 'años de serie' },
          { n: getProvincias().length.toString(), l: 'jurisdicciones' },
        ].map((s) => (
          <div key={s.l} className="rounded-lg border border-slate-800 bg-slate-950/60 p-5 text-center">
            <p className="text-2xl font-semibold text-slate-100">{s.n}</p>
            <p className="mt-1 text-xs text-slate-500">{s.l}</p>
          </div>
        ))}
      </section>

      <section className="mt-10 rounded-lg border border-amber-900/50 bg-amber-950/20 p-5">
        <h2 className="text-base font-semibold text-amber-200">Lo que el informe no es</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          No es un diagnóstico de tu campo: es el de tu zona. Nadie midió tu rodeo — el
          dato es el agregado del departamento, y sirve para saber contra qué te estás
          comparando. Tampoco es asesoramiento técnico: las recomendaciones que trae son
          las de la bibliografía publicada de INTA para ese ambiente, con la cita a la
          vista para que las lleves a tu asesor.
        </p>
      </section>

      <div className="mt-12">
        {P.publicado ? (
          <SelectorVariante
            slug={P.slug}
            nombre={P.nombre}
            precio={P.precio}
            modalidad={P.modalidad}
            opciones={variantesDisponibles()}
          />
        ) : (
          <ListaDeEspera slug={P.slug} nombre={P.nombre} />
        )}
      </div>

      {P.publicado && (
        <ComoSePaga precio={`ARS ${P.precio.toLocaleString('es-AR')}`} modalidad={P.modalidad} />
      )}

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
        <p className="text-xs leading-relaxed text-slate-500">
          Fuente: {META.organismo}. {META.dataset}. Datos agregados por departamento: no
          contienen identificación de personas ni de establecimientos. Los departamentos
          con menos de {META.minUpPublicable} unidades productivas no se publican.
        </p>
        <ul className="mt-4 space-y-2 text-sm">
          <li>
            <Link href="/que-es-el-destete" className="text-sky-400 underline underline-offset-2">
              Qué es el destete
            </Link>
            <span className="text-slate-500"> — el concepto, gratis</span>
          </li>
          <li>
            <Link href="/buenas-practicas" className="text-sky-400 underline underline-offset-2">
              Buenas Prácticas Ganaderas
            </Link>
            <span className="text-slate-500"> — el marco de la Red BPA</span>
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
