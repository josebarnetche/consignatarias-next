import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProveedor, getProveedoresPublicados, aPublico } from '@/lib/proveedores'
import { ContactarProveedor } from '@/components/productos/ContactarProveedor'

const APP_URL = 'https://www.consignatarias.com.ar'

export const dynamicParams = false
export const revalidate = false

export function generateStaticParams() {
  return getProveedoresPublicados().map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const p = getProveedor(slug)
  if (!p) return {}
  return {
    title: `${p.empresa} — ${p.rubro}`,
    description: `${p.descripcion} Dejá tus datos y te contactan.`,
    keywords: [p.rubro.toLowerCase(), p.empresa.toLowerCase(), ...p.leSirveA.map((s) => s.toLowerCase())],
    openGraph: {
      title: `${p.empresa} — ${p.rubro}`,
      description: p.descripcion,
      url: `${APP_URL}/proveedores/${p.slug}`,
      type: 'website',
    },
    alternates: { canonical: `${APP_URL}/proveedores/${p.slug}` },
  }
}

/**
 * Ficha de un proveedor.
 *
 * Se construye con `aPublico()`: el email y el teléfono del proveedor **no llegan al
 * HTML**. Es lo que se acordó — figura la empresa y hay un canal de contacto, no se
 * expone la casilla de quien la atiende.
 */
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const proveedor = getProveedor(slug)
  if (!proveedor || !proveedor.publicado) notFound()

  const p = aPublico(proveedor)

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: p.empresa,
            description: p.descripcion,
            url: `${APP_URL}/proveedores/${p.slug}`,
            areaServed: { '@type': 'AdministrativeArea', name: p.provincia },
            knowsAbout: p.rubro,
          }),
        }}
      />

      <nav className="mb-6 text-xs text-slate-500">
        <Link href="/proveedores" className="hover:text-sky-400">Proveedores</Link>
        <span className="mx-2">/</span>
        <span className="text-slate-400">{p.empresa}</span>
      </nav>

      <header>
        <h1 className="text-3xl font-semibold text-slate-100 sm:text-4xl">{p.empresa}</h1>
        <p className="mt-2 text-lg text-sky-400">{p.rubro}</p>
        <p className="mt-4 text-base leading-relaxed text-slate-300">{p.descripcion}</p>
      </header>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Le sirve a</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {p.leSirveA.map((s) => (
            <span key={s} className="rounded border border-slate-800 bg-slate-950/60 px-3 py-1 text-sm text-slate-300">
              {s}
            </span>
          ))}
        </div>
        <p className="mt-4 text-sm text-slate-500">Zona: {p.provincia}</p>
      </section>

      <div className="mt-10">
        <ContactarProveedor slug={p.slug} empresa={p.empresa} />
      </div>

      <section className="mt-10 rounded-lg border border-slate-800 bg-slate-950/60 p-5">
        <h2 className="text-sm font-semibold text-slate-300">Cómo funciona esto</h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-400">
          <li>
            · <strong className="text-slate-300">No publicamos su teléfono ni su mail.</strong>{' '}
            Dejás tus datos y se los pasamos; te contacta directo.
          </li>
          <li>
            · <strong className="text-slate-300">No cobramos comisión</strong> ni participamos
            de lo que arreglen. Esta guía existe para que el que busca encuentre.
          </li>
          <li>
            · La empresa figura acá porque dio su conformidad, y puede pedir salir cuando
            quiera.
          </li>
        </ul>
      </section>

      <section className="mt-8 border-t border-slate-800 pt-6">
        <Link href="/proveedores" className="text-sm text-sky-400 underline underline-offset-2">
          ← Ver todos los proveedores
        </Link>
      </section>
    </div>
  )
}
