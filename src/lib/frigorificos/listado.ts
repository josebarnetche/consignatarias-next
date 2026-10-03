/**
 * listado.ts — proyección mínima del directorio para la tabla de /frigorificos.
 *
 * FrigorificosClient importaba frigorificos.json entero (251 KB) dentro del bundle de
 * cliente. Ahora el server arma esto y lo pasa por props: solo los campos que la tabla
 * usa, en tuplas y con la provincia como índice, porque viaja dentro del HTML (payload
 * RSC) y con objetos repetiría las claves 1.115 veces.
 */
import frigorificosData from '@/lib/data/frigorificos.json'

/** [cuit, razón social, matrícula, índice de provincia, etapa, 1 si figura en el padrón SENASA] */
export type FilaFrigorifico = [string, string, string, number, number, 0 | 1]

interface Basico {
  cuit: string
  name: string
  matricula: string
  province: string
  stage: number
  senasaActive?: boolean
}

export function listadoFrigorificos(): { filas: FilaFrigorifico[]; provincias: string[] } {
  const basicos = frigorificosData as Basico[]
  const provincias = Array.from(new Set(basicos.map((f) => f.province))).sort()
  const indice = new Map(provincias.map((p, i) => [p, i]))
  const filas = basicos.map<FilaFrigorifico>((f) => [
    f.cuit,
    f.name,
    f.matricula,
    indice.get(f.province)!,
    f.stage,
    f.senasaActive === true ? 1 : 0,
  ])
  return { filas, provincias }
}
