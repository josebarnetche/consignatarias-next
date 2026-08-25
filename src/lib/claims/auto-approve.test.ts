import { describe, it, expect } from 'vitest'
import { verificarPosesion } from './auto-approve'

/**
 * Estos tests son la línea entre "una firma abre su panel sola" y "cualquiera se
 * queda con el perfil de una casa ajena". Si alguno se pone en verde por accidente,
 * el agujero es de seguridad, no de UX.
 */
describe('verificarPosesion', () => {
  it('aprueba cuando el email es exactamente el del registro', () => {
    const r = verificarPosesion('oficina@kyl.com.ar', 'oficina@kyl.com.ar')
    expect(r.aprobar).toBe(true)
    expect(r.motivo).toBe('email_exacto')
  })

  it('ignora mayúsculas y espacios', () => {
    expect(verificarPosesion('Oficina@KYL.com.ar', '  oficina@kyl.com.ar ').aprobar).toBe(true)
  })

  it('aprueba a otra persona del mismo dominio propio de la firma', () => {
    // ventas@kyl.com.ar es de la casa aunque el registro tenga oficina@kyl.com.ar.
    const r = verificarPosesion('oficina@kyl.com.ar', 'ventas@kyl.com.ar')
    expect(r.aprobar).toBe(true)
    expect(r.motivo).toBe('dominio_propio')
  })

  it('NO aprueba por compartir gmail', () => {
    // Es el caso peligroso: la firma registró un gmail y cualquier gmail del mundo
    // "comparte dominio" con ella.
    const r = verificarPosesion('florencia.reggiycia@gmail.com', 'atacante@gmail.com')
    expect(r.aprobar).toBe(false)
    expect(r.detalle).toContain('correo masivo')
  })

  it('NO aprueba por compartir hotmail, outlook ni yahoo', () => {
    for (const d of ['hotmail.com', 'outlook.com', 'yahoo.com.ar', 'fibertel.com.ar']) {
      expect(verificarPosesion(`firma@${d}`, `otro@${d}`).aprobar).toBe(false)
    }
  })

  it('sí aprueba el gmail exacto de la firma', () => {
    // Coincidencia exacta sobre un gmail sigue siendo prueba: hay que tener ESE inbox.
    const r = verificarPosesion('florencia.reggiycia@gmail.com', 'florencia.reggiycia@gmail.com')
    expect(r.aprobar).toBe(true)
    expect(r.motivo).toBe('email_exacto')
  })

  it('NO aprueba un email de otro dominio', () => {
    expect(verificarPosesion('oficina@kyl.com.ar', 'alguien@otracosa.com').aprobar).toBe(false)
  })

  it('NO aprueba si la firma no tiene email registrado', () => {
    // Sin nada contra qué comparar, no hay verificación posible: va a revisión.
    const r = verificarPosesion(null, 'cualquiera@kyl.com.ar')
    expect(r.aprobar).toBe(false)
    expect(r.detalle).toContain('no tiene email en el registro')
  })

  it('no se deja engañar por un dominio que TERMINA igual', () => {
    // "notkyl.com.ar" no es "kyl.com.ar".
    expect(verificarPosesion('oficina@kyl.com.ar', 'x@notkyl.com.ar').aprobar).toBe(false)
  })

  it('no se deja engañar por un subdominio', () => {
    expect(verificarPosesion('oficina@kyl.com.ar', 'x@mail.kyl.com.ar').aprobar).toBe(false)
  })

  it('no se deja engañar por un @ de más en el nombre', () => {
    // "oficina@kyl.com.ar@evil.com" tiene dominio evil.com, no kyl.com.ar.
    expect(verificarPosesion('oficina@kyl.com.ar', 'oficina@kyl.com.ar@evil.com').aprobar).toBe(false)
  })
})
