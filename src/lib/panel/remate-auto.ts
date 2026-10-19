/**
 * Lo que el panel calcula solo al cargar un remate (19-10-2026): la firma pone fecha
 * y lugar, y el resto —cuántos días faltan, en qué mail semanal sale, cómo se llama
 * si no le puso nombre— se deriva. Usuario nuevo: que no tenga que pensar nada.
 */

const DIA = 86_400_000

const aFecha = (iso: string) => new Date(iso + 'T12:00:00Z')
const aIso = (d: Date) => d.toISOString().slice(0, 10)
const sumar = (iso: string, dias: number) => aIso(new Date(aFecha(iso).getTime() + dias * DIA))

/** Días entre hoy y la fecha del remate (0 = hoy). Fechas YYYY-MM-DD de Argentina. */
export function diasHasta(fecha: string, hoy: string): number {
  return Math.round((aFecha(fecha).getTime() - aFecha(hoy).getTime()) / DIA)
}

/** Lunes igual o posterior a la fecha. */
function lunesDesde(iso: string): string {
  const dow = aFecha(iso).getUTCDay() // 0 = domingo
  return sumar(iso, (8 - dow) % 7)
}

/**
 * El lunes cuyo mail semanal lleva el remate, o null si ya no llega a ninguno.
 *
 * El envío de los lunes 10:00 ART toma los remates de ese día a 7 días adelante
 * (`api/cron/weekly-newsletter`). Si hoy es lunes y ya pasaron las 10, el de hoy salió.
 */
export function lunesDelMail(fecha: string, hoy: string, horaAr: number): string | null {
  const esLunes = aFecha(hoy).getUTCDay() === 1
  const proximo = esLunes && horaAr < 10 ? hoy : lunesDesde(sumar(hoy, 1))
  if (fecha < proximo) return null
  const porFecha = lunesDesde(sumar(fecha, -7))
  return porFecha > proximo ? porFecha : proximo
}

const TIPO_TITULO: Record<string, string> = {
  invernada: 'de invernada',
  cria: 'de cría',
  reproductores: 'de reproductores',
  especial: 'especial',
}

/** Nombre del remate si la firma no le pone uno: "Remate de invernada en Mercedes". */
export function tituloSugerido({ type, location, date }: { type: string; location: string; date: string }): string {
  const tipo = TIPO_TITULO[type]
  const lugar = location.trim()
  if (lugar) return ['Remate', tipo, `en ${lugar}`].filter(Boolean).join(' ')
  if (date) {
    const dia = aFecha(date).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', timeZone: 'UTC' })
    return ['Remate', tipo, `del ${dia}`].filter(Boolean).join(' ')
  }
  return ''
}

const plano = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase()

/** "EA. Aguay, CORRIENTES" → "EA. Aguay": la web de la firma suele pegar la provincia al lugar. */
export function sinProvincia(lugar: string, provincia: string | null | undefined): string {
  const t = lugar.trim()
  if (!provincia) return t
  const i = t.lastIndexOf(',')
  return i > 0 && plano(t.slice(i + 1)) === plano(provincia) ? t.slice(0, i).trim() : t
}

/** Lugares donde la firma ya remató, sin repetir, con su provincia: un toque y listo. */
export function lugaresHabituales(remates: { location: string | null; province: string | null | undefined }[], max = 4) {
  const vistos = new Map<string, { location: string; province: string | null; veces: number }>()
  for (const r of remates) {
    const lugar = sinProvincia(r.location ?? '', r.province)
    if (!lugar) continue
    const k = lugar.toLowerCase()
    const prev = vistos.get(k)
    if (prev) {
      prev.veces++
      if (!prev.province && r.province) prev.province = r.province
    } else vistos.set(k, { location: lugar, province: r.province ?? null, veces: 1 })
  }
  return [...vistos.values()].sort((a, b) => b.veces - a.veces).slice(0, max)
}
