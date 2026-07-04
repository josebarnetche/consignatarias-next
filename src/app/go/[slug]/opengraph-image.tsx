// /go/[slug] es la landing-redirect del perfil de consignataria: usa la MISMA
// tarjeta OG de marca que /consignatarias/[slug] (src/lib/og/brand.tsx), con
// params estáticos propios (solo slugs canónicos).
import { getAllCanonicalSlugs } from '@/lib/data/consignataria-slugs'

export { default, alt, size, contentType } from '@/app/(terminal)/consignatarias/[slug]/opengraph-image'

export const revalidate = false
export const dynamicParams = false

export function generateStaticParams() {
  return getAllCanonicalSlugs().map(slug => ({ slug }))
}
