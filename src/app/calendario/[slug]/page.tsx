import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getAllCanonicalSlugs, getCanonicalSlug, getProfile, getAuctionsForProfile } from '@/lib/data/consignataria-slugs'
import rematesData from '@/lib/data/remates.json'
import type { Auction } from '@/lib/db/schema'
import { BreadcrumbSchema, WebApplicationSchema } from '@/components/seo/JsonLd'

const auctions = rematesData as Auction[]

/* ------------------------------------------------------------------ */
/*  STATIC PARAMS                                                      */
/* ------------------------------------------------------------------ */

export function generateStaticParams() {
  return getAllCanonicalSlugs().map(slug => ({ slug }))
}

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const canonical = getCanonicalSlug(slug)
  if (!canonical) return {}

  const profile = getProfile(canonical)
  if (!profile) return {}

  return {
    title: `Calendario de ${profile.displayName} — Consignatarias`,
    description: `Suscribite al calendario de remates de ${profile.displayName}. Recibí notificaciones automáticas en Google Calendar, Apple o Outlook.`,
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default async function CalendarioPage({ params }: Props) {
  const { slug } = await params

  const canonical = getCanonicalSlug(slug)
  if (!canonical) notFound()

  if (slug !== canonical) {
    redirect(`/calendario/${canonical}`)
  }

  const profile = getProfile(canonical)
  if (!profile) notFound()

  const today = new Date().toISOString().slice(0, 10)
  const upcoming = getAuctionsForProfile(auctions, canonical)
    .filter(a => a.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5)

  // webcal:// = SUSCRIPCIÓN (sincroniza y se actualiza solo → recurrencia), no descarga
  // de un snapshot. Host canónico www para no pegar contra el 307 que rompe a Google.
  const webcalUrl = `webcal://www.consignatarias.com.ar/api/calendario/${canonical}`
  const googleUrl = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcalUrl)}`
  
  return (
    <div className="min-h-screen bg-zinc-950">
      {/* SEO Schema */}
      <BreadcrumbSchema items={[
        { name: 'Inicio', url: 'https://www.consignatarias.com.ar' },
        { name: 'Consignatarias', url: 'https://www.consignatarias.com.ar/consignatarias' },
        { name: profile.displayName, url: `https://www.consignatarias.com.ar/consignatarias/${canonical}` },
        { name: 'Calendario', url: `https://www.consignatarias.com.ar/calendario/${canonical}` },
      ]} />
      <WebApplicationSchema
        name={`Calendario de ${profile.displayName}`}
        description={`Suscribite al calendario de remates de ${profile.displayName}. Recibí notificaciones automáticas.`}
        url={`https://www.consignatarias.com.ar/calendario/${canonical}`}
        applicationCategory="UtilityApplication"
        features={['Sincronización Google Calendar', 'Apple Calendar', 'Outlook', 'Notificaciones automáticas']}
      />

      <div className="max-w-xl mx-auto px-4 py-12">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-4">📅</div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Calendario de {profile.displayName}
          </h1>
          <p className="text-zinc-400">
            Suscribite y recibí los remates automáticamente en tu calendario
          </p>
        </div>

        {/* Calendar buttons */}
        <div className="space-y-3 mb-8">
          {/* Google Calendar */}
          <a
            href={googleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 w-full p-4 bg-white hover:bg-zinc-100 text-zinc-900 rounded-xl transition-colors"
          >
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold">
              G
            </div>
            <div className="flex-1 text-left">
              <div className="font-medium">Google Calendar</div>
              <div className="text-sm text-zinc-500">Se agrega automáticamente</div>
            </div>
            <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>

          {/* Apple Calendar */}
          <a
            href={webcalUrl}
            className="flex items-center gap-4 w-full p-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center text-white font-bold">
              🍎
            </div>
            <div className="flex-1 text-left">
              <div className="font-medium">Apple Calendar</div>
              <div className="text-sm text-zinc-400">Se suscribe y actualiza solo</div>
            </div>
            <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </a>

          {/* Outlook */}
          <a
            href={webcalUrl}
            className="flex items-center gap-4 w-full p-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors"
          >
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
              O
            </div>
            <div className="flex-1 text-left">
              <div className="font-medium">Outlook</div>
              <div className="text-sm text-zinc-400">Se suscribe y actualiza solo</div>
            </div>
            <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </a>
        </div>

        {/* Instructions */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-8">
          <h2 className="font-medium text-white mb-3">¿Cómo funciona?</h2>
          <ol className="text-sm text-zinc-400 space-y-2 list-decimal list-inside">
            <li>Elegí tu calendario (Google, Apple u Outlook)</li>
            <li>Aceptá la suscripción cuando tu app lo pida</li>
            <li>¡Listo! Los remates aparecen automáticamente</li>
          </ol>
          <p className="text-xs text-zinc-500 mt-3">
            El calendario se actualiza solo cuando hay nuevos remates.
          </p>
        </div>

        {/* Preview of upcoming */}
        {upcoming.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-medium text-zinc-400 mb-3">Próximos remates</h2>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl divide-y divide-zinc-800">
              {upcoming.map((a, i) => (
                <div key={i} className="px-4 py-3 flex justify-between items-center">
                  <div>
                    <div className="text-sm text-white">{a.title}</div>
                    <div className="text-xs text-zinc-500">{a.location}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-emerald-400">{formatDate(a.date)}</div>
                    {a.time && <div className="text-xs text-zinc-500">{a.time}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Back link */}
        <div className="text-center space-y-3">
          <Link
            href={`/go/${canonical}`}
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            ← Volver al perfil
          </Link>
          <p className="text-xs text-zinc-600">
            consignatarias.com.ar
          </p>
        </div>

      </div>
    </div>
  )
}
