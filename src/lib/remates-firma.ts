/**
 * Validaciones de lo que la firma carga en un remate desde su panel (18-10-2026).
 * Compartidas por las rutas de alta y edición; sin dependencias de servidor para que
 * el formulario pueda usar las mismas reglas.
 */

/** Vacío vale (el campo es opcional); si viene, tiene que ser un enlace https. */
export function urlValida(v: unknown): boolean {
  if (v == null || v === '') return true
  if (typeof v !== 'string' || v.length > 1000) return false
  try {
    return new URL(v).protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * El flyer se muestra como imagen en la ficha pública del remate, así que sólo se
 * acepta uno subido por la ruta del panel: nuestro bucket y la carpeta de ESA firma.
 * Una URL cualquiera sería una imagen de terceros servida desde nuestras páginas.
 */
export function flyerValido(v: unknown, slug: string): boolean {
  if (v == null || v === '') return true
  if (typeof v !== 'string' || !urlValida(v)) return false
  return v.includes(`/storage/v1/object/public/consignataria-assets/flyers/${slug}/`)
}
