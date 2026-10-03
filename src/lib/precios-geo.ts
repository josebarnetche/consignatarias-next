import rematesData from '@/lib/data/remates.json'
import type { Auction } from '@/lib/db/schema'

/**
 * Configuración de /precios/[categoria]/[provincia]. Vive acá y no en la página para
 * que la página y el sitemap compartan el mismo set de categorías y provincias.
 *
 * Todas las combinaciones se indexan: en GSC rinden mejor que la página nacional
 * (2,35 % de CTR, posición 5,1; 106 de 109 indexadas, sep-2026). Lo que se corrigió
 * es la honestidad: el número es el INMAG nacional y la página lo dice así.
 */

export type CategoriaGeoSlug = 'novillos' | 'novillitos' | 'vaquillonas' | 'vacas' | 'toros' | 'terneros'

export const CATEGORIAS_GEO: Record<CategoriaGeoSlug, { singular: string; title: string; promedioKg: number; remateTypes: string[] }> = {
  novillos: { singular: 'novillo', title: 'Novillo', promedioKg: 430, remateTypes: ['general', 'especial'] },
  novillitos: { singular: 'novillito', title: 'Novillito', promedioKg: 280, remateTypes: ['general', 'invernada'] },
  vaquillonas: { singular: 'vaquillona', title: 'Vaquillona', promedioKg: 320, remateTypes: ['invernada', 'cria', 'especial'] },
  vacas: { singular: 'vaca', title: 'Vaca', promedioKg: 380, remateTypes: ['general', 'especial'] },
  toros: { singular: 'toro', title: 'Toro', promedioKg: 600, remateTypes: ['reproductores', 'especial', 'general'] },
  terneros: { singular: 'ternero', title: 'Ternero', promedioKg: 180, remateTypes: ['invernada', 'cria'] },
}

/* `km` = distancia carretera aproximada de una zona ganadera representativa de la
   provincia al Mercado Agroganadero (Cañuelas). Alimenta el diferencial regional
   estimado. Buenos Aires es el mercado de referencia → km bajo. */
export const PROVINCIAS_GEO: Record<string, { name: string; display: string; km: number }> = {
  'buenos-aires': { name: 'BUENOS AIRES', display: 'Buenos Aires', km: 150 },
  cordoba: { name: 'CORDOBA', display: 'Córdoba', km: 700 },
  'santa-fe': { name: 'SANTA FE', display: 'Santa Fe', km: 480 },
  'entre-rios': { name: 'ENTRE RIOS', display: 'Entre Ríos', km: 475 },
  corrientes: { name: 'CORRIENTES', display: 'Corrientes', km: 1000 },
  'la-pampa': { name: 'LA PAMPA', display: 'La Pampa', km: 610 },
  chaco: { name: 'CHACO', display: 'Chaco', km: 1050 },
  'san-luis': { name: 'SAN LUIS', display: 'San Luis', km: 790 },
  'santiago-del-estero': { name: 'SANTIAGO DEL ESTERO', display: 'Santiago del Estero', km: 1000 },
  formosa: { name: 'FORMOSA', display: 'Formosa', km: 1200 },
  misiones: { name: 'MISIONES', display: 'Misiones', km: 1100 },
  neuquen: { name: 'NEUQUEN', display: 'Neuquén', km: 1170 },
  tucuman: { name: 'TUCUMAN', display: 'Tucumán', km: 1080 },
}

export const CATEGORIAS_GEO_SLUGS = Object.keys(CATEGORIAS_GEO) as CategoriaGeoSlug[]
export const PROVINCIAS_GEO_SLUGS = Object.keys(PROVINCIAS_GEO)

const auctions = rematesData as Auction[]

/** Remates próximos de los tipos que mueven esa categoría, en esa provincia. */
export function proximosRematesGeo(categoria: CategoriaGeoSlug, provincia: string, hoy = new Date().toISOString().slice(0, 10)): Auction[] {
  const cat = CATEGORIAS_GEO[categoria]
  const prov = PROVINCIAS_GEO[provincia]
  if (!cat || !prov) return []
  return auctions
    .filter((a) => a.province === prov.name && cat.remateTypes.includes(a.type) && a.date >= hoy)
    .sort((x, y) => x.date.localeCompare(y.date))
}
