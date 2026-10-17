/**
 * Lo que PRO Consignataria le da a la firma, en la versión corta que usa el panel
 * (bienvenida post-pago y pestaña "Mi plan").
 *
 * Cada línea se verificó contra el código el 17-10-2026. Si una promesa deja de ser
 * cierta, se saca de acá; si se agrega una, primero tiene que existir.
 *  - sello y primer lugar: getFeaturedSlugs (directorio, provincias, muro, calendario,
 *    fichas de remate y el directorio del servidor MCP).
 *  - newsletter: weekly-newsletter pone primero los remates PRO y registra los envíos
 *    (promotion_campaigns → bloque "A cuántos les llegó").
 *  - leads con contacto: dashboard/page.tsx borra teléfono y email si no es PRO.
 *  - quién te mira: lib/reports/origen-visitas.ts.
 *  - Cañuelas: lib/reports/{cartera,benchmark,participacion,territorio}.ts, sólo si la
 *    firma opera en el MAG.
 *  - widget: panel PRO; landing /go con logo, sello y formulario de consulta.
 */
export const BENEFICIOS_PRO_CONSIGNATARIA = [
  'Sello ★ PRO y primer lugar en el directorio, las provincias y el muro de la portada',
  'Tus remates resaltados en el calendario y en sus fichas',
  'Tus remates primero en el newsletter semanal, con el registro de a cuántos les llegó',
  'Primera en el directorio que consultan los asistentes de IA',
  'Los productores que te consultan, con nombre y contacto',
  'Quién mira tu perfil: cuándo y desde dónde (Google, el calendario, una IA)',
  'Si operás en Cañuelas: tu cartera, tu precio y tu cuota contra las 22 casas',
  'Widget de remates para tu web y tu landing con QR, logo y formulario',
] as const
