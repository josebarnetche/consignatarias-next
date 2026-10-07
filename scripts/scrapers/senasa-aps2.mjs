/**
 * Estado real de habilitación de una planta, rubro por rubro, desde el registro
 * público APS2 de SENASA.
 *
 * POR QUÉ EXISTE. El padrón que veníamos usando sólo dice si la planta figura o
 * no figura, y eso no responde la única pregunta que importa para rutear un
 * productor: ¿esta planta puede faenar bovinos hoy? Falla para los dos lados.
 * Vicentin Faenas figura vigente y cerró en diciembre de 2017. Brekan figura
 * vigente y es ciclo I — el filtro por ciclo la daba por buena — pero el
 * establecimiento está TRANSFERIDO y su rubro "I A - CABEZA DE BOVINO FAENADO"
 * está SUSPENDIDO: no faena. Las consultas que le mandamos no tenían destino.
 *
 * El registro APS2 sí lo dice: devuelve el estado del establecimiento y el
 * estado de CADA rubro. Con eso el ruteo deja de ser una inferencia.
 *
 * ⚠️ EL NÚMERO OFICIAL DE APS2 NO ES LA MATRÍCULA DEL PADRÓN RUCA. Son dos
 * registros distintos con numeraciones distintas: el 4066 de RUCA es Arre Beef y
 * el 4066 de APS2 es una avícola que acopia huevos. De 94 fichas traídas por
 * número, 36 eran de otra empresa. Por eso NADA se da por bueno sin comparar la
 * razón social, y lo que no coincide se descarta en vez de guardarse: un estado
 * de habilitación atribuido a la empresa equivocada es peor que no tener dato.
 *
 * CÓMO. Es un formulario JSF, así que hay que pedir la página, quedarse con el
 * ViewState y la cookie de sesión, postear la búsqueda por número oficial y
 * después postear el link de la fila para abrir el detalle. Tres requests por
 * planta. Se va despacio a propósito: es un servicio del Estado y no hay ningún
 * apuro que justifique golpearlo.
 *
 * Uso:
 *   node scripts/scrapers/senasa-aps2.mjs            → las 185 plantas de ciclo I (~15 min)
 *   node scripts/scrapers/senasa-aps2.mjs --todas    → el padrón completo (1.116, ~1,5 h)
 *   node scripts/scrapers/senasa-aps2.mjs 1974 4787  → matrículas sueltas
 */

import { readFileSync, writeFileSync } from 'node:fs'

const URL_REG =
  'https://aps2.senasa.gov.ar/registros/faces/publico/establecimientos/tc_frigorificospublico.jsp'
const UA = 'ConsignatariasBot/1.0 (+https://www.consignatarias.com.ar/mcp; agro@memola.com.ar)'
const PAUSA_MS = 1500
const SALIDA = 'src/lib/data/senasa-rubros.json'

/** El rubro que habilita a comprar hacienda en pie. Lo demás es carne ya faenada. */
export const RUBRO_FAENA_BOVINA = 'I A - CABEZA DE BOVINO FAENADO'

const dormir = (ms) => new Promise((r) => setTimeout(r, ms))

/** Cookie jar mínimo: el registro sólo manda JSESSIONID y sin eso el ViewState no sirve. */
function guardarCookies(jar, res) {
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const [par] = c.split(';')
    const i = par.indexOf('=')
    if (i > 0) jar.set(par.slice(0, i).trim(), par.slice(i + 1).trim())
  }
}
const cookieHeader = (jar) => [...jar].map(([k, v]) => `${k}=${v}`).join('; ')

/**
 * El servidor declara ISO-8859-1. Si se lee como UTF-8, "CÁMARA FRIGORÍFICA"
 * vuelve con caracteres rotos y después no matchea contra nada.
 */
async function leerLatin1(res) {
  return new TextDecoder('latin1').decode(await res.arrayBuffer())
}

function viewState(html) {
  const m = html.match(/id="javax\.faces\.ViewState" value="([^"]+)"/)
  return m ? m[1] : null
}

async function postear(jar, vs, extra) {
  const data = new URLSearchParams({
    'Form1:_idJsp7': '',
    'Form1:_idJsp9': '0',
    'Form1:_idJsp12': '',
    'Form1:actividades': '0',
    Form1_SUBMIT: '1',
    field: '',
    'Form1:_link_hidden_': '',
    'Form1:_idcl': '',
    'Form1:scroll_1': '',
    'javax.faces.ViewState': vs,
    ...extra,
  })
  const res = await fetch(URL_REG, {
    method: 'POST',
    headers: {
      'User-Agent': UA,
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: cookieHeader(jar),
    },
    body: data,
    redirect: 'follow',
  })
  guardarCookies(jar, res)
  return leerLatin1(res)
}

const limpiar = (s) =>
  s
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&aacute;/g, 'á')
    .replace(/&eacute;/g, 'é')
    .replace(/&iacute;/g, 'í')
    .replace(/&oacute;/g, 'ó')
    .replace(/&uacute;/g, 'ú')
    .replace(/&ntilde;/g, 'ñ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    // El registro mezcla entidades con nombre y numéricas (&#243; por ó) en la
    // misma página: sin esto, "Razón social" no matchea y el campo vuelve nulo.
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, ' ')
    .trim()

/** Lee el campo de una ficha por su etiqueta ("Razón social:", "Estado:"). */
function campo(html, etiqueta) {
  const celdas = [...html.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((m) => limpiar(m[1]))
  const i = celdas.findIndex((c) => c.toLowerCase().startsWith(etiqueta.toLowerCase()))
  return i >= 0 && celdas[i + 1] ? celdas[i + 1] : null
}

/** Las filas de rubro son las que terminan en un estado conocido. */
const ESTADOS = new Set([
  'HABILITADO',
  'SUSPENDIDO',
  'TRANSFERIDO',
  'REPOSICION',
  'REPOSICIÓN',
  'BAJA',
  'CLAUSURADO',
  'INHABILITADO',
])

function rubros(html) {
  const out = []
  for (const fila of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const celdas = [...fila[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((m) => limpiar(m[1]))
    if (celdas.length < 2) continue
    const estado = celdas[celdas.length - 1].toUpperCase()
    const nombre = celdas[0]
    if (ESTADOS.has(estado) && nombre.length > 3 && nombre.length < 200) {
      out.push({ rubro: nombre, estado })
    }
  }
  return out
}

/** Contactos cargados en el propio registro. Sanfed, por ejemplo, sólo existe ahí. */
function contactos(html) {
  const out = []
  for (const m of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const celdas = [...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((x) => limpiar(x[1]))
    const tipo = celdas.find((c) => /^(MAIL|TELEFONO|TELÉFONO|FAX|CELULAR)$/i.test(c))
    if (!tipo) continue
    const valor = celdas.find((c) => c !== tipo && (c.includes('@') || /\d{4,}/.test(c)))
    if (valor) out.push({ tipo: tipo.toUpperCase(), valor })
  }
  return out
}

/**
 * De los resultados de una búsqueda, el link de la fila cuya razón social
 * coincide — no el de la primera, que es de donde salían los 36 cruces errados.
 * Sin nombre esperado, la primera es lo único que hay.
 */
function filaQueCoincide(html, nombreEsperado) {
  const links = [...html.matchAll(/oamSubmitForm\('Form1','(Form1:data:(\d+):_idJsp\d+)'\)/g)]
  if (!links.length) return null
  if (!nombreEsperado) return links[0][1]
  // Las filas de resultados son: N° oficial | Establecimiento | Tipo.
  const filas = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)]
    .map((f) => [...f[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((c) => limpiar(c[1])))
    .filter((c) => c.length >= 3 && /^\d+$/.test(c[0]))
  for (const [i, l] of links.entries()) {
    if (filas[i] && mismaEmpresa(filas[i][1], nombreEsperado)) return l[1]
  }
  return null
}

/**
 * El término con el que buscar por nombre. Se mandan las primeras palabras
 * significativas: el buscador hace "contiene", y la forma societaria o un
 * agregado del padrón ("S.A.", "(D.N.I. N° ...)") hacen que no encuentre nada.
 */
function terminoDeBusqueda(nombre) {
  const palabras = normalizar(nombre).split(' ').filter((w) => w.length > 2)
  return palabras.slice(0, 3).join(' ')
}

/** Para comparar razones sociales sin que la forma societaria decida el match. */
function normalizar(s) {
  return (s || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\b(S A S|SAS|S R L|SRL|S A I C|SAIC|S A|SA|LTDA|CIA|HNOS)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function mismaEmpresa(a, b) {
  const x = normalizar(a)
  const y = normalizar(b)
  if (!x || !y) return false
  if (x === y) return true
  // Un prefijo largo en común alcanza: "FRIGORIFICO GORINA" vs "FRIGORIFICO GORINA S A I C".
  const n = Math.min(14, x.length, y.length)
  return n >= 8 && (x.startsWith(y.slice(0, n)) || y.startsWith(x.slice(0, n)))
}

/**
 * Una planta: busca por número oficial y abre el detalle de la primera fila.
 * `nombreEsperado` no es opcional en la práctica: sin él no se puede saber si la
 * ficha que volvió es de esta empresa o de otra con el mismo número.
 */
export async function relevar(matricula, nombreEsperado = null) {
  let via = 'número oficial'
  const jar = new Map()
  const res0 = await fetch(URL_REG, { headers: { 'User-Agent': UA } })
  guardarCookies(jar, res0)
  const vs0 = viewState(await leerLatin1(res0))
  if (!vs0) return { matricula, error: 'sin ViewState: el registro cambió o está caído' }

  // Primero por número oficial. Si no aparece —o aparece otra empresa— se
  // reintenta por razón social, que es la identificación que de verdad vale:
  // las dos numeraciones no se corresponden.
  let busqueda = await postear(jar, vs0, {
    'Form1:_idJsp7': String(matricula),
    'Form1:_idJsp18': 'Buscar',
  })
  let campoBusqueda = { 'Form1:_idJsp7': String(matricula) }
  let fila = filaQueCoincide(busqueda, nombreEsperado)

  if (!fila && nombreEsperado) {
    const vsN = viewState(busqueda)
    const termino = terminoDeBusqueda(nombreEsperado)
    busqueda = await postear(jar, vsN, {
      'Form1:_idJsp12': termino,
      'Form1:_idJsp18': 'Buscar',
    })
    campoBusqueda = { 'Form1:_idJsp12': termino }
    fila = filaQueCoincide(busqueda, nombreEsperado)
    if (fila) via = 'razón social'
  }

  if (!fila) {
    return {
      matricula: String(matricula),
      error: nombreEsperado
        ? 'no figura en APS2 ni por número ni por razón social'
        : 'no figura en el registro APS2',
    }
  }

  const vs1 = viewState(busqueda)
  const detalle = await postear(jar, vs1, { ...campoBusqueda, 'Form1:_idcl': fila })

  const razonSocial = campo(detalle, 'Razón social')
  if (nombreEsperado && !mismaEmpresa(razonSocial, nombreEsperado)) {
    return {
      matricula: String(matricula),
      error: `otra empresa: el N° ${matricula} de APS2 es "${razonSocial}", no "${nombreEsperado}"`,
    }
  }

  const rs = rubros(detalle).filter((r) => !r.rubro.endsWith(':'))
  const faena = rs.find((r) => r.rubro.toUpperCase().startsWith('I A -'))
  return {
    matricula: String(matricula),
    razonSocial,
    estado: campo(detalle, 'Estado'),
    // La pregunta que el padrón viejo no podía contestar.
    faenaBovinaHabilitada: faena ? faena.estado === 'HABILITADO' : false,
    estadoFaenaBovina: faena ? faena.estado : null,
    rubros: rs,
    contactos: contactos(detalle),
    identificadaPor: via,
    relevadoEl: new Date().toISOString().slice(0, 10),
  }
}

async function main() {
  const args = process.argv.slice(2)
  const sueltas = args.filter((a) => /^\d+$/.test(a))
  let matriculas

  if (sueltas.length) {
    // Matrículas sueltas: sin nombre contra qué comparar, así que la ficha se
    // trae tal cual y la verificación queda en manos de quien la pidió.
    matriculas = sueltas.map((m) => [m, null])
  } else {
    const dir = JSON.parse(readFileSync('src/lib/data/frigorificos.json', 'utf8'))
    const todas = Array.isArray(dir) ? dir : Object.values(dir).find(Array.isArray)
    // Por defecto, las plantas de ciclo I: son las únicas a las que tendría
    // sentido mandarle un productor con hacienda en pie, y son 185 de 1.116.
    // Relevar las 1.116 no agrega nada al ruteo y golpea el servicio seis veces más.
    const candidatas = args.includes('--todas') ? todas : todas.filter((f) => f.stage === 1)
    matriculas = candidatas.filter((f) => f.matricula).map((f) => [f.matricula, f.name])
  }

  const resultados = []
  for (const [i, [m, nombre]] of matriculas.entries()) {
    process.stderr.write(`[${i + 1}/${matriculas.length}] ${m}\n`)
    try {
      resultados.push(await relevar(m, nombre))
    } catch (e) {
      resultados.push({ matricula: String(m), error: String(e.message || e) })
    }
    await dormir(PAUSA_MS)
  }

  const ok = resultados.filter((r) => !r.error)
  const otraEmpresa = resultados.filter((r) => r.error?.startsWith('otra empresa')).length
  const faenan = ok.filter((r) => r.faenaBovinaHabilitada).length
  writeFileSync(
    SALIDA,
    JSON.stringify(
      { generadoEl: new Date().toISOString(), fuente: URL_REG, plantas: resultados },
      null,
      2,
    ) + '\n',
  )
  process.stderr.write(
    `\n${ok.length} plantas verificadas, ${faenan} con faena bovina habilitada, ` +
      `${otraEmpresa} descartadas por ser otra empresa, ` +
      `${resultados.length - ok.length - otraEmpresa} sin ficha. → ${SALIDA}\n`,
  )
}

if (import.meta.url === `file://${process.argv[1]}`) await main()
