/**
 * EL menú del sitio — una sola fuente para la portada, el terminal (escritorio) y el
 * teléfono (revisión de navegabilidad del 17-10-2026).
 *
 * Antes había tres menús distintos: la portada con 7 enlaces propios, el terminal con
 * 7 desplegables (~45 destinos) y la tira del teléfono con 14 accesos, cada uno con su
 * criterio. Ahora los tres leen de acá, con seis grupos por modelo mental:
 *   Precios · Vender y comprar · Remates · Directorio · Campos · Para empresas
 * Las guías, el glosario y El Corredor van en el footer. Si se agrega una sección
 * importante, va acá y aparece en los tres lugares a la vez.
 */

export type NavTagKind = 'live' | 'pro' | 'core' | 'new'

export interface NavLeaf {
  label: string
  href: string
  /** Bajada corta en el desplegable. */
  hint?: string
  tag?: NavTagKind
}

export interface NavGroup {
  label: string
  /** Ruta base para marcar el grupo activo. */
  match: string
  /** Adónde lleva el grupo cuando no hay desplegable (tira del teléfono). */
  href: string
  items: NavLeaf[]
}

export function buildNavGroups(totales: { plantas: number; firmas: number }): NavGroup[] {
  return [
    {
      label: 'Precios',
      match: '/mercado',
      href: '/vr',
      items: [
        { label: 'Precio por categoría y peso', href: '/vr', hint: 'Lo que se pagó de verdad, hoy', tag: 'new' },
        { label: 'INMAG hoy', href: '/mercado/inmag', hint: 'Precio de referencia', tag: 'live' },
        { label: 'Pulso del mercado', href: '/mercado/pulso', hint: 'Cañuelas por firma, en vivo', tag: 'live' },
        { label: 'Precios hoy', href: '/precios', hint: 'Hacienda en pie' },
        { label: 'Categorías', href: '/mercado', hint: 'Terneros, novillos, vacas' },
        { label: 'INMAG en USD', href: '/mercado/inmag-dolares', hint: 'Serie dolarizada' },
        { label: 'Novillo 20 años', href: '/mercado/novillo-historico', hint: '2006→hoy · USD oficial y blue' },
        { label: 'Maíz / Novillo', href: '/mercado/spread', hint: 'Relación de canje' },
        { label: 'Índice de Liquidación', href: '/mercado/liquidacion', hint: '% hembras · liquidación vs retención' },
        { label: 'Productividad por zona', href: '/productividad', hint: 'El rodeo de cada partido' },
        { label: 'Internacional', href: '/mercado/internacional', hint: 'Chicago (CME) USD/kg' },
        { label: 'Metodología', href: '/metodologia/vr', hint: 'Cómo se calcula y qué no dice' },
      ],
    },
    {
      label: 'Vender y comprar',
      match: '/valuar-hacienda',
      href: '/valuar-hacienda',
      items: [
        { label: 'Cuánto vale mi hacienda', href: '/valuar-hacienda', hint: 'Con lo que se vendió, por categoría y peso' },
        { label: 'Mi Ganado', href: '/mi-ganado', hint: 'Tu rodeo valuado · gratis con tu cuenta' },
        { label: '¿Vendo ahora?', href: '/mercado/vender-ahora', hint: 'Tu lote contra los últimos 365 días' },
        { label: 'Calculadora de neto', href: '/calculadora', hint: 'Lo que te queda en mano' },
        { label: 'Lotes en venta', href: '/lotes', hint: 'Hacienda publicada, con la banda observada' },
        // Pre-ofertas salió del menú el 17-10-2026: fue un piloto operado a mano que
        // cerró el 16-07 y la página dice "No hay pre-ofertas abiertas". La URL sigue viva.
        { label: 'Quiero comprar', href: '/quiero-comprar', hint: 'Decinos qué buscás y te avisamos' },
        { label: 'Comparar firmas', href: '/comparar', hint: 'Quién remata más seguido' },
        { label: 'Sanidad / SENASA', href: '/sanidad', hint: 'Vacunación y requisitos para mover hacienda' },
        { label: 'Validar RENSPA', href: '/renspa', hint: 'Decodificá el código de tu establecimiento' },
      ],
    },
    {
      label: 'Remates',
      match: '/remates',
      href: '/remates',
      items: [
        { label: 'Calendario', href: '/remates', hint: 'Todos los remates' },
        { label: 'Hoy', href: '/remates/hoy' },
        { label: 'Esta semana', href: '/remates/semana' },
        { label: 'En vivo', href: '/remates/en-vivo', tag: 'live' },
        { label: 'Anteriores', href: '/remates/anteriores', hint: 'Resultados de los que ya pasaron' },
        { label: 'Exportar al calendario', href: '/calendario-exportar', hint: 'Google, Outlook o Apple' },
      ],
    },
    {
      label: 'Directorio',
      match: '/consignatarias',
      href: '/consignatarias',
      items: [
        { label: 'Consignatarias', href: '/consignatarias', hint: `${totales.firmas} firmas` },
        { label: 'Frigoríficos', href: '/frigorificos', hint: `${totales.plantas.toLocaleString('es-AR')} plantas habilitadas por SENASA` },
        { label: 'Proveedores', href: '/proveedores', hint: 'Quién le vende a la industria' },
        { label: 'Inmobiliarias rurales', href: '/inmobiliarias-rurales', hint: 'Quién vende y arrienda campos' },
      ],
    },
    {
      label: 'Campos',
      match: '/campos',
      href: '/campos/valuar',
      items: [
        { label: '¿Cuánto vale mi campo?', href: '/campos/valuar', hint: 'Tasador · 15 provincias y 52 zonas' },
        { label: 'Índice de arrendamiento', href: '/mercado/arrendamiento', hint: 'Kg de novillo por hectárea' },
        { label: 'Campos ofrecidos', href: '/campos', hint: 'En arrendamiento y en venta' },
        { label: 'Publicar un campo', href: '/campos/publicar', hint: 'Gratis · tu contacto no se publica' },
      ],
    },
    {
      label: 'Para empresas',
      match: '/para-empresas',
      href: '/para-empresas',
      items: [
        { label: 'Para empresas', href: '/para-empresas', hint: 'Firmas, datos y uso institucional' },
        { label: 'PRO Consignataria', href: '/para-consignatarias', hint: 'Tu firma y tus remates, primero', tag: 'pro' },
        { label: 'Datos por API', href: '/enterprise', hint: 'Precios, lotes y series' },
        { label: 'Servidor MCP', href: '/mcp', hint: 'El dato del mercado para agentes de IA' },
        { label: 'Informes por zona', href: '/informes', hint: 'El dato de tu zona, en PDF' },
        { label: 'Licencia de datos', href: '/licencia-datos', hint: 'Cómo citar y redistribuir' },
        { label: 'Planes y precios', href: '/planes' },
      ],
    },
  ]
}

export function matchPath(pathname: string, href: string): boolean {
  if (href === '/overview' || href === '/') return pathname === href
  return pathname === href || pathname.startsWith(href + '/')
}

/** Un grupo está activo si coincide su base o alguno de sus destinos. */
export function isGroupActive(pathname: string, group: NavGroup): boolean {
  if (matchPath(pathname, group.match)) return true
  return group.items.some((it) => matchPath(pathname, it.href))
}
