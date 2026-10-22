/**
 * Qué contestar cuando una provincia no tiene remates programados.
 *
 * El único consumidor real del MCP pide `list_remates {provincia: "Misiones"}`
 * todos los días hábiles y recibió 477 veces "No hay remates próximos" en 28
 * días: Misiones no tiene remates en el calendario. Una respuesta muerta no le
 * sirve a nadie. Ahora devuelve los de la región (el NEA, en ese caso) y la
 * salida para quien busca hacienda: dejar el pedido.
 */
import { regionDe, lugarGenerico } from '@/lib/mercado/geo-ar'
import { normalizeGeo } from '@/lib/leads/routing'

export interface RemateMin {
  date: string
  status: string
  province: string
}

export function rematesDeLaRegion<R extends RemateMin>(
  provinciaPedida: string,
  remates: R[],
  hoy: string,
  limite: number,
): { region: string | null; nombreRegion: string; remates: R[] } {
  // La provincia llega como subcadena ("misiones", "Bs As"): se resuelve contra
  // las provincias que el calendario conoce o, si no está, contra la tabla de regiones.
  const pedida = normalizeGeo(provinciaPedida)
  // Una provincia en blanco no es una provincia: sin esto, "  " se resolvía a la
  // región del primer remate del archivo.
  if (!pedida) return { region: null, nombreRegion: 'otra zona', remates: [] }
  const region = regionDe(pedida) ?? regionDe(remates.find((r) => normalizeGeo(r.province).includes(pedida))?.province)
  if (!region) return { region: null, nombreRegion: 'otra zona', remates: [] }
  const out = remates
    .filter((r) => r.status === 'scheduled' && r.date >= hoy && regionDe(r.province) === region)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, limite)
  return { region, nombreRegion: lugarGenerico(pedida), remates: out }
}

/** La línea que invita a dejar el pedido. Es servicio, no oferta: el pedido es gratis. */
export function sugerenciaPedido(provincia: string): string {
  return (
    `¿Buscás hacienda en ${provincia}? Con cattle_buying_request (alias quiero_comprar) ` +
    `queda registrado el pedido —categoría, cabezas, provincia y un email— y avisamos ` +
    `cuando aparece un remate o un lote que encaje. Es gratis.`
  )
}
