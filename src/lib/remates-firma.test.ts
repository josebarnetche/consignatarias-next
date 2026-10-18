import { describe, expect, it } from 'vitest'
import { flyerValido, urlValida } from './remates-firma'

describe('urlValida', () => {
  it('acepta vacío y https', () => {
    expect(urlValida('')).toBe(true)
    expect(urlValida(null)).toBe(true)
    expect(urlValida('https://youtube.com/watch?v=x')).toBe(true)
  })
  it('rechaza http y basura', () => {
    expect(urlValida('http://x.com')).toBe(false)
    expect(urlValida('javascript:alert(1)')).toBe(false)
    expect(urlValida('no es url')).toBe(false)
  })
})

describe('flyerValido', () => {
  const base = 'https://nyqkgorazkwcufkzxmhd.supabase.co/storage/v1/object/public/consignataria-assets/flyers'
  it('sólo el bucket y la carpeta de la firma', () => {
    expect(flyerValido(`${base}/reggi/a.jpg`, 'reggi')).toBe(true)
    expect(flyerValido(`${base}/otra/a.jpg`, 'reggi')).toBe(false)
    expect(flyerValido('https://cualquiera.com/flyer.jpg', 'reggi')).toBe(false)
    expect(flyerValido('', 'reggi')).toBe(true)
  })
})
