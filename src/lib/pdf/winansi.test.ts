import { describe, it, expect } from 'vitest'
import { aWinAnsi, saneaProfundo, caracteresProblematicos } from './winansi'

describe('aWinAnsi', () => {
  it('traduce la flecha, que era el bug original', () => {
    // "46 → 30 visitas" salía impreso "46 ! 30 visitas".
    expect(aWinAnsi('46 → 30 visitas')).toBe('46 a 30 visitas')
  })

  it('traduce los comparadores del texto de productividad', () => {
    expect(aWinAnsi('≥ 10 UP')).toBe('>= 10 UP')
    expect(aWinAnsi('≤ 0,95')).toBe('<= 0,95')
    expect(aWinAnsi('0,74 × 1,5')).toBe('0,74 x 1,5')
    expect(aWinAnsi('≈ 18 años')).toBe('~ 18 años')
  })

  it('traduce rayas, comillas y puntos suspensivos', () => {
    expect(aWinAnsi('un dato —el mejor— que…')).toBe('un dato -el mejor- que...')
    expect(aWinAnsi('“cría” y ‘recría’')).toBe('"cría" y \'recría\'')
  })

  it('deja intactos los acentos y la ñ, que WinAnsi sí representa', () => {
    const s = 'Curuzú Cuatiá, Mburucuyá, Ñandubay, señal'
    expect(aWinAnsi(s)).toBe(s)
  })

  it('no rompe una cadena que ya está limpia', () => {
    expect(aWinAnsi('Mercedes, Corrientes: 57,3%')).toBe('Mercedes, Corrientes: 57,3%')
    expect(aWinAnsi('')).toBe('')
  })
})

describe('saneaProfundo', () => {
  it('sanea strings anidados en objetos y arrays', () => {
    const entrada = {
      titulo: '2012 → 2025',
      filas: [{ label: '≥ 3 kg', nota: 'un guión — largo' }],
      numero: 42,
      nulo: null,
    }
    expect(saneaProfundo(entrada)).toEqual({
      titulo: '2012 a 2025',
      filas: [{ label: '>= 3 kg', nota: 'un guión - largo' }],
      numero: 42,
      nulo: null,
    })
  })

  it('no altera números, booleanos ni null', () => {
    expect(saneaProfundo(0)).toBe(0)
    expect(saneaProfundo(false)).toBe(false)
    expect(saneaProfundo(null)).toBe(null)
  })
})

describe('caracteresProblematicos', () => {
  it('no reporta nada para texto que el saneador ya cubre', () => {
    expect(caracteresProblematicos('2012 → 2025 · ≥ 10 × 2')).toEqual([])
    expect(caracteresProblematicos('Curuzú Cuatiá, Mburucuyá')).toEqual([])
  })

  it('delata un símbolo nuevo que todavía no está traducido', () => {
    // Sirve como chequeo antes de publicar copy nuevo: si esto devuelve algo,
    // ese carácter va a salir como "!" en el PDF que alguien pagó.
    expect(caracteresProblematicos('₿ 100')).toEqual(['₿'])
  })
})
