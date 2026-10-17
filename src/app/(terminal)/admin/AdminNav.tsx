'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ADMIN_NAV, isNavItemActive, type NavBadgeTone } from '@/lib/admin/nav'

export type NavBadges = Record<string, { count: number; tone: NavBadgeTone }>

const nf = (n: number) => n.toLocaleString('es-AR')

function CountBadge({ count, tone }: { count: number; tone: NavBadgeTone }) {
  return (
    <span
      className={`ml-auto min-w-[1.25rem] px-1.5 py-px text-center text-xxs font-terminal tabular-nums leading-tight border ${
        tone === 'negative' ? 'border-negative text-negative' : 'border-accent text-accent'
      }`}
      style={{ borderRadius: 'var(--radius-ctl)' }}
    >
      {nf(count)}
    </span>
  )
}

/**
 * Navegación del panel admin. En escritorio: columna lateral agrupada por tarea
 * ("Por decidir" arriba, con el contador de lo pendiente). En móvil: una fila
 * con scroll horizontal, mismos ítems y contadores.
 */
export default function AdminNav({ badges }: { badges: NavBadges }) {
  const pathname = usePathname() ?? ''

  return (
    <>
      {/* Escritorio */}
      <nav aria-label="Panel admin" className="hidden lg:block terminal-panel sticky top-4 self-start">
        <div className="px-panel pt-3 pb-2 text-xxs text-zinc-500 font-terminal uppercase tracking-widest">
          Admin
        </div>
        <div className="pb-2">
          {ADMIN_NAV.map((group, gi) => (
            <div key={gi} className={group.label ? 'mt-3' : ''}>
              {group.label && (
                <div className="px-panel pb-1 text-xxs text-zinc-500 font-terminal uppercase tracking-wider">
                  {group.label}
                </div>
              )}
              <ul>
                {group.items.map((item) => {
                  const active = isNavItemActive(item, pathname)
                  const b = badges[item.href]
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                        className={`flex items-center gap-2 px-panel py-1.5 text-data font-terminal border-l-2 transition-colors ${
                          active
                            ? 'border-accent text-ink bg-zinc-800/40'
                            : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/20'
                        }`}
                      >
                        <span className="truncate">{item.label}</span>
                        {b && b.count > 0 && <CountBadge {...b} />}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      {/* Móvil */}
      <nav aria-label="Panel admin" className="lg:hidden terminal-panel mb-px overflow-x-auto">
        <ul className="flex items-center gap-1 px-2 py-2 w-max">
          {ADMIN_NAV.flatMap((g) => g.items).map((item) => {
            const active = isNavItemActive(item, pathname)
            const b = badges[item.href]
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xxs font-terminal uppercase tracking-wider whitespace-nowrap border ${
                    active ? 'border-accent text-accent' : 'border-terminal-border text-zinc-400'
                  }`}
                  style={{ borderRadius: 'var(--radius-ctl)' }}
                >
                  {item.label}
                  {b && b.count > 0 && (
                    <span className={b.tone === 'negative' ? 'text-negative' : 'text-accent'}>{nf(b.count)}</span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </>
  )
}
