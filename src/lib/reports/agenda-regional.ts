/**
 * agenda-regional.ts — el producto para las casas que NO operan en Cañuelas.
 *
 * POR QUÉ EXISTE
 * Los bloques del MAG (cartera, benchmark, participación) sirven para 22 firmas.
 * **Las otras 109 no rematan en Cañuelas** y para ellas el panel no tenía nada: ni
 * leads (hay uno solo en todo el sitio), ni dato transaccional.
 *
 * Pero sí hay un dato que ninguna de ellas tiene y nosotros sí: **el calendario
 * completo de su provincia**. Una casa conoce sus propias fechas; no conoce las de
 * las otras veinticuatro que rematan en Corrientes. Y en este negocio la fecha es una
 * decisión cara: si el remate cae el mismo día que el de otra casa fuerte de la zona,
 * se parte la clientela y bajan los precios.
 *
 * Ejemplo real del calendario al 24-ago-2026: Reggi remata el 27 en Monte Caseros y
 * ese mismo día hay tres remates más en Corrientes —Aguerre, Madelán y Duhalde, los
 * tres en Mercedes—. Eso es lo que el panel le tiene que decir antes de que fije la
 * próxima fecha.
 *
 * LO QUE NO HACE
 * No dice quién le compró a quién ni a qué precio: eso no existe fuera del MAG. Todo
 * lo de acá sale del calendario público de remates, y el módulo es explícito sobre
 * ese límite en vez de rellenar con métricas que suenan bien.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { getAuctionsForProfile } from '@/lib/data/consignataria-slugs'

export interface Auction {
  consignatariaSlug?: string
  consignatariaName?: string
  date?: string
  time?: string | null
  location?: string | null
  province?: string | null
  type?: string | null
  estimatedHeads?: number | null
  status?: string | null
}

export interface DiaCompartido {
  fecha: string
  /** Mi remate de ese día. */
  miRemate: { titulo: string; localidad: string | null }
  /** Los de otras casas, el mismo día y provincia. */
  otros: Array<{ firma: string; localidad: string | null; cabezas: number | null }>
}

export interface VentanaLibre {
  fecha: string
  /** Días de distancia respecto del remate propio más cercano. */
  diasDesdeElMio: number
}

export interface CompetidorZona {
  slug: string
  nombre: string
  remates: number
  cabezas: number
  /** Cuota sobre las cabezas ofrecidas en la provincia. */
  cuotaOferta: number
  esMia: boolean
}

export interface AgendaRegional {
  slug: string
  provincia: string
  /** Ventana analizada hacia adelante, en días. */
  dias: number
  misRemates: number
  rematesProvincia: number
  /** Cabezas ofrecidas por mí / por la provincia, cuando el calendario las declara. */
  misCabezas: number
  cabezasProvincia: number
  cuotaOferta: number
  /** Fechas donde mi remate coincide con otro de la zona. */
  diasCompartidos: DiaCompartido[]
  /** Días sin ningún remate en la provincia, cerca de los míos. */
  ventanasLibres: VentanaLibre[]
  competidores: CompetidorZona[]
  /** Categorías que se rematan en la zona y yo no estoy cubriendo. */
  categoriasSinCubrir: string[]
}

const DIA = 86_400_000
const iso = (d: Date) => d.toISOString().slice(0, 10)

function norm(s: string | null | undefined): string {
  return (s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .trim()
}

/**
 * La agenda de la provincia de una firma, mirando hacia adelante.
 *
 * `remates` es el calendario completo (`remates.json`); se filtra acá para no obligar
 * al llamador a conocer la forma del dato.
 *
 * Devuelve null si la firma no tiene provincia declarada o si no hay actividad en su
 * zona — decirlo así es mejor que mostrar una agenda vacía.
 */
export async function getAgendaRegional(
  db: SupabaseClient | null,
  slug: string,
  remates: Auction[],
  dias = 45,
): Promise<AgendaRegional | null> {
  if (!db) return null
  try {
    const { data } = await db
      .from('consignatarias')
      .select('province, display_name')
      .eq('canonical_slug', slug)
      .maybeSingle()
    const provincia = (data as { province: string | null } | null)?.province
    if (!provincia) return null

    const hoy = iso(new Date())
    const hasta = iso(new Date(Date.now() + dias * DIA))
    const provNorm = norm(provincia)

    const enZona = remates.filter(
      (r) =>
        r.date &&
        r.date >= hoy &&
        r.date <= hasta &&
        r.status !== 'cancelled' &&
        norm(r.province) === provNorm,
    )
    if (enZona.length === 0) return null

    // OJO CON EL SLUG. El scrape emite variantes para la misma casa —Reggi aparece
    // como `reggi`, `reggi-y-cia` y `reggi-y-cia-s-r-l`—, así que comparar por
    // igualdad se come dos tercios de sus remates y la firma ve "0 remates tuyos"
    // en una semana en la que tiene tres. `getAuctionsForProfile` resuelve el grupo.
    const misSlugs = new Set(
      (getAuctionsForProfile(remates as never[], slug) as Auction[])
        .map((r) => r.consignatariaSlug)
        .filter(Boolean) as string[],
    )
    misSlugs.add(slug)
    const esMio = (r: Auction) => !!r.consignatariaSlug && misSlugs.has(r.consignatariaSlug)

    const mios = enZona.filter(esMio)

    // Días donde mi remate comparte fecha con otra casa de la zona.
    const diasCompartidos: DiaCompartido[] = []
    for (const mio of mios) {
      const otros = enZona.filter((r) => r.date === mio.date && !esMio(r))
      if (otros.length === 0) continue
      diasCompartidos.push({
        fecha: mio.date!,
        miRemate: { titulo: mio.type ?? 'remate', localidad: mio.location ?? null },
        otros: otros.map((o) => ({
          firma: o.consignatariaName ?? o.consignatariaSlug ?? 'otra casa',
          localidad: o.location ?? null,
          cabezas: o.estimatedHeads ?? null,
        })),
      })
    }

    // Días sin NINGÚN remate en la provincia, dentro de los 21 días siguientes al
    // primero mío. Sirve para elegir fecha; más allá de tres semanas deja de ser
    // una decisión y pasa a ser especulación.
    const ocupados = new Set(enZona.map((r) => r.date!))
    const ventanasLibres: VentanaLibre[] = []
    if (mios.length > 0) {
      const refe = Date.parse([...mios].sort((a, b) => a.date!.localeCompare(b.date!))[0].date!)
      for (let i = 1; i <= 21; i++) {
        const f = iso(new Date(refe + i * DIA))
        if (f > hasta) break
        if (!ocupados.has(f)) ventanasLibres.push({ fecha: f, diasDesdeElMio: i })
      }
    }

    // Competidores por cabezas ofrecidas.
    // Se agrupa por NOMBRE normalizado y no por slug, por lo mismo: las variantes
    // partirían a una casa en tres competidores distintos.
    const porFirma = new Map<string, { nombre: string; remates: number; cabezas: number; mia: boolean }>()
    for (const r of enZona) {
      const clave = norm(r.consignatariaName) || (r.consignatariaSlug ?? 'sin-slug')
      const prev = porFirma.get(clave) ?? {
        nombre: r.consignatariaName ?? clave,
        remates: 0,
        cabezas: 0,
        mia: false,
      }
      prev.remates++
      prev.cabezas += r.estimatedHeads ?? 0
      prev.mia = prev.mia || esMio(r)
      porFirma.set(clave, prev)
    }
    const cabezasProvincia = [...porFirma.values()].reduce((a, f) => a + f.cabezas, 0)
    const misCabezas = [...porFirma.values()].filter((f) => f.mia).reduce((a, f) => a + f.cabezas, 0)

    const competidores: CompetidorZona[] = [...porFirma.entries()]
      .map(([clave, f]) => ({
        slug: clave,
        nombre: f.nombre,
        remates: f.remates,
        cabezas: f.cabezas,
        cuotaOferta:
          cabezasProvincia > 0 ? Number(((f.cabezas / cabezasProvincia) * 100).toFixed(1)) : 0,
        esMia: f.mia,
      }))
      // Por REMATES primero: las cabezas las declara menos de un tercio del
      // calendario, así que ordenar por ellas deja arriba a quien las cargó, no a
      // quien más opera.
      .sort((a, b) => b.remates - a.remates || b.cabezas - a.cabezas)
      .slice(0, 10)

    // Categorías que la zona remata y yo no.
    const catsZona = new Set(enZona.map((r) => (r.type ?? '').toLowerCase()).filter(Boolean))
    const catsMias = new Set(mios.map((r) => (r.type ?? '').toLowerCase()).filter(Boolean))
    const categoriasSinCubrir = [...catsZona].filter(
      (c) => !catsMias.has(c) && c !== 'general',
    )

    return {
      slug,
      provincia,
      dias,
      misRemates: mios.length,
      rematesProvincia: enZona.length,
      misCabezas,
      cabezasProvincia,
      cuotaOferta:
        cabezasProvincia > 0 ? Number(((misCabezas / cabezasProvincia) * 100).toFixed(1)) : 0,
      diasCompartidos: diasCompartidos.sort((a, b) => a.fecha.localeCompare(b.fecha)),
      ventanasLibres: ventanasLibres.slice(0, 5),
      competidores,
      categoriasSinCubrir,
    }
  } catch (e) {
    console.error('[agenda-regional] falló:', e)
    return null
  }
}
