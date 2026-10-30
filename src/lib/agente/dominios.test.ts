import { describe, expect, it } from 'vitest'
import { crearChequeoMx, dominioDe } from './dominios'

const err = (code: string) => Object.assign(new Error(code), { code })

describe('dominioDe', () => {
  it('toma lo que va después de la última arroba, en minúscula', () => {
    expect(dominioDe('Logros@ARNET.com.ar ')).toBe('arnet.com.ar')
  })
})

describe('crearChequeoMx', () => {
  it('deja pasar un dominio con MX y frena uno sin MX o inexistente', async () => {
    const tiene = crearChequeoMx(async (d) => {
      if (d === 'ok.com') return [{ exchange: 'mx.ok.com' }]
      if (d === 'arnet.com.ar') throw err('ENODATA')
      throw err('ENOTFOUND')
    })
    expect(await tiene('a@ok.com')).toBe(true)
    expect(await tiene('Logros@arnet.com.ar')).toBe(false)
    expect(await tiene('x@noexiste.test')).toBe(false)
  })

  it('un MX nulo (".", RFC 7505) es no recibe correo', async () => {
    const tiene = crearChequeoMx(async () => [{ exchange: '.' }])
    expect(await tiene('a@nulo.com')).toBe(false)
  })

  it('un error del DNS que no es "no existe" deja pasar el mail', async () => {
    const tiene = crearChequeoMx(async () => { throw err('ETIMEOUT') })
    expect(await tiene('a@lento.com')).toBe(true)
  })

  it('consulta cada dominio una sola vez por corrida', async () => {
    let n = 0
    const tiene = crearChequeoMx(async () => { n++; return [{ exchange: 'mx' }] })
    await Promise.all([tiene('a@x.com'), tiene('b@X.com'), tiene('c@x.com')])
    expect(n).toBe(1)
  })
})
