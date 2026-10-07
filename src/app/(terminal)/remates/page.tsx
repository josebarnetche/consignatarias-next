import { Metadata } from 'next'
import Link from 'next/link'
import RematesClient from './RematesClient'
import NextRemateCountdown from '@/components/remates/NextRemateCountdown'
import rematesData from '@/lib/data/remates.json'
import { getAllProfiles, getCanonicalSlug } from '@/lib/data/consignataria-slugs'
import { SectionBreadcrumbSchema, FAQPageSchema, RematesListSchema, DatasetSchema } from '@/components/seo/JsonLd'
import { LICENCIA_PROPIA } from '@/lib/seo/schemas'
import type { Auction } from '@/lib/db/schema'
import NewsletterSignup from '@/components/NewsletterSignup'
import { Breadcrumb } from '@/components/ui'
import { FaqList } from '@/components/seo/FaqList'
import { remateHref } from '@/lib/remates-enlaces'
import { FECHA_DATOS, fechaLarga } from '@/lib/datos-frescura'
import { EXPO, REMATES_EXPO, expoVigente, posicionNacional } from '@/lib/data/expo-mercedes'

/** Al navegador sólo le van los remates de hoy en adelante.
 *
 * La pestaña "Anteriores" mantenía 965 remates pasados vivos en memoria del
 * cliente —561 KB de JSON en la página más visitada del sitio— duplicando una
 * página que ya existe y se indexa: /remates/anteriores. Ahora el que los
 * quiere va ahí, y el bundle baja a los ~200 que están por venir.
 *
 * El corte usa la fecha del servidor; el cliente recalcula su "hoy" (que después
 * de las 20:00 ART salta al día siguiente) sobre este subconjunto, así que un
 * remate de hoy nunca se pierde por la diferencia de huso.
 */
const hoyISO = new Date().toISOString().slice(0, 10)
const rematesProximos = (rematesData as Auction[]).filter((a) => a.date >= hoyISO)

// Regenerate hourly for fresh TODAY
export const revalidate = 3600

const MESES_SLUG = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

function proximosRemates() {
  const today = new Date().toISOString().slice(0, 10)
  return rematesData.filter((r) => r.date >= today && r.status === 'scheduled')
}

// Title atemporal: el mes y el año los lleva /remates/mes/[mes], que es la
// página que tiene que salir para "remates de octubre".
export async function generateMetadata(): Promise<Metadata> {
  const proximos = proximosRemates().length
  const title = 'Remates ganaderos: calendario de remates de hacienda en Argentina'
  const description = `${proximos.toLocaleString('es-AR')} remates de hacienda por venir, con día, hora y lugar. Buscá por provincia, tipo de remate o consignataria. Se actualiza todos los días.`

  return {
    title: { absolute: title },
    description,
    keywords: [
      'remates ganaderos',
      'calendario remates',
      'remates de hacienda',
      'subastas hacienda',
      'remates invernada',
      'remates cria',
      'consignatarias argentina',
    ],
    openGraph: {
      title,
      description,
      url: 'https://www.consignatarias.com.ar/remates',
      type: 'website',
      images: [{ url: '/og-remates.png', width: 1200, height: 630 }],
    },
    alternates: {
      canonical: 'https://www.consignatarias.com.ar/remates',
    },
  }
}

// FAQ items for rich snippets
const FAQ_ITEMS = [
  {
    question: '¿Qué es un remate ganadero?',
    answer: 'Un remate ganadero es una subasta pública de hacienda (ganado bovino, ovino, porcino u otros) organizada por una consignataria de hacienda. Los productores consignan sus animales y los compradores ofertan en vivo o por TV/streaming. Es el principal método de comercialización de ganado en Argentina.',
  },
  {
    question: '¿Cómo puedo participar en un remate ganadero?',
    answer: 'Para participar como comprador, debés registrarte previamente en la consignataria organizadora, presentar documentación (CUIT, habilitación SENASA) y obtener una paleta de postor. Podés asistir presencialmente a la feria o participar a través de transmisiones en vivo por TV o internet.',
  },
  {
    question: '¿Qué tipos de remates ganaderos existen?',
    answer: 'Los principales tipos son: remates de invernada (terneros y vaquillonas para engorde), remates de cría (vientres y reproductores), remates generales (hacienda mixta), remates especiales (animales de pedigrí o exposición) y remates de hacienda gorda (animales terminados para faena).',
  },
  {
    question: '¿Cada cuánto se actualizan los datos del calendario?',
    answer: 'El calendario de consignatarias.com.ar se actualiza automáticamente todos los días a las 14:00 hora argentina (ART). Los datos provienen de fuentes oficiales como la Cámara Argentina de Consignatarios de Ganado (CACG) y las propias consignatarias.',
  },
  {
    question: '¿Qué información incluye cada remate del calendario?',
    answer: 'Cada remate incluye: fecha y hora, consignataria responsable, ubicación (localidad y provincia), tipo de remate, categoría de hacienda, cantidad estimada de cabezas, y cuando están disponibles, enlaces al catálogo y transmisión en vivo.',
  },
]

export default function RematesPage() {
  const totalProfiles = getAllProfiles().length
  const provinces = new Set(rematesData.map((r) => r.province))
  const totalProvinces = provinces.size
  const actualizado = fechaLarga()

  // Remates de los próximos 7 días y meses con remates (enlaces a /remates/mes/*,
  // solo los que tienen algo: los meses vacíos no tienen contenido que mostrar).
  const proximos = proximosRemates()
  const enSieteDias = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10)
  const rematesSemana = proximos.filter((r) => r.date <= enSieteDias).length
  const anio = String(new Date().getFullYear())
  const mesesConRemates = Array.from(
    new Set(proximos.filter((r) => r.date.startsWith(anio)).map((r) => Number(r.date.slice(5, 7)) - 1)),
  ).sort((a, b) => a - b)
  
  // Get upcoming remates for structured data
  const today = new Date().toISOString().slice(0, 10)
  const upcomingRemates = rematesData
    .filter((r) => r.date >= today && r.status === 'scheduled')
    .slice(0, 20)
    .map((r) => ({
      id: r.id,
      name: `${r.consignatariaName} - ${r.type}`,
      date: r.date,
      time: r.time || undefined,
      location: r.location,
      province: r.province,
      consignatariaName: r.consignatariaName,
      type: r.type,
      estimatedHeads: r.estimatedHeads ?? undefined,
    }))

  // Próximo remate: el primero con date>=hoy, ordenado por date+time. El cómputo
  // del countdown vive en el cliente (Date.now()), así que acá solo elegimos el
  // remate; la hora exacta la resuelve el componente.
  const next = rematesData
    .filter((r) => r.date >= today && r.status === 'scheduled')
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''))[0]
  const nextRemate = next
    ? {
        consignatariaName: next.consignatariaName,
        date: next.date,
        time: next.time ?? undefined,
        province: next.province || undefined,
        slug: getCanonicalSlug(next.consignatariaSlug) ?? next.consignatariaSlug,
        href: remateHref(next) ?? undefined,
      }
    : null

  return (
    <>
      <SectionBreadcrumbSchema section="remates" sectionName="Remates" />
      <FAQPageSchema items={FAQ_ITEMS} />
      <RematesListSchema remates={upcomingRemates} />
      <DatasetSchema
        name="Calendario de Remates Ganaderos Argentina"
        description="Base de datos actualizada de remates ganaderos de múltiples consignatarias argentinas"
        url="https://www.consignatarias.com.ar/remates"
        keywords={['remates ganaderos', 'subastas hacienda', 'consignatarias argentina']}
        license={LICENCIA_PROPIA}
      />
      {/* Breadcrumb visual (§3.2). El JSON-LD ya lo emite SectionBreadcrumbSchema
          arriba, así que acá schema={false} para no duplicar structured data. */}
      <div className="mx-auto max-w-5xl px-4 pt-3 sm:px-6">
        <Breadcrumb items={[{ name: 'Remates' }]} schema={false} />
      </div>
      {/* Encabezado: qué es esta página en una línea. Los accesos por provincia,
          tipo y el newsletter bajaron al pie — siguen enlazados para Google, pero
          ya no se interponen entre el productor y la lista. */}
      <header className="mx-auto max-w-5xl px-4 pt-4 pb-2 sm:px-6">
        <h1 className="text-2xl font-semibold text-ink sm:text-3xl">Calendario de remates de hacienda</h1>
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-zinc-400">
          Los remates ganaderos de todo el país con día, hora y lugar:{' '}
          {rematesSemana === 1 ? 'hay 1 remate' : `hay ${rematesSemana} remates`} en los próximos 7 días.{' '}
          {totalProfiles} consignatarias en {totalProvinces} provincias.
        </p>
        {actualizado && (
          <p className="mt-1 text-sm text-zinc-500">
            Actualizado el <time dateTime={FECHA_DATOS ?? undefined}>{actualizado}</time>.
          </p>
        )}
        {nextRemate && (
          <div className="mt-3">
            <NextRemateCountdown nextRemate={nextRemate} />
          </div>
        )}

        {/* Destacado de la Expo de Mercedes: se apaga solo pasado el último remate. */}
        {expoVigente() && (
          <Link
            href="/remates/expo-rural-mercedes"
            className="mt-4 block rounded-terminal border border-accent/40 bg-accent/[0.05] p-4 transition-colors hover:bg-accent/[0.09]"
          >
            <p className="text-sm font-medium text-accent">
              {EXPO.entidad} · {EXPO.provincia}
            </p>
            <p className="mt-1 text-base font-semibold text-ink">
              {REMATES_EXPO.length} remates de {posicionNacional().firmas} firmas en dos semanas
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              La rueda de la {EXPO.edicion}ª Expo de Mercedes. Ver el cronograma completo →
            </p>
          </Link>
        )}
      </header>

      {/* RematesClient ya no usa useSearchParams → renderiza SSR (lista en el
          HTML servido, visible para crawlers). Sin Suspense/fallback. */}
      <RematesClient remates={rematesProximos} />

      {/* Pie: navegación a las páginas indexables + newsletter */}
      <section className="mx-auto max-w-5xl px-4 pb-10 sm:px-6">
        <div className="terminal-panel p-panel space-y-5">
          {[
            {
              titulo: 'Remates por momento',
              links: [
                { href: '/remates/en-vivo', label: 'En vivo' },
                { href: '/remates/hoy', label: 'Hoy' },
                { href: '/remates/manana', label: 'Mañana' },
                { href: '/remates/semana', label: 'Esta semana' },
                { href: '/remates/fin-de-semana', label: 'Fin de semana' },
                { href: '/remates/anteriores', label: 'Anteriores' },
              ],
            },
            ...(mesesConRemates.length
              ? [{
                  titulo: 'Remates por mes',
                  links: mesesConRemates.map((m) => ({
                    href: `/remates/mes/${MESES_SLUG[m]}`,
                    label: `Remates de ${MESES_SLUG[m]}`,
                  })),
                }]
              : []),
            {
              titulo: 'Remates por provincia',
              links: [
                { href: '/remates/buenos-aires', label: 'Buenos Aires' },
                { href: '/remates/cordoba', label: 'Córdoba' },
                { href: '/remates/santa-fe', label: 'Santa Fe' },
                { href: '/remates/entre-rios', label: 'Entre Ríos' },
                { href: '/remates/corrientes', label: 'Corrientes' },
              ],
            },
            {
              titulo: 'Remates por tipo',
              links: [
                { href: '/remates/tipo/invernada', label: 'Invernada' },
                { href: '/remates/tipo/cria', label: 'Cría' },
                { href: '/remates/tipo/general', label: 'General' },
                { href: '/remates/tipo/reproductores', label: 'Reproductores' },
                { href: '/remates/tipo/especial', label: 'Especial' },
              ],
            },
          ].map((g) => (
            <nav key={g.titulo} aria-label={g.titulo}>
              <h2 className="text-sm font-semibold text-ink">{g.titulo}</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {g.links.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="inline-flex min-h-[40px] items-center rounded-full border border-terminal-border px-3.5 text-sm text-zinc-300 transition-colors hover:border-accent/50 hover:text-accent"
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            </nav>
          ))}

          <div id="recibir-remates" className="scroll-mt-20 border-t border-terminal-border pt-5">
            <h2 className="text-sm font-semibold text-ink">Recibí los remates de la semana por mail</h2>
            <div className="mt-2">
              <NewsletterSignup source="remates" buttonText="Suscribirme" placeholder="tu@email.com" compact />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 pb-10 sm:px-6">
        <FaqList items={FAQ_ITEMS} />
      </div>
    </>
  )
}
