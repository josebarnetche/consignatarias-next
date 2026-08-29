import type { Metadata } from 'next'
import Link from 'next/link'
import { getProveedoresPublicados, aPublico } from '@/lib/proveedores'

const APP_URL = 'https://www.consignatarias.com.ar'

export const metadata: Metadata = {
  title: 'Proveedores de la industria frigorífica y ganadera',
  description:
    'Empresas que le venden a frigoríficos, marcas de carne, consignatarias y despostaderos. Dejás tus datos y te contactan: no publicamos sus teléfonos y no cobramos comisión.',
  keywords: [
    'proveedores industria frigorífica',
    'etiquetas para frigoríficos',
    'proveedores para frigoríficos argentina',
    'insumos industria de la carne',
    'servicios para marcas de carne',
  ],
  openGraph: {
    title: 'Proveedores de la industria frigorífica y ganadera',
    description: 'Empresas que le venden a la cadena de la carne. Dejás tus datos y te contactan.',
    url: `${APP_URL}/proveedores`,
    type: 'website',
  },
  alternates: { canonical: `${APP_URL}/proveedores` },
}

export const revalidate = false

/**
 * La guía de proveedores.
 *
 * Nace de un pedido concreto: una empresa de etiquetas quiso figurar y poder recibir
 * consultas. No es un listado paga-y-aparecés — de hecho hoy no se cobra — y **no publica
 * el contacto de nadie**: el interesado deja sus datos y nosotros los derivamos.
 *
 * Las páginas usan `aPublico()`, que deja afuera el email y el teléfono del proveedor. El
 * catálogo tiene tests que verifican que eso no se filtre al HTML.
 */
export default function ProveedoresPage() {
  const proveedores = getProveedoresPublicados().map(aPublico)

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: 'Proveedores de la industria frigorífica y ganadera',
            itemListElement: proveedores.map((p, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              item: {
                '@type': 'Organization',
                name: p.empresa,
                description: p.rubro,
                url: `${APP_URL}/proveedores/${p.slug}`,
                areaServed: p.provincia,
              },
            })),
          }),
        }}
      />

      <header className="mb-10">
        <p className="text-xs uppercase tracking-widest text-sky-500">Proveedores</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-100 sm:text-4xl">
          Quién le vende a la industria
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-400">
          Empresas que trabajan con frigoríficos, marcas de carne, consignatarias y
          despostaderos. Si te sirve alguna, dejás tus datos y te contactan.{' '}
          <strong className="text-slate-300">No cobramos comisión</strong> ni publicamos
          los teléfonos de nadie.
        </p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2">
        {proveedores.map((p) => (
          <Link
            key={p.slug}
            href={`/proveedores/${p.slug}`}
            className="group flex flex-col rounded-lg border border-slate-800 bg-slate-950/60 p-5 transition hover:border-sky-800 hover:bg-slate-900/60"
          >
            <h2 className="font-semibold text-slate-100 group-hover:text-sky-300">{p.empresa}</h2>
            <p className="mt-1 text-sm text-sky-400">{p.rubro}</p>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">{p.descripcion}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {p.leSirveA.map((s) => (
                <span key={s} className="rounded bg-slate-800/80 px-2 py-0.5 text-[11px] text-slate-400">
                  {s}
                </span>
              ))}
            </div>
            <div className="mt-auto flex items-baseline justify-between pt-5">
              <span className="text-xs text-slate-500">{p.provincia}</span>
              <span className="text-sm font-medium text-sky-400 group-hover:text-sky-300">
                Que me contacten →
              </span>
            </div>
          </Link>
        ))}
      </div>

      <section className="mt-12 rounded-lg border border-slate-800 bg-slate-950/60 p-6">
        <h2 className="text-base font-semibold text-slate-200">¿Tenés una empresa que le vende a la cadena?</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          Escribinos a{' '}
          <a href="mailto:agro@memola.com.ar" className="text-sky-400 underline underline-offset-2">
            agro@memola.com.ar
          </a>{' '}
          con el nombre de la empresa y qué hacen. Publicamos el nombre y el rubro; el
          contacto queda del lado nuestro y te derivamos a quien consulte.
        </p>
      </section>

      <section className="mt-8 border-t border-slate-800 pt-6">
        <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <li>
            <Link href="/frigorificos" className="text-sky-400 underline underline-offset-2">
              Frigoríficos habilitados
            </Link>
          </li>
          <li>
            <Link href="/consignatarias" className="text-sky-400 underline underline-offset-2">
              Consignatarias
            </Link>
          </li>
          <li>
            <Link href="/remates" className="text-sky-400 underline underline-offset-2">
              Remates
            </Link>
          </li>
        </ul>
      </section>
    </div>
  )
}
