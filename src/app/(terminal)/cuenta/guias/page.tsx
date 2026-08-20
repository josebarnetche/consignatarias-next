import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentSession } from '@/lib/user-tier'
import { requireServiceClient } from '@/lib/supabase'
import { GUIAS_PREMIUM, formatArs } from '@/lib/guias-premium'

export const metadata: Metadata = {
  title: 'Mis guías',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Biblioteca del comprador. El entitlement vive atado al EMAIL (la compra es
 * email-first, sin cuenta), así que acá se busca por el email de la sesión: quien
 * entra con la casilla que pagó, ve su guía. Si además todavía no tenía user_id
 * asociado, se lo pegamos ahora — así la compra queda ligada a la cuenta.
 */
export default async function MisGuiasPage() {
  const { user } = await getCurrentSession()
  if (!user?.email) {
    redirect('/login?next=/cuenta/guias')
  }
  const email = user.email.trim().toLowerCase()

  const service = requireServiceClient()
  const { data: purchases } = await service
    .from('guia_purchases')
    .select('guia_slug, purchased_at, download_count, last_downloaded_at, user_id, id')
    .eq('email', email)
    .eq('status', 'paid')

  const rows = purchases ?? []

  // Atribución perezosa: la compra se hizo sin cuenta; ahora que sabemos quién es,
  // la ligamos. Best-effort — si falla, la guía se sigue viendo por email.
  const huerfanas = rows.filter((r) => !r.user_id).map((r) => r.id)
  if (huerfanas.length > 0) {
    await service
      .from('guia_purchases')
      .update({ user_id: user.id })
      .in('id', huerfanas)
  }

  const compradas = new Map(rows.map((r) => [r.guia_slug, r]))

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2 text-xxs font-terminal uppercase tracking-wider text-zinc-500">
          <Link href="/cuenta" className="hover:text-zinc-300">
            Tu cuenta
          </Link>
          <span>/</span>
          <span className="text-zinc-300">Mis guías</span>
        </div>
        <h1 className="text-xl font-heading text-zinc-100 mb-2">Mis guías</h1>
        <p className="text-zinc-400 text-sm max-w-2xl">
          Las guías que compraste, atadas a <strong className="text-zinc-200">{email}</strong>.
          Se bajan las veces que quieras; cada copia sale marcada con tu email.
        </p>
      </div>

      <div className="space-y-4">
        {GUIAS_PREMIUM.map((guia) => {
          const compra = compradas.get(guia.slug)
          return (
            <div key={guia.slug} className="terminal-panel">
              <div className="terminal-panel-header flex items-center justify-between">
                <span>{guia.title}</span>
                <span className={compra ? 'text-positive' : 'text-zinc-500'}>
                  {compra ? `COMPRADA · EDICIÓN ${guia.edicion}` : formatArs(guia.priceArs)}
                </span>
              </div>
              <div className="px-4 py-4">
                <p className="text-sm text-zinc-400 leading-relaxed mb-3">{guia.tagline}</p>
                {compra ? (
                  <>
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-xxs font-terminal uppercase tracking-wider text-zinc-500 mb-3">
                      <span>Comprada {formatDate(compra.purchased_at)}</span>
                      <span>Descargas {compra.download_count ?? 0}</span>
                      <span>Última {formatDate(compra.last_downloaded_at)}</span>
                      <span>Versión {guia.version}</span>
                    </div>
                    <a
                      href={`/api/guias-premium/${guia.slug}/download`}
                      className="inline-block bg-accent text-zinc-950 font-semibold text-sm rounded px-4 py-2 hover:brightness-110"
                    >
                      Descargar el PDF
                    </a>
                  </>
                ) : (
                  <Link
                    href={guia.landing}
                    className="inline-block border border-terminal-border text-zinc-200 text-sm rounded px-4 py-2 hover:border-accent hover:text-accent"
                  >
                    Ver de qué se trata
                  </Link>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-zinc-500 text-xs mt-6 leading-relaxed">
        ¿Compraste con otro email? Entrá con esa casilla y la guía te aparece acá.
        Cuando sale una edición nueva la bajás desde el mismo botón, sin volver a pagar.
        ¿Factura A? La emite Memola Medios SAS (CUIT 30-71863222-2): escribinos a{' '}
        <a href="mailto:agro@memola.com.ar" className="text-accent hover:underline">
          agro@memola.com.ar
        </a>{' '}
        con razón social y CUIT.
      </p>
    </div>
  )
}
