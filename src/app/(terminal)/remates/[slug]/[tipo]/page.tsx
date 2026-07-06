import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import rematesData from '@/lib/data/remates.json'
import type { Auction } from '@/lib/db/schema'
import { BreadcrumbSchema } from '@/components/seo/JsonLd'
import { getCanonicalSlug } from '@/lib/data/consignataria-slugs'
import { EmptyState } from '@/components/ui'
import {
  formatDateShort,
  getCity,
  getProvinceCode,
  TYPE_LABELS,
  TYPE_COLORS,
  CAT_LABELS,
} from '@/lib/ui/tokens'

/* ------------------------------------------------------------------ */
/*  PROVINCE + TYPE CONFIGURATION                                       */
/* ------------------------------------------------------------------ */

interface ProvinceConfig {
  slug: string
  name: string
  displayName: string
}

interface TypeConfig {
  slug: string
  name: string
  displayName: string
}

const PROVINCES: ProvinceConfig[] = [
  { slug: 'buenos-aires', name: 'BUENOS AIRES', displayName: 'Buenos Aires' },
  { slug: 'cordoba', name: 'CORDOBA', displayName: 'Córdoba' },
  { slug: 'san-luis', name: 'SAN LUIS', displayName: 'San Luis' },
  { slug: 'santa-fe', name: 'SANTA FE', displayName: 'Santa Fe' },
  { slug: 'chaco', name: 'CHACO', displayName: 'Chaco' },
  { slug: 'entre-rios', name: 'ENTRE RIOS', displayName: 'Entre Ríos' },
  { slug: 'corrientes', name: 'CORRIENTES', displayName: 'Corrientes' },
  { slug: 'la-pampa', name: 'LA PAMPA', displayName: 'La Pampa' },
  { slug: 'misiones', name: 'MISIONES', displayName: 'Misiones' },
  { slug: 'formosa', name: 'FORMOSA', displayName: 'Formosa' },
  { slug: 'neuquen', name: 'NEUQUEN', displayName: 'Neuquén' },
  { slug: 'santiago-del-estero', name: 'SANTIAGO DEL ESTERO', displayName: 'Santiago del Estero' },
  { slug: 'tucuman', name: 'TUCUMAN', displayName: 'Tucumán' },
]

const TYPES: TypeConfig[] = [
  { slug: 'invernada', name: 'invernada', displayName: 'Invernada' },
  { slug: 'cria', name: 'cria', displayName: 'Cría' },
  { slug: 'general', name: 'general', displayName: 'Generales' },
  { slug: 'especial', name: 'especial', displayName: 'Especiales' },
  { slug: 'reproductores', name: 'reproductores', displayName: 'Reproductores' },
]

/* ------------------------------------------------------------------ */
/*  METADATA                                                            */
/* ------------------------------------------------------------------ */

interface PageParams {
  params: Promise<{ slug: string; tipo: string }>
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { slug: provincia, tipo } = await params
  const provinceConfig = PROVINCES.find((p) => p.slug === provincia)
  const typeConfig = TYPES.find((t) => t.slug === tipo)

  if (!provinceConfig || !typeConfig) return {}

  const remates = (rematesData as Auction[]).filter(
    (r) =>
      r.province?.toUpperCase() === provinceConfig.name &&
      r.type?.toLowerCase() === typeConfig.name
  )

  const title = `Remates de ${typeConfig.displayName} en ${provinceConfig.displayName} — ${remates.length} subastas | consignatarias.com.ar`
  const description = `Calendario completo de remates de ${typeConfig.displayName.toLowerCase()} en ${provinceConfig.displayName}. ${remates.length} subastas programadas de consignatarias verificadas.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      locale: 'es_AR',
    },
    alternates: {
      canonical: `https://www.consignatarias.com.ar/remates/${provincia}/${tipo}`,
    },
  }
}

/* ------------------------------------------------------------------ */
/*  STATIC PARAMS                                                       */
/* ------------------------------------------------------------------ */

export async function generateStaticParams() {
  const params: { slug: string; tipo: string }[] = []
  const remates = rematesData as Auction[]

  for (const province of PROVINCES) {
    for (const type of TYPES) {
      // Only generate pages for combinations that have at least 1 remate
      const count = remates.filter(
        (r) =>
          r.province?.toUpperCase() === province.name &&
          r.type?.toLowerCase() === type.name
      ).length
      if (count > 0) {
        params.push({ slug: province.slug, tipo: type.slug })
      }
    }
  }

  return params
}

/* ------------------------------------------------------------------ */
/*  PAGE COMPONENT                                                      */
/* ------------------------------------------------------------------ */

export default async function ProvinceTypePage({ params }: PageParams) {
  const { slug: provincia, tipo } = await params
  const provinceConfig = PROVINCES.find((p) => p.slug === provincia)
  const typeConfig = TYPES.find((t) => t.slug === tipo)

  if (!provinceConfig || !typeConfig) {
    notFound()
  }

  const allRemates = rematesData as Auction[]
  const remates = allRemates
    .filter(
      (r) =>
        r.province?.toUpperCase() === provinceConfig.name &&
        r.type?.toLowerCase() === typeConfig.name
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // If no remates for this combination, show empty state but don't 404
  // This allows the page to exist for SEO purposes

  const breadcrumbItems = [
    { name: 'Inicio', url: 'https://www.consignatarias.com.ar' },
    { name: 'Remates', url: 'https://www.consignatarias.com.ar/remates' },
    { name: provinceConfig.displayName, url: `https://www.consignatarias.com.ar/remates/${provincia}` },
    { name: typeConfig.displayName, url: `https://www.consignatarias.com.ar/remates/${provincia}/${tipo}` },
  ]

  // Count other types in this province for navigation
  const typeCounts = TYPES.map((t) => ({
    ...t,
    count: allRemates.filter(
      (r) =>
        r.province?.toUpperCase() === provinceConfig.name &&
        r.type?.toLowerCase() === t.name
    ).length,
  }))

  // Count other provinces with this type for navigation
  const provinceCounts = PROVINCES.map((p) => ({
    ...p,
    count: allRemates.filter(
      (r) =>
        r.province?.toUpperCase() === p.name &&
        r.type?.toLowerCase() === typeConfig.name
    ).length,
  })).filter((p) => p.count > 0)

  return (
    <main className="min-h-screen bg-black text-sky-500 font-mono p-4 md:p-8">
      <BreadcrumbSchema items={breadcrumbItems} />

      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex items-center gap-2 text-sm text-sky-700 mb-4">
          <Link href="/" className="hover:text-sky-400">inicio</Link>
          <span>/</span>
          <Link href="/remates" className="hover:text-sky-400">remates</Link>
          <span>/</span>
          <Link href={`/remates/${provincia}`} className="hover:text-sky-400">{provincia}</Link>
          <span>/</span>
          <span className="text-sky-500">{tipo}</span>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold mb-4">
          Remates de {typeConfig.displayName} en {provinceConfig.displayName}
        </h1>

        <p className="text-sky-600 mb-6">
          {remates.length} {remates.length === 1 ? 'subasta programada' : 'subastas programadas'} de {typeConfig.displayName.toLowerCase()} en {provinceConfig.displayName}.
          Calendario actualizado con todas las consignatarias verificadas de la provincia.
        </p>

        {/* Type filter pills */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Link
            href={`/remates/${provincia}`}
            className="px-3 py-1 text-sm border border-sky-800 text-sky-600 hover:bg-sky-900/30 rounded"
          >
            Todos
          </Link>
          {typeCounts.map((t) => (
            <Link
              key={t.slug}
              href={`/remates/${provincia}/${t.slug}`}
              className={`px-3 py-1 text-sm border rounded transition-colors ${
                t.slug === tipo
                  ? 'bg-sky-500 text-black border-sky-500'
                  : 'border-sky-800 text-sky-600 hover:bg-sky-900/30'
              }`}
            >
              {t.displayName} ({t.count})
            </Link>
          ))}
        </div>

        {/* Province links for same type */}
        {provinceCounts.length > 1 && (
          <div className="text-sm text-sky-700 mb-6">
            <span className="mr-2">Ver {typeConfig.displayName.toLowerCase()} en:</span>
            {provinceCounts.slice(0, 8).map((p, i) => (
              <span key={p.slug}>
                {i > 0 && <span className="mx-1">·</span>}
                <Link
                  href={`/remates/${p.slug}/${tipo}`}
                  className={`hover:text-sky-400 ${p.slug === provincia ? 'text-sky-500 underline' : ''}`}
                >
                  {p.displayName}
                </Link>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Remates List */}
      <div className="max-w-6xl mx-auto">
        {remates.length === 0 ? (
          <div className="border border-sky-900">
            <EmptyState
              icon="martillo"
              title={`No hay remates de ${typeConfig.displayName.toLowerCase()} programados en ${provinceConfig.displayName} actualmente.`}
              cta={
                <div className="flex flex-wrap justify-center gap-4">
                  <Link
                    href={`/remates/${provincia}`}
                    className="text-sky-400 hover:underline"
                  >
                    Ver todos los remates en {provinceConfig.displayName}
                  </Link>
                  <Link
                    href={`/remates/tipo/${tipo}`}
                    className="text-sky-400 hover:underline"
                  >
                    Ver {typeConfig.displayName.toLowerCase()} en todo el país
                  </Link>
                </div>
              }
            />
          </div>
        ) : (
          <div className="space-y-2">
            {remates.map((remate, idx) => {
              const slug = getCanonicalSlug(remate.consignatariaSlug || '')
              const typeColor = TYPE_COLORS[remate.type as keyof typeof TYPE_COLORS] || 'text-sky-500'
              const typeLabel = TYPE_LABELS[remate.type as keyof typeof TYPE_LABELS] || remate.type
              const catLabel = CAT_LABELS[remate.mainCategory as keyof typeof CAT_LABELS] || remate.mainCategory

              return (
                <div
                  key={`${remate.date}-${remate.consignatariaSlug}-${idx}`}
                  className="border border-sky-900 p-4 hover:border-sky-700 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sky-600">{formatDateShort(remate.date)}</span>
                        <span className="text-sky-800">|</span>
                        <Link
                          href={slug ? `/consignatarias/${slug}` : '/consignatarias'}
                          className="text-sky-400 hover:underline font-semibold"
                        >
                          {remate.consignatariaName}
                        </Link>
                      </div>
                      <div className="text-sm text-sky-700 mt-1">
                        {getCity(remate.location)} · {getProvinceCode(remate.province)}
                        {remate.time && ` · ${remate.time}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-0.5 rounded ${typeColor} bg-sky-900/30`}>
                        {typeLabel}
                      </span>
                      {catLabel && (
                        <span className="text-xs text-sky-600">
                          {catLabel}
                        </span>
                      )}
                      {remate.estimatedHeads && (
                        <span className="text-xs text-sky-700">
                          {remate.estimatedHeads.toLocaleString()} cab.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* SEO Footer */}
      <footer className="max-w-6xl mx-auto mt-12 pt-8 border-t border-sky-900">
        <div className="grid md:grid-cols-2 gap-8 text-sm text-sky-700">
          <div>
            <h2 className="text-sky-500 font-semibold mb-2">
              Remates de {typeConfig.displayName} en {provinceConfig.displayName}
            </h2>
            <p>
              Calendario completo y actualizado de remates de {typeConfig.displayName.toLowerCase()} en {provinceConfig.displayName}.
              Todas las subastas de consignatarias verificadas, con fechas, ubicaciones y categorías de hacienda.
            </p>
          </div>
          <div>
            <h3 className="text-sky-500 font-semibold mb-2">Enlaces relacionados</h3>
            <ul className="space-y-1">
              <li>
                <Link href={`/remates/${provincia}`} className="hover:text-sky-400">
                  Todos los remates en {provinceConfig.displayName}
                </Link>
              </li>
              <li>
                <Link href={`/remates/tipo/${tipo}`} className="hover:text-sky-400">
                  {typeConfig.displayName} en toda Argentina
                </Link>
              </li>
              <li>
                <Link href="/consignatarias" className="hover:text-sky-400">
                  Directorio de consignatarias
                </Link>
              </li>
              <li>
                <Link href="/mercado/inmag" className="hover:text-sky-400">
                  Precios INMAG
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </footer>
    </main>
  )
}
