import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { requireServiceClient } from '@/lib/supabase'
import { AdminPageHeader, AdminSection } from '@/components/admin/kit'
import { PRODUCTOS_DATOS, evaluar, rangoPrecio, type Evaluacion } from '@/lib/productos-datos'

export const metadata: Metadata = {
  title: 'Productos — metas y kill switch',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

/**
 * El tablero del kill switch.
 *
 * POR QUÉ EXISTE
 * La regla —cada producto nace con una meta en pesos y una fecha, y si esa fecha llega
 * sin la meta se retira— sólo sirve si alguien la ve sin tener que acordarse. Acá la
 * decisión ya está escrita en `productos-datos.ts` desde antes de que duela; esta página
 * sólo la contrasta contra lo que de verdad entró.
 *
 * En este repo ya hay dos features con cero uso en 48 usuarios que nunca se apagaron
 * porque nunca hubo un criterio escrito para apagarlas.
 */
export default async function AdminProductos() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) redirect('/login?next=/admin/productos')

  const service = requireServiceClient()
  const { data: rol } = await service
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()
  if (rol?.role !== 'admin') redirect('/dashboard')

  // Compra única: lo cobrado acumulado por producto.
  const { data: compras } = await service
    .from('informe_purchases')
    .select('producto_slug, amount_ars, status')
    .eq('status', 'paid')

  const acumulado = new Map<string, number>()
  for (const c of compras ?? []) {
    acumulado.set(c.producto_slug, (acumulado.get(c.producto_slug) ?? 0) + Number(c.amount_ars ?? 0))
  }

  // Suscripción: lo recurrente que HOY cobra de verdad. Una fila sin
  // `rebill_subscription_id` fue otorgada a mano y no es ingreso.
  const { data: subs } = await service
    .from('user_subscriptions')
    .select('tier, status, rebill_subscription_id')
    .eq('status', 'active')
  const proPagas = (subs ?? []).filter((s) => s.tier === 'pro' && s.rebill_subscription_id).length

  const hoy = new Date()
  const evaluaciones = PRODUCTOS_DATOS.map((p) =>
    evaluar(
      p,
      p.modalidad === 'suscripcion' ? proPagas * p.precio : (acumulado.get(p.slug) ?? 0),
      hoy,
    ),
  )

  const vencidos = evaluaciones.filter((e) => e.estado === 'vencido-sin-meta')

  return (
    <>
      <AdminPageHeader
        title="Productos"
        meta="metas y kill switch"
        description={
          <>
            Cada producto nace con una meta y una fecha. Si la fecha llega sin la meta, se retira: la decisión está
            escrita en <code>productos-datos.ts</code> desde antes de lanzarlo.
          </>
        }
      />

      {vencidos.length > 0 && (
        <section className="terminal-panel border-negative/50 px-panel py-3">
          <h2 className="text-data font-terminal text-negative">
            {vencidos.length === 1 ? 'Hay un producto para retirar' : `Hay ${vencidos.length} productos para retirar`}
          </h2>
          <p className="mt-1 text-xxs text-zinc-400 font-terminal">
            Venció el plazo sin llegar a la meta. Poné <code>publicado: false</code> en el catálogo y deployá: se cae del
            sitemap, del hub y del checkout sin borrar nada.
          </p>
        </section>
      )}

      {evaluaciones.map((e) => (
        <Fila key={e.producto.slug} e={e} />
      ))}

      <AdminSection title="Cómo se cuenta">
        <ul className="space-y-1.5 text-data text-zinc-400">
          <li>
            <strong className="text-ink font-medium">Compra única:</strong> suma de <code>informe_purchases.amount_ars</code>{' '}
            con <code>status=&apos;paid&apos;</code>.
          </li>
          <li>
            <strong className="text-ink font-medium">Suscripción:</strong> sólo las que tienen{' '}
            <code>rebill_subscription_id</code>. Una PRO otorgada a mano no es ingreso, y hoy{' '}
            <strong className="text-ink font-medium">
              {proPagas === 0 ? 'no hay ninguna que cobre de verdad' : `hay ${proPagas}`}
            </strong>
            .
          </li>
        </ul>
      </AdminSection>
    </>
  )
}

function Fila({ e }: { e: Evaluacion }) {
  const { producto: p } = e
  const pct = Math.min(100, Math.round(e.avance * 100))
  /**
   * Clases completas y no interpoladas: Tailwind escanea el fuente como texto, así que
   * `text-${color}` no genera ninguna clase. Tonos por token semántico.
   */
  const tono = {
    'meta-cumplida': { texto: 'text-positive', barra: 'bg-positive' },
    'vencido-sin-meta': { texto: 'text-negative', barra: 'bg-negative' },
    'en-plazo': { texto: 'text-accent', barra: 'bg-accent' },
  }[e.estado]

  return (
    <AdminSection
      title={
        <span className="flex items-center gap-2">
          {p.nombre}
          {!p.publicado && (
            <span className="terminal-tag normal-case tracking-normal">retirado</span>
          )}
        </span>
      }
      action={
        <Link href={p.landing} className="text-xxs text-accent">
          Ver página →
        </Link>
      }
    >
      <p className="text-xxs text-zinc-500 font-terminal">
        {p.audiencia} · {p.modalidad === 'suscripcion' ? 'suscripción' : 'compra única'} · {rangoPrecio(p)} (se cobra{' '}
        {p.precio.toLocaleString('es-AR')})
      </p>

      <div className="mt-3">
        <div className="flex items-baseline justify-between gap-2 text-data font-terminal tabular-nums">
          <span className="text-ink">
            ARS {e.vendidoArs.toLocaleString('es-AR')}
            <span className="text-zinc-500"> de {p.metaArs.toLocaleString('es-AR')}</span>
            {p.modalidad === 'suscripcion' && <span className="text-zinc-500">/mes</span>}
          </span>
          <span className={`font-medium ${tono.texto}`}>{pct}%</span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
          <div className={`h-full ${tono.barra}`} style={{ width: `${Math.max(pct, 1)}%` }} />
        </div>
      </div>

      <p className={`mt-3 text-data ${tono.texto}`}>{e.veredicto}</p>

      <p className="mt-1 text-xxs text-zinc-500 font-terminal tabular-nums">
        Corte: {p.fechaCorte}
        {e.estado === 'en-plazo' && ` · faltan ${e.diasRestantes} días`}
      </p>

      {e.estado !== 'meta-cumplida' && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xxs text-zinc-500 hover:text-zinc-300 font-terminal">
            Qué se hace si no llega
          </summary>
          <p className="mt-2 border-l-2 border-terminal-border pl-3 text-xxs leading-relaxed text-zinc-400">{p.siNoLlega}</p>
        </details>
      )}
    </AdminSection>
  )
}
