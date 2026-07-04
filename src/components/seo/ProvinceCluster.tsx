import Link from 'next/link'

/**
 * Province internal-link mesh. Dropped on every province page (remates,
 * consignatarias, frigoríficos) to cross-link the four silos for that province
 * into a single authority cluster — the #1 SEO structural win. Pass `exclude`
 * to drop the link to the page you're already on.
 */

const PROVINCE_SLUGS: Record<string, string> = {
  'BUENOS AIRES': 'buenos-aires',
  CHACO: 'chaco',
  CORDOBA: 'cordoba',
  CORRIENTES: 'corrientes',
  'ENTRE RIOS': 'entre-rios',
  FORMOSA: 'formosa',
  'LA PAMPA': 'la-pampa',
  MISIONES: 'misiones',
  NEUQUEN: 'neuquen',
  'SAN LUIS': 'san-luis',
  'SANTA FE': 'santa-fe',
  'SANTIAGO DEL ESTERO': 'santiago-del-estero',
  TUCUMAN: 'tucuman',
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

type Silo = 'remates' | 'consignatarias' | 'frigorificos'

// The 13 provinces where /precios/[cat]/[prov] is statically generated.
// Keep in sync with the /precios PROVINCES list — same set as PROVINCE_SLUGS.
const PRECIOS_SLUGS = new Set(Object.values(PROVINCE_SLUGS))

export function ProvinceCluster({
  province,
  exclude,
}: {
  province: string
  exclude?: Silo
}) {
  const key = province.trim().toUpperCase()
  const slug = PROVINCE_SLUGS[key]
  if (!slug) return null
  const name = titleCase(province)

  const allLinks: { key: Silo | 'mercado' | 'precio'; href: string; label: string }[] = [
    { key: 'remates', href: `/remates/${slug}`, label: `Remates en ${name}` },
    { key: 'consignatarias', href: `/consignatarias/${slug}`, label: `Consignatarias en ${name}` },
    { key: 'frigorificos', href: `/frigorificos/${slug}`, label: `Frigoríficos en ${name}` },
    // Geo precio link only where /precios is statically generated (no 404).
    ...(PRECIOS_SLUGS.has(slug)
      ? [{ key: 'precio' as const, href: `/precios/novillos/${slug}`, label: `Precio del novillo en ${name}` }]
      : []),
    { key: 'mercado', href: '/mercado', label: 'Precios del mercado (INMAG)' },
  ]
  const links = allLinks.filter((l) => l.key !== exclude)

  return (
    <nav
      aria-label={`Más sobre ${name}`}
      className="border-t border-terminal-border mt-8 pt-6"
    >
      <h2 className="text-xs font-terminal uppercase tracking-wider text-zinc-500 mb-3">
        Todo sobre la hacienda en {name}
      </h2>
      <div className="flex flex-wrap gap-2">
        {links.map((l) => (
          <Link
            key={l.key}
            href={l.href}
            className="inline-flex items-center text-xs text-accent hover:text-accent-bright border border-terminal-border hover:border-sky-600/60 rounded px-3 py-1.5 transition-colors"
          >
            {l.label} →
          </Link>
        ))}
      </div>
    </nav>
  )
}
