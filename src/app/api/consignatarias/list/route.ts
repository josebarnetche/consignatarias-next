import { NextRequest, NextResponse } from 'next/server'
import { getAllProfiles } from '@/lib/data/consignataria-slugs'
import { createServiceClient } from '@/lib/supabase'

export const revalidate = 3600

/**
 * Lista de consignatarias (slug + nombre) para los droplists del panel.
 *
 * Sin parámetros devuelve TODAS las del registro, tengan remates o no — el ranking
 * sólo trae las que tienen, así que las demás quedaban afuera y no se podían elegir.
 *
 * Con `?mag=1` devuelve **sólo las que operan en el Mercado Agroganadero**. Lo usa el
 * panel de Intel de mercado, y no es un detalle cosmético: el intel se calcula sobre
 * `mag_consignataria_sales_lots`, que existe para 22 firmas de 130. Ofreciendo la
 * lista completa, seguir a una casa del interior devolvía una fila vacía para
 * siempre, sin explicación — parecía que el producto estaba roto cuando en realidad
 * ese dato no existe fuera de Cañuelas.
 *
 * Mismo shape en los dos casos ({ data: [{ slug, nombre }] }) para el parser del panel.
 */
export async function GET(req: NextRequest) {
  const soloMag = req.nextUrl.searchParams.get('mag') === '1'
  const perfiles = getAllProfiles()

  if (!soloMag) {
    const data = perfiles
      .map((p) => ({ slug: p.canonicalSlug, nombre: p.displayName }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    return NextResponse.json({ success: true, data })
  }

  const db = createServiceClient()
  if (!db) return NextResponse.json({ success: true, data: [] })

  // El padrón del MAG arrastra 64 casas, pero **sólo 22 tienen slug canónico
  // asignado**, y son exactamente las que operan: el resto son razones sociales
  // históricas sin actividad. Así que el mapeo ya es el filtro, y alcanza con una
  // consulta al padrón.
  //
  // NO escanear `mag_consignataria_sales_lots` para deducirlo: PostgREST corta en
  // 1.000 filas y `.limit(20000)` no lo cambia, así que el set salía armado con los
  // primeros mil lotes y devolvía 2 firmas de 22 — sin fallar ni avisar.
  const { data: mapeadas } = await db
    .from('mag_consignatarias')
    .select('consignataria_canonical_slug')
    .eq('active', true)
    .not('consignataria_canonical_slug', 'is', null)

  const slugsMag = ((mapeadas ?? []) as { consignataria_canonical_slug: string }[])
    .map((m) => m.consignataria_canonical_slug)

  // El nombre sale de la TABLA, no del registro canónico.
  //
  // Nueve de las 22 casas del MAG —Brandemann, Crespo y Rodríguez, Casa Massola…—
  // tienen fila pero no perfil canónico (el lío de slugs con sufijo societario). Si
  // se filtra contra `getAllProfiles()` quedan 13, y la lista de competencia se come
  // a la séptima casa por volumen sin decir por qué. Sus páginas sí resuelven
  // (verificado: 200), así que el enlace funciona igual.
  const nombrePorSlug = new Map(perfiles.map((p) => [p.canonicalSlug, p.displayName]))
  const faltantes = slugsMag.filter((s) => !nombrePorSlug.has(s))

  if (faltantes.length > 0) {
    const { data: filas } = await db
      .from('consignatarias')
      .select('canonical_slug, display_name')
      .in('canonical_slug', faltantes)
    for (const f of (filas ?? []) as { canonical_slug: string; display_name: string }[]) {
      nombrePorSlug.set(f.canonical_slug, f.display_name)
    }
  }

  const data = slugsMag
    .filter((s) => nombrePorSlug.has(s))
    .map((s) => ({ slug: s, nombre: nombrePorSlug.get(s)! }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

  return NextResponse.json({ success: true, data })
}
