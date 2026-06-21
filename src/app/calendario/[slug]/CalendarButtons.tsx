'use client'

import { trackValueEvent } from '@/lib/analytics'

/**
 * Botones de suscripción al calendario. Cada clic registra el evento de valor
 * `calendar_subscribe` (recurrencia — la palanca #1) en el sistema interno de conteo,
 * atribuido a la consignataria, con el proveedor en meta. La página es server; esto
 * aísla el onClick en cliente sin romper el SSR del resto.
 */
export function CalendarButtons({
  googleUrl,
  webcalUrl,
  slug,
}: {
  googleUrl: string
  webcalUrl: string
  slug: string
}) {
  const track = (provider: 'google' | 'apple' | 'outlook') =>
    trackValueEvent('calendar_subscribe', { entityType: 'consignataria', entitySlug: slug, meta: { provider } })

  return (
    <div className="space-y-3 mb-8">
      <a
        href={googleUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track('google')}
        className="flex items-center gap-4 w-full p-4 bg-white hover:bg-zinc-100 text-zinc-900 rounded-xl transition-colors"
      >
        <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold">G</div>
        <div className="flex-1 text-left">
          <div className="font-medium">Google Calendar</div>
          <div className="text-sm text-zinc-500">Se agrega automáticamente</div>
        </div>
        <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </a>

      <a
        href={webcalUrl}
        onClick={() => track('apple')}
        className="flex items-center gap-4 w-full p-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors"
      >
        <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center text-white font-bold">🍎</div>
        <div className="flex-1 text-left">
          <div className="font-medium">Apple Calendar</div>
          <div className="text-sm text-zinc-400">Se suscribe y actualiza solo</div>
        </div>
        <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      </a>

      <a
        href={webcalUrl}
        onClick={() => track('outlook')}
        className="flex items-center gap-4 w-full p-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors"
      >
        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">O</div>
        <div className="flex-1 text-left">
          <div className="font-medium">Outlook</div>
          <div className="text-sm text-zinc-400">Se suscribe y actualiza solo</div>
        </div>
        <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      </a>
    </div>
  )
}
