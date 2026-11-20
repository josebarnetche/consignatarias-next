/**
 * Qué remate está en vivo AHORA, para la tool `live_auctions` del MCP.
 *
 * POR QUÉ EXISTE. `upcoming_auctions` contesta "qué viene", y el 12-11-2026 ni
 * siquiera eso del día: filtraba `status === 'scheduled'` y el scraper marca
 * `live` a todos los remates de hoy, así que los 25 del día no aparecían. La
 * pregunta del comprador a la tarde es otra —"¿dónde hay un remate ahora?"— y
 * la respuesta ya la calcula `/remates/en-vivo` (construirPared en
 * src/lib/remates-en-vivo.ts): qué canal de YouTube está transmitiendo.
 *
 * Dos fuentes, y la respuesta las separa para no vender una por la otra:
 *   • AL AIRE: la pared dice que hay transmisión (YouTube o nuestro capturador).
 *   • EN HORARIO: el calendario lo pone entre su hora de inicio y tres horas
 *     después (la misma duración que usa getEffectiveStatus), sin transmisión
 *     que lo confirme. Puede estar rematándose sin cámara, o haberse corrido.
 *
 * Pura: recibe el calendario, la pared y la hora. La red la pone el route.
 */
import { normalizeGeo } from '@/lib/leads/routing'

/** La misma duración que supone la agenda del sitio (getEffectiveStatus). */
export const DURACION_REMATE_MIN = 180

export interface RemateCalendario {
  consignatariaName: string
  consignatariaSlug: string
  date: string
  time: string | null
  location: string
  province: string
  mainCategory: string
  status: string
}

export interface TransmisionAlAire {
  firma: string
  slug: string
  hora?: string | null
  lugar?: string | null
  watchUrl: string
  enVivoAhora: boolean
}

export interface FilaAhora {
  consignataria: string
  consignataria_slug: string | null
  hora: string | null
  lugar: string
  provincia: string
  categoria: string | null
  ver: string | null
}

export interface RematesAhora {
  al_aire: FilaAhora[]
  en_horario: FilaAhora[]
  mas_tarde: FilaAhora[]
  sin_hora: FilaAhora[]
}

/** Fecha (YYYY-MM-DD), minutos desde medianoche y HH:MM, en hora argentina. */
export function ahoraArgentina(now: Date = new Date()): { fecha: string; minutos: number; hora: string } {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Argentina/Buenos_Aires',
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    })
      .formatToParts(now)
      .map((x) => [x.type, x.value]),
  )
  return {
    fecha: `${p.year}-${p.month}-${p.day}`,
    minutos: Number(p.hour) * 60 + Number(p.minute),
    hora: `${p.hour}:${p.minute}`,
  }
}

/** Minutos desde medianoche, o null si no hay hora ('00:00' es "sin hora" en el scraper). */
function minutos(t: string | null | undefined): number | null {
  if (!t || t === '00:00') return null
  const m = /^(\d{2}):(\d{2})/.exec(t)
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}

function lugarLimpio(location: string, province: string): string {
  const loc = (location || '').trim()
  const prov = (province || '').trim()
  if (!loc) return prov
  if (!prov || loc.toLowerCase().includes(prov.toLowerCase())) return loc
  return `${loc}, ${prov}`
}

export function rematesAhora(opts: {
  remates: RemateCalendario[]
  pared: TransmisionAlAire[]
  hoy: string
  ahoraMin: number
  provincia?: string | null
  /** Slug crudo del scraper → slug canónico de la ficha (la pared usa el canónico). */
  canonico?: (slug: string) => string
  nombre?: (r: RemateCalendario) => string
}): RematesAhora {
  const canon = opts.canonico ?? ((s: string) => s)
  const nombre = opts.nombre ?? ((r: RemateCalendario) => r.consignatariaName)
  const prov = opts.provincia ? normalizeGeo(opts.provincia) : ''
  const enProv = (p: string | null | undefined) => !prov || normalizeGeo(p).includes(prov)

  const deHoy = opts.remates.filter(
    (r) => r.date === opts.hoy && r.status !== 'completed' && r.status !== 'cancelled' && enProv(r.province),
  )
  const fila = (r: RemateCalendario, ver: string | null = null): FilaAhora => ({
    consignataria: nombre(r),
    consignataria_slug: r.consignatariaSlug || null,
    hora: minutos(r.time) === null ? null : r.time,
    lugar: lugarLimpio(r.location, r.province),
    provincia: r.province,
    categoria: r.mainCategory || null,
    ver,
  })

  // AL AIRE: lo que dice la pared. Se busca su remate en el calendario para dar
  // lugar y categoría; si no aparece (la pared filtra igual por hoy), va con lo suyo.
  const alAire: FilaAhora[] = []
  const cubiertos = new Set<string>()
  for (const s of opts.pared) {
    if (!s.enVivoAhora || !enProv(s.lugar)) continue
    const r = deHoy.find((x) => canon(x.consignatariaSlug) === s.slug && (!s.hora || x.time === s.hora))
      ?? deHoy.find((x) => canon(x.consignatariaSlug) === s.slug)
    cubiertos.add(s.slug)
    alAire.push(
      r
        ? { ...fila(r, s.watchUrl), consignataria: s.firma }
        : { consignataria: s.firma, consignataria_slug: s.slug, hora: s.hora ?? null, lugar: s.lugar ?? '', provincia: s.lugar ?? '', categoria: null, ver: s.watchUrl },
    )
  }

  const enHorario: FilaAhora[] = []
  const masTarde: FilaAhora[] = []
  const sinHora: FilaAhora[] = []
  for (const r of deHoy) {
    const inicio = minutos(r.time)
    if (inicio === null) {
      if (!cubiertos.has(canon(r.consignatariaSlug))) sinHora.push(fila(r))
      continue
    }
    if (opts.ahoraMin < inicio) masTarde.push(fila(r))
    else if (opts.ahoraMin < inicio + DURACION_REMATE_MIN && !cubiertos.has(canon(r.consignatariaSlug))) enHorario.push(fila(r))
  }
  const porHora = (a: FilaAhora, b: FilaAhora) => (a.hora ?? '99').localeCompare(b.hora ?? '99')
  return {
    al_aire: alAire.sort(porHora),
    en_horario: enHorario.sort(porHora),
    mas_tarde: masTarde.sort(porHora),
    sin_hora: sinHora,
  }
}
