/**
 * winansi.ts — sanea texto antes de que llegue a un `doc.text()` de jsPDF.
 *
 * POR QUÉ EXISTE
 * jsPDF con las fuentes core (Helvetica) codifica en **WinAnsi**, que no tiene flecha ni
 * comillas tipográficas. La leyenda `"46 → 30 visitas"` se imprimía `"46 ! 30 visitas"` en
 * el PDF que la firma le mostraba a su socio. Los acentos y la ñ sí entran; sólo hay que
 * tocar los caracteres de afuera del juego.
 *
 * Vivía como función privada dentro de `reports/performance.ts`. Se movió acá cuando
 * apareció el segundo generador: **dos saneadores se despegan**, y el síntoma de que se
 * despegaron es un `!` en un PDF que alguien ya pagó.
 *
 * REGLA: toda cadena dinámica que termine en un `doc.text()` pasa por acá. Se aplica en la
 * capa que arma los datos del PDF, no adentro del generador, para que el generador no
 * tenga que conocer la forma interna de los datos.
 *
 * Si agregás copy con un símbolo nuevo, agregalo también acá ANTES de publicar.
 */
export function aWinAnsi(s: string): string {
  return (
    s
      // Flechas — las de los textos de tendencia ("2012 → 2025")
      .replace(/[→⟶➜]/g, 'a')
      .replace(/[←⟵]/g, 'de')
      .replace(/[↑▲]/g, '+')
      .replace(/[↓▼]/g, '-')
      // Rayas y guiones tipográficos
      .replace(/[–—―]/g, '-')
      // Comillas
      .replace(/[“”«»]/g, '"')
      .replace(/[‘’]/g, "'")
      // Puntos suspensivos
      .replace(/…/g, '...')
      // Comparadores y operadores — aparecen en texto de productividad
      // ("≥ 10 UP", "0,74 × 1,5")
      .replace(/≥/g, '>=')
      .replace(/≤/g, '<=')
      .replace(/≠/g, '!=')
      .replace(/≈/g, '~')
      .replace(/×/g, 'x')
      .replace(/÷/g, '/')
      .replace(/[−]/g, '-')
      // Unidades y símbolos que aparecen en fichas de campo
      .replace(/‰/g, ' por mil')
      .replace(/[²]/g, '2')
      .replace(/[³]/g, '3')
      .replace(/[·•]/g, '-')
      .replace(/™/g, '(TM)')
      // Espacios especiales que jsPDF mide mal
      .replace(/[    ]/g, ' ')
  )
}

/**
 * Aplica `aWinAnsi` a todas las cadenas de un objeto o array, en profundidad.
 *
 * Es la forma segura de sanear el payload completo de un PDF de una sola vez, en vez de
 * acordarse campo por campo — que es exactamente como se cuela el `!`.
 */
export function saneaProfundo<T>(valor: T): T {
  if (typeof valor === 'string') return aWinAnsi(valor) as unknown as T
  if (Array.isArray(valor)) return valor.map(saneaProfundo) as unknown as T
  if (valor && typeof valor === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(valor as Record<string, unknown>)) {
      out[k] = saneaProfundo(v)
    }
    return out as T
  }
  return valor
}

/**
 * Los caracteres que WinAnsi no puede representar y que este módulo todavía no traduce.
 * Sirve para tests y para un chequeo previo a publicar copy nuevo.
 */
export function caracteresProblematicos(s: string): string[] {
  const saneado = aWinAnsi(s)
  const fuera = new Set<string>()
  for (const ch of saneado) {
    const code = ch.codePointAt(0)!
    // WinAnsi cubre 0x20-0x7E y 0xA0-0xFF, más un puñado de 0x80-0x9F que jsPDF mapea.
    const entra = (code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff) || ch === '\n'
    if (!entra) fuera.add(ch)
  }
  return [...fuera]
}
