import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import {
  ORG_ID,
  FUENTE_MAG,
  LICENCIA_PROPIA,
  buildBreadcrumbList,
  buildDataset,
  buildRemateEvent,
  buildRematesItemList,
  buildRemateVideo,
  finDelAnioSiguiente,
  hoyART,
  remateAddress,
  remateEndDate,
  remateStartDate,
  youtubeVideoId,
} from './schemas'

const REMATE = {
  title: 'UMC HV — Remate Feria',
  consignatariaName: 'UMC SA - Haciendas Villaguay SRL',
  consignatariaSlug: 'umc-haciendas-villaguay',
  date: '2026-01-09',
  time: '14:00',
  location: 'Villaguay, Entre Rios',
  province: 'ENTRE RIOS',
  type: 'general',
  estimatedHeads: null,
  description: 'Remate feria UMC Haciendas Villaguay',
  youtubeUrl: null,
}

describe('fechas de remate', () => {
  it('startDate con -03:00, y solo la fecha si no hay hora', () => {
    expect(remateStartDate('2026-10-03', '14:30')).toBe('2026-10-03T14:30:00-03:00')
    expect(remateStartDate('2026-10-03', null)).toBe('2026-10-03')
    expect(remateStartDate('2026-10-03', 'a confirmar')).toBe('2026-10-03')
  })

  it('endDate con aritmética de fecha: conserva minutos y cruza la medianoche', () => {
    expect(remateEndDate('2026-10-03', '14:30')).toBe('2026-10-03T18:30:00-03:00')
    // Antes daba "T24:00", inválido.
    expect(remateEndDate('2026-10-03', '20:00')).toBe('2026-10-04T00:00:00-03:00')
    expect(remateEndDate('2026-10-03', null)).toBe('2026-10-03')
  })

  it('hoyART usa UTC-3', () => {
    expect(hoyART(new Date('2026-10-04T02:00:00Z'))).toBe('2026-10-03')
    expect(hoyART(new Date('2026-10-04T03:00:00Z'))).toBe('2026-10-04')
  })

  it('priceValidUntil = fin del año siguiente (nunca vence solo)', () => {
    expect(finDelAnioSiguiente(new Date('2026-10-03T12:00:00Z'))).toBe('2027-12-31')
  })
})

describe('remateAddress', () => {
  it('separa ciudad y provincia legible', () => {
    expect(remateAddress('Villaguay, Entre Rios', 'ENTRE RIOS')).toEqual({
      '@type': 'PostalAddress',
      addressLocality: 'Villaguay',
      addressRegion: 'Entre Ríos',
      addressCountry: 'AR',
    })
  })

  it('no serializa campos vacíos (antes ", Buenos Aires, Argentina")', () => {
    expect(remateAddress('', 'BUENOS AIRES')).toEqual({
      '@type': 'PostalAddress',
      addressRegion: 'Buenos Aires',
      addressCountry: 'AR',
    })
    expect(remateAddress(null, '')).toEqual({ '@type': 'PostalAddress', addressCountry: 'AR' })
  })
})

describe('buildRemateEvent', () => {
  it('URL de la ficha, presencial, organizer con url, imagen', () => {
    const ev = buildRemateEvent(REMATE, { organizerUrl: 'https://www.consignatarias.com.ar/consignatarias/umc' })
    expect(ev.url).toBe('https://www.consignatarias.com.ar/remates/umc-haciendas-villaguay-general-entre-rios-2026-01-09')
    expect(ev.eventAttendanceMode).toBe('https://schema.org/OfflineEventAttendanceMode')
    expect(ev.location).toMatchObject({ '@type': 'Place', name: 'Villaguay' })
    expect(ev.organizer).toEqual({
      '@type': 'Organization',
      name: REMATE.consignatariaName,
      url: 'https://www.consignatarias.com.ar/consignatarias/umc',
    })
    expect(ev.image).toEqual(['https://www.consignatarias.com.ar/og-remates.png'])
    expect(ev.startDate).toBe('2026-01-09T14:00:00-03:00')
    expect(ev.endDate).toBe('2026-01-09T18:00:00-03:00')
  })

  it('con transmisión: modo mixto con VirtualLocation', () => {
    const ev = buildRemateEvent({ ...REMATE, youtubeUrl: 'https://www.youtube.com/watch?v=4Tr-Z4mopzY' })
    expect(ev.eventAttendanceMode).toBe('https://schema.org/MixedEventAttendanceMode')
    expect(Array.isArray(ev.location)).toBe(true)
    expect((ev.location as unknown[])[1]).toEqual({
      '@type': 'VirtualLocation',
      url: 'https://www.youtube.com/watch?v=4Tr-Z4mopzY',
    })
  })

  it('url: null → sin url (remate sin ficha)', () => {
    expect('url' in buildRemateEvent(REMATE, { url: null })).toBe(false)
  })

  it('sin provincia ni localidad: Place.name "Argentina", sin campos vacíos', () => {
    const ev = buildRemateEvent({ ...REMATE, location: '', province: '' })
    expect(ev.location).toEqual({
      '@type': 'Place',
      name: 'Argentina',
      address: { '@type': 'PostalAddress', addressCountry: 'AR' },
    })
  })
})

describe('buildRematesItemList', () => {
  it('numberOfItems = los emitidos, no el total', () => {
    const remates = Array.from({ length: 25 }, (_, i) => ({ remate: { ...REMATE, date: `2026-01-${String(i + 1).padStart(2, '0')}` } }))
    const list = buildRematesItemList(remates, { name: 'Próximos remates' })
    expect(list.numberOfItems).toBe(10)
    expect(list.itemListElement).toHaveLength(10)
    expect(list.name).toBe('Próximos remates')
  })
})

describe('buildRemateVideo', () => {
  const base = { name: 'Remate', description: 'd', youtubeUrl: 'https://youtu.be/4Tr-Z4mopzY', date: '2026-10-03', time: '14:00' }

  it('sin contentUrl ni duration; embed + hqdefault', () => {
    const v = buildRemateVideo({ ...base, now: new Date('2026-10-20T12:00:00Z') })!
    expect(v).not.toHaveProperty('contentUrl')
    expect(v).not.toHaveProperty('duration')
    expect(v.embedUrl).toBe('https://www.youtube.com/embed/4Tr-Z4mopzY')
    expect(v.thumbnailUrl).toBe('https://img.youtube.com/vi/4Tr-Z4mopzY/hqdefault.jpg')
    expect(v).not.toHaveProperty('publication')
  })

  it('uploadDate nunca en el futuro', () => {
    const v = buildRemateVideo({ ...base, date: '2026-12-01', now: new Date('2026-10-03T12:00:00Z') })!
    expect(v.uploadDate).toBe('2026-10-03')
  })

  it('isLiveBroadcast solo el día y en horario', () => {
    const enVivo = buildRemateVideo({ ...base, now: new Date('2026-10-03T18:00:00Z') })! // 15:00 ART
    expect(enVivo.publication).toMatchObject({ isLiveBroadcast: true })
    const antes = buildRemateVideo({ ...base, now: new Date('2026-10-03T12:00:00Z') })! // 09:00 ART
    expect(antes).not.toHaveProperty('publication')
    const futuro = buildRemateVideo({ ...base, date: '2026-10-10', now: new Date('2026-10-03T18:00:00Z') })!
    expect(futuro).not.toHaveProperty('publication')
  })

  it('un canal no es un video → null', () => {
    expect(buildRemateVideo({ ...base, youtubeUrl: 'https://www.youtube.com/@umc/streams' })).toBeNull()
    expect(youtubeVideoId('https://www.youtube.com/live/4Tr-Z4mopzY?si=x')).toBe('4Tr-Z4mopzY')
  })
})

describe('buildBreadcrumbList', () => {
  it('el último nivel puede ir sin item (antes caía a la home)', () => {
    const b = buildBreadcrumbList([{ name: 'Inicio', url: 'https://www.consignatarias.com.ar' }, { name: 'INMAG' }])
    expect(b.itemListElement[1]).toEqual({ '@type': 'ListItem', position: 2, name: 'INMAG' })
  })
})

describe('buildDataset', () => {
  it('serie ajena: sin license, el MAG como creator/sourceOrganization/isBasedOn', () => {
    const d = buildDataset({ name: 'INMAG', description: 'x', url: 'u', license: null, fuente: FUENTE_MAG })
    expect(d).not.toHaveProperty('license')
    expect(d).toMatchObject({
      creator: { name: FUENTE_MAG.name },
      sourceOrganization: { name: FUENTE_MAG.name },
      isBasedOn: FUENTE_MAG.url,
      publisher: { '@id': ORG_ID },
    })
  })

  it('compilación propia: licencia de /licencia-datos, creator = la org por @id', () => {
    const d = buildDataset({ name: 'Calendario', description: 'x', url: 'u', license: LICENCIA_PROPIA })
    expect(d.license).toBe(LICENCIA_PROPIA)
    expect(d.creator).toEqual({ '@id': ORG_ID })
  })

  it('sin dateModified explícito no inventa la fecha del build', () => {
    const d = buildDataset({ name: 'n', description: 'x', url: 'u', license: null })
    expect(d).not.toHaveProperty('dateModified')
  })

  it('spatialCoverage por provincia', () => {
    const d = buildDataset({ name: 'n', description: 'x', url: 'u', license: null, spatialCoverage: 'Córdoba' })
    expect(d.spatialCoverage).toEqual({ '@type': 'Place', name: 'Córdoba' })
  })
})

/* ------------------------------------------------------------------ */
/*  Guardas sobre el código de las páginas                              */
/* ------------------------------------------------------------------ */

const APP = join(__dirname, '../../app')
function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    return statSync(p).isDirectory() ? archivos(p) : /\.tsx?$/.test(n) ? [p] : []
  })
}

describe('guardas de datos estructurados', () => {
  const fuentes = archivos(APP).map((p) => [p, readFileSync(p, 'utf8')] as const)

  it('ninguna página usa QAPage (es para foros con respuestas de usuarios)', () => {
    const malos = fuentes.filter(([, s]) => /<QAPageSchema|'@type': 'QAPage'/.test(s))
    expect(malos.map(([p]) => p)).toEqual([])
  })

  it('ningún Product/Offer sobre precios de hacienda (seller MAG)', () => {
    // El sitio no vende hacienda: un Product con el MAG como seller/brand es markup engañoso.
    const malos = fuentes.filter(([, s]) => /'@type': 'Product'/.test(s) && /(seller|brand):\s*\{[^}]*Mercado Agroganadero/.test(s))
    expect(malos.map(([p]) => p)).toEqual([])
  })

  it('toda página con FAQPageSchema muestra las preguntas (FaqList o .map del mismo array)', () => {
    // remates/page.tsx y consignatarias/page.tsx los resuelve el frente de contenido
    // (otro PR de la misma auditoría).
    const PENDIENTES = ['remates/page.tsx', 'consignatarias/page.tsx']
    const malos: string[] = []
    for (const [p, s] of fuentes) {
      const rel = p.slice(p.indexOf('/app/') + 5).replace('(terminal)/', '')
      if (PENDIENTES.includes(rel)) continue
      for (const m of s.matchAll(/<FAQPageSchema\s+items=\{([A-Za-z_][\w]*)/g)) {
        const id = m[1]
        const visible = new RegExp(`<FaqList\\s+items=\\{${id}\\}`).test(s) || new RegExp(`\\b${id}(\\.\\w+)*\\.map\\(\\(?\\w+`).test(s.replace(m[0], ''))
        if (!visible) malos.push(`${rel} (${id})`)
      }
    }
    expect(malos).toEqual([])
  })
})
