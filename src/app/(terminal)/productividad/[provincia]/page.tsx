import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  getProvincias,
  getDepartamentosPublicables,
  indiceTernerosVaca,
  hayCompraDeTerneros,
  escala,
  totalProvincial,
  ultimoAnio,
  META,
} from '@/lib/productividad/panel'

const APP_URL = 'https://www.consignatarias.com.ar'

export const dynamicParams = false
export const revalidate = false

export function generateStaticParams() {
  const anio = ultimoAnio()
  const conFichas = new Set(
    getDepartamentosPublicables()
      .filter((d) => d.serie[anio])
      .map((d) => d.slugProvincia),
  )
  return [...conFichas].map((provincia) => ({ provincia }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ provincia: string }>
}): Promise<Metadata> {
  const { provincia } = await params
  const p = getProvincias().find((x) => x.slug === provincia)
  if (!p) return {}
  const anio = ultimoAnio()
  const total = totalProvincial(p.clave, anio)

  return {
    title: `Ganadería en ${p.nombre} — stock por partido`,
    description: `${total ? total.total.toLocaleString('es-AR') + ' cabezas' : 'Stock bovino'} en ${p.nombre} al cierre de ${anio}, partido por partido: cabezas, establecimientos y terneros por vaca. Datos oficiales.`,
    keywords: [
      `ganadería en ${p.nombre}`,
      `stock bovino ${p.nombre}`,
      `cabezas de ganado por partido ${p.nombre}`,
      `zonas ganaderas de ${p.nombre}`,
    ],
    alternates: { canonical: `${APP_URL}/productividad/${p.slug}` },
  }
}

/** Índice provincial: la tabla de partidos, ordenada por rodeo. */
export default async function Page({ params }: { params: Promise<{ provincia: string }> }) {
  const { provincia } = await params
  const p = getProvincias().find((x) => x.slug === provincia)
  if (!p) notFound()

  const anio = ultimoAnio()
  const deptos = getDepartamentosPublicables()
    .filter((d) => d.provincia === p.clave && d.serie[anio])
    .sort((a, b) => b.serie[anio].total - a.serie[anio].total)

  if (!deptos.length) notFound()

  const total = totalProvincial(p.clave, anio)
  const fmt = (n: number) => n.toLocaleString('es-AR')
  const pct = (n: number | null) =>
    n == null ? '—' : `${(n * 100).toLocaleString('es-AR', { maximumFractionDigits: 1 })} %`

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <nav className="mb-6 text-xs text-slate-500">
        <Link href="/productividad" className="hover:text-sky-400">Productividad</Link>
        <span className="mx-2">/</span>
        <span className="text-slate-400">{p.nombre}</span>
      </nav>

      <header>
        <h1 className="text-3xl font-semibold text-slate-100 sm:text-4xl">
          Ganadería en {p.nombre}
        </h1>
        <p className="mt-3 text-base text-slate-400">
          {total && (
            <>
              <strong className="text-slate-200">{fmt(total.total)}</strong> cabezas al cierre
              de {anio}
              {total.up ? <> en {fmt(total.up)} establecimientos</> : null}.{' '}
            </>
          )}
          {deptos.length} partidos con dato publicable.
        </p>
      </header>

      <div className="mt-8 overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-slate-900/80 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Partido</th>
              <th className="px-4 py-3 font-medium">Cabezas</th>
              <th className="px-4 py-3 font-medium">Establec.</th>
              <th className="px-4 py-3 font-medium">Escala</th>
              <th className="px-4 py-3 text-right font-medium">Tern./vaca</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {deptos.map((d) => {
              const f = d.serie[anio]
              const compra = hayCompraDeTerneros(f)
              return (
                <tr key={d.clave} className="hover:bg-slate-900/40">
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/productividad/${d.slugProvincia}/${d.slugDepartamento}`}
                      className="text-slate-200 hover:text-sky-400"
                    >
                      {d.nombre}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-slate-300">{fmt(f.total)}</td>
                  <td className="px-4 py-2.5 text-slate-500">{f.up ? fmt(f.up) : '—'}</td>
                  <td className="px-4 py-2.5 text-slate-500">
                    {escala(f) ? fmt(Math.round(escala(f)!)) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className={compra ? 'text-slate-500' : 'font-medium text-sky-300'}>
                      {pct(indiceTernerosVaca(f))}
                    </span>
                    {compra && (
                      <span className="ml-1.5 text-[10px] uppercase text-amber-500" title="Compra terneros: zona de invernada">
                        inv.
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-slate-500">
        <strong className="text-slate-400">inv.</strong> marca los partidos donde entran
        terneros comprados: ahí el cociente no mide eficiencia reproductiva sino engorde, y
        no se compara con los de cría.
      </p>

      <section className="mt-10 border-t border-slate-800 pt-6">
        <p className="text-xs leading-relaxed text-slate-500">
          Fuente: {META.organismo}. Dato agregado por departamento. Se publican los partidos
          con al menos {META.minUpPublicable} unidades productivas.
        </p>
        <Link href="/productividad" className="mt-4 inline-block text-sm text-sky-400 underline underline-offset-2">
          ← Todas las provincias
        </Link>
      </section>
    </div>
  )
}
