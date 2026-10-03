/**
 * Familias de public/marca/ que tienen variante del tema claro (X.ext → X-claro.ext),
 * generadas por scripts/marca-variantes-claro.sh. Si se agrega una imagen de marca
 * nueva, correr el script y, si es de una familia nueva, sumarla acá.
 */
const CON_VARIANTE =
  /^\/marca\/(?:(?:iconos|iconos-color|glifos|glifos-color|ai|ilus|patterns|educativas|renders|features)\/[^/]+|feat-mcp|hero-pampa(?:-mobile)?|rel-alambrado|martillazo)\.(?:png|jpg|webp|svg)$/

/** "/marca/ilus/ilu-pampa.jpg" → "/marca/ilus/ilu-pampa-claro.jpg"; null si no tiene variante. */
export function srcClaro(src: string | undefined | null): string | null {
  if (!src || !CON_VARIANTE.test(src)) return null
  return src.replace(/(\.[a-z]+)$/, '-claro$1')
}
