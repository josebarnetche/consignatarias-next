import { Metadata } from 'next'
import Link from 'next/link'
import { getProfile, getAllCanonicalSlugs } from '@/lib/data/consignataria-slugs'
import rematesData from '@/lib/data/remates.json'
import type { Auction } from '@/lib/db/schema'

export const metadata: Metadata = {
  title: 'Comparar Consignatarias | Consignatarias.com.ar',
  description: 'Compará consignatarias de hacienda lado a lado. Comparación de remates, cobertura geográfica y especialidades.',
  openGraph: {
    title: 'Comparar Consignatarias',
    description: 'Herramienta de comparación de consignatarias de hacienda',
  },
}

interface ConsignatariaStats {
  slug: string
  displayName: string
  totalRemates: number
  remates2026: number
  provinces: string[]
  types: string[]
  avgCabezas: number | null
  lastRemateDate: string | null
}

function getConsignatariaStats(slug: string): ConsignatariaStats | null {
  const profile = getProfile(slug)
  if (!profile) return null

  const auctions = (rematesData as Auction[]).filter(
    a => profile.allSlugs.includes(a.consignatariaSlug)
  )

  const auctions2026 = auctions.filter(a => a.date.startsWith('2026'))
  
  const provinces = [...new Set(auctions.map(a => a.province).filter(Boolean))]
  const types = [...new Set(auctions.map(a => a.type).filter(Boolean))]
  
  const withHeads = auctions.filter(a => a.estimatedHeads && a.estimatedHeads > 0)
  const avgCabezas = withHeads.length > 0
    ? Math.round(withHeads.reduce((sum, a) => sum + (a.estimatedHeads || 0), 0) / withHeads.length)
    : null

  const sortedByDate = [...auctions].sort((a, b) => b.date.localeCompare(a.date))
  const lastRemateDate = sortedByDate[0]?.date || null

  return {
    slug: profile.canonicalSlug,
    displayName: profile.displayName,
    totalRemates: auctions.length,
    remates2026: auctions2026.length,
    provinces,
    types,
    avgCabezas,
    lastRemateDate,
  }
}

// Get top consignatarias for suggestions
function getTopConsignatarias(): ConsignatariaStats[] {
  const allSlugs = getAllCanonicalSlugs()
  const stats = allSlugs
    .map(slug => getConsignatariaStats(slug))
    .filter((s): s is ConsignatariaStats => s !== null && s.totalRemates > 0)
    .sort((a, b) => b.totalRemates - a.totalRemates)
    .slice(0, 12)
  
  return stats
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

const typeLabels: Record<string, string> = {
  invernada: 'Invernada',
  cria: 'Cría',
  reproductores: 'Reproductores',
  general: 'General',
  especial: 'Especial',
}

export default async function CompararPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const slugsParam = params.vs
  const selectedSlugs = typeof slugsParam === 'string' 
    ? slugsParam.split(',').filter(Boolean).slice(0, 3)
    : Array.isArray(slugsParam) 
      ? slugsParam.slice(0, 3) 
      : []

  const selectedStats = selectedSlugs
    .map(slug => getConsignatariaStats(slug))
    .filter((s): s is ConsignatariaStats => s !== null)

  const topConsignatarias = getTopConsignatarias()

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-zinc-200">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <nav className="text-sm text-zinc-500 mb-4">
            <Link href="/" className="hover:text-zinc-300">Inicio</Link>
            <span className="mx-2">/</span>
            <span className="text-zinc-300">Comparar</span>
          </nav>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            Comparar Consignatarias
          </h1>
          <p className="text-zinc-400">
            Seleccioná hasta 3 consignatarias para comparar sus estadísticas
          </p>
        </div>

        {/* Comparison Table */}
        {selectedStats.length > 0 ? (
          <div className="mb-12">
            <div className="overflow-x-auto">
              <table className="w-full border border-zinc-800 rounded-lg overflow-hidden">
                <thead className="bg-zinc-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider border-b border-zinc-800">
                      Métrica
                    </th>
                    {selectedStats.map(stat => (
                      <th key={stat.slug} className="px-4 py-3 text-left text-sm font-semibold text-white border-b border-zinc-800">
                        <Link href={`/consignatarias/${stat.slug}`} className="hover:text-emerald-400 transition-colors">
                          {stat.displayName}
                        </Link>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  <tr className="bg-[#0d0d12]">
                    <td className="px-4 py-3 text-sm text-zinc-400">Remates totales</td>
                    {selectedStats.map(stat => (
                      <td key={stat.slug} className="px-4 py-3 text-sm font-medium text-white">
                        {stat.totalRemates}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm text-zinc-400">Remates 2026</td>
                    {selectedStats.map(stat => (
                      <td key={stat.slug} className="px-4 py-3 text-sm text-emerald-400 font-medium">
                        {stat.remates2026}
                      </td>
                    ))}
                  </tr>
                  <tr className="bg-[#0d0d12]">
                    <td className="px-4 py-3 text-sm text-zinc-400">Provincias</td>
                    {selectedStats.map(stat => (
                      <td key={stat.slug} className="px-4 py-3 text-sm text-zinc-300">
                        {stat.provinces.length > 0 ? stat.provinces.join(', ') : '-'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm text-zinc-400">Tipos de remate</td>
                    {selectedStats.map(stat => (
                      <td key={stat.slug} className="px-4 py-3 text-sm text-zinc-300">
                        {stat.types.length > 0 
                          ? stat.types.map(t => typeLabels[t] || t).join(', ')
                          : '-'}
                      </td>
                    ))}
                  </tr>
                  <tr className="bg-[#0d0d12]">
                    <td className="px-4 py-3 text-sm text-zinc-400">Promedio cabezas/remate</td>
                    {selectedStats.map(stat => (
                      <td key={stat.slug} className="px-4 py-3 text-sm text-zinc-300">
                        {stat.avgCabezas ? stat.avgCabezas.toLocaleString('es-AR') : '-'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm text-zinc-400">Último remate</td>
                    {selectedStats.map(stat => (
                      <td key={stat.slug} className="px-4 py-3 text-sm text-zinc-300">
                        {formatDate(stat.lastRemateDate)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 flex gap-2">
              <Link
                href="/comparar"
                className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                ← Limpiar comparación
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center mb-12">
            <p className="text-zinc-400 mb-4">
              Seleccioná consignatarias de la lista para comenzar a comparar
            </p>
            <p className="text-sm text-zinc-500">
              Podés agregar hasta 3 consignatarias
            </p>
          </div>
        )}

        {/* Consignatarias Grid */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">
            {selectedStats.length > 0 ? 'Agregar otra consignataria' : 'Consignatarias más activas'}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {topConsignatarias.map(stat => {
              const isSelected = selectedSlugs.includes(stat.slug)
              const newSlugs = isSelected
                ? selectedSlugs.filter(s => s !== stat.slug)
                : [...selectedSlugs, stat.slug].slice(0, 3)
              const href = newSlugs.length > 0 ? `/comparar?vs=${newSlugs.join(',')}` : '/comparar'
              
              return (
                <Link
                  key={stat.slug}
                  href={href}
                  className={`
                    p-4 rounded-lg border transition-all
                    ${isSelected 
                      ? 'bg-emerald-900/30 border-emerald-600 text-emerald-300' 
                      : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600 text-white'
                    }
                  `}
                >
                  <div className="font-medium text-sm mb-1 truncate">{stat.displayName}</div>
                  <div className="text-xs text-zinc-400">
                    {stat.remates2026} remates en 2026
                  </div>
                  {isSelected && (
                    <div className="text-xs text-emerald-400 mt-1">✓ Seleccionada</div>
                  )}
                </Link>
              )
            })}
          </div>
        </div>

        {/* Link to full directory */}
        <div className="text-center">
          <Link
            href="/consignatarias"
            className="text-emerald-400 hover:text-emerald-300 text-sm"
          >
            Ver todas las consignatarias →
          </Link>
        </div>
      </div>
    </main>
  )
}
