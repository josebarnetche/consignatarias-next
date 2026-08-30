import type { Metadata } from 'next'
import Link from 'next/link'
import {
  getProvincias,
  getDepartamentosPublicables,
  indiceTernerosVaca,
  hayCompraDeTerneros,
  totalProvincial,
  totalPais,
  ultimoAnio,
  META,
} from '@/lib/productividad/panel'
import { getProducto } from '@/lib/productos-datos'
import { CtaInformeTracker } from '@/components/productos/FichaTracker'

const APP_URL = 'https://www.consignatarias.com.ar'
const INFORME = getProducto('informe-productivo-departamento')!

export const metadata: Metadata = {
  title: 'Productividad ganadera por departamento — stock y eficiencia',
  description:
    'Cuántas cabezas hay en cada partido del país, cuántos establecimientos, y cuántos terneros por vaca produce cada zona. Serie desde 2012, con datos oficiales de MAGyP.',
  keywords: [
    'stock ganadero por departamento',
    'existencias bovinas por partido',
    'cuántas cabezas de ganado hay en argentina',
    'índice de destete por zona',
    'productividad ganadera argentina',
    'mapa ganadero argentino',
  ],
  openGraph: {
    title: 'Productividad ganadera por departamento',
    description: 'El rodeo de cada partido del país, con catorce años de serie oficial.',
    url: `${APP_URL}/productividad`,
    type: 'website',
  },
  alternates: { canonical: `${APP_URL}/productividad` },
}

export const revalidate = false

/**
 * Hub nacional de productividad.
 *
 * Es la puerta de las 455 fichas: el activo de búsqueda del proyecto y la única fuente de
 * audiencia nueva del plan. Publica gratis lo que ninguna otra fuente publica —el índice
 * terneros/vaca por departamento— y deriva al informe pago para el detalle.
 */
export default function ProductividadPage() {
  const anio = ultimoAnio()
  const publicables = getDepartamentosPublicables().filter((d) => d.serie[anio])
  const pais = totalPais(anio)
  const paisAntes = totalPais(2012)

  const provincias = getProvincias()
    .map((p) => {
      const deptos = publicables.filter((d) => d.provincia === p.clave)
      const total = totalProvincial(p.clave, anio)
      return { ...p, n: deptos.length, cabezas: total?.total ?? 0 }
    })
    .filter((p) => p.n > 0)
    .sort((a, b) => b.cabezas - a.cabezas)

  // Los diez de mejor eficiencia del país, entre los de cría.
  const top = publicables
    .filter((d) => !hayCompraDeTerneros(d.serie[anio]))
    .map((d) => ({ d, i: indiceTernerosVaca(d.serie[anio]) }))
    .filter((x): x is { d: (typeof publicables)[0]; i: number } => x.i != null)
    .sort((a, b) => b.i - a.i)
    .slice(0, 10)

  const fmt = (n: number) => n.toLocaleString('es-AR')
  const variacionPais =
    pais && paisAntes && paisAntes.total ? (pais.total - paisAntes.total) / paisAntes.total : null

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Dataset',
            name: 'Productividad ganadera por departamento — Argentina',
            description: `Existencias bovinas por categoría, unidades productivas e índice terneros/vaca para ${publicables.length} departamentos de Argentina, serie 2012-${anio}.`,
            url: `${APP_URL}/productividad`,
            temporalCoverage: `2012/${anio}`,
            spatialCoverage: { '@type': 'Country', name: 'Argentina' },
            creator: { '@type': 'Organization', name: 'Consignatarias.com.ar' },
            isBasedOn: META.organismo,
            license: `${APP_URL}/licencia-datos`,
          }),
        }}
      />

      <header className="mb-10">
        <p className="text-xs uppercase tracking-widest text-sky-500">Productividad</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-100 sm:text-4xl">
          El rodeo, partido por partido
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-400">
          Cuántas cabezas hay en cada zona del país, en cuántos establecimientos, y cuántos
          terneros saca por vaca. Con catorce años de serie oficial.{' '}
          <strong className="text-slate-300">Es gratis y se puede citar.</strong>
        </p>
      </header>

      {pais && (
        <section className="grid gap-4 sm:grid-cols-3">
          {[
            { n: fmt(pais.total), l: `cabezas en el país (${anio})` },
            { n: pais.up ? fmt(pais.up) : '—', l: 'unidades productivas' },
            { n: fmt(publicables.length), l: 'partidos con ficha propia' },
          ].map((s) => (
            <div key={s.l} className="rounded-lg border border-slate-800 bg-slate-950/60 p-5">
              <p className="text-2xl font-semibold text-slate-100">{s.n}</p>
              <p className="mt-1 text-xs leading-snug text-slate-500">{s.l}</p>
            </div>
          ))}
        </section>
      )}

      {variacionPais != null && (
        <p className="mt-5 text-sm leading-relaxed text-slate-300">
          Desde 2012 el rodeo nacional{' '}
          {variacionPais >= 0 ? 'creció' : (
            <>
              perdió{' '}
              <strong className="text-amber-400">
                {fmt(Math.abs(paisAntes!.total - pais!.total))} cabezas
              </strong>
            </>
          )}{' '}
          ({(Math.abs(variacionPais) * 100).toLocaleString('es-AR', { maximumFractionDigits: 1 })} %).
        </p>
      )}

      <section className="mt-12">
        <h2 className="text-xl font-semibold text-slate-100">Por provincia</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {provincias.map((p) => (
            <Link
              key={p.clave}
              href={`/productividad/${p.slug}`}
              className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 px-5 py-4 transition hover:border-sky-800 hover:bg-slate-900/60"
            >
              <div>
                <p className="font-medium text-slate-100">{p.nombre}</p>
                <p className="text-xs text-slate-500">{p.n} partidos</p>
              </div>
              <p className="text-sm text-slate-400">{fmt(p.cabezas)}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold text-slate-100">Los diez más eficientes del país</h2>
        <p className="mt-1 text-sm text-slate-500">
          Terneros por vaca, entre los partidos de cría. Las zonas de invernada quedan
          afuera: ahí entran terneros comprados y el cociente mide otra cosa.
        </p>
        <ol className="mt-5 divide-y divide-slate-800 overflow-hidden rounded-lg border border-slate-800">
          {top.map((x, i) => (
            <li key={x.d.clave}>
              <Link
                href={`/productividad/${x.d.slugProvincia}/${x.d.slugDepartamento}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-slate-900/50"
              >
                <span className="flex items-baseline gap-3">
                  <span className="w-5 text-xs text-slate-600">{i + 1}</span>
                  <span className="text-slate-200">{x.d.nombre}</span>
                  <span className="text-xs text-slate-500">{x.d.provinciaNombre}</span>
                </span>
                <span className="font-medium text-sky-300">
                  {(x.i * 100).toLocaleString('es-AR', { maximumFractionDigits: 1 })} %
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12 rounded-lg border border-sky-900/50 bg-slate-950/80 p-6">
        <h2 className="text-lg font-semibold text-slate-100">¿Y el informe completo?</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          Estas páginas tienen los titulares de cada zona. El informe de un partido trae el
          rodeo abierto por categoría, la serie año por año, todo el ranking de la provincia
          y lo que INTA publicó sobre ese ambiente. En PDF, para imprimir.
        </p>
        <CtaInformeTracker desde="hub:productividad">
          <Link
            href={INFORME.landing}
            className="mt-5 inline-block rounded bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-500"
          >
            Ver el informe · ARS {INFORME.precio.toLocaleString('es-AR')}
          </Link>
        </CtaInformeTracker>
      </section>

      <section className="mt-10 border-t border-slate-800 pt-6">
        <p className="text-xs leading-relaxed text-slate-500">
          Fuente: {META.organismo}. {META.dataset}. Dato agregado por departamento: no
          contiene identificación de personas ni de establecimientos. Se publican los
          partidos con al menos {META.minUpPublicable} unidades productivas — abajo de esa
          escala el agregado dejaría de serlo.
        </p>
      </section>
    </div>
  )
}
