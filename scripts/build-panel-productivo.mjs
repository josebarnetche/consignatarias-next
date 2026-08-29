#!/usr/bin/env node
/**
 * Panel productivo departamental — construye `src/lib/data/stock-departamental.json`
 * desde la serie oficial de stock bovino de MAGyP (base SIGSA/SENASA).
 *
 * POR QUÉ
 * Es la capa de estructura de los planes productivos regionales: cuántos animales hay en
 * cada departamento, cómo está compuesto el rodeo y cómo viene la serie. De acá sale el
 * **índice terneros/vaca por departamento**, que no está publicado como serie en ninguna
 * fuente oficial — aparece calculado suelto dentro de PDFs, nunca desagregado y nunca
 * como panel. Lo computamos nosotros. Ver `docs/strategy/PRODUCTO-INFORME-ZONA.md`.
 *
 * FRECUENCIA
 * Anual. MAGyP sobrescribe el mismo archivo en abril con el cierre del año anterior (el
 * nombre no se versiona). Correr esto una vez al año y comparar contra lo persistido.
 *
 * USO
 *   node scripts/build-panel-productivo.mjs            # descarga y construye
 *   node scripts/build-panel-productivo.mjs --cache x.xls   # usa un XLS ya bajado
 *   node scripts/build-panel-productivo.mjs --check    # no escribe, sólo verifica
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import XLSX from 'xlsx'

const AQUI = dirname(fileURLToPath(import.meta.url))
const SALIDA = join(AQUI, '..', 'src', 'lib', 'data', 'stock-departamental.json')

const FUENTE = {
  organismo: 'MAGyP — Secretaría de Agricultura, Ganadería y Pesca (base SIGSA/SENASA)',
  dataset: 'Stock Bovino por departamento y estratificación al 31-12 (2007-2025)',
  url:
    'https://www.magyp.gob.ar/sitio/areas/bovinos/informacion_interes/informes/_archivos//' +
    '000001=Series%20de%20stock%20bovino%20y%20mapas/000000_Stock/' +
    '000000_Stock%20Bovino%20por%20departamento%20y%20estratificaci%C3%B3n%20al%2031-12%20(2007-2025).xls',
}

/** Orden fijo de categorías. La fila de serie es este array + [total, up]. */
const CATEGORIAS = [
  'vacas', 'vaquillonas', 'novillos', 'novillitos',
  'terneros', 'terneras', 'toros', 'toritos', 'bueyes',
]

/**
 * Mínimo de unidades productivas para publicar un departamento.
 *
 * Dos razones, ambas necesarias:
 *  1. **Privacidad.** Un departamento con 1 UP no es un agregado: es el rodeo de un
 *     establecimiento concreto. San Isidro tiene 1 UP y 2 cabezas; Vinchina 1 UP y 14.
 *     Publicar su composición por categoría es publicar el rodeo de alguien.
 *  2. **Sentido.** Un departamento con 5 UP no tiene un sistema productivo del que hacer
 *     un plan.
 *
 * Los no publicables SIGUEN en el panel (los totales provinciales tienen que cerrar),
 * pero no generan ficha pública ni informe.
 */
const MIN_UP_PUBLICABLE = 10

/** Sin desagregación departamental: sólo total provincial, y estimados al 31/03. */
const ANIOS_ESTIMADOS = new Set([2007, 2008, 2009, 2010, 2011])

/** Filas que no son un departamento aunque ocupen la columna de departamento. */
const PSEUDO_DEPARTAMENTOS = new Set(['TOTAL', 'TOTAL PAIS', 'SIN DEFINIR'])

/**
 * Departamentos que el origen renombró a mitad de la serie.
 *
 * MAGyP cambió grafías en masa (2019, 2021, 2023 y 2024) sin dejar rastro: números por
 * palabras (`9 de Julio` → `Nueve de Julio`), abreviaturas por nombre completo
 * (`Coronel de Marina Leonardo Rosales` → `Coronel Rosales`), artículos que aparecen
 * (`Capital` → `La Capital`). Sin unificarlos, 24 departamentos quedan partidos en dos
 * mitades y la ficha de cada uno dice "sin dato reciente" para partidos que sí lo tienen
 * — entre ellos Nueve de Julio de Santa Fe, con 2.158 establecimientos.
 *
 * Cada par se verificó por continuidad de stock entre el último año del nombre viejo y el
 * primero del nuevo; el desvío va de 0,4 % a 27 %. Los años nunca se solapan: el origen
 * usa un nombre u otro, nunca los dos el mismo año.
 *
 * Clave: `PROVINCIA|NOMBRE VIEJO NORMALIZADO` → nombre canónico (el vigente).
 */
const ALIAS_DEPARTAMENTOS = new Map(Object.entries({
  // Números escritos con cifra → escritos con palabra
  'BUENOS AIRES|25 DE MAYO':        'Veinticinco de Mayo',
  'BUENOS AIRES|9 DE JULIO':        'Nueve de Julio',
  'CHACO|25 DE MAYO':               'Veinticinco de Mayo',
  'CHACO|9 DE JULIO':               'Nueve de Julio',
  'CHACO|12 DE OCTUBRE':            'Doce de Octubre',
  'CHACO|1 DE MAYO':                'Primero De Mayo',
  'MISIONES|25 DE MAYO':            'Veinticinco de Mayo',
  'RIO NEGRO|25 DE MAYO':           'Veinticinco de Mayo',
  'RIO NEGRO|9 DE JULIO':           'Nueve de Julio',
  'SAN JUAN|25 DE MAYO':            'Veinticinco de Mayo',
  'SAN JUAN|9 DE JULIO':            'Nueve de Julio',
  'SANTA FE|9 DE JULIO':            'Nueve de Julio',

  // Abreviaturas y nombres largos → forma vigente
  'BUENOS AIRES|ADOLFO GONZALES CHAVES':             'Gonzales Chaves',
  'BUENOS AIRES|BRANDSEN':                           'Coronel Brandsen',
  'BUENOS AIRES|CORONEL DE MARINA LEONARDO ROSALES': 'Coronel Rosales',
  'BUENOS AIRES|FLORENTINO AMEGHINO':                'Ameghino',
  'BUENOS AIRES|GENERAL JUAN MADARIAGA':             'General Madariaga',
  'BUENOS AIRES|JOSE M EZEIZA':                      'Ezeiza',
  'LA RIOJA|GENERAL JUAN F QUIROGA':                 'Coronel Juan Facundo Quiroga',
  'SANTA FE|VILLA CONSTITUCION':                     'Constitución',

  // Aparece el artículo (o desaparece)
  'SALTA|CAPITAL':                  'La Capital',
  'SALTA|LA CANDELARIA':            'Candelaria',
  'SAN LUIS|CAPITAL':               'La Capital',
  'SANTA FE|CAPITAL':               'La Capital',

  // Error de tipeo del origen, un solo año: 22.124 cabezas en 2023 cae exacto entre las
  // 23.376 de 2022 y las 22.073 de 2024 de Dos de Abril, y Chaco no tiene ningún
  // departamento llamado "1 de Abril".
  'CHACO|1 DE ABRIL':               '2 de Abril',
}))

/**
 * Quita diacríticos, puntuación y espacios sobrantes.
 *
 * NO es cosmético — el origen escribe el mismo lugar de formas distintas según el año, y
 * sin esto se parte en dos entidades con la serie cortada, sin que nada falle:
 *
 *  · La columna "sin tilde" **no siempre viene sin tilde**: Entre Ríos es `ENTRE RIOS`
 *    de 2007 a 2024 y `ENTRE RÍOS` en 2025.
 *  · `MAYOR LUIS J. FONTANA` (2012-2024) → `MAYOR LUIS J.FONTANA` (2025).
 *  · `CHOS MALAL` y `COLLON CURA` (2012-2024) → `CHOS - MALAL`, `COLLON - CURA` (2025).
 *  · `1° DE MAYO` (2012-2019) → `1º DE MAYO` (2020-2023): grado vs. ordinal masculino.
 *
 * Por eso la puntuación se colapsa a espacio en vez de borrarse: `J.FONTANA` tiene que
 * dar `J FONTANA` y no `JFONTANA`.
 */
function clave(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
}

function slug(texto) {
  return clave(texto).toLowerCase().replace(/ /g, '-')
}

function anioDe(celda) {
  const n = Number(String(celda ?? '').replace('*', '').trim())
  return Number.isInteger(n) && n > 1990 && n < 2100 ? n : null
}

function entero(celda) {
  const n = Number(celda)
  return Number.isFinite(n) ? Math.round(n) : 0
}

async function obtenerXls() {
  const i = process.argv.indexOf('--cache')
  if (i !== -1 && process.argv[i + 1]) {
    console.log(`[panel] usando cache: ${process.argv[i + 1]}`)
    return readFileSync(process.argv[i + 1])
  }
  console.log('[panel] descargando de MAGyP…')
  const res = await fetch(FUENTE.url)
  if (!res.ok) throw new Error(`[panel] MAGyP devolvió ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  // El origen es un XLS binario (BIFF). Si algún día devuelven una página de error con
  // 200, el magic byte lo delata antes de que parseemos basura.
  if (buf[0] !== 0xd0 || buf[1] !== 0xcf) {
    throw new Error(`[panel] la respuesta no es un XLS binario (${buf.length} bytes)`)
  }
  console.log(`[panel] ${buf.length.toLocaleString('es-AR')} bytes`)
  return buf
}

function parsear(buf) {
  const wb = XLSX.read(buf, { type: 'buffer' })
  if (!wb.SheetNames.includes('Stock')) {
    throw new Error(`[panel] no hay hoja "Stock" (hay: ${wb.SheetNames.join(', ')})`)
  }
  const filas = XLSX.utils.sheet_to_json(wb.Sheets['Stock'], { header: 1, raw: true })

  // El encabezado real está en la fila 3 (1-indexado): fila 1 es el título y fila 2 va
  // vacía. Verificamos en vez de asumir — si MAGyP mueve una fila, esto avisa.
  const cabecera = filas[2] ?? []
  if (clave(cabecera[0]) !== 'ANO' || clave(cabecera[5]) !== 'VACAS') {
    throw new Error(`[panel] cabecera inesperada en la fila 3: ${JSON.stringify(cabecera.slice(0, 6))}`)
  }

  return filas.slice(3).filter((f) => f && f[1] != null && anioDe(f[0]) !== null)
}

function construir(filas) {
  const provincias = new Map()      // clave -> nombre display
  const departamentos = new Map()   // "PROV/DEPTO" -> registro
  const totalesProvinciales = {}    // clave prov -> { anio: fila }
  const totalesPais = {}            // anio -> fila
  const colisiones = []             // depto-año con más de una fila en el origen

  for (const f of filas) {
    const anio = anioDe(f[0])
    const provClave = clave(f[2])
    const provNombre = String(f[1] ?? '').trim()
    const depNombre = String(f[3] ?? '').trim()

    /**
     * La identidad del departamento sale de la columna de display, NO de la "sin tilde".
     *
     * La columna sin tilde tiene errores de tipeo del origen que parten un departamento
     * en dos entidades: `BIEDMA` por Viedma (vigente 2021-2025), `MBUCURUYA` por
     * Mburucuyá, `USUHAIA`, `ULLUN`, `RIO SENGUERR`, `PRESIDENTE DE LA PLAZA` por
     * Presidencia, `CORONEL JUAN F. QUIROGA` por General. La columna de display está
     * limpia en todos esos casos. Usándola: 0 colisiones de slug y los 25 departamentos
     * de Corrientes salen exactos.
     */
    const canonico = ALIAS_DEPARTAMENTOS.get(`${provClave}|${clave(depNombre)}`) ?? depNombre
    const depClave = clave(canonico)
    // La fila de pseudo-departamento sí se reconoce por la columna sin tilde, que es
    // donde el origen escribe `Total` / `Total País` / `Sin definir`.
    const depClaveOrigen = clave(f[4])

    const valores = CATEGORIAS.map((_, i) => entero(f[5 + i]))
    const total = entero(f[14])
    // La cantidad de UP sólo se informa desde 2022. `null` ≠ 0: no es que no haya
    // establecimientos, es que ese año no se publicó el dato.
    const up = f[15] == null || f[15] === '' ? null : entero(f[15])
    const fila = [...valores, total, up]

    if (provClave === 'TOTAL PAIS') {
      totalesPais[anio] = fila
      continue
    }

    provincias.set(provClave, provNombre)

    if (PSEUDO_DEPARTAMENTOS.has(depClaveOrigen)) {
      if (depClaveOrigen === 'TOTAL') {
        totalesProvinciales[provClave] ??= {}
        totalesProvinciales[provClave][anio] = fila
      }
      // SIN DEFINIR (5 filas en 2012/2015/2018) se descarta: no es un departamento y no
      // se le puede hacer una ficha.
      continue
    }

    const k = `${provClave}/${depClave}`
    if (!departamentos.has(k)) {
      departamentos.set(k, {
        clave: k,
        provincia: provClave,
        provinciaNombre: provNombre,
        departamento: depClave,
        nombre: canonico,
        nombreAnio: anio,
        slugProvincia: slug(provNombre),
        slugDepartamento: slug(depNombre),
        serie: {},
      })
    }
    const reg = departamentos.get(k)

    // El nombre que se muestra es el de la aparición más reciente: si el origen corrige
    // una grafía, gana la corrección.
    if (anio >= reg.nombreAnio) {
      reg.nombre = canonico
      reg.nombreAnio = anio
      reg.slugDepartamento = slug(canonico)
    }

    if (reg.serie[anio]) {
      /**
       * Dos filas para el mismo departamento-año. Se suman, y el caso queda registrado.
       *
       * Sumar mantiene el cierre contra el total provincial. Pero **introduce ruido en la
       * serie de ese departamento**, así que no se esconde: va a `meta.colisiones` para
       * que quien lea la ficha sepa qué años están afectados.
       *
       * El caso conocido es Capitán Sarmiento (Buenos Aires), 2012-2018: el origen
       * etiquetó las filas de General Sarmiento con el nombre de Capitán Sarmiento y lo
       * corrigió recién en 2019. El desvío va de 4,8 % en 2012 a 0,4 % en 2018.
       */
      colisiones.push({ departamento: k, anio, sumadas: 2 })
      reg.serie[anio] = reg.serie[anio].map((v, i) =>
        i === 10 ? (v == null && fila[10] == null ? null : (v ?? 0) + (fila[10] ?? 0)) : v + fila[i],
      )
    } else {
      reg.serie[anio] = fila
    }
  }

  // `up` del año más reciente que lo informe. Define publicable.
  for (const d of departamentos.values()) {
    const anios = Object.keys(d.serie).map(Number).sort((a, b) => b - a)
    const ultimoConUp = anios.find((a) => d.serie[a][10] != null)
    d.up = ultimoConUp ? d.serie[ultimoConUp][10] : null
    d.upAnio = ultimoConUp ?? null
    d.publicable = d.up != null && d.up >= MIN_UP_PUBLICABLE
  }

  return {
    colisiones,
    provincias: [...provincias.entries()]
      .map(([clave, nombre]) => ({ clave, nombre, slug: slug(nombre) }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    departamentos: [...departamentos.values()].sort(
      (a, b) => a.provincia.localeCompare(b.provincia) || a.departamento.localeCompare(b.departamento),
    ),
    totalesProvinciales,
    totalesPais,
  }
}

/** Verificaciones que tienen que dar. Si alguna falla, el archivo no se escribe. */
function verificar(panel) {
  const problemas = []
  const { provincias, departamentos, totalesProvinciales } = panel

  if (provincias.length !== 24) {
    problemas.push(`se esperaban 24 provincias (23 + CABA), hay ${provincias.length}: ` +
      provincias.map((p) => p.clave).join(', '))
  }

  // El duplicado por tilde de Entre Ríos: si volviera, dos claves distintas empiezan igual.
  const raices = new Map()
  for (const p of provincias) {
    const raiz = p.clave.replace(/[^A-Z]/g, '')
    if (raices.has(raiz)) problemas.push(`provincia duplicada por normalización: ${raices.get(raiz)} / ${p.clave}`)
    raices.set(raiz, p.clave)
  }

  // Slugs únicos dentro de cada provincia — son la URL de la ficha.
  const vistos = new Set()
  for (const d of departamentos) {
    const s = `${d.slugProvincia}/${d.slugDepartamento}`
    if (vistos.has(s)) problemas.push(`slug duplicado: ${s}`)
    vistos.add(s)
  }

  // La suma de los departamentos tiene que acercarse al total provincial publicado.
  // Tolerancia 1%: SIN DEFINIR se descartó y puede haber redondeos del origen.
  const ANIO = Math.max(...departamentos.flatMap((d) => Object.keys(d.serie).map(Number)))
  for (const p of provincias) {
    const total = totalesProvinciales[p.clave]?.[ANIO]?.[9]
    if (total == null) continue
    const suma = departamentos
      .filter((d) => d.provincia === p.clave && d.serie[ANIO])
      .reduce((acc, d) => acc + d.serie[ANIO][9], 0)
    const desvio = total === 0 ? 0 : Math.abs(suma - total) / total
    if (desvio > 0.01) {
      problemas.push(`${p.clave} ${ANIO}: suma de deptos ${suma} vs total ${total} (${(desvio * 100).toFixed(1)}%)`)
    }
  }

  /**
   * Un departamento con producción real que deja de aparecer es, casi siempre, un
   * renombre del origen que falta mapear en ALIAS_DEPARTAMENTOS — no un partido que se
   * quedó sin ganado. Sin este chequeo, su ficha diría "sin dato reciente" y su serie
   * quedaría cortada en silencio. Fue así como aparecieron los 25 alias actuales.
   */
  const huerfanos = departamentos.filter(
    (d) => d.publicable && (d.up ?? 0) >= 100 && !d.serie[ANIO],
  )
  for (const d of huerfanos) {
    const ultimo = Math.max(...Object.keys(d.serie).map(Number))
    problemas.push(
      `${d.clave}: ${d.up} UP pero su serie termina en ${ultimo} — ¿renombre sin mapear en ALIAS_DEPARTAMENTOS?`,
    )
  }

  const corrientes = departamentos.filter((d) => d.provincia === 'CORRIENTES')
  if (corrientes.length !== 25) {
    problemas.push(`Corrientes debería tener 25 departamentos, tiene ${corrientes.length}`)
  }

  return problemas
}

function resumen(panel) {
  const { departamentos, provincias } = panel
  const anios = [...new Set(departamentos.flatMap((d) => Object.keys(d.serie).map(Number)))].sort()
  const ultimo = anios[anios.length - 1]
  const pub = departamentos.filter((d) => d.publicable)

  console.log('')
  console.log(`  provincias .............. ${provincias.length}`)
  console.log(`  departamentos ........... ${departamentos.length}`)
  console.log(`  publicables (UP ≥ ${MIN_UP_PUBLICABLE}) .. ${pub.length}  (${departamentos.length - pub.length} bajo el umbral)`)
  console.log(`  años con desagregación .. ${anios[0]}–${ultimo}`)
  console.log(`  años estimados (31/03) .. ${[...ANIOS_ESTIMADOS].join(', ')} (sólo total provincial)`)

  const cor = departamentos
    .filter((d) => d.provincia === 'CORRIENTES' && d.serie[ultimo])
    .map((d) => ({ n: d.nombre, i: d.serie[ultimo][0] ? (d.serie[ultimo][4] + d.serie[ultimo][5]) / d.serie[ultimo][0] : 0 }))
    .sort((a, b) => b.i - a.i)
  console.log(`\n  Corrientes ${ultimo} — terneros/vaca, extremos:`)
  console.log(`    ${cor[0].n}: ${(cor[0].i * 100).toFixed(1)}%  ·  ${cor[cor.length - 1].n}: ${(cor[cor.length - 1].i * 100).toFixed(1)}%`)
}

const buf = await obtenerXls()
const filas = parsear(buf)
console.log(`[panel] ${filas.length.toLocaleString('es-AR')} filas de datos`)

const panel = construir(filas)
const problemas = verificar(panel)
if (panel.colisiones.length) {
  console.log(`[panel] ⚠ ${panel.colisiones.length} departamento-año con fila duplicada en el origen (sumadas):`)
  for (const c of panel.colisiones) console.log(`    ${c.departamento} ${c.anio}`)
}

if (problemas.length) {
  console.error('\n[panel] ❌ verificación fallida:')
  for (const p of problemas) console.error(`  · ${p}`)
  process.exit(1)
}
console.log('[panel] ✅ verificaciones OK')

resumen(panel)

if (process.argv.includes('--check')) {
  console.log('\n[panel] --check: no se escribió nada')
  process.exit(0)
}

const salida = {
  meta: {
    ...FUENTE,
    generado: new Date().toISOString().slice(0, 10),
    minUpPublicable: MIN_UP_PUBLICABLE,
    aniosEstimados: [...ANIOS_ESTIMADOS],
    colisiones: panel.colisiones,
    nota:
      'Agregados por departamento. No contiene identificación de personas ni de establecimientos. ' +
      'Los departamentos con menos de ' + MIN_UP_PUBLICABLE + ' unidades productivas quedan marcados ' +
      'publicable:false — con esa escala el agregado se acerca a describir un establecimiento concreto.',
  },
  categorias: CATEGORIAS,
  formatoSerie: [...CATEGORIAS, 'total', 'up'],
  ...panel,
}

writeFileSync(SALIDA, JSON.stringify(salida))
const kb = (Buffer.byteLength(JSON.stringify(salida)) / 1024).toFixed(0)
console.log(`\n[panel] escrito ${SALIDA.replace(/.*[\\/]src/, 'src')} (${kb} KB)`)
