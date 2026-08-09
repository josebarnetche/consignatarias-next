/**
 * INMOBILIARIA RURAL — campos ofrecidos en arrendamiento o venta.
 *
 * La diferencia con cualquier portal inmobiliario: el arrendamiento se publica en
 * KG DE NOVILLO POR HECTÁREA POR MES —como se pacta y se liquida, con el promedio
 * del mes anterior— y nosotros lo pasamos a plata. Un portal dice "consultar".
 *
 * La matemática vive en `valuacion-campos.ts`; acá quedan tipos y formato.
 *
 * El contacto del oferente NUNCA se publica: las consultas entran como lead y las
 * conecta Jose (misma regla que El Ovejero — la relación no se regala).
 */

export const OPERACIONES = ['arrendamiento', 'venta', 'ambos'] as const
export const APTITUDES = ['ganadera', 'agricola', 'mixta', 'forestal'] as const
export type Operacion = (typeof OPERACIONES)[number]
export type Aptitud = (typeof APTITUDES)[number]

export const APTITUD_LABEL: Record<Aptitud, string> = {
  ganadera: 'Ganadera',
  agricola: 'Agrícola',
  mixta: 'Mixta',
  forestal: 'Forestal',
}

export interface Campo {
  id: number
  slug: string | null
  operacion: Operacion
  hectareas: number
  provincia: string
  partido: string | null
  aptitud: Aptitud | null
  titulo: string | null
  descripcion: string | null
  mejoras: string | null
  precio_kg_ha_mes: number | null
  precio_usd_ha: number | null
  capacidad_cabezas: number | null
  destacado: boolean
  status: string
  created_at: string
  published_at: string | null
}

export function precioVenta(hectareas: number, usdHa: number) {
  return { totalUsd: hectareas * usdHa, usdHa }
}

export const fmtArs = (n: number) => '$' + Math.round(n).toLocaleString('es-AR')
export const fmtUsd = (n: number) => 'US$' + Math.round(n).toLocaleString('es-AR')
export const fmtHa = (n: number) =>
  `${Number(n).toLocaleString('es-AR', { maximumFractionDigits: 0 })} ha`

/** Slug estable y legible: sirve de URL y de título si no cargaron uno. */
export function slugCampo(c: { id: number; provincia: string; partido: string | null; hectareas: number; operacion: string }): string {
  const limpiar = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  const partes = [
    c.operacion === 'venta' ? 'campo-en-venta' : 'campo-en-arrendamiento',
    Math.round(c.hectareas) + '-ha',
    limpiar(c.partido || c.provincia),
    String(c.id),
  ]
  return partes.filter(Boolean).join('-')
}

export function tituloCampo(c: Campo): string {
  if (c.titulo) return c.titulo
  const dónde = c.partido ? `${c.partido}, ${c.provincia}` : c.provincia
  const qué = c.operacion === 'venta' ? 'en venta' : c.operacion === 'ambos' ? 'en venta o arrendamiento' : 'en arrendamiento'
  return `Campo ${qué} — ${fmtHa(c.hectareas)} en ${dónde}`
}

/** Carga estimada si no la declararon: 0,8 EV/ha ganadera, 0,5 mixta. Es orientativo. */
export function capacidadEstimada(c: Pick<Campo, 'hectareas' | 'aptitud' | 'capacidad_cabezas'>): { cabezas: number; estimada: boolean } | null {
  if (c.capacidad_cabezas) return { cabezas: c.capacidad_cabezas, estimada: false }
  if (c.aptitud === 'ganadera') return { cabezas: Math.round(c.hectareas * 0.8), estimada: true }
  if (c.aptitud === 'mixta') return { cabezas: Math.round(c.hectareas * 0.5), estimada: true }
  return null
}
