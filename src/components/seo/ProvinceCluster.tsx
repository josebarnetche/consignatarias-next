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

  const allLinks: { key: Silo | 'mercado'; href: string; label: string }[] = [
    { key: 'remates', href: `/remates/${slug}`, label: `Remates en ${name}` },
    { key: 'consignatarias', href: `/consignatarias/${slug}`, label: `Consignatarias en ${name}` },
    { key: 'frigorificos', href: `/frigorificos/${slug}`, label: `Frigoríficos en ${name}` },
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
            className="inline-flex items-center text-xs text-amber-500 hover:text-amber-400 border border-amber-800/50 hover:border-amber-600/60 rounded px-3 py-1.5 transition-colors"
          >
            {l.label} →
          </Link>
        ))}
      </div>
    </nav>
  )
}
