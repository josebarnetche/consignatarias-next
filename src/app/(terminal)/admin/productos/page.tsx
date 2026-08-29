import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { requireServiceClient } from '@/lib/supabase'
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
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-100">Productos · metas y kill switch</h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Cada producto nace con una meta y una fecha. Si la fecha llega sin la meta, se
          retira — la decisión está escrita en <code className="text-slate-400">productos-datos.ts</code>{' '}
          desde antes de lanzarlo.
        </p>
      </header>

      {vencidos.length > 0 && (
        <div className="mb-8 rounded-lg border border-red-900/60 bg-red-950/30 p-5">
          <h2 className="font-semibold text-red-200">
            {vencidos.length === 1 ? 'Hay un producto para retirar' : `Hay ${vencidos.length} productos para retirar`}
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            Venció el plazo sin llegar a la meta. Poné <code className="text-slate-400">publicado: false</code>{' '}
            en el catálogo y deployá: se cae del sitemap, del hub y del checkout sin borrar nada.
          </p>
        </div>
      )}

      <div className="space-y-5">
        {evaluaciones.map((e) => (
          <Fila key={e.producto.slug} e={e} />
        ))}
      </div>

      <section className="mt-10 rounded-lg border border-slate-800 bg-slate-950/60 p-5">
        <h2 className="text-sm font-semibold text-slate-300">Cómo se cuenta</h2>
        <ul className="mt-3 space-y-1.5 text-sm text-slate-400">
          <li>
            · <strong className="text-slate-300">Compra única:</strong> suma de{' '}
            <code>informe_purchases.amount_ars</code> con <code>status=&apos;paid&apos;</code>.
          </li>
          <li>
            · <strong className="text-slate-300">Suscripción:</strong> sólo las que tienen{' '}
            <code>rebill_subscription_id</code>. Una PRO otorgada a mano no es ingreso, y hoy{' '}
            <strong className="text-slate-300">
              {proPagas === 0 ? 'no hay ninguna que cobre de verdad' : `hay ${proPagas}`}
            </strong>
            .
          </li>
        </ul>
      </section>
    </div>
  )
}

function Fila({ e }: { e: Evaluacion }) {
  const { producto: p } = e
  const pct = Math.min(100, Math.round(e.avance * 100))
  /**
   * Clases completas y no interpoladas: Tailwind escanea el fuente como texto, así que
   * `text-${color}-400` no genera ninguna clase y el color sale sin estilo. El bug es
   * invisible en dev con JIT caliente y aparece recién en el build.
   */
  const tono = {
    'meta-cumplida': { texto: 'text-emerald-400', barra: 'bg-emerald-500', linea: 'text-emerald-300' },
    'vencido-sin-meta': { texto: 'text-red-400', barra: 'bg-red-500', linea: 'text-red-300' },
    'en-plazo': { texto: 'text-sky-400', barra: 'bg-sky-500', linea: 'text-sky-300' },
  }[e.estado]

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-slate-100">{p.nombre}</h2>
            {!p.publicado && (
              <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">
                retirado
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            {p.audiencia} · {p.modalidad === 'suscripcion' ? 'suscripción' : 'compra única'} ·{' '}
            {rangoPrecio(p)} (se cobra {p.precio.toLocaleString('es-AR')})
          </p>
        </div>
        <Link href={p.landing} className="shrink-0 text-xs text-sky-400 underline underline-offset-2">
          Ver página
        </Link>
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-slate-300">
            ARS {e.vendidoArs.toLocaleString('es-AR')}
            <span className="text-slate-600"> de {p.metaArs.toLocaleString('es-AR')}</span>
            {p.modalidad === 'suscripcion' && <span className="text-slate-600">/mes</span>}
          </span>
          <span className={`font-medium ${tono.texto}`}>{pct}%</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div className={`h-full ${tono.barra}`} style={{ width: `${Math.max(pct, 1)}%` }} />
        </div>
      </div>

      <p className={`mt-3 text-sm ${tono.linea}`}>{e.veredicto}</p>

      <p className="mt-2 text-xs text-slate-500">
        Corte: {p.fechaCorte}
        {e.estado === 'en-plazo' && ` · faltan ${e.diasRestantes} días`}
      </p>

      {e.estado !== 'meta-cumplida' && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-300">
            Qué se hace si no llega
          </summary>
          <p className="mt-2 border-l-2 border-slate-800 pl-3 text-xs leading-relaxed text-slate-400">
            {p.siNoLlega}
          </p>
        </details>
      )}
    </div>
  )
}
