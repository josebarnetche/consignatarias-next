// Twitter card = la misma tarjeta OG de marca (src/lib/og/brand.tsx).
// Re-export para mantener una sola fuente de verdad del diseño.
export {
  default,
  alt,
  size,
  contentType,
  generateStaticParams,
  revalidate,
  dynamicParams,
} from './opengraph-image'
