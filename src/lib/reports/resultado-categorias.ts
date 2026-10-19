/**
 * resultado-categorias.ts — las categorías que ofrece el formulario de resultados.
 *
 * Vive aparte de `vr.ts` a propósito (17-10-2026): el formulario es un componente de
 * cliente y `vr.ts` arrastra `vr-bandas.json` entero al bundle. Acá van sólo los slugs
 * y las etiquetas. Que no se desincronicen con `SLUGS_CONOCIDOS` lo cuida un test
 * (`resultado-vs-mercado.test.ts`).
 *
 * Ternero y ternera van en la lista aunque el VR no tenga banda para ellos: son el
 * grueso de lo que se vende en un remate del interior y la firma tiene que poder
 * cargarlos. La comparación los muestra "sin referencia" y dice por qué.
 */

export interface CategoriaResultado {
  /** Slug que se guarda en `category_results[].categoria_vr`. */
  slug: string
  /** Lo que ve la firma en el desplegable y lo que se guarda en `category`. */
  etiqueta: string
}

export const CATEGORIAS_RESULTADO: readonly CategoriaResultado[] = [
  { slug: 'novillo', etiqueta: 'Novillo' },
  { slug: 'novillito', etiqueta: 'Novillito' },
  { slug: 'vaquillona', etiqueta: 'Vaquillona' },
  { slug: 'vaca', etiqueta: 'Vaca' },
  { slug: 'toro', etiqueta: 'Toro' },
  { slug: 'mej', etiqueta: 'MEJ (macho entero joven)' },
  { slug: 'ternero', etiqueta: 'Ternero' },
  { slug: 'ternera', etiqueta: 'Ternera' },
] as const

export const SLUGS_CATEGORIA_RESULTADO = CATEGORIAS_RESULTADO.map((c) => c.slug)

/** Slugs que el formulario ofrece pero que el VR no mide por lote (el MAG no los opera). */
export const SLUGS_SIN_VR = ['ternero', 'ternera'] as const

export function etiquetaCategoria(slug: string): string | null {
  return CATEGORIAS_RESULTADO.find((c) => c.slug === slug)?.etiqueta ?? null
}
