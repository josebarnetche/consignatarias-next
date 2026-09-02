import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const SRC = readFileSync(join(process.cwd(), 'src/components/AnalyticsProvider.tsx'), 'utf8')

/**
 * La clasificación de motores decide si una visita se cuenta como búsqueda o como IA.
 * Equivocarla no rompe nada visible: simplemente hace que el tablero mienta durante
 * meses, y encima en la dirección que uno quiere creer.
 *
 * Pasó: `bing.com` estaba mapeado a 'copilot' y el 6-ago empezó a capturar TODO el
 * tráfico del buscador. En 30 días eso fueron 521 visitas contadas como generativas
 * —el canal se veía 4× más grande de lo que era— y las mismas sesiones migraron de
 * `organic` a `ai` en value_events.
 */
describe('clasificación de motores de IA', () => {
  it('bing.com no cuenta como asistente: es el buscador', () => {
    const linea = SRC.split('\n').find((l) => l.includes("'copilot'") && l.includes('RegExp') === false && l.includes('['))
    expect(linea, 'no encontré la regla de copilot').toBeTruthy()
    expect(linea).not.toContain('bing\.com')
  })

  it('copilot sigue detectándose por su propio dominio', () => {
    expect(SRC).toContain('copilot\.microsoft\.com')
  })

  it('los buscadores no están en la lista de motores generativos', () => {
    // google.com, bing.com y duckduckgo son búsqueda. Si alguno entra acá, el canal
    // de IA se infla con tráfico que no es de asistentes.
    const bloque = SRC.slice(SRC.indexOf('const AI_ENGINES'), SRC.indexOf('const AI_ENGINES') + 1800)
    for (const buscador of ['(^|\.)google\.com$', '(^|\.)bing\.com$', 'duckduckgo']) {
      expect(bloque, `${buscador} no debería estar entre los motores de IA`).not.toContain(buscador)
    }
  })
})
