/**
 * Typed UI primitives (DESIGN-SYSTEM.md §2.5). Aditivas: envuelven las clases
 * del tema ya existentes en `globals.css` y fijan el contrato. Color/tono salen
 * SIEMPRE del token canónico en `@/lib/ui/tokens`.
 */
export { default as Delta } from './Delta'
export { default as Stat } from './Stat'
export { default as PageHeader } from './PageHeader'
export { default as Badge, type BadgeTone } from './Badge'

// Existing ui components (re-exported for a single import surface).
export { FollowButton } from './FollowButton'
export { FollowerCount, FollowerCountCompact } from './FollowerCount'
export { TopFollowed, TopFollowedCompact } from './TopFollowed'
export { AddToCalendarButton } from './AddToCalendarButton'
