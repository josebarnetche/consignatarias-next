/**
 * Rutas de la API que usa el DUEÑO de una ficha desde su panel (18-10-2026): reporte
 * PDF, pre-ofertas, remates, flyer, logo, consultas y videos. Con sesión no cuentan
 * para el límite anónimo del middleware: cada handler exige sesión y dueño.
 */
const RUTA_DUENO = /^\/api\/consignatarias\/[^/]+\/(report|preofertas|auctions|flyer|logo|leads|videos)(\/|$)/

export function esRutaDeDueno(pathname: string): boolean {
  return RUTA_DUENO.test(pathname)
}
