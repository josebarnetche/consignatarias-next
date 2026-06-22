/**
 * Typed UI primitives (DESIGN-SYSTEM.md §2.5). Aditivas: envuelven las clases
 * del tema ya existentes en `globals.css` y fijan el contrato. Color/tono salen
 * SIEMPRE del token canónico en `@/lib/ui/tokens`.
 */
export { default as Delta } from './Delta'
export { default as Stat } from './Stat'
export { default as PageHeader } from './PageHeader'
export { default as Badge, type BadgeTone } from './Badge'
export { default as Breadcrumb, type BreadcrumbItem } from './Breadcrumb'

// Data-language primitives (DESIGN-SYSTEM.md §4).
export { default as DataTable, type DataColumn } from './DataTable'
export { default as PriceCell } from './PriceCell'
export { default as ChartCard, Series, type PricePoint } from './ChartCard'

// Fluidez / smooth UI (DESIGN-SYSTEM.md §5).
export { default as PageTransition } from './PageTransition'
export { default as DeltaFlash } from './DeltaFlash'
export {
  default as Skeleton,
  SkeletonText,
  SkeletonStat,
  SkeletonTable,
  SkeletonCard,
} from './Skeleton'

// Existing ui components (re-exported for a single import surface).
export { FollowButton } from './FollowButton'
export { FollowerCount, FollowerCountCompact } from './FollowerCount'
export { TopFollowed, TopFollowedCompact } from './TopFollowed'
export { AddToCalendarButton } from './AddToCalendarButton'
