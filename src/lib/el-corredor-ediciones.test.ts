import { describe, expect, it } from 'vitest'
import {
  citaDeEdicion,
  fechaLarga,
  limpiarHecho,
  listarEdiciones,
  mensajeWhatsApp,
  normalizarPiezas,
  recortar,
  slugDeYm,
  vecinas,
  ymDeSlug,
  type ManifestCorredor,
} from './el-corredor-ediciones'
import manifestReal from '../../public/el-corredor/manifest.json'
import respaldoReal from './data/el-corredor-hechos.json'
import { buildReport } from './seo/schemas'

const manifest: ManifestCorredor = {
  current: {
    ym: '2026-10',
    edition_label: 'Octubre · 2026',
    month_slug: 'octubre-2026',
    pdf_path: '/el-corredor/octubre-2026.pdf',
    cover_path: '/el-corredor/cover-octubre-2026.png',
    og_path: '/el-corredor/og-octubre-2026.png',
    published_at: '2026-11-01T20:54:13.530314Z',
  },
  history: [
    { ym: '2026-10', pdf_path: '/el-corredor/octubre-2026.pdf', published_at: '2026-11-01T20:54:13Z' },
    { ym: '2026-09', pdf_path: '/el-corredor/septiembre-2026.pdf', published_at: '2026-10-05T05:02:42Z' },
    { ym: '2026-04', pdf_path: '/el-corredor/abril-2026.pdf', published_at: '2026-05-10T09:15:57Z' },
  ],
}

describe('slugs de edición', () => {
  it('ida y vuelta entre ym y slug', () => {
    expect(slugDeYm('2026-10')).toBe('octubre-2026')
    expect(slugDeYm('2027-01')).toBe('enero-2027')
    expect(ymDeSlug('octubre-2026')).toBe('2026-10')
    expect(ymDeSlug('septiembre-2026')).toBe('2026-09')
  })
  it('rechaza lo que no es una edición', () => {
    expect(slugDeYm('2026-13')).toBeNull()
    expect(slugDeYm('202610')).toBeNull()
    expect(ymDeSlug('octubre')).toBeNull()
    expect(ymDeSlug('brumario-2026')).toBeNull()
    expect(ymDeSlug('../manifest')).toBeNull()
  })
})

describe('limpiarHecho', () => {
  it('saca etiquetas HTML del generador', () => {
    expect(limpiarHecho('cerró en <span class="fuerte">$4.010</span> por kilo')).toBe('cerró en $4.010 por kilo')
  })
  it('saca el doble signo y el % de los puntos porcentuales', () => {
    expect(limpiarHecho('bajó -1,1% contra el mes')).toBe('bajó 1,1% contra el mes')
    expect(limpiarHecho('subió +26,8% en doce meses')).toBe('subió 26,8% en doce meses')
    expect(limpiarHecho('ganó +19,5% interanual')).toBe('ganó 19,5% interanual')
    expect(limpiarHecho('+0,8% pp contra el mes anterior')).toBe('+0,8 pp contra el mes anterior')
    expect(limpiarHecho('-3,4% pp')).toBe('-3,4 pp')
  })
  it('no toca un signo que no está duplicado', () => {
    expect(limpiarHecho('variación +1,3% en el mes')).toBe('variación +1,3% en el mes')
  })
})

describe('normalizarPiezas', () => {
  it('acepta el formato documentado', () => {
    const p = normalizarPiezas([
      { tipo: 'ig', ruta: '/el-corredor/ig-octubre-2026-1.png', titulo: ' 4 números ' },
      { tipo: 'estado', ruta: '/el-corredor/estado-octubre-2026-1.png', titulo: 'Semáforo', texto: 'línea' },
    ])
    expect(p).toEqual([
      { tipo: 'ig', ruta: '/el-corredor/ig-octubre-2026-1.png', titulo: '4 números' },
      { tipo: 'estado', ruta: '/el-corredor/estado-octubre-2026-1.png', titulo: 'Semáforo', texto: 'línea' },
    ])
  })
  it('descarta tipos desconocidos, rutas fuera de /el-corredor y piezas sin título', () => {
    expect(
      normalizarPiezas([
        { tipo: 'tiktok', ruta: '/el-corredor/x.png', titulo: 'x' },
        { tipo: 'ig', ruta: '/marca/x.png', titulo: 'x' },
        { tipo: 'ig', ruta: '/el-corredor/../secreto.png', titulo: 'x' },
        { tipo: 'ig', ruta: 'javascript:alert(1)', titulo: 'x' },
        { tipo: 'ig', ruta: '/el-corredor/x.png', titulo: '' },
        null,
        'texto',
      ]),
    ).toEqual([])
  })
  it('sin piezas en el manifest devuelve lista vacía', () => {
    expect(normalizarPiezas(undefined)).toEqual([])
  })
})

describe('listarEdiciones', () => {
  const respaldo = { ediciones: { '2026-09': { hechos: ['Hecho de septiembre <b>uno</b>.'], faltantes: ['SIO Carnes'] } } }
  const ed = listarEdiciones(manifest, respaldo, (r) => r.includes('septiembre'))

  it('una edición por mes, de la más nueva a la más vieja, sin duplicar current', () => {
    expect(ed.map((e) => e.ym)).toEqual(['2026-10', '2026-09', '2026-04'])
  })
  it('marca la vigente y completa con los campos de current', () => {
    expect(ed[0].esVigente).toBe(true)
    expect(ed[0].coverPath).toBe('/el-corredor/cover-octubre-2026.png')
    expect(ed[0].path).toBe('/el-corredor/octubre-2026')
    expect(ed[0].numero).toBe('10/2026')
    expect(ed[0].titulo).toBe('Octubre 2026')
  })
  it('deriva tapa y OG de las viejas solo si el archivo existe', () => {
    expect(ed[1].coverPath).toBe('/el-corredor/cover-septiembre-2026.png')
    expect(ed[2].coverPath).toBeNull()
    expect(ed[2].ogPath).toBeNull()
  })
  it('toma los hechos del respaldo cuando el manifest no los trae', () => {
    expect(ed[1].hechos).toEqual(['Hecho de septiembre uno.'])
    expect(ed[1].faltantes).toEqual(['SIO Carnes'])
    expect(ed[2].hechos).toEqual([])
  })
  it('los hechos del manifest mandan sobre el respaldo', () => {
    const m: ManifestCorredor = { ...manifest, current: { ...manifest.current, ym: '2026-09', pdf_path: '/el-corredor/septiembre-2026.pdf', hechos: ['Del manifest.'] } }
    const e = listarEdiciones(m, respaldo).find((x) => x.ym === '2026-09')!
    expect(e.hechos).toEqual(['Del manifest.'])
  })
  it('descarta ítems con ym o pdf inválidos', () => {
    const m: ManifestCorredor = {
      current: manifest.current,
      history: [
        { ym: 'basura', pdf_path: '/el-corredor/x.pdf' },
        { ym: '2026-08', pdf_path: 'https://otro.sitio/x.pdf' },
      ],
    }
    expect(listarEdiciones(m).map((e) => e.ym)).toEqual(['2026-10'])
  })
  it('arma la cita con la URL de la edición, o usa la del manifest', () => {
    expect(ed[0].cita).toBe(
      'El Corredor, edición 10/2026 (Octubre 2026). Mesa de mercado de consignatarias.com.ar. https://www.consignatarias.com.ar/el-corredor/octubre-2026',
    )
    const m: ManifestCorredor = { ...manifest, current: { ...manifest.current, cita: 'Cita fija.' } }
    expect(listarEdiciones(m)[0].cita).toBe('Cita fija.')
  })
})

describe('vecinas', () => {
  const ed = listarEdiciones(manifest)
  it('anterior es la más vieja, siguiente la más nueva', () => {
    expect(vecinas(ed, '2026-09').anterior?.ym).toBe('2026-04')
    expect(vecinas(ed, '2026-09').siguiente?.ym).toBe('2026-10')
    expect(vecinas(ed, '2026-10').siguiente).toBeNull()
    expect(vecinas(ed, '2026-04').anterior).toBeNull()
  })
})

describe('mensajes y textos', () => {
  const e = { titulo: 'Octubre 2026', hechos: ['El Índice Novillo cerró en $4.010.'], url: 'https://x/el-corredor/octubre-2026' }
  it('el mensaje de WhatsApp lleva el dato y el link', () => {
    expect(mensajeWhatsApp(e)).toBe('El Corredor · Octubre 2026\n\nEl Índice Novillo cerró en $4.010.\n\nhttps://x/el-corredor/octubre-2026')
    expect(mensajeWhatsApp(e, { tipo: 'estado', ruta: '/el-corredor/a.png', titulo: 'Semáforo', texto: 'Hembras 60,9%' })).toContain('Hembras 60,9%')
  })
  it('citaDeEdicion', () => {
    expect(citaDeEdicion({ titulo: 'Octubre 2026', numero: '10/2026', url: 'U' })).toContain('edición 10/2026')
  })
  it('recortar corta en palabra', () => {
    expect(recortar('uno dos tres cuatro', 10)).toBe('uno dos…')
    expect(recortar('corto', 10)).toBe('corto')
  })
  it('fechaLarga en hora argentina', () => {
    expect(fechaLarga('2026-11-01T20:54:13Z')).toBe('1 de noviembre de 2026')
    expect(fechaLarga('2026-11-01T02:00:00Z')).toBe('31 de octubre de 2026')
    expect(fechaLarga(null)).toBeNull()
    expect(fechaLarga('no-fecha')).toBeNull()
  })
})

describe('archivo real (manifest + respaldo del repo)', () => {
  const ed = listarEdiciones(manifestReal as ManifestCorredor, respaldoReal)
  it('cada edición del manifest tiene página y la vigente es la de current', () => {
    expect(ed.length).toBe(new Set((manifestReal.history ?? []).map((h) => h.ym).concat(manifestReal.current.ym)).size)
    expect(ed[0].ym).toBe(manifestReal.current.ym)
  })
  it('las ediciones con respaldo tienen cinco hechos sin HTML ni doble signo', () => {
    for (const ym of Object.keys(respaldoReal.ediciones)) {
      const e = ed.find((x) => x.ym === ym)
      expect(e, ym).toBeDefined()
      expect(e!.hechos).toHaveLength(5)
      for (const h of e!.hechos) {
        expect(h).not.toMatch(/<|bajó -|subió \+|% pp/)
      }
    }
  })
})

describe('buildReport', () => {
  it('Report con PDF, serie, número y hechos como abstract', () => {
    const r = buildReport({
      name: 'El Corredor — Octubre 2026',
      description: 'd',
      url: 'https://www.consignatarias.com.ar/el-corredor/octubre-2026',
      reportNumber: '10/2026',
      datePublished: '2026-11-01T20:54:13Z',
      pdfUrl: 'https://www.consignatarias.com.ar/el-corredor/octubre-2026.pdf',
      serie: { name: 'El Corredor', url: 'https://www.consignatarias.com.ar/el-corredor' },
      hechos: ['Uno.', 'Dos.'],
      temporalCoverage: '2026-10',
    })
    expect(r['@type']).toBe('Report')
    expect(r.reportNumber).toBe('10/2026')
    expect(r.encoding).toEqual({ '@type': 'MediaObject', contentUrl: 'https://www.consignatarias.com.ar/el-corredor/octubre-2026.pdf', encodingFormat: 'application/pdf' })
    expect(r.isPartOf['@type']).toBe('Periodical')
    expect(r.abstract).toBe('Uno. Dos.')
    expect(r.author).toEqual({ '@id': 'https://www.consignatarias.com.ar/#org' })
    expect('image' in r).toBe(false)
  })
})
