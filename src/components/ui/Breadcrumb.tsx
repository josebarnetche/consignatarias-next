import Link from 'next/link'
import { BreadcrumbSchema } from '@/components/seo/JsonLd'

const SITE = 'https://www.consignatarias.com.ar'

export interface BreadcrumbItem {
  /** Visible label (e.g. "Frigoríficos"). */
  name: string
  /**
   * Path or absolute URL. A path like `/frigorificos` is rendered as a `<Link>`
   * and normalized to an absolute URL for the JSON-LD. Omit `href` on the LAST
   * item (current page) to render it as plain text.
   */
  href?: string
}

interface BreadcrumbProps {
  /**
   * Trail from root → current page. `Inicio` (/) is prepended automatically
   * unless the first item is already the home, so callers pass only the
   * meaningful segments: `[{name:'Mercado',href:'/mercado'},{name:'INMAG'}]`.
   */
  items: BreadcrumbItem[]
  /**
   * Emit the BreadcrumbList JSON-LD alongside the visual trail. Default `true`.
   * Set `false` when the page already renders its own breadcrumb schema, to
   * avoid duplicate structured data.
   */
  schema?: boolean
  className?: string
}

const toAbsolute = (href: string): string =>
  href.startsWith('http') ? href : `${SITE}${href}`

/**
 * Unified breadcrumb. Renders the visual trail AND (optionally) the
 * BreadcrumbList JSON-LD from the SAME array — no more listing the crumbs
 * twice. Terminal style: `text-xxs font-terminal`, `/` separator en
 * `terminal-border`, mismo glyph que el nav. DESIGN-SYSTEM.md §3.2.
 *
 *   <Breadcrumb items={[
 *     { name: 'Mercado', href: '/mercado' },
 *     { name: 'INMAG' },           // current page → plain text
 *   ]} />
 */
export default function Breadcrumb({
  items,
  schema = true,
  className = '',
}: BreadcrumbProps) {
  // Prepend Inicio unless caller already starts at home.
  const hasHome = items[0]?.href === '/' || items[0]?.href === SITE
  const trail: BreadcrumbItem[] = hasHome
    ? items
    : [{ name: 'Inicio', href: '/' }, ...items]

  const schemaItems = trail.map((it) => ({
    name: it.name,
    url: toAbsolute(it.href ?? '/'),
  }))

  return (
    <>
      {schema && <BreadcrumbSchema items={schemaItems} />}
      <nav
        aria-label="Migas de pan"
        className={`flex items-center gap-1.5 text-xxs font-terminal text-zinc-500 ${className}`.trim()}
      >
        {trail.map((it, i) => {
          const isLast = i === trail.length - 1
          return (
            <span key={`${it.name}-${i}`} className="flex items-center gap-1.5 min-w-0">
              {i > 0 && (
                <span className="text-terminal-border select-none" aria-hidden>
                  /
                </span>
              )}
              {isLast || !it.href ? (
                <span
                  className="text-accent truncate"
                  aria-current={isLast ? 'page' : undefined}
                >
                  {it.name}
                </span>
              ) : (
                <Link
                  href={it.href}
                  className="text-zinc-500 hover:text-zinc-300 transition-colors truncate"
                >
                  {it.name}
                </Link>
              )}
            </span>
          )
        })}
      </nav>
    </>
  )
}
