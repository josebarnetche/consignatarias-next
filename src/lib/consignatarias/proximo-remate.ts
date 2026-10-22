import type { Auction } from '@/lib/db/schema'
import { nombrePropio } from '@/lib/ui/tokens'

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

// Sólo los tipos que le dicen algo al productor; "general"/"especial" no agregan nada al snippet.
const TIPO_SNIPPET: Partial<Record<Auction['type'], string>> = {
  invernada: 'invernada',
  cria: 'cría',
  reproductores: 'reproductores',
}

/**
 * El próximo remate de una firma, listo para el title/description de su ficha:
 * fecha ("28 de octubre"), la localidad tal como la publica el cronograma y el tipo.
 * Sólo remates programados (o en vivo) de hoy en adelante; null si no hay ninguno —
 * nunca una fecha inventada.
 */
export function proximoRemateMeta(
  remates: Pick<Auction, 'date' | 'status' | 'location' | 'type'>[],
  hoy: string = new Date().toISOString().slice(0, 10),
): { fecha: string; lugar: string; tipo: string } | null {
  const r = remates
    .filter((a) => a.date >= hoy && (a.status === 'scheduled' || a.status === 'live'))
    .sort((a, b) => a.date.localeCompare(b.date))[0]
  if (!r) return null
  const [, m, d] = r.date.split('-').map(Number)
  if (!m || !d || m < 1 || m > 12) return null
  const lugar = nombrePropio((r.location || '').split(',')[0].trim().replace(/\.+$/, ''))
  return { fecha: `${d} de ${MESES[m - 1]}`, lugar, tipo: TIPO_SNIPPET[r.type] ?? '' }
}
