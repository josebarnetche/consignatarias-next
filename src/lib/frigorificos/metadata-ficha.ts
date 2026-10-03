/**
 * Title y description de /frigorificos/[cuit]. Aparte de la página para poder testearlos:
 * son la cara de la ficha en el SERP, y las búsquedas por CUIT tenían CTR de 0,15 %
 * (Search Console, sep-2026) con un title que Google cortaba antes de la razón social.
 */
import { fechaAR, type FichaFrigorifico } from '@/lib/frigorificos/ficha'

export const MAX_TITLE = 65
export const MAX_DESCRIPTION = 155

/** Recorta a `max` con "…", en el último espacio si no queda demasiado corto. */
function recortar(s: string, max: number): string {
  if (s.length <= max) return s
  const corte = s.slice(0, max - 1)
  const espacio = corte.lastIndexOf(' ')
  return `${(espacio > max / 2 ? corte.slice(0, espacio) : corte).trimEnd()}…`
}

const SIGLA_SOCIETARIA = /^(S\.?A\.?|S\.?R\.?L\.?|S\.?A\.?S\.?|S\.?A\.?I\.?C\.?|S\.?A\.?C\.?I\.?|S\.?C\.?A\.?|S\.?H\.?|LTDA\.?)$/i
const CONECTORES = new Set(['de', 'del', 'y', 'e'])

/** "FRIGORIFICO LAS HERAS S.A." → "Frigorifico Las Heras S.A." (el padrón viene en mayúsculas). */
export function razonSocialLegible(s: string): string {
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) => {
      if (SIGLA_SOCIETARIA.test(w)) return w.toUpperCase()
      const l = w.toLowerCase()
      if (i > 0 && CONECTORES.has(l)) return l
      return l.charAt(0).toUpperCase() + l.slice(1)
    })
    .join(' ')
}

/**
 * "{Razón social} · CUIT 30-50012088-2 · Frigorífico SENASA en {Localidad}", ≤ MAX_TITLE.
 * Con 65 caracteres la forma completa solo entra con nombres cortos, así que se va
 * achicando la cola (sin localidad, después "SENASA" a secas) antes de tocar la razón
 * social, y recién al final se recorta el nombre. El CUIT con guiones no se pierde nunca.
 */
export function tituloFicha(razonSocial: string, cuit: string, localidad: string): string {
  const nombre = razonSocialLegible(razonSocial)
  // El enriquecido trae "Clorinda, Formosa": en el title alcanza con la localidad.
  const lugar = localidad.split(',')[0].trim()
  const colas = [
    ` · CUIT ${cuit} · Frigorífico SENASA en ${lugar}`,
    ` · CUIT ${cuit} · Frigorífico SENASA`,
    ` · CUIT ${cuit} · SENASA`,
  ]
  for (const cola of colas) {
    if (nombre.length + cola.length <= MAX_TITLE) return `${nombre}${cola}`
  }
  const ultima = colas[colas.length - 1]
  return `${recortar(nombre, MAX_TITLE - ultima.length)}${ultima}`
}

/** "Habilitación SENASA vigente al 14/09/2026" / "No figura en el padrón SENASA del 14/09/2026". */
export function estadoSenasaCorto(ficha: FichaFrigorifico): string {
  return ficha.senasa.vigente
    ? `Habilitación SENASA vigente al ${fechaAR(ficha.senasa.fechaPadron)}`
    : `No figura en el padrón SENASA del ${fechaAR(ficha.senasa.fechaPadron)}`
}

/** La base va siempre (recortada si hace falta); los extras se suman mientras entren. */
export function descripcionFicha(base: string, extras: string[]): string {
  let out = recortar(base, MAX_DESCRIPTION - 1)
  for (const extra of extras) {
    const candidata = `${out} · ${extra}`
    if (candidata.length + 1 > MAX_DESCRIPTION) break
    out = candidata
  }
  return `${out}.`
}
