/**
 * Slug de la ficha de un remate (/remates/[slug]): firma-tipo-provincia-fecha.
 *
 * Única fuente de la fórmula. La usan la ficha (generateStaticParams), los
 * listados que enlazan a la ficha, los Event de schema.org y las notificaciones
 * (src/lib/demanda.ts), donde además es la CLAVE ESTABLE: los `id` numéricos de
 * remates.json se reasignan en cada scrape. No cambiar la fórmula: rompe las URLs
 * indexadas y re-dispara avisos ya enviados.
 */
export interface RemateSlugInput {
  consignatariaSlug?: string | null
  type?: string | null
  province?: string | null
  date: string
}

export function remateSlug(r: RemateSlugInput): string {
  return [
    r.consignatariaSlug || 'remate',
    r.type || 'general',
    r.province?.toLowerCase().replace(/\s+/g, '-') || 'argentina',
    r.date,
  ].join('-')
}

/** Ruta relativa de la ficha: `/remates/{slug}`. */
export function rematePath(r: RemateSlugInput): string {
  return `/remates/${remateSlug(r)}`
}
