import Link from 'next/link'
import rematesData from '@/lib/data/remates.json'
import frigorificosSummary from '@/lib/data/frigorificos-summary.json'
import { PROVINCIAS_CON_DATO } from '@/lib/campos-seo'
import { getDepartamentosPublicables, ultimoAnio } from '@/lib/productividad/panel'

/**
 * Red de enlaces por provincia. Va en cada página de provincia (remates,
 * consignatarias, frigoríficos, precios, origen) y cruza todo lo que el sitio
 * tiene de esa provincia. Cada enlace sale solo si la página existe y vale la
 * pena: un enlace a un 404 o a una página flaca resta en vez de sumar.
 * `exclude` saca el enlace a la página en la que ya estás.
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

const PROVINCE_DISPLAY: Record<string, string> = {
  'buenos-aires': 'Buenos Aires',
  chaco: 'Chaco',
  cordoba: 'Córdoba',
  corrientes: 'Corrientes',
  'entre-rios': 'Entre Ríos',
  formosa: 'Formosa',
  'la-pampa': 'La Pampa',
  misiones: 'Misiones',
  neuquen: 'Neuquén',
  'san-luis': 'San Luis',
  'santa-fe': 'Santa Fe',
  'santiago-del-estero': 'Santiago del Estero',
  tucuman: 'Tucumán',
}

/** Acepta "ENTRE RIOS", "Entre Ríos" o "entre-rios". */
function normalizarProvincia(p: string): string {
  return p.trim().toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/-/g, ' ')
}

/**
 * Tipos de remate donde se vende cada categoría. Copia de CATEGORIES.remateTypes
 * de /precios/[categoria]/[provincia]: la página de precio × provincia solo es
 * indexable si hay próximos remates de esos tipos en la provincia, y acá se usa
 * el mismo criterio para no enlazar las que quedan en noindex.
 */
const PRECIO_CATEGORIAS: { slug: string; nombre: string; tipos: string[] }[] = [
  { slug: 'novillos', nombre: 'novillo', tipos: ['general', 'especial'] },
  { slug: 'novillitos', nombre: 'novillito', tipos: ['general', 'invernada'] },
  { slug: 'vaquillonas', nombre: 'vaquillona', tipos: ['invernada', 'cria', 'especial'] },
  { slug: 'vacas', nombre: 'vaca', tipos: ['general', 'especial'] },
  { slug: 'toros', nombre: 'toro', tipos: ['reproductores', 'especial', 'general'] },
  { slug: 'terneros', nombre: 'ternero', tipos: ['invernada', 'cria'] },
]

type Remate = { province: string; type: string; date: string; status: string }
const REMATES = rematesData as Remate[]
const PROVINCIAS_CON_REMATES = new Set(REMATES.map((r) => r.province))
const FRIGORIFICOS_POR_PROVINCIA = (frigorificosSummary as { byProvince?: Record<string, number> }).byProvince ?? {}
const CAMPOS_SLUGS = new Set(PROVINCIAS_CON_DATO.map((p) => p.slug))

let productividadSlugs: Set<string> | null = null
function provinciasConProductividad(): Set<string> {
  if (!productividadSlugs) {
    const anio = ultimoAnio()
    productividadSlugs = new Set(
      getDepartamentosPublicables().filter((d) => d.serie[anio]).map((d) => d.slugProvincia),
    )
  }
  return productividadSlugs
}

type Silo = 'remates' | 'consignatarias' | 'frigorificos' | 'precios' | 'campos' | 'productividad'

export function ProvinceCluster({
  province,
  exclude,
}: {
  province: string
  exclude?: Silo
}) {
  const key = normalizarProvincia(province)
  const slug = PROVINCE_SLUGS[key]
  if (!slug) return null
  const name = PROVINCE_DISPLAY[slug]
  const today = new Date().toISOString().slice(0, 10)
  const proximos = REMATES.filter((r) => r.province === key && r.date >= today && r.status === 'scheduled')

  const links: { key: string; silo: Silo | 'mercado'; href: string; label: string }[] = []
  if (PROVINCIAS_CON_REMATES.has(key)) {
    links.push({ key: 'remates', silo: 'remates', href: `/remates/${slug}`, label: `Remates de hacienda en ${name}` })
    links.push({ key: 'consignatarias', silo: 'consignatarias', href: `/consignatarias/${slug}`, label: `Consignatarias de ${name}` })
  }
  if ((FRIGORIFICOS_POR_PROVINCIA[key] ?? 0) > 0) {
    links.push({ key: 'frigorificos', silo: 'frigorificos', href: `/frigorificos/${slug}`, label: `Frigoríficos de ${name}` })
  }
  for (const c of PRECIO_CATEGORIAS) {
    if (proximos.some((r) => c.tipos.includes(r.type))) {
      links.push({ key: `precio-${c.slug}`, silo: 'precios', href: `/precios/${c.slug}/${slug}`, label: `Precio del ${c.nombre} en ${name}` })
    }
  }
  if (CAMPOS_SLUGS.has(slug)) {
    links.push({ key: 'campos', silo: 'campos', href: `/campos/valor-hectarea/${slug}`, label: `Valor de la hectárea en ${name}` })
  }
  if (provinciasConProductividad().has(slug)) {
    links.push({ key: 'productividad', silo: 'productividad', href: `/productividad/${slug}`, label: `Terneros por vaca en ${name}` })
  }
  links.push({ key: 'vr', silo: 'mercado', href: '/vr', label: 'Cuánto vale tu hacienda hoy' })

  const visibles = links.filter((l) => l.silo !== exclude)

  return (
    <nav
      aria-label={`Más sobre ${name}`}
      className="border-t border-terminal-border mt-8 pt-6"
    >
      <h2 className="text-xs font-terminal uppercase tracking-wider text-zinc-500 mb-3">
        Todo sobre la hacienda en {name}
      </h2>
      <div className="flex flex-wrap gap-2">
        {visibles.map((l) => (
          <Link
            key={l.key}
            href={l.href}
            className="inline-flex items-center text-xs text-accent hover:text-accent-bright border border-terminal-border hover:border-accent/60 rounded px-3 py-1.5 transition-colors"
          >
            {l.label} →
          </Link>
        ))}
      </div>
    </nav>
  )
}
