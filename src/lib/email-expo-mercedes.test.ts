import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildExpoMercedesAvisoHtml, ASUNTO_EXPO_MERCEDES } from './email'
import { REMATES_EXPO, casasConfirmadas } from './data/expo-mercedes'

const html = buildExpoMercedesAvisoHtml({
  to: 'destinatario@ejemplo.com',
  casas: casasConfirmadas().length,
  url: 'https://www.consignatarias.com.ar/remates/expo-rural-mercedes',
  remates: REMATES_EXPO.map((r) => ({
    fecha: r.fecha,
    firma: r.firma,
    cabania: r.cabania,
    hora: r.hora,
    modalidad: r.modalidad === 'fisico' ? 'en pista' : r.modalidad,
    categoria: r.categoria,
  })),
})

describe('el aviso de la Expo de Mercedes', () => {
  it('lleva los siete remates, ninguno de menos', () => {
    for (const r of REMATES_EXPO) {
      const dia = Number(r.fecha.slice(8, 10))
      expect(html, `falta el remate del ${dia}`).toContain(`>${dia}<`)
    }
  })

  it('nombra a las casas que rematan', () => {
    for (const nombre of ['HK Agro', 'Gananor Pujol', 'Reggi', 'Ávalos', 'Villaguay']) {
      expect(html, `no menciona a ${nombre}`).toContain(nombre)
    }
  })

  it('no le pone nombre al remate sin consignataria confirmada', () => {
    // El del 17 son dos cabañas y todavía no se sabe quién baja el martillo. En un mail
    // que va a las propias firmas del rubro, inventarlo se nota y no se perdona.
    expect(html).toContain('Cabañas Trumil y La Morenita')
    expect(html).toContain('consignataria a confirmar')
  })

  it('dice por qué le llega y cómo darse de baja', () => {
    expect(html).toContain('Te llega porque')
    expect(html).toContain('/unsubscribe?email=')
    expect(html).toContain('Darte de baja')
  })

  it('el asunto entra entero en la bandeja', () => {
    // Gmail corta cerca de los 50 caracteres en móvil.
    expect(ASUNTO_EXPO_MERCEDES.length).toBeLessThanOrEqual(50)
  })

  it('el enlace lleva a la página con atribución', () => {
    expect(html).toContain('/remates/expo-rural-mercedes')
  })
})

describe('el endpoint no puede mandar sin querer', () => {
  const ruta = join(process.cwd(), 'src/app/api/cron/expo-mercedes-aviso/route.ts')
  const route = readFileSync(ruta, 'utf8')

  it('sin ?enviar=1 devuelve preview y no toca Resend', () => {
    // Un envío a medio centenar de instituciones no vuelve atrás. El default es mirar.
    expect(route).toContain("searchParams.get('enviar') === '1'")
    expect(route).toContain('if (!enviar) {')
    expect(route).toMatch(/modo:\s*'preview/)
  })

  it('exige autorización antes que nada', () => {
    expect(route).toContain('if (!authorizeCron(req))')
  })

  it('excluye a frigoríficos, que ese día reciben el suyo', () => {
    expect(route).toContain("const AUDIENCIA = ['el-corredor', 'reporte-semanal', 'remates']")
    expect(route).not.toContain("'frigorificos'")
  })

  it('se niega a anunciar algo que ya pasó', () => {
    expect(route).toContain('if (!expoVigente())')
  })
})
