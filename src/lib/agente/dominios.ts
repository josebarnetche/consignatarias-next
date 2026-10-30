/**
 * Dominios que no reciben correo.
 *
 * El 20-10 la consulta del kosher (#48) a Logros@arnet.com.ar quedó "entrega
 * demorada" y nunca llegó: arnet.com.ar ya no tiene MX. El 26-10 el agente le
 * volvió a escribir a otra casilla @arnet.com.ar (C-49-47). Un mail a un dominio
 * sin MX no sale nunca y además cuenta como contacto hecho; mejor no mandarlo y
 * que quede la nota en el informe de la corrida.
 *
 * Solo se descarta cuando el DNS contesta que el dominio no existe o no tiene MX.
 * Un timeout o cualquier otro error del DNS deja pasar el mail, como antes.
 */
import { resolveMx } from 'node:dns/promises'

type Resolver = (dominio: string) => Promise<Array<{ exchange: string }>>

const SIN_MX = new Set(['ENOTFOUND', 'ENODATA', 'NXDOMAIN'])

export function dominioDe(email: string): string {
  return email.slice(email.lastIndexOf('@') + 1).trim().toLowerCase()
}

/** Arma un chequeo con caché por corrida: cada dominio se consulta una sola vez. */
export function crearChequeoMx(resolver: Resolver = resolveMx) {
  const cache = new Map<string, Promise<boolean>>()
  return (email: string): Promise<boolean> => {
    const dominio = dominioDe(email)
    if (!dominio) return Promise.resolve(false)
    let r = cache.get(dominio)
    if (!r) {
      r = resolver(dominio).then(
        (mx) => mx.some((m) => m.exchange && m.exchange !== '.'),
        (e: NodeJS.ErrnoException) => !SIN_MX.has(String(e?.code ?? '')),
      )
      cache.set(dominio, r)
    }
    return r
  }
}
