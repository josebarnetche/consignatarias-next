/**
 * Serializa un objeto schema.org para un <script type="application/ld+json">.
 *
 * `JSON.stringify` NO escapa `</script>`: un texto con eso cierra el bloque y lo
 * que sigue se ejecuta como HTML. Varios schemas llevan campos que escriben los
 * usuarios (el sitio web, el teléfono o la descripción de un perfil reclamado de
 * frigorífico o consignataria), así que sin este escape era un XSS almacenado.
 *
 * Se escapan `<`, `>`, `&` y los separadores U+2028/U+2029 como secuencias \uXXXX:
 * dentro de un JSON solo pueden aparecer en strings, así que el resultado sigue
 * siendo JSON válido y dice exactamente lo mismo para Google.
 *
 * Todo JSON-LD del sitio pasa por acá (lo controla src/lib/seo/json-ld.test.ts).
 */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}
