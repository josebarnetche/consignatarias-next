import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { requireServiceClient } from '@/lib/supabase'
import { getProducto, getProductosPublicados } from '@/lib/productos-datos'
import { CancelarSuscripcion } from './CancelarSuscripcion'

export const metadata: Metadata = {
  title: 'Mis informes',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

interface Compra {
  id: number
  producto_slug: string
  variante_slug: string
  variante_label: string | null
  purchased_at: string
  amount_ars: number | null
  download_count: number
  factura_cuit: string | null
  factura_emitida_at: string | null
}

interface Suscripcion {
  id: number
  producto_slug: string
  status: string
  current_period_end: string | null
  amount_ars: number | null
  last_delivered_at: string | null
}

/**
 * La biblioteca del comprador: compras únicas arriba de suscripciones, y la baja.
 *
 * Es adonde cae el redirect `approved` de Rebill, así que resuelve tres momentos:
 *
 *  1. **Recién pagó.** El webhook tarda unos segundos en otorgar, así que si vuelve con
 *     `?comprado=` o `?suscripto=` y la fila todavía no está, se le dice que se está
 *     acreditando en vez de mostrarle una biblioteca vacía — que se lee como "pagué y no
 *     tengo nada".
 *  2. **Vuelve meses después** a bajarlo. Por eso la compra única no vence.
 *  3. **Quiere darse de baja.** Sin escribir un mail ni llamar: es lo que le prometimos.
 */
export default async function MisInformes({
  searchParams,
}: {
  searchParams: Promise<{ comprado?: string; suscripto?: string }>
}) {
  const { comprado, suscripto } = await searchParams

  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user?.email) {
    redirect(`/login?next=${encodeURIComponent('/cuenta/informes')}`)
  }
  const email = user.email.trim().toLowerCase()

  const service = requireServiceClient()
  const { data, error } = await service
    .from('informe_purchases')
    .select(
      'id, producto_slug, variante_slug, variante_label, purchased_at, amount_ars, download_count, factura_cuit, factura_emitida_at',
    )
    .eq('email', email)
    .eq('status', 'paid')
    .order('purchased_at', { ascending: false })

  if (error) console.error('[cuenta/informes]', error.message)
  const compras = (data ?? []) as Compra[]

  const { data: subsData, error: errSubs } = await service
    .from('producto_subscriptions')
    .select('id, producto_slug, status, current_period_end, amount_ars, last_delivered_at')
    .eq('email', email)
    .in('status', ['active', 'cancelled'])
    .order('created_at', { ascending: false })
  if (errSubs) console.error('[cuenta/informes] subs', errSubs.message)

  // Sólo las vigentes: una cancelada con período vencido ya no da acceso, así que
  // mostrarla como si lo diera sería mentirle a quien la mira.
  const ahora = new Date()
  const suscripciones = ((subsData ?? []) as Suscripcion[]).filter(
    (sb) =>
      sb.status === 'active' ||
      (sb.current_period_end && new Date(sb.current_period_end) > ahora),
  )

  const pendiente = comprado ?? suscripto ?? null
  const recienComprado = pendiente ? getProducto(pendiente) : null
  const acreditando =
    !!recienComprado &&
    !compras.some((c) => c.producto_slug === pendiente) &&
    !suscripciones.some((sb) => sb.producto_slug === pendiente)

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-100">Mis informes</h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Comprados con <span className="text-slate-300">{email}</span>. No vencen: los
          podés bajar cuantas veces quieras.
        </p>
      </header>

      {acreditando && (
        <div className="mb-8 rounded-lg border border-sky-900/60 bg-sky-950/30 p-5">
          <h2 className="font-medium text-sky-200">Estamos acreditando tu pago</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            Tarda unos segundos. Actualizá esta página en un momento y el informe de{' '}
            <strong className="text-slate-100">{recienComprado.nombre}</strong> va a estar
            acá. También te lo mandamos por mail.
          </p>
          <p className="mt-3 text-xs text-slate-500">
            Si pasan unos minutos y no aparece, escribinos a{' '}
            <a href="mailto:agro@memola.com.ar" className="text-sky-400 underline underline-offset-2">
              agro@memola.com.ar
            </a>{' '}
            desde esta misma casilla y lo destrabamos a mano.
          </p>
        </div>
      )}

      {suscripciones.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Tus suscripciones
          </h2>
          <ul className="space-y-4">
            {suscripciones.map((sb) => {
              const p = getProducto(sb.producto_slug)
              const enGracia = sb.status === 'cancelled'
              return (
                <li key={sb.id} className="rounded-lg border border-slate-800 bg-slate-950/60 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-slate-100">{p?.nombre ?? sb.producto_slug}</h3>
                        {enGracia && (
                          <span className="rounded bg-amber-950/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-300">
                            dada de baja
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {enGracia ? 'La tenés hasta el ' : 'Se renueva el '}
                        {sb.current_period_end
                          ? new Date(sb.current_period_end).toLocaleDateString('es-AR', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric',
                            })
                          : '—'}
                        {sb.amount_ars ? ` · ARS ${sb.amount_ars.toLocaleString('es-AR')}/mes` : ''}
                      </p>
                    </div>
                    <a
                      href={`/api/informes/${sb.producto_slug}/download`}
                      className="shrink-0 rounded bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
                    >
                      Descargar PDF
                    </a>
                  </div>
                  {!enGracia && p && (
                    <CancelarSuscripcion
                      slug={sb.producto_slug}
                      nombre={p.nombre}
                      vigenteHasta={sb.current_period_end}
                    />
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {compras.length === 0 && suscripciones.length === 0 && !acreditando ? (
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-8 text-center">
          <p className="text-slate-300">Todavía no compraste ningún informe.</p>
          <Link
            href="/informes"
            className="mt-5 inline-block rounded bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-500"
          >
            Ver los informes
          </Link>
        </div>
      ) : compras.length > 0 ? (
        <ul className="space-y-4">
          {compras.map((c) => {
            const p = getProducto(c.producto_slug)
            const href = `/api/informes/${c.producto_slug}/download${
              c.variante_slug ? `?variante=${encodeURIComponent(c.variante_slug)}` : ''
            }`
            return (
              <li
                key={c.id}
                className="rounded-lg border border-slate-800 bg-slate-950/60 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="font-medium text-slate-100">
                      {p?.nombre ?? c.producto_slug}
                    </h2>
                    {c.variante_label && (
                      <p className="text-sm text-sky-300">{c.variante_label}</p>
                    )}
                    <p className="mt-1.5 text-xs text-slate-500">
                      Comprado el{' '}
                      {new Date(c.purchased_at).toLocaleDateString('es-AR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })}
                      {c.amount_ars ? ` · ARS ${c.amount_ars.toLocaleString('es-AR')}` : ''}
                      {c.download_count > 0 ? ` · ${c.download_count} descargas` : ''}
                    </p>
                    {c.factura_cuit && (
                      <p className="mt-1 text-xs text-slate-500">
                        Factura A{' '}
                        {c.factura_emitida_at
                          ? 'emitida'
                          : 'pedida — la emitimos y te llega por mail'}
                      </p>
                    )}
                  </div>
                  <a
                    href={href}
                    className="shrink-0 rounded bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
                  >
                    Descargar PDF
                  </a>
                </div>
              </li>
            )
          })}
        </ul>
      ) : null}

      <section className="mt-12 border-t border-slate-800 pt-6">
        <h2 className="text-sm font-semibold text-slate-300">Otros informes</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {getProductosPublicados()
            .filter(
              (p) =>
                !compras.some((c) => c.producto_slug === p.slug) &&
                !suscripciones.some((sb) => sb.producto_slug === p.slug),
            )
            .map((p) => (
              <li key={p.slug}>
                <Link href={p.landing} className="text-sky-400 underline underline-offset-2">
                  {p.nombre}
                </Link>
                <span className="text-slate-500"> — {p.tagline}</span>
              </li>
            ))}
        </ul>
      </section>
    </div>
  )
}
