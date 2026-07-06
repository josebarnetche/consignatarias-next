import { NextResponse } from 'next/server'
import { getAllProfiles } from '@/lib/data/consignataria-slugs'

export const revalidate = 3600

/**
 * Lista COMPLETA de consignatarias (slug + nombre), tengan remates o no. La usa el
 * droplist del panel de intel/pulso: el ranking solo trae firmas con remates, así
 * que las que no tienen quedaban afuera y no se podían seguir. Ordenada por nombre.
 * Mismo shape que /ranking ({ data: [{ slug, nombre }] }) para el parser del panel.
 */
export async function GET() {
  const data = getAllProfiles()
    .map((p) => ({ slug: p.canonicalSlug, nombre: p.displayName }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  return NextResponse.json({ success: true, data })
}
