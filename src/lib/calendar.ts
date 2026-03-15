/**
 * Calendar integration utilities
 * Generate .ics files and Google Calendar links for video sessions
 */

interface CalendarEvent {
  title: string
  description?: string
  startDate: Date
  endDate: Date
  location?: string
}

/**
 * Generate a Google Calendar URL for an event
 */
export function getGoogleCalendarUrl(event: CalendarEvent): string {
  const formatGCalDate = (d: Date) =>
    d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatGCalDate(event.startDate)}/${formatGCalDate(event.endDate)}`,
    details: event.description || '',
    location: event.location || '',
  })

  return `https://calendar.google.com/calendar/event?${params.toString()}`
}

/**
 * Generate an .ics file content string
 */
export function generateICS(event: CalendarEvent): string {
  const formatICSDate = (d: Date) =>
    d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

  const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@movestudio.be`

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MŌVE Studio//Video Call//NL',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTART:${formatICSDate(event.startDate)}`,
    `DTEND:${formatICSDate(event.endDate)}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${(event.description || '').replace(/\n/g, '\\n')}`,
    event.location ? `LOCATION:${event.location}` : '',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Video call begint over 15 minuten',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean)

  return lines.join('\r\n')
}

/**
 * Download an .ics file in the browser
 */
export function downloadICS(event: CalendarEvent, filename?: string) {
  const content = generateICS(event)
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || 'move-video-call.ics'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
