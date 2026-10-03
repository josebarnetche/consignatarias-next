import { jsonLd } from '@/lib/seo/json-ld'
import Link from 'next/link'
import rematesData from '@/lib/data/remates.json'
import type { Auction } from '@/lib/db/schema'
import { getAllProfiles, getAuctionsForProfile } from '@/lib/data/consignataria-slugs'
import { BreadcrumbSchema, FAQPageSchema } from '@/components/seo/JsonLd'
import { ProvinceCluster } from '@/components/seo/ProvinceCluster'
import { CAT_LABELS, getCity, nombrePropio } from '@/lib/ui/tokens'
import { remateAnchor, remateHref, tipoNombre } from '@/lib/remates-enlaces'

/* ============================================================
   PROVINCE VIEW — used when /consignatarias/[slug] matches a
   province slug (buenos-aires, chaco, etc.). Lives in _views/
   so the leading underscore tells Next.js to NOT treat this as
   a route segment.
   ============================================================ */

export const PROVINCE_MAP: Record<string, string> = {
  'buenos-aires': 'BUENOS AIRES',
  'chaco': 'CHACO',
  'cordoba': 'CORDOBA',
  'corrientes': 'CORRIENTES',
  'entre-rios': 'ENTRE RIOS',
  'formosa': 'FORMOSA',
  'la-pampa': 'LA PAMPA',
  'misiones': 'MISIONES',
  'neuquen': 'NEUQUEN',
  'san-luis': 'SAN LUIS',
  'santa-fe': 'SANTA FE',
  'santiago-del-estero': 'SANTIAGO DEL ESTERO',
  'tucuman': 'TUCUMAN',
}

export const PROVINCE_DISPLAY: Record<string, string> = {
  'buenos-aires': 'Buenos Aires',
  'chaco': 'Chaco',
  'cordoba': 'Córdoba',
  'corrientes': 'Corrientes',
  'entre-rios': 'Entre Ríos',
  'formosa': 'Formosa',
  'la-pampa': 'La Pampa',
  'misiones': 'Misiones',
  'neuquen': 'Neuquén',
  'san-luis': 'San Luis',
  'santa-fe': 'Santa Fe',
  'santiago-del-estero': 'Santiago del Estero',
  'tucuman': 'Tucumán',
}

const TIPO_PLURAL: Record<string, string> = {
  invernada: 'de invernada',
  cria: 'de cría',
  general: 'generales',
  especial: 'especiales',
  reproductores: 'de reproductores',
}

function contar<T>(items: T[], clave: (x: T) => string | null | undefined): [string, number][] {
  const m = new Map<string, number>()
  for (const it of items) {
    const k = clave(it)
    if (k) m.set(k, (m.get(k) ?? 0) + 1)
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1])
}

function enumerar(xs: string[]): string {
  if (xs.length <= 1) return xs.join('')
  return `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}`
}

/**
 * Párrafo propio de cada provincia, armado con los remates de remates.json:
 * plazas con más remates, firmas que más rematan, tipo de remate y categoría
 * que predominan y el próximo remate. Son datos de la provincia, no plantilla:
 * dos provincias nunca dicen lo mismo.
 */
function resumenProvincia(
  provinceAuctions: Auction[],
  firmas: { displayName: string; auctionCount: number }[],
  provinceDisplay: string,
  today: string,
) {
  if (provinceAuctions.length === 0) return null
  const plazas = contar(provinceAuctions, (a) => nombrePropio(getCity(a.location || '')))
    .filter(([nombre]) => nombre.toLowerCase() !== provinceDisplay.toLowerCase())
    .slice(0, 3)
  const tipos = contar(provinceAuctions, (a) => a.type)
  const categorias = contar(provinceAuctions, (a) => (a.mainCategory && a.mainCategory !== 'mixto' ? a.mainCategory : null))
  const total = provinceAuctions.length
  const proximo = provinceAuctions
    .filter((a) => a.date >= today && a.status === 'scheduled')
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''))[0]

  const partes: string[] = []
  partes.push(
    `En ${provinceDisplay} registramos ${total} ${total === 1 ? 'remate' : 'remates'} de ${firmas.length} ${firmas.length === 1 ? 'consignataria' : 'consignatarias'}.`,
  )
  if (plazas.length) {
    const [primera, ...resto] = plazas
    partes.push(
      plazas.length === 1
        ? `La plaza con más actividad es ${primera[0]} (${primera[1]} ${primera[1] === 1 ? 'remate' : 'remates'}).`
        : `Las plazas con más actividad son ${primera[0]} (${primera[1]} remates), ${enumerar(resto.map(([n]) => n))}.`,
    )
  }
  const top = firmas.slice(0, 3)
  if (top.length) {
    partes.push(
      top.length === 1
        ? `La firma que más remata en la provincia es ${nombrePropio(top[0].displayName)}.`
        : `Las firmas que más rematan en la provincia son ${nombrePropio(top[0].displayName)} (${top[0].auctionCount} remates), ${enumerar(top.slice(1).map((f) => nombrePropio(f.displayName)))}.`,
    )
  }
  if (tipos.length) {
    const [t1, n1] = tipos[0]
    const pct = Math.round((n1 / total) * 100)
    const segundo = tipos[1] ? `, seguidos por los ${TIPO_PLURAL[tipos[1][0]] ?? tipos[1][0]}` : ''
    partes.push(`Predominan los remates ${TIPO_PLURAL[t1] ?? t1} (${pct}% del total)${segundo}.`)
  }
  if (categorias.length) {
    partes.push(`Cuando el remate declara una categoría principal, la que más aparece es ${(CAT_LABELS[categorias[0][0] as Auction['mainCategory']] ?? categorias[0][0]).toLowerCase()}.`)
  }
  return { texto: partes.join(' '), proximo }
}

export function isProvinceSlug(slug: string): boolean {
  return slug in PROVINCE_MAP
}

export function provinceSlugsWithAuctions(): string[] {
  const auctions = rematesData as Auction[]
  const provincesWithAuctions = new Set(auctions.map((a) => a.province))
  return Object.entries(PROVINCE_MAP)
    .filter(([, name]) => provincesWithAuctions.has(name))
    .map(([slug]) => slug)
}

export async function provinceMetadata(provincia: string) {
  const provinceName = PROVINCE_MAP[provincia]
  const provinceDisplay = PROVINCE_DISPLAY[provincia]
  if (!provinceName) return null

  const auctions = rematesData as Auction[]
  const profiles = getAllProfiles()
  const consignatariasInProvince = profiles.filter((p) => {
    const pAuctions = getAuctionsForProfile(auctions, p.canonicalSlug)
    return pAuctions.some((a) => a.province === provinceName)
  })
  const count = consignatariasInProvince.length

  return {
    title: `Consignatarias en ${provinceDisplay}: ${count} Activas con Remates 2026`,
    description: `${count} consignatarias de hacienda con remates en ${provinceDisplay}. Perfiles, datos de contacto y próximos remates por consignataria. Directorio actualizado a diario.`,
    keywords: [
      `consignatarias ${provinceDisplay.toLowerCase()}`,
      `consignatarias de hacienda ${provinceDisplay.toLowerCase()}`,
      `remates ganaderos ${provinceDisplay.toLowerCase()}`,
      `consignatarios ${provinceDisplay.toLowerCase()}`,
      `ferias ganaderas ${provinceDisplay.toLowerCase()}`,
      `subastas ganaderas ${provinceDisplay.toLowerCase()}`,
    ],
    openGraph: {
      title: `Consignatarias en ${provinceDisplay} | ${count} en Directorio`,
      description: `Directorio de ${count} consignatarias de hacienda con actividad en ${provinceDisplay}. Calendario de remates y perfiles completos.`,
      url: `https://www.consignatarias.com.ar/consignatarias/${provincia}`,
      type: 'website' as const,
    },
    alternates: {
      canonical: `https://www.consignatarias.com.ar/consignatarias/${provincia}`,
    },
  }
}

function ProvinceConsignatariasSchema({
  entries,
  provinceDisplay,
}: {
  entries: Array<{ slug: string; displayName: string; auctionCount: number }>
  provinceDisplay: string
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Consignatarias de Hacienda en ${provinceDisplay}`,
    description: `Directorio de ${entries.length} consignatarias operando en ${provinceDisplay}`,
    numberOfItems: entries.length,
    itemListElement: entries.slice(0, 10).map((c, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Organization',
        '@id': `https://www.consignatarias.com.ar/consignatarias/${c.slug}`,
        name: c.displayName,
        url: `https://www.consignatarias.com.ar/consignatarias/${c.slug}`,
      },
    })),
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLd(schema) }}
    />
  )
}

export async function ProvinceView({ provincia }: { provincia: string }) {
  const provinceName = PROVINCE_MAP[provincia]
  const provinceDisplay = PROVINCE_DISPLAY[provincia]

  const auctions = rematesData as Auction[]
  const profiles = getAllProfiles()
  const today = new Date().toISOString().slice(0, 10)

  const entries = profiles
    .map((p) => {
      const pAuctions = getAuctionsForProfile(auctions, p.canonicalSlug)
      const provinceAuctions = pAuctions.filter((a) => a.province === provinceName)
      const upcoming = provinceAuctions.filter((a) => a.date >= today).length
      const types = [...new Set(provinceAuctions.map((a) => a.type))]
      return {
        slug: p.canonicalSlug,
        displayName: p.displayName,
        auctionCount: provinceAuctions.length,
        upcoming,
        types,
      }
    })
    .filter((e) => e.auctionCount > 0)
    .sort((a, b) => b.auctionCount - a.auctionCount)

  const totalRemates = entries.reduce((sum, e) => sum + e.auctionCount, 0)
  const totalUpcoming = entries.reduce((sum, e) => sum + e.upcoming, 0)
  const resumen = resumenProvincia(
    auctions.filter((a) => a.province === provinceName),
    entries,
    provinceDisplay,
    today,
  )
  const proximoHref = resumen?.proximo ? remateHref(resumen.proximo) : null

  const topConsignatarias = entries.slice(0, 6).map((e) => e.displayName)
  const faqItems = [
    {
      question: `¿Cuántas consignatarias operan en ${provinceDisplay}?`,
      answer: `Hay ${entries.length} ${entries.length === 1 ? 'consignataria de hacienda con remates' : 'consignatarias de hacienda con remates'} en ${provinceDisplay}, que suman ${totalRemates} ${totalRemates === 1 ? 'remate registrado' : 'remates registrados'}${totalUpcoming > 0 ? `, ${totalUpcoming} ${totalUpcoming === 1 ? 'próximo' : 'próximos'}` : ''}.`,
    },
    {
      question: `¿Qué consignatarias rematan en ${provinceDisplay}?`,
      answer: topConsignatarias.length
        ? `Entre las consignatarias con más remates en ${provinceDisplay} figuran ${topConsignatarias.join(', ')}${entries.length > topConsignatarias.length ? ' y otras' : ''}.`
        : `Por el momento no hay consignatarias con remates registrados en ${provinceDisplay}.`,
    },
  ]

  const otherProvinces = Object.entries(PROVINCE_DISPLAY)
    .filter(([slug]) => slug !== provincia)
    .sort((a, b) => a[1].localeCompare(b[1]))

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Inicio', url: 'https://www.consignatarias.com.ar' },
          { name: 'Consignatarias', url: 'https://www.consignatarias.com.ar/consignatarias' },
          { name: provinceDisplay, url: `https://www.consignatarias.com.ar/consignatarias/${provincia}` },
        ]}
      />
      <ProvinceConsignatariasSchema entries={entries} provinceDisplay={provinceDisplay} />
      <FAQPageSchema items={faqItems} />

      <section className="px-4 pt-4 pb-2 max-w-4xl">
        <nav className="text-sm text-zinc-500 mb-4">
          <Link href="/" className="hover:text-zinc-300">Inicio</Link>
          <span className="mx-2">/</span>
          <Link href="/consignatarias" className="hover:text-zinc-300">Consignatarias</Link>
          <span className="mx-2">/</span>
          <span className="text-zinc-300">{provinceDisplay}</span>
        </nav>

        <h1 className="text-zinc-100 text-xl font-semibold mb-3">
          Consignatarias de Hacienda en {provinceDisplay}
        </h1>
        <p className="text-zinc-400 text-sm leading-relaxed mb-3">
          Directorio de <strong className="text-zinc-200">{entries.length} consignatarias</strong> con
          actividad en {provinceDisplay}. En total hay <strong className="text-zinc-200">{totalRemates} remates</strong> registrados
          en la provincia{totalUpcoming > 0 && <>, de los cuales <strong className="text-zinc-200">{totalUpcoming}</strong> son próximos</>}.
        </p>
        {resumen && (
          <div className="text-zinc-400 text-sm leading-relaxed mb-3 space-y-2">
            <p>{resumen.texto}</p>
            {resumen.proximo && (
              <p>
                Próximo remate:{' '}
                {proximoHref ? (
                  <Link href={proximoHref} className="text-accent hover:underline">
                    {remateAnchor(resumen.proximo)}
                  </Link>
                ) : (
                  remateAnchor(resumen.proximo)
                )}
                .
              </p>
            )}
          </div>
        )}
        <p className="text-sm mb-3 flex flex-wrap gap-x-4 gap-y-1">
          <Link href={`/remates/${provincia}`} className="text-accent hover:underline">
            Ver el calendario de remates en {provinceDisplay} →
          </Link>
          <Link href="/vr" className="text-accent hover:underline">
            Cuánto vale tu hacienda hoy →
          </Link>
        </p>
        <p className="text-zinc-500 text-xs mb-6">
          Cada consignataria opera en varias localidades. Entrá a cualquiera para ver su
          calendario completo de remates, las provincias donde opera y más información.
        </p>
      </section>

      <section className="px-4 pb-4 max-w-4xl">
        <div className="grid gap-3">
          {entries.map((c) => (
            <Link
              key={c.slug}
              href={`/consignatarias/${c.slug}`}
              className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 transition-colors"
            >
              <div>
                <div className="text-zinc-100 font-medium">{nombrePropio(c.displayName)}</div>
                <div className="text-zinc-500 text-sm">
                  {c.auctionCount} remates en {provinceDisplay}
                  {c.upcoming > 0 && <span className="text-emerald-400"> · {c.upcoming} próximos</span>}
                </div>
              </div>
              <div className="flex gap-1.5">
                {c.types.slice(0, 3).map((type) => (
                  <span
                    key={type}
                    className="px-2 py-0.5 text-xs rounded bg-zinc-800 text-zinc-400"
                  >
                    {tipoNombre(type)}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="px-4 pb-8 max-w-4xl">
        <h2 className="text-zinc-400 text-sm font-medium mb-3">Otras provincias</h2>
        <div className="flex flex-wrap gap-2">
          {otherProvinces.map(([slug, name]) => (
            <Link
              key={slug}
              href={`/consignatarias/${slug}`}
              className="px-3 py-1.5 text-sm rounded-lg bg-zinc-900/50 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 transition-colors"
            >
              {name}
            </Link>
          ))}
        </div>
      </section>

      <section className="px-4 pb-8 max-w-4xl">
        <ProvinceCluster province={provinceName} exclude="consignatarias" />
      </section>
    </>
  )
}
