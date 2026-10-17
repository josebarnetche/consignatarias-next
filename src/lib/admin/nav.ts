import type { AdminPendientes } from './pendientes'

/**
 * Mapa del panel admin. Las URLs son CONTRATO: las enlazan mails
 * (src/lib/email.ts), scripts/leads-digest.ts y el redirect de /dashboard.
 * Se reagrupan y renombran, nunca se mueven.
 */
export type NavBadgeTone = 'accent' | 'negative'

export interface AdminNavItem {
  href: string
  label: string
  /** Rutas adicionales que marcan este ítem como activo. */
  alsoActive?: string[]
  badge?: (p: AdminPendientes) => number | null
  badgeTone?: NavBadgeTone
}

export interface AdminNavGroup {
  label: string | null
  items: AdminNavItem[]
}

const sum = (...n: Array<number | null>) =>
  n.every((x) => x == null) ? null : n.reduce<number>((a, x) => a + (x ?? 0), 0)

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    label: null,
    items: [{ href: '/admin', label: 'Hoy' }],
  },
  {
    label: 'Por decidir',
    items: [
      {
        href: '/admin/claims',
        label: 'Verificaciones',
        alsoActive: ['/admin/frigorifico-claims'],
        badge: (p) => sum(p.claimsConsignatarias, p.claimsFrigorificos),
      },
      { href: '/admin/leads', label: 'Leads', badge: (p) => p.leadsSinTrabajar },
      { href: '/admin/campos', label: 'Campos', badge: (p) => p.campos },
      { href: '/admin/reviews', label: 'Reseñas', badge: (p) => p.reviews },
      { href: '/admin/preoferta', label: 'Pre-ofertas' },
    ],
  },
  {
    label: 'Directorio',
    items: [{ href: '/admin/consignatarias', label: 'Consignatarias' }],
  },
  {
    label: 'Métricas',
    items: [
      { href: '/admin/overview', label: 'En vivo' },
      { href: '/admin/dashboard', label: 'Negocio' },
      { href: '/admin/suscriptores', label: 'Suscriptores' },
      { href: '/admin/productos', label: 'Productos' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      {
        href: '/admin/ops',
        label: 'Ops',
        badge: (p) => (p.cronsEnRojo ? p.cronsEnRojo.length : null),
        badgeTone: 'negative',
      },
      { href: '/admin/valor', label: 'Calculadora de valor' },
    ],
  },
]

export function isNavItemActive(item: AdminNavItem, pathname: string): boolean {
  const match = (h: string) => (h === '/admin' ? pathname === '/admin' : pathname === h || pathname.startsWith(h + '/'))
  return match(item.href) || (item.alsoActive ?? []).some(match)
}
