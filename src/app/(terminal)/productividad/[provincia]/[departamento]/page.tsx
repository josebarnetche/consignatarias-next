import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  getDepartamento,
  getDepartamentosPublicables,
  indiceTernerosVaca,
  desteteEstimado,
  hayCompraDeTerneros,
  escala,
  rankingProvincial,
  puestoEnProvincia,
  tendencia,
  aniosConRuido,
  ultimoAnio,
  META,
} from '@/lib/productividad/panel'
import { getProducto } from '@/lib/productos-datos'
import { FichaTracker, CtaInformeTracker } from '@/components/productos/FichaTracker'

const APP_URL = 'https://www.consignatarias.com.ar'
const INFORME = getProducto('informe-productivo-departamento')!

export const dynamicParams = false
export const revalidate = false

/**
 * Ficha pública de un departamento — 455 páginas, una por partido.
 *
 * ES EL ACTIVO, NO EL PRODUCTO. Cada una publica un indicador que no está en ninguna otra
 * parte (el índice terneros/vaca por departamento, con catorce años de serie) y lo hace
 * gratis y citable, con `Dataset` en el schema. Es la misma doctrina que rige el resto del
 * sitio: el número del día queda abierto porque es cita GEO; lo que se cobra es el trabajo
 * de cruzarlo y ponerlo en contexto.
 *
 * Lo que la ficha NO trae y sí el informe: la composición completa del rodeo, la serie año
 * por año, las referencias de la provincia y las recomendaciones de INTA para el ambiente.
 */
export function generateStaticParams() {
  const anio = ultimoAnio()
  return getDepartamentosPublicables()
    .filter((d) => d.serie[anio])
    .map((d) => ({ provincia: d.slugProvincia, departamento: d.slugDepartamento }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ provincia: string; departamento: string }>
}): Promise<Metadata> {
  const { provincia, departamento } = await params
  const d = getDepartamento(provincia, departamento)
  const anio = ultimoAnio()
  if (!d?.serie[anio]) return {}

  const f = d.serie[anio]
  const cabezas = f.total.toLocaleString('es-AR')

  return {
    title: `Ganadería en ${d.nombre}, ${d.provinciaNombre} — ${cabezas} cabezas`,
    description: `${cabezas} cabezas en ${d.nombre} al cierre de ${anio}, en ${f.up?.toLocaleString('es-AR') ?? '—'} establecimientos. Terneros por vaca, evolución del rodeo desde 2012 y comparación con el resto de ${d.provinciaNombre}. Datos oficiales.`,
    keywords: [
      `ganadería en ${d.nombre}`,
      `cabezas de ganado ${d.nombre}`,
      `stock bovino ${d.nombre}`,
      `campos ganaderos ${d.nombre} ${d.provinciaNombre}`,
      `producción ganadera ${d.provinciaNombre}`,
    ],
    openGraph: {
      title: `Ganadería en ${d.nombre}, ${d.provinciaNombre}`,
      description: `${cabezas} cabezas y ${f.up?.toLocaleString('es-AR') ?? '—'} establecimientos. Serie desde 2012.`,
      url: `${APP_URL}/productividad/${d.slugProvincia}/${d.slugDepartamento}`,
      type: 'website',
    },
    alternates: {
      canonical: `${APP_URL}/productividad/${d.slugProvincia}/${d.slugDepartamento}`,
    },
  }
}

export default async function Page({
  params,
}: {
  params: Promise<{ provincia: string; departamento: string }>
}) {
  const { provincia, departamento } = await params
  const d = getDepartamento(provincia, departamento)
  const anio = ultimoAnio()
  if (!d || !d.publicable || !d.serie[anio]) notFound()

  const f = d.serie[anio]
  const indice = indiceTernerosVaca(f)
  const destete = desteteEstimado(f)
  const compra = hayCompraDeTerneros(f)
  const puesto = puestoEnProvincia(d, anio)
  const t = tendencia(d, 2012, anio)
  const ruido = aniosConRuido(d)

  // Vecinos por índice, para dar contexto sin la tabla entera.
  const ranking = rankingProvincial(d.provincia, anio)
  const miIdx = ranking.findIndex((r) => r.departamento.clave === d.clave)
  const vecinos =
    miIdx >= 0 ? ranking.slice(Math.max(0, miIdx - 2), miIdx + 3) : ranking.slice(0, 5)

  const fmt = (n: number) => n.toLocaleString('es-AR')
  const pct = (n: number | null, dec = 1) =>
    n == null ? '—' : `${(n * 100).toLocaleString('es-AR', { maximumFractionDigits: dec })} %`

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <FichaTracker provincia={d.slugProvincia} departamento={d.slugDepartamento} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                // Dataset y no Article: el valor de esta página es el dato, y es lo que
                // hace que un asistente pueda citarla como fuente.
                '@type': 'Dataset',
                name: `Stock bovino de ${d.nombre}, ${d.provinciaNombre}`,
                description: `Existencias bovinas por categoría y serie histórica del departamento de ${d.nombre}, ${d.provinciaNombre}, ${d.serie[2012] ? '2012' : ''}-${anio}.`,
                url: `${APP_URL}/productividad/${d.slugProvincia}/${d.slugDepartamento}`,
                temporalCoverage: `${Object.keys(d.serie)[0]}/${anio}`,
                spatialCoverage: {
                  '@type': 'AdministrativeArea',
                  name: `${d.nombre}, ${d.provinciaNombre}, Argentina`,
                },
                creator: { '@type': 'Organization', name: 'Consignatarias.com.ar' },
                isBasedOn: META.organismo,
                license: `${APP_URL}/licencia-datos`,
                variableMeasured: [
                  { '@type': 'PropertyValue', name: 'Cabezas totales', value: f.total },
                  ...(f.up ? [{ '@type': 'PropertyValue', name: 'Unidades productivas', value: f.up }] : []),
                  ...(indice != null
                    ? [{ '@type': 'PropertyValue', name: 'Terneros por vaca', value: Number(indice.toFixed(3)) }]
                    : []),
                ],
              },
              {
                '@type': 'BreadcrumbList',
                itemListElement: [
                  { '@type': 'ListItem', position: 1, name: 'Productividad', item: `${APP_URL}/productividad` },
                  {
                    '@type': 'ListItem',
                    position: 2,
                    name: d.provinciaNombre,
                    item: `${APP_URL}/productividad/${d.slugProvincia}`,
                  },
                  {
                    '@type': 'ListItem',
                    position: 3,
                    name: d.nombre,
                    item: `${APP_URL}/productividad/${d.slugProvincia}/${d.slugDepartamento}`,
                  },
                ],
              },
            ],
          }),
        }}
      />

      <nav className="mb-6 text-xs text-slate-500">
        <Link href="/productividad" className="hover:text-sky-400">Productividad</Link>
        <span className="mx-2">/</span>
        <Link href={`/productividad/${d.slugProvincia}`} className="hover:text-sky-400">
          {d.provinciaNombre}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-400">{d.nombre}</span>
      </nav>

      <header>
        <h1 className="text-3xl font-semibold text-slate-100 sm:text-4xl">
          Ganadería en {d.nombre}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {d.provinciaNombre} · rodeo al 31 de diciembre de {anio}
        </p>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          { n: fmt(f.total), l: 'cabezas' },
          { n: f.up ? fmt(f.up) : '—', l: 'establecimientos' },
          { n: escala(f) ? fmt(Math.round(escala(f)!)) : '—', l: 'cabezas por establecimiento' },
        ].map((s) => (
          <div key={s.l} className="rounded-lg border border-slate-800 bg-slate-950/60 p-5">
            <p className="text-2xl font-semibold text-slate-100">{s.n}</p>
            <p className="mt-1 text-xs leading-snug text-slate-500">{s.l}</p>
          </div>
        ))}
      </section>

      <section className="mt-8 rounded-lg border border-slate-800 bg-slate-950/60 p-6">
        <p className="text-xs uppercase tracking-widest text-slate-500">Terneros por vaca</p>
        <div className="mt-2 flex flex-wrap items-baseline gap-4">
          <p className="text-4xl font-semibold text-sky-300">{pct(indice)}</p>
          {puesto && (
            <p className="text-sm text-slate-400">
              Puesto <strong className="text-slate-200">{puesto.puesto}</strong> de {puesto.de} en{' '}
              {d.provinciaNombre}
            </p>
          )}
        </div>

        {compra ? (
          <p className="mt-4 rounded border border-amber-900/50 bg-amber-950/20 p-4 text-sm leading-relaxed text-amber-100">
            Este partido tiene más terneros de los que su rodeo de vacas puede parir: el
            exceso son terneros <strong>comprados</strong>. Es zona de invernada, no de
            cría, y acá el índice deja de medir eficiencia reproductiva — por eso no
            calculamos destete ni lo incluimos en el ranking provincial.
          </p>
        ) : destete != null ? (
          <p className="mt-4 text-sm leading-relaxed text-slate-400">
            Ajustado por la proporción de vacas que entra en servicio, eso equivale a un
            destete estimado de <strong className="text-slate-200">{pct(destete)}</strong>.
            Es una estimación: el registro no separa vacas de cría de vacas de invernada,
            así que se asume el 83 % que INTA usa para el NEA.
          </p>
        ) : null}
      </section>

      {t && (
        <section className="mt-8">
          <h2 className="text-xl font-semibold text-slate-100">Cómo viene</h2>
          <p className="mt-3 text-base leading-relaxed text-slate-300">
            Entre {t.desde} y {t.hasta} el rodeo de {d.nombre}{' '}
            {t.stockVar >= 0 ? (
              <>creció <strong className="text-emerald-400">{pct(t.stockVar)}</strong></>
            ) : (
              <>se achicó <strong className="text-amber-400">{pct(Math.abs(t.stockVar))}</strong></>
            )}
            , de {fmt(t.stockDesde)} a {fmt(t.stockHasta)} cabezas.
            {t.indiceDeltaPuntos != null && (
              <>
                {' '}En el mismo período la relación terneros/vaca se movió{' '}
                <strong className={t.indiceDeltaPuntos >= 0 ? 'text-emerald-400' : 'text-amber-400'}>
                  {t.indiceDeltaPuntos >= 0 ? '+' : ''}
                  {t.indiceDeltaPuntos.toLocaleString('es-AR', { maximumFractionDigits: 1 })} puntos
                </strong>
                .
              </>
            )}
          </p>
          {ruido.length > 0 && (
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Los años {ruido.join(', ')} llevan una imprecisión conocida: el organismo
              publicó dos filas para este partido y hubo que sumarlas.
            </p>
          )}
        </section>
      )}

      {vecinos.length > 1 && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold text-slate-100">Contra los de al lado</h2>
          <p className="mt-1 text-sm text-slate-500">
            Los partidos de {d.provinciaNombre} más cercanos en eficiencia.
          </p>
          <div className="mt-4 overflow-hidden rounded-lg border border-slate-800">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-800">
                {vecinos.map((v) => {
                  const esEste = v.departamento.clave === d.clave
                  return (
                    <tr key={v.departamento.clave} className={esEste ? 'bg-sky-950/30' : ''}>
                      <td className="px-4 py-2.5 text-slate-500">{v.puesto}</td>
                      <td className="px-4 py-2.5">
                        {esEste ? (
                          <span className="font-medium text-sky-300">{v.departamento.nombre}</span>
                        ) : (
                          <Link
                            href={`/productividad/${v.departamento.slugProvincia}/${v.departamento.slugDepartamento}`}
                            className="text-slate-200 hover:text-sky-400"
                          >
                            {v.departamento.nombre}
                          </Link>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-slate-300">
                        {pct(v.indice)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="mt-10 rounded-lg border border-sky-900/50 bg-slate-950/80 p-6">
        <h2 className="text-lg font-semibold text-slate-100">El informe completo de {d.nombre}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          Esta página tiene los titulares. El informe trae el rodeo abierto por categoría,
          la serie año por año desde 2012, todo el ranking de {d.provinciaNombre} y lo que
          la bibliografía de INTA dice que mueve la aguja en este ambiente. En PDF,
          pensado para imprimir.
        </p>
        <CtaInformeTracker desde={`ficha:${d.slugProvincia}/${d.slugDepartamento}`}>
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
          contiene identificación de personas ni de establecimientos. Publicamos los
          partidos con al menos {META.minUpPublicable} unidades productivas.
        </p>
        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <li>
            <Link href={`/productividad/${d.slugProvincia}`} className="text-sky-400 underline underline-offset-2">
              Todos los partidos de {d.provinciaNombre}
            </Link>
          </li>
          <li>
            <Link href="/que-es-el-destete" className="text-sky-400 underline underline-offset-2">
              Qué es el destete
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
