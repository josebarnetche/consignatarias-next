import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  arrendamientoIndexUrl,
  fetchArrendamientoMonthClose,
  parseArrendamientoTotales,
  parseNumAr,
} from './arrendamiento-index'

// HTML reales de haciinfo000013 bajados el 28-11-2026 (ISO-8859-1).
const fixture = (name: string) => readFileSync(resolve(__dirname, '__fixtures__', name), 'latin1')
const OCT = fixture('haciinfo000013-2026-10.html')
const NOV_PARCIAL = fixture('haciinfo000013-2026-11-parcial.html')

describe('parseArrendamientoTotales', () => {
  it('octubre 2026: índice arrendamiento 4.186,564 sobre 80.045 cab (no el INMAG 4.122,039)', () => {
    const r = parseArrendamientoTotales(OCT)
    expect(r).toEqual({ index: 4186.564, cabezas: 80045, importe: 131340085900 })
    expect(r?.index).not.toBe(4122.039)
  })

  it('noviembre 2026 parcial (1–27/11): 4.165,759 sobre 78.480 cab', () => {
    expect(parseArrendamientoTotales(NOV_PARCIAL)).toEqual({ index: 4165.759, cabezas: 78480, importe: 124578105250 })
  })

  it('sin fila Totales → null', () => {
    expect(parseArrendamientoTotales('<table><tr><td>Lu 02/11/2026</td><td>1.000</td></tr></table>')).toBeNull()
    expect(parseArrendamientoTotales('')).toBeNull()
  })

  it('Totales sin índice calculado ("- *") → null', () => {
    const html = '<TR><TD><B>&nbsp;Totales</B></TD><TD>73</TD><TD></TD><TD>- *</TD><TD></TD></TR>'
    expect(parseArrendamientoTotales(html)).toBeNull()
  })

  it('ignora las filas diarias aunque tengan índice', () => {
    const html =
      '<TR><TD>Vi&nbsp;30/10/2026</TD><TD>3.791</TD><TD>6.159.036.000,00</TD><TD>4.151,250</TD></TR>' +
      '<TR><TD><B>Totales</B></TD><TD><B>10</B></TD><TD><B>1.000,00</B></TD><TD><B>4.000,500</B></TD></TR>'
    expect(parseArrendamientoTotales(html)?.index).toBe(4000.5)
  })
})

describe('helpers', () => {
  it('parseNumAr', () => {
    expect(parseNumAr('4.186,564')).toBe(4186.564)
    expect(parseNumAr('80.045')).toBe(80045)
  })

  it('arrendamientoIndexUrl pide el mes completo', () => {
    expect(arrendamientoIndexUrl(2026, 10)).toBe(
      'https://www.mercadoagroganadero.com.ar/dll/hacienda2.dll/haciinfo000013?txtFECHAINI=01%2F10%2F2026&txtFECHAFIN=31%2F10%2F2026',
    )
    expect(arrendamientoIndexUrl(2028, 2)).toContain('txtFECHAFIN=29%2F02%2F2028')
  })
})

describe('fetchArrendamientoMonthClose', () => {
  it('decodifica ISO-8859-1 y parsea', async () => {
    const body = readFileSync(resolve(__dirname, '__fixtures__', 'haciinfo000013-2026-10.html'))
    const f = vi.fn(async () => new Response(body, { status: 200 }))
    const r = await fetchArrendamientoMonthClose(2026, 10, f as unknown as typeof fetch)
    expect(r?.index).toBe(4186.564)
    expect(f).toHaveBeenCalledOnce()
  })

  it('HTTP no-ok → null (el llamador no cae al INMAG)', async () => {
    const f = vi.fn(async () => new Response('err', { status: 503 }))
    expect(await fetchArrendamientoMonthClose(2026, 10, f as unknown as typeof fetch)).toBeNull()
  })
})
