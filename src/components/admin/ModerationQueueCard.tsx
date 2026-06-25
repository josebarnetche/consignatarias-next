import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase'

const nf = (n: number) => n.toLocaleString('es-AR')

interface QueueItem {
  label: string
  href: string
  count: number | null // null = "s/d" (query falló)
}

/**
 * Cuenta filas con status='pending' en una tabla. Soft-fail: devuelve null si
 * el cliente o la query fallan, para que el card muestre "s/d" sin romper.
 */
async function countPending(
  client: ReturnType<typeof createServiceClient>,
  table: string,
): Promise<number | null> {
  if (!client) return null
  const { count, error } = await client
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')
  if (error || count == null) return null
  return count
}

export default async function ModerationQueueCard() {
  const supabase = createServiceClient()

  const [consignatariaClaims, frigorificoClaims, reviews] = await Promise.all([
    countPending(supabase, 'consignataria_claims'),
    countPending(supabase, 'frigorifico_claims'),
    countPending(supabase, 'consignataria_reviews'),
  ])

  const items: QueueItem[] = [
    { label: 'Claims consignataria', href: '/admin/claims', count: consignatariaClaims },
    { label: 'Claims frigorífico', href: '/admin/frigorifico-claims', count: frigorificoClaims },
    { label: 'Reseñas a aprobar', href: '/admin/reviews', count: reviews },
  ]

  const totalAccionable = items.reduce((s, i) => s + (i.count ?? 0), 0)

  return (
    <div className="terminal-panel">
      <div className="terminal-panel-header flex items-center justify-between">
        <span className="text-zinc-400 text-xxs tracking-widest">COLA DE MODERACIÓN</span>
        {totalAccionable > 0 ? (
          <span className="text-warning text-xxs font-terminal tabular-nums">
            {nf(totalAccionable)} pendiente{totalAccionable === 1 ? '' : 's'}
          </span>
        ) : (
          <span className="text-zinc-600 text-xxs font-terminal">al día ✓</span>
        )}
      </div>

      <div>
        {items.map((item) => {
          const pending = item.count != null && item.count > 0
          return (
            <Link
              key={item.href}
              href={item.href}
              className="border-b border-terminal-border px-cell py-1.5 flex items-center gap-2 hover:bg-white/[0.02] transition-colors group"
            >
              <span
                className={`text-data font-terminal flex-1 min-w-0 truncate ${
                  pending ? 'text-zinc-200' : 'text-zinc-500'
                }`}
              >
                {item.label}
              </span>
              {item.count == null ? (
                <span className="text-zinc-600 text-data font-terminal tabular-nums">s/d</span>
              ) : pending ? (
                <span className="text-warning text-data font-terminal tabular-nums">
                  {nf(item.count)}
                </span>
              ) : (
                <span className="text-zinc-600 text-xxs font-terminal">al día ✓</span>
              )}
              <span
                className={`text-xxs font-terminal ${
                  pending ? 'text-warning' : 'text-zinc-700'
                } group-hover:translate-x-0.5 transition-transform`}
              >
                →
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
