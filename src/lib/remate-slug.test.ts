import { describe, expect, it } from 'vitest'
import { createRequire } from 'node:module'
import rematesData from '@/lib/data/remates.json'
import { remateSlug } from './remate-slug'

const require = createRequire(import.meta.url)

describe('slugs vigentes de next.config.js', () => {
  // El middleware decide qué fichas de remate son vigentes con la lista que arma
  // next.config.js (no puede importar TS). Si la fórmula se desincroniza, el middleware
  // manda fichas vigentes al perfil de la consignataria con un 301.
  it('coinciden con remateSlug() para todo remates.json', () => {
    const config = require('../../next.config.js') as { env: { REMATE_SLUGS_VIGENTES: string } }
    const desdeConfig = new Set(config.env.REMATE_SLUGS_VIGENTES.split('\n'))
    const desdeTs = new Set(rematesData.map((r) => remateSlug(r)))
    expect(desdeConfig).toEqual(desdeTs)
  })
})
