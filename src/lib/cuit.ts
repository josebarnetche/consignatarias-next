/**
 * CUIT: validación con dígito verificador y formato.
 *
 * POR QUÉ ES OBLIGATORIO EN LA OFERTA DE HACIENDA. Criterio de Pablo Usandizaga
 * (KyL, 05-10-2026): quien ofrece hacienda a la venta tiene que dar **razón
 * social y CUIT**, porque con eso se hace el chequeo crediticio antes de mover
 * la operación — se averigua en el BCRA (central de deudores) y en la Cámara
 * Argentina de Consignatarios. Es el oficio: nadie consigna hacienda de alguien
 * a quien no puede verificar.
 *
 * Lo que esta función hace y lo que NO. Valida que el número sea un CUIT real
 * (estructura y dígito verificador); **no** dice si existe en ARCA, ni si la
 * razón social se corresponde, ni nada crediticio. Eso es una consulta aparte y
 * se hace con la persona, no con una expresión regular.
 */

const PESOS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2] as const

/** Prefijos válidos: 20/23/24/25/26/27 personas físicas, 30/33/34 jurídicas. */
const PREFIJOS = new Set(['20', '23', '24', '25', '26', '27', '30', '33', '34'])

/** Solo los dígitos, sin guiones ni espacios. */
export function soloDigitos(entrada: string | null | undefined): string {
  return String(entrada || '').replace(/\D/g, '')
}

/**
 * ¿Es un CUIT válido? Módulo 11 sobre los primeros 10 dígitos.
 *
 * El caso borde del resto 1 es el que casi todas las implementaciones sueltas se
 * olvidan: el dígito verificador es 9 para las personas jurídicas y 4 para las
 * físicas, no 10.
 */
export function cuitValido(entrada: string | null | undefined): boolean {
  const d = soloDigitos(entrada)
  if (d.length !== 11) return false
  if (/^(\d)\1{10}$/.test(d)) return false // 11111111111 y familia
  const tipo = d.slice(0, 2)
  if (!PREFIJOS.has(tipo)) return false

  const suma = PESOS.reduce((acc, peso, i) => acc + peso * Number(d[i]), 0)
  const resto = suma % 11
  const dv = resto === 0 ? 0 : resto === 1 ? (Number(tipo) >= 30 ? 9 : 4) : 11 - resto
  return dv === Number(d[10])
}

/** `30-71863222-2`. Devuelve la entrada tal cual si no son 11 dígitos. */
export function formatearCuit(entrada: string | null | undefined): string {
  const d = soloDigitos(entrada)
  if (d.length !== 11) return String(entrada || '')
  return `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}`
}

/** Persona física o jurídica, según el prefijo. Útil para pedir el dato correcto. */
export function tipoDeCuit(entrada: string | null | undefined): 'fisica' | 'juridica' | null {
  const d = soloDigitos(entrada)
  if (d.length !== 11) return null
  const t = Number(d.slice(0, 2))
  if ([20, 23, 24, 25, 26, 27].includes(t)) return 'fisica'
  if ([30, 33, 34].includes(t)) return 'juridica'
  return null
}

/** Dónde se verifica, para no dejarlo en la cabeza de una sola persona. */
export const DONDE_SE_VERIFICA = [
  'BCRA — Central de Deudores del Sistema Financiero (situación 1 a 5)',
  'Cámara Argentina de Consignatarios de Ganado — antecedentes de la firma',
] as const
