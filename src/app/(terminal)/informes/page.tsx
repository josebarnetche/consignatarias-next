import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { getProductosPublicados, rangoPrecio, type ProductoDatos } from '@/lib/productos-datos'

const APP_URL = 'https://www.consignatarias.com.ar'

export const metadata: Metadata = {
  title: 'Informes de datos ganaderos — comprá el de tu zona | Consignatarias',
  description:
    'Informes hechos con datos oficiales: canon de arrendamiento por zona, productividad de tu departamento, prospección provincial. Se pagan con tarjeta, en pesos, y se descargan al instante.',
  keywords: [
    'informes ganaderos', 'informe de arrendamiento rural', 'informe productivo por departamento',
    'datos ganaderos por zona', 'stock bovino por departamento', 'canon de arrendamiento por hectárea',
    'comprar informe ganadero', 'estadísticas ganaderas argentina',
  ],
  openGraph: {
    title: 'Informes de datos ganaderos — comprá el de tu zona',
    description:
      'Canon de arrendamiento, productividad departamental y prospección provincial, con datos oficiales y fuente declarada.',
    url: `${APP_URL}/informes`,
    type: 'website',
  },
  alternates: { canonical: `${APP_URL}/informes` },
}

export const revalidate = false

/**
 * Hub de informes — la puerta de entrada a todo lo que se cobra por dato.
 *
 * Muestra los cuatro productos con su precio en rango (regla de la casa: nunca un número
 * seco) y separa por comprador, porque un productor y una consignataria no compran lo
 * mismo ni por el mismo motivo. Lo que está `publicado: false` en el catálogo no aparece
 * acá ni en el sitemap.
 */
export default function InformesPage() {
  const productos = getProductosPublicados()
  const paraProductor = productos.filter((p) => p.audiencia.startsWith('A3') || p.audiencia.startsWith('A5'))
  const paraFirmas = productos.filter((p) => p.audiencia.startsWith('A1') || p.audiencia.startsWith('A2'))

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: 'Informes de datos ganaderos',
            itemListElement: productos.map((p, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              item: {
                '@type': 'Product',
                name: p.nombre,
                description: p.tagline,
                url: `${APP_URL}${p.landing}`,
                offers: {
                  '@type': 'Offer',
                  price: p.precio,
                  priceCurrency: 'ARS',
                  availability: 'https://schema.org/InStock',
                  url: `${APP_URL}${p.landing}`,
                },
              },
            })),
          }),
        }}
      />

      <header className="mb-10">
        <p className="text-xs uppercase tracking-widest text-sky-500">Informes</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-100 sm:text-4xl">
          El dato de tu zona, en un informe
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-400">
          Todos salen de fuentes oficiales —MAGyP, SENASA, INTA, el Mercado Agroganadero— y
          declaran de dónde viene cada número. Se pagan con tarjeta, en pesos, y se bajan al
          instante. No son suscripciones: se compran una vez.
        </p>
      </header>

      <Seccion
        titulo="Si tenés hacienda o campo"
        bajada="Para decidir si un canon es razonable o si tu zona está produciendo lo que puede."
        productos={paraProductor}
      />

      <Seccion
        titulo="Si sos consignataria o comisionista"
        bajada="Para saber dónde hay rodeo que todavía no te está consignando."
        productos={paraFirmas}
      />

      <section className="mt-12 rounded-lg border border-slate-800 bg-slate-950/60 p-6">
        <h2 className="text-base font-semibold text-slate-200">Antes de comprar, mirá lo que es gratis</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          Buena parte del dato está abierto y siempre lo va a estar: el precio del día, la
          serie del INMAG, el calendario de remates y las guías. Los informes agregan el
          trabajo de cruzar, comparar y ponerlo en contexto para una zona concreta.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link href="/guias" className="text-sky-400 underline underline-offset-2">Guías gratuitas</Link>
          <span className="text-slate-700">·</span>
          <Link href="/mercado/arrendamiento" className="text-sky-400 underline underline-offset-2">Canon por zona</Link>
          <span className="text-slate-700">·</span>
          <Link href="/precios" className="text-sky-400 underline underline-offset-2">Precios de hoy</Link>
          <span className="text-slate-700">·</span>
          <Link href="/metodologia" className="text-sky-400 underline underline-offset-2">Cómo medimos</Link>
        </div>
      </section>
    </div>
  )
}

function Seccion({
  titulo,
  bajada,
  productos,
}: {
  titulo: string
  bajada: string
  productos: ProductoDatos[]
}) {
  if (!productos.length) return null
  return (
    <section className="mb-12">
      <h2 className="text-xl font-semibold text-slate-100">{titulo}</h2>
      <p className="mt-1 text-sm text-slate-500">{bajada}</p>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        {productos.map((p) => (
          <Link
            key={p.slug}
            href={p.landing}
            className="group flex flex-col rounded-lg border border-slate-800 bg-slate-950/60 p-5 transition hover:border-sky-800 hover:bg-slate-900/60"
          >
            <div className="flex items-start gap-3">
              <Image
                src={p.icono}
                alt=""
                width={40}
                height={40}
                className="h-10 w-10 shrink-0 rounded bg-stone-100 p-1"
              />
              <div className="min-w-0">
                <h3 className="font-semibold text-slate-100 group-hover:text-sky-300">{p.nombre}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-400">{p.tagline}</p>
              </div>
            </div>

            <p className="mt-4 border-l-2 border-slate-800 pl-3 text-sm italic text-slate-500">
              {p.pregunta}
            </p>

            <div className="mt-auto flex items-baseline justify-between pt-5">
              <span className="text-sm text-slate-500">
                {p.modalidad === 'suscripcion' ? 'Suscripción' : 'Compra única'} · {rangoPrecio(p)}
              </span>
              <span className="text-sm font-medium text-sky-400 group-hover:text-sky-300">Ver →</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
