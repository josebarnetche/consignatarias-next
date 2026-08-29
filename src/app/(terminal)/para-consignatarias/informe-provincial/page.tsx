import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { getProducto, rangoPrecio } from '@/lib/productos-datos'
import { ListaDeEspera } from '@/components/productos/ListaDeEspera'
import { getDepartamentosPublicables, getProvincias, ultimoAnio, META } from '@/lib/productividad/panel'

const APP_URL = 'https://www.consignatarias.com.ar'
const P = getProducto('informe-prospeccion-provincial')!

export const metadata: Metadata = {
  title: 'Informe de prospección provincial — dónde está el rodeo de tu provincia',
  description:
    'Cuántas cabezas hay en cada partido de tu provincia, qué zonas crecen y cuáles se vacían, y de qué escala son los establecimientos. Para firmas del interior que no operan en Cañuelas.',
  keywords: P.keywords,
  openGraph: {
    title: 'Informe de prospección provincial',
    description:
      'El mapa del rodeo de tu provincia, partido por partido, con catorce años de serie oficial.',
    url: `${APP_URL}${P.landing}`,
    type: 'website',
  },
  alternates: { canonical: `${APP_URL}${P.landing}` },
}

export const revalidate = false

export default function Page() {
  const anio = ultimoAnio()
  const publicables = getDepartamentosPublicables()
  const provincias = getProvincias()

  // Cuántos partidos publicables tiene cada provincia — es el tamaño de lo que se vende.
  const porProvincia = provincias
    .map((p) => ({
      nombre: p.nombre,
      n: publicables.filter((d) => d.provincia === p.clave && d.serie[anio]).length,
    }))
    .filter((p) => p.n >= 5)
    .sort((a, b) => b.n - a.n)
    .slice(0, 8)

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
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
          }),
        }}
      />

      <nav className="mb-6 text-xs text-slate-500">
        <Link href="/para-consignatarias" className="hover:text-sky-400">Para consignatarias</Link>
        <span className="mx-2">/</span>
        <span className="text-slate-400">Informe provincial</span>
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
          ¿Dónde queda rodeo sin quién se lo venda?
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-slate-300">
          El mapa de tu provincia partido por partido: cuántas cabezas hay en cada uno,
          de qué escala son los establecimientos, y qué zonas ganaron o perdieron
          hacienda en los últimos catorce años.
        </p>
      </header>

      <section className="mt-10 rounded-lg border border-slate-800 bg-slate-950/60 p-6">
        <h2 className="text-lg font-semibold text-slate-100">Para quién es</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          Para las firmas que trabajan el interior y no operan en Cañuelas. Si tu casa
          manda al Mercado Agroganadero, lo tuyo es{' '}
          <Link href="/para-consignatarias/pro-territorio" className="text-sky-400 underline underline-offset-2">
            PRO Territorio
          </Link>
          , que cruza esto con tu propia cartera medida.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          Acá no hace falta que operes en ningún mercado nuestro: el informe se arma con
          la serie oficial de stock bovino, que cubre todo el país.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-slate-100">Qué trae</h2>
        <ol className="mt-4 space-y-3 text-sm leading-relaxed text-slate-300">
          {[
            'Todos los partidos de tu provincia ordenados por rodeo, con la composición por categoría.',
            'La escala media de cada uno: cuántas cabezas por establecimiento, que define si ahí hay diez clientes grandes o trescientos chicos.',
            'La serie 2012 en adelante: qué partidos crecieron, cuáles se achicaron y cuánto.',
            'La eficiencia de cada zona, y si es cuenca de cría o de invernada — medido, no supuesto.',
            'Los frigoríficos habilitados de la provincia y los remates que la tocan, para ver el canal de salida que ya existe.',
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

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-slate-100">Cobertura</h2>
        <p className="mt-2 text-sm text-slate-400">
          Partidos con dato publicable en {anio}, por provincia:
        </p>
        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full min-w-[380px] text-sm">
            <tbody className="divide-y divide-slate-800">
              {porProvincia.map((p) => (
                <tr key={p.nombre}>
                  <td className="px-4 py-2.5 text-slate-200">{p.nombre}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-sky-300">
                    {p.n} partidos
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          {publicables.length} partidos publicables en total, sobre {provincias.length}{' '}
          jurisdicciones. Los que tienen menos de {META.minUpPublicable} establecimientos
          no se publican: con esa escala el agregado deja de serlo.
        </p>
      </section>

      <section className="mt-10 flex flex-wrap items-baseline justify-between gap-3 border-y border-slate-800 py-5">
        <div>
          <p className="text-sm text-slate-400">Compra única, una provincia</p>
          <p className="text-xs text-slate-500">No es suscripción: se compra y es tuyo.</p>
        </div>
        <p className="text-lg font-semibold text-slate-100">
          {rangoPrecio(P)} <span className="text-sm font-normal text-slate-500">ARS</span>
        </p>
      </section>

      <div className="mt-8">
        <ListaDeEspera slug={P.slug} nombre={P.nombre} />
      </div>

      <section className="mt-12 border-t border-slate-800 pt-6">
        <p className="text-xs leading-relaxed text-slate-500">
          Fuente: {META.organismo}. Datos agregados por departamento: no contienen
          identificación de personas ni de establecimientos.
        </p>
        <ul className="mt-4 space-y-2 text-sm">
          <li>
            <Link href="/consignatarias" className="text-sky-400 underline underline-offset-2">
              El directorio de consignatarias
            </Link>
          </li>
          <li>
            <Link href="/frigorificos" className="text-sky-400 underline underline-offset-2">
              Frigoríficos por provincia
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
