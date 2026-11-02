import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { buildNavGroups, esEnlaceDirecto } from '@/lib/nav'
import { FOOTER_COLUMNS } from '@/components/SiteFooter'
import { GUIAS } from '@/lib/data/guias'

/**
 * Arquitectura de información (v1.255.1): las páginas que competían entre sí por la misma
 * búsqueda —cada una con su canonical— se fusionaron en UNA sobreviviente por familia, y
 * las demás son 301 en vercel.json. Este test cuida que la fusión no se deshaga sola:
 *
 * - la ruta vieja no vuelve a tener page.tsx (si vuelve, le gana al redirect y otra vez
 *   hay dos páginas para la misma pregunta);
 * - la sobreviviente existe y no es, a su vez, origen de otro redirect (sin cadenas);
 * - nada del sitio enlaza a la ruta vieja ni la lista el sitemap (un 301 en el enlazado
 *   interno gasta crawl y diluye la señal);
 * - el menú y el footer únicos no apuntan a lo que se sacó.
 */

const ROOT = process.cwd()
const APP = join(ROOT, 'src', 'app')

/** Familia → sobreviviente. Es la tabla del PR; si cambia una, cambia acá. */
const FUSIONES: Record<string, string> = {
  '/el-novillo-en-dolares': '/mercado/novillo-historico',
  '/mercado/inmag-dolares': '/mercado/novillo-historico',
  '/relacion-maiz-novillo': '/mercado/spread',
  '/reporte-semanal': '/informes/parte-semanal',
  '/vender-hacienda-guia': '/como-vender-hacienda',
  '/sanidad': '/calendario-sanitario-bovino',
  '/upgrade': '/planes',
}

interface Redirect {
  source: string
  destination: string
  permanent?: boolean
  statusCode?: number
  has?: unknown
}
const vercel = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8')) as { redirects: Redirect[] }

/** Todas las rutas estáticas con page.tsx (los grupos `(x)` no cuentan en la URL). */
function rutasConPagina(dir = APP): Set<string> {
  const out = new Set<string>()
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      const full = join(d, name)
      if (statSync(full).isDirectory()) walk(full)
      else if (name === 'page.tsx') {
        const segs = relative(APP, d)
          .split(sep)
          .filter((s) => s && !(s.startsWith('(') && s.endsWith(')')))
        out.add('/' + segs.join('/'))
      }
    }
  }
  walk(dir)
  return out
}
const RUTAS = rutasConPagina()
const sinAncla = (href: string) => href.split('#')[0].split('?')[0] || '/'

function archivosFuente(dir: string): string[] {
  const out: string[] = []
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      const full = join(d, name)
      if (statSync(full).isDirectory()) walk(full)
      else if (/\.(tsx?|mjs)$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(full)
    }
  }
  walk(dir)
  return out
}

describe('fusiones de la v1.255.1', () => {
  it.each(Object.entries(FUSIONES))('%s → %s es un 301 en vercel.json', (vieja, sobreviviente) => {
    const r = vercel.redirects.find((x) => x.source === vieja)
    expect(r, `falta el redirect de ${vieja}`).toBeDefined()
    expect(r!.destination).toBe(sobreviviente)
    expect(r!.statusCode, `${vieja} tiene que ser 301, no 307/308`).toBe(301)
  })

  it.each(Object.entries(FUSIONES))('%s ya no tiene página y %s sí', (vieja, sobreviviente) => {
    expect(RUTAS.has(vieja), `${vieja} volvió a tener page.tsx: le gana al redirect`).toBe(false)
    expect(RUTAS.has(sobreviviente), `la sobreviviente ${sobreviviente} no tiene page.tsx`).toBe(true)
  })

  it('ningún redirect apunta a otro redirect (sin cadenas)', () => {
    const origenes = new Set(vercel.redirects.filter((r) => !r.has).map((r) => r.source))
    for (const r of vercel.redirects) {
      if (r.destination.startsWith('http')) continue
      expect(origenes.has(sinAncla(r.destination)), `${r.source} → ${r.destination} encadena`).toBe(false)
    }
  })

  it('el sitemap no lista ninguna ruta vieja', () => {
    const src = readFileSync(join(APP, 'sitemap.ts'), 'utf8')
    for (const vieja of Object.keys(FUSIONES)) {
      expect(src.includes(`${vieja}\``) || src.includes(`'${vieja}'`), `sitemap.ts todavía lista ${vieja}`).toBe(false)
    }
  })

  it('nada en src enlaza a una ruta vieja', () => {
    const hallazgos: string[] = []
    for (const f of archivosFuente(join(ROOT, 'src'))) {
      const src = readFileSync(f, 'utf8')
      for (const vieja of Object.keys(FUSIONES)) {
        // Un enlace es la ruta entre comillas (sola, con ancla o con query), no una mención en un comentario.
        const re = new RegExp(`["'\`]${vieja.replace(/\//g, '\\/')}(["'\`#?]|$)`)
        if (re.test(src)) hallazgos.push(`${relative(ROOT, f)} → ${vieja}`)
      }
    }
    expect(hallazgos).toEqual([])
  })
})

describe('menú único (lib/nav)', () => {
  const grupos = buildNavGroups({ plantas: 1, firmas: 1 })

  it('Banda Consignatarias es la segunda entrada de Precios', () => {
    const precios = grupos.find((g) => g.label === 'Precios')!
    expect(precios.items[1]).toMatchObject({ label: 'Banda Consignatarias', href: '/banda' })
  })

  it('El Corredor es un enlace directo de nivel superior a una página que existe', () => {
    const corredor = grupos.find((g) => g.label === 'El Corredor')!
    expect(corredor).toBeDefined()
    expect(esEnlaceDirecto(corredor)).toBe(true)
    expect(RUTAS.has(corredor.href)).toBe(true)
  })

  it('ningún destino del menú es una ruta vieja', () => {
    const hrefs = grupos.flatMap((g) => [g.href, ...g.items.map((i) => i.href)]).map(sinAncla)
    for (const vieja of Object.keys(FUSIONES)) expect(hrefs).not.toContain(vieja)
  })
})

describe('footer único (components/SiteFooter)', () => {
  const links = FOOTER_COLUMNS.flatMap((c) => c.groups.flatMap((g) => g.links))
  const internos = links.map((l) => l.href).filter((h) => h.startsWith('/'))

  it('lo usan el terminal y la portada, y no queda otro footer', () => {
    const layout = readFileSync(join(APP, '(terminal)', 'layout.tsx'), 'utf8')
    const portada = readFileSync(join(APP, 'page.tsx'), 'utf8')
    expect(layout).toContain('<SiteFooter')
    expect(portada).toContain('<SiteFooter')
    expect(layout).not.toContain('<footer')
    expect(portada).not.toContain('<footer')
  })

  it('agrupa las guías por tema', () => {
    const guias = FOOTER_COLUMNS.find((c) => c.title === 'Guías')!
    expect(guias.groups.map((g) => g.titulo)).toEqual(['Vender', 'Campos', 'Sanidad', 'Glosario'])
  })

  it('no lleva Preofertas, Upgrade ni Manifiesto / El Oráculo', () => {
    for (const fuera of ['/preofertas', '/upgrade', '/el-oraculo']) {
      expect(internos.map(sinAncla)).not.toContain(fuera)
    }
    expect(links.map((l) => l.label.toLowerCase()).join(' ')).not.toMatch(/manifiesto|oráculo|preofertas|upgrade/)
  })

  it('cada enlace interno tiene su página', () => {
    const faltan = internos.map(sinAncla).filter((h) => !RUTAS.has(h))
    expect(faltan).toEqual([])
  })
})

describe('índice de guías (lib/data/guias)', () => {
  it('no lista rutas viejas y cada guía tiene su página', () => {
    const hrefs = GUIAS.flatMap((g) => g.guias.map((x) => x.href))
    for (const vieja of Object.keys(FUSIONES)) expect(hrefs).not.toContain(vieja)
    expect(hrefs.filter((h) => !RUTAS.has(h))).toEqual([])
  })
})

describe('anclas que los enlaces viejos esperan en la sobreviviente', () => {
  it.each([
    ['(terminal)/mercado/novillo-historico/page.tsx', ['inmag-dolares', 'alerta', 'dias']],
    ['(terminal)/calendario-sanitario-bovino/page.tsx', ['aftosa', 'planes', 'vacunador-2027', 'movimiento', 'renspa', 'tramites', 'faq']],
    ['(terminal)/informes/parte-semanal/page.tsx', ['reporte-gratis']],
    ['(terminal)/como-vender-hacienda/page.tsx', ['precio-de-tranquera', 'gastos-de-comercializacion']],
  ])('%s', (rel, ids) => {
    const ruta = join(APP, rel)
    expect(existsSync(ruta)).toBe(true)
    const src = readFileSync(ruta, 'utf8')
    for (const id of ids) expect(src, `falta id="${id}"`).toContain(`id="${id}"`)
  })
})
