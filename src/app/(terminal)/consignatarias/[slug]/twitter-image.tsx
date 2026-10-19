// Twitter card = la misma tarjeta OG de marca (src/lib/og/brand.tsx).
// Re-export para mantener una sola fuente de verdad del diseño. La configuración del
// segmento (revalidate / dynamicParams) NO se puede re-exportar: Next la lee de forma
// estática y avisaba en cada build que la ignoraba. Va escrita acá, igual que en
// opengraph-image.tsx.
export { default, alt, size, contentType, generateStaticParams } from './opengraph-image'

export const revalidate = false
export const dynamicParams = true
