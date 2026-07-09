'use client'

import { generateICSContent } from '@/lib/utils/ics'
import { trackValueEvent } from '@/lib/analytics'

interface AddToCalendarButtonProps {
  title: string
  description: string
  location: string
  startDate: string // YYYY-MM-DD
  startTime?: string | null // HH:MM
  organizer?: string
  url?: string
  className?: string
}

export function AddToCalendarButton({
  title,
  description,
  location,
  startDate,
  startTime,
  organizer,
  url,
  className = '',
}: AddToCalendarButtonProps) {
  const handleDownload = () => {
    const content = generateICSContent({
      title,
      description,
      location,
      startDate,
      startTime: startTime || undefined,
      organizer,
      url,
      durationHours: 4,
    })
    
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
    const blobUrl = URL.createObjectURL(blob)
    
    // Generate filename from title
    const safeTitle = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50)
    const filename = `remate-${safeTitle}-${startDate}.ics`
    
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(blobUrl)
    
    // Track: value-event (GA4 + ledger de recurrencia, peso 6). Antes usaba
    // window.gtag crudo con params UA-legacy y NO entraba al índice de valor
    // (drift P0-1, ver docs/analytics/audit.md).
    trackValueEvent('calendar_download', { entityType: 'remate', meta: { title } })
  }

  return (
    <button
      onClick={handleDownload}
      className={`flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-700 hover:bg-zinc-600 text-white font-medium rounded-lg transition-colors ${className}`}
      title="Agregar a tu calendario (iOS, Android, Google, Outlook)"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      Agregar al Calendario
    </button>
  )
}
