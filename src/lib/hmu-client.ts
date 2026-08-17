'use client'
/**
 * howmuchusers.wtf desde el browser (public key). page.viewed / session.started / custom.
 * sendBeacon con fallback a fetch keepalive. Sin key → no-op.
 */
const HMU_EVENTS = 'https://howmuchusers.wtf/api/v1/events'
const KEY = process.env.NEXT_PUBLIC_HMU_PUBLIC_KEY

export function hmuClientTrack(
  event: 'page.viewed' | 'session.started' | (string & {}),
  props?: Record<string, string | number | boolean | null>,
) {
  if (!KEY || typeof window === 'undefined') return
  const body = JSON.stringify(props ? { event, props } : { event })
  try {
    // sendBeacon no permite headers → la key va por query string (público, no secreto)
    fetch(`${HMU_EVENTS}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-HMU-Key': KEY },
      body,
      keepalive: true,
    }).catch(() => {})
  } catch {
    /* noop */
  }
}
