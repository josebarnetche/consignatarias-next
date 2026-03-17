/**
 * ICS Calendar File Generator
 * Creates .ics files for remate events that work on iOS, Android, and desktop calendars
 */

interface ICSEventParams {
  title: string
  description: string
  location: string
  startDate: string // YYYY-MM-DD
  startTime?: string // HH:MM
  durationHours?: number
  url?: string
  organizer?: string
}

function formatDateForICS(dateStr: string, timeStr?: string): string {
  // Format: YYYYMMDDTHHMMSS
  const date = dateStr.replace(/-/g, '')
  const time = timeStr ? timeStr.replace(':', '') + '00' : '100000' // Default 10:00 AM
  return `${date}T${time}`
}

function generateUID(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}@consignatarias.com.ar`
}

function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

export function generateICSContent(event: ICSEventParams): string {
  const startDateTime = formatDateForICS(event.startDate, event.startTime)
  const durationMs = (event.durationHours || 4) * 60 * 60 * 1000 // Default 4 hours
  
  // Calculate end time
  const startDate = new Date(event.startDate + 'T' + (event.startTime || '10:00'))
  const endDate = new Date(startDate.getTime() + durationMs)
  const endDateTime = formatDateForICS(
    endDate.toISOString().slice(0, 10),
    endDate.toISOString().slice(11, 16)
  )

  const now = new Date()
  const timestamp = formatDateForICS(
    now.toISOString().slice(0, 10),
    now.toISOString().slice(11, 16)
  )

  const description = escapeICSText(
    event.description + 
    (event.url ? `\\n\\nMás información: ${event.url}` : '') +
    (event.organizer ? `\\n\\nOrganiza: ${event.organizer}` : '')
  )

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//consignatarias.com.ar//NONSGML Remates//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${generateUID()}`,
    `DTSTAMP:${timestamp}`,
    `DTSTART:${startDateTime}`,
    `DTEND:${endDateTime}`,
    `SUMMARY:${escapeICSText(event.title)}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${escapeICSText(event.location)}`,
    event.url ? `URL:${event.url}` : '',
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    'DESCRIPTION:Remate mañana',
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Remate en 2 horas',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n')
}

export function generateICSDataURL(event: ICSEventParams): string {
  const content = generateICSContent(event)
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(content)}`
}

export function downloadICSFile(event: ICSEventParams, filename: string): void {
  const content = generateICSContent(event)
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
