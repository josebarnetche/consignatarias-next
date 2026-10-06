/**
 * Nota institucional en PDF para los ministerios de producción provinciales.
 *
 * POR QUÉ UN PDF Y NO UN CORREO A SECAS. Los ministerios imprimen lo que reciben
 * y lo giran en papel por mesa de entradas. Una nota que sólo existe en el cuerpo
 * del mail se pierde en ese paso. Así que va A4, con membrete, firmada y con los
 * datos fiscales visibles: tiene que poder vivir como papel.
 *
 * La firma es la imagen que José usa para sus notas. El pie lleva CUIT y domicilio
 * porque sin eso una nota de un privado a un organismo público no se tramita.
 *
 * Uso: node scripts/notas/nota-ministerios.mjs
 *      → un PDF por provincia en scripts/notas/salida/
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const HOY = new Date()
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
const FECHA_LARGA = `${HOY.getDate()} de ${MESES[HOY.getMonth()]} de ${HOY.getFullYear()}`

const RAIZ = process.cwd()
const SALIDA = join(RAIZ, 'scripts/notas/salida')
const FIRMA = '/Users/josebarnetche/Downloads/firma.png'
const LOGO = join(RAIZ, 'public/Consignatariaslogo.png')

const b64 = (p) => readFileSync(p).toString('base64')

/**
 * Lo que se le pide a cada provincia. Es el mismo pedido, pero la lista de
 * plantas cambia: nombrarlas es lo que convierte una nota genérica en una que
 * alguien puede responder sin volver a preguntar nada.
 */
const PROVINCIAS = [
  {
    id: 'chaco',
    provincia: 'Chaco',
    organismo: 'Subsecretaría de Ganadería y Producción Animal',
    ministerio: 'Ministerio de la Producción y el Desarrollo Económico Sostenible',
    destinatario: 'Sra. Subsecretaria de Ganadería y Producción Animal',
    nombre: 'Mariela Alejandra Kasko',
    domicilio: 'Marcelo T. de Alvear 145, Edificio B, piso 7, oficina 4 — Resistencia, Chaco',
    plantas: [
      ['Frigorífico Ovechas S.A.S.', 'CUIT 30-71866959-2, matrícula 4077, Pampa del Infierno'],
      ['Oscar Juan Korovaichuk', 'CUIT 20-06148931-3, matrícula 4972, General Vedia'],
    ],
    respaldo:
      ', y por comunicaciones oficiales de esa Provincia consta que ambos se encuentran en actividad',
    parrafoPropio:
      'En el caso de Ovechas S.A.S. tomamos conocimiento, por comunicaciones oficiales de esa Provincia, de que la articulación con los productores caprinos y ovinos se canaliza a través del programa PROGANO. Si ese es el circuito que corresponde, agradeceríamos nos lo confirmen para orientar allí a los productores que nos consultan, en lugar de hacerlo por una vía equivocada.',
  },
  {
    id: 'formosa',
    organismo: 'Subsecretaría de la Producción Sustentable',
    ministerio: 'Ministerio de la Producción y Ambiente',
    destinatario: 'Sr. Subsecretario de la Producción Sustentable',
    nombre: 'Ing. Nazareno Manuel García Labarthe',
    domicilio: 'José M. Uriburu 1507 — Formosa',
    respaldo:
      ' y en el listado de establecimientos alcanzados por la tipificación de reses bovinas (Resolución 96/2024), que comprende plantas faenadoras en actividad, de modo que entendemos que se encuentra operando',
    provincia: 'Formosa',
    plantas: [['FP Carnes S.R.L.', 'CUIT 30-70997989-9, matrícula 8753, departamento Pirané']],
  },
  {
    id: 'misiones',
    organismo: 'Subsecretaría de Desarrollo y Producción Animal',
    ministerio: 'Ministerio del Agro y la Producción',
    destinatario: 'Sr. Subsecretario de Desarrollo y Producción Animal',
    nombre: 'Med. Vet. Carlos Caraves',
    domicilio: 'Colón 1628, 8º piso — Posadas, Misiones',
    respaldo:
      ' y en el listado de establecimientos alcanzados por la tipificación de reses bovinas (Resolución 96/2024), que comprende plantas faenadoras en actividad, de modo que entendemos que se encuentra operando',
    provincia: 'Misiones',
    plantas: [['AMEL S.R.L.', 'CUIT 30-71072402-0, matrícula 13913, Santa Ana, departamento Candelaria']],
  },
  {
    id: 'corrientes',
    organismo: 'Secretaría de Agricultura y Ganadería',
    ministerio: 'Ministerio de Producción',
    destinatario: 'Sr. Secretario de Agricultura y Ganadería',
    nombre: 'Esc. Norberto Mórtola',
    domicilio: 'San Martín 2224, CP 3400 — Ciudad de Corrientes',
    respaldo:
      ' y en el listado de establecimientos alcanzados por la tipificación de reses bovinas (Resolución 96/2024), que comprende plantas faenadoras en actividad, de modo que entendemos que se encuentra operando',
    provincia: 'Corrientes',
    plantas: [['La Brava S.A.', 'CUIT 30-70781069-2, matrícula 9096, departamento Capital']],
  },
]

function cuerpo(p) {
  const lista = p.plantas
    .map(([n, d]) => `<li><strong>${n}</strong> — ${d}</li>`)
    .join('\n')
  const plural = p.plantas.length > 1
  return `
  <p>Me dirijo a usted en representación de <strong>Memola Medios S.A.S.</strong>, responsable de
  <strong>consignatarias.com.ar</strong>, un servicio de información pública sobre el mercado ganadero
  argentino. Publicamos de forma abierta y gratuita el directorio de establecimientos faenadores del país,
  precios de referencia y datos sanitarios, citando siempre la fuente oficial de cada dato.</p>

  <p>Productores de distintas provincias nos consultan a diario buscando a quién ofrecer su hacienda.
  Cuando la consulta corresponde a una planta determinada, nuestra tarea es orientarlos hacia ella.
  Para hacerlo necesitamos un dato de contacto institucional, y en el caso ${plural ? 'de los siguientes establecimientos' : 'del siguiente establecimiento'}
  de esa Provincia no hemos encontrado ninguno publicado en fuente oficial ni propia:</p>

  <ul>${lista}</ul>

  <p>${plural ? 'Ambos figuran' : 'Figura'} en el padrón RUCA del Ministerio de Economía de la Nación${p.respaldo || ''}.
  Sin embargo, no ${plural ? 'cuentan' : 'cuenta'} con sitio web, teléfono ni correo electrónico publicados,
  lo que nos impide completar la derivación.</p>

  ${p.parrafoPropio ? `<p>${p.parrafoPropio}</p>` : ''}

  <p><strong>Por lo expuesto, solicito a usted tenga a bien informarnos el canal de contacto institucional
  ${plural ? 'de dichos establecimientos' : 'de dicho establecimiento'}</strong> —o, en su defecto, la vía que ${p.organismo ? `esa ${p.organismo.split(' ')[0]}` : 'ese Ministerio'} considere
  apropiada para canalizar consultas de productores interesados en operar con ${plural ? 'ellos' : 'él'}—.</p>

  <p>Aclaro que no solicitamos información reservada ni datos personales: únicamente el canal institucional
  que la propia Provincia considere publicable. El uso será exclusivamente el de orientar a productores
  hacia establecimientos habilitados, sin intermediación comercial de nuestra parte en esa derivación.</p>

  <p>Quedamos a disposición para ampliar cualquier aspecto de esta presentación y para poner nuestra
  información a disposición ${p.organismo ? `de esa ${p.organismo.split(' ')[0]}` : 'de ese Ministerio'} en lo que resulte de utilidad.</p>

  <p>Sin otro particular, saludo a usted muy atentamente.</p>`
}

function html(p) {
  const trato = p.destinatario || `Sr./Sra. Ministro/a de Producción`
  const org = p.organismo || 'Área de Ganadería'
  const min = p.ministerio || `Ministerio de Producción de la Provincia de ${p.provincia}`
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<style>
  @page { size: A4; margin: 22mm 20mm 20mm 25mm; }
  * { box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; font-size: 10.8pt; line-height: 1.55;
         color: #111; background: #fff; margin: 0; }
  .membrete { display: flex; align-items: center; justify-content: space-between;
              border-bottom: 1.5px solid #111; padding-bottom: 7mm; margin-bottom: 9mm; }
  .membrete img { height: 13mm; }
  .emisor { text-align: right; font-size: 8.4pt; line-height: 1.4; color: #333; font-family: Helvetica, Arial, sans-serif; }
  .emisor strong { color: #111; font-size: 9pt; }
  .lugar { text-align: right; margin-bottom: 8mm; }
  .dest { margin-bottom: 7mm; line-height: 1.45; }
  .dest .sd { margin-top: 2mm; letter-spacing: 0.1em; }
  .ref { margin-bottom: 7mm; padding-left: 0; }
  .ref span { font-family: Helvetica, Arial, sans-serif; font-size: 9.2pt;
              text-transform: uppercase; letter-spacing: 0.06em; }
  p { margin: 0 0 4.2mm; text-align: justify; }
  ul { margin: 0 0 4.2mm; padding-left: 7mm; }
  li { margin-bottom: 1.6mm; }
  .firma { margin-top: 10mm; }
  .firma img { height: 26mm; display: block; }
  .firma .datos { font-family: Helvetica, Arial, sans-serif; font-size: 9pt; line-height: 1.45;
                  border-top: 0.6px solid #111; display: inline-block; padding-top: 1.5mm; margin-top: -3mm; }
  .pie { margin-top: 12mm; padding-top: 3mm; border-top: 0.6px solid #bbb;
         font-family: Helvetica, Arial, sans-serif; font-size: 7.8pt; color: #555; text-align: center; }
</style></head><body>
  <div class="membrete">
    <img src="data:image/png;base64,${b64(LOGO)}" alt="Consignatarias">
    <div class="emisor">
      <strong>MEMOLA MEDIOS S.A.S.</strong><br>
      CUIT 30-71863222-2<br>
      Mercedes, Provincia de Corrientes<br>
      agro@memola.com.ar · +54 9 3773 41-8130
    </div>
  </div>

  <div class="lugar">Mercedes, Corrientes, ${FECHA_LARGA}.</div>

  <div class="dest">
    <strong>${trato}</strong><br>
    ${p.nombre ? `${p.nombre}<br>` : ''}
    ${org}<br>
    ${min}<br>
    Provincia ${p.provincia === 'Chaco' ? 'del Chaco' : `de ${p.provincia}`}
    ${p.domicilio ? `<br>${p.domicilio}` : ''}
    <div class="sd">S                    /                    D</div>
  </div>

  <div class="ref"><span>Ref.: Solicitud de contacto institucional de establecimientos faenadores de la Provincia</span></div>

  ${cuerpo(p)}

  <div class="firma">
    <img src="data:image/png;base64,${b64(FIRMA)}" alt="">
    <div class="datos">
      <strong>José Barnetche</strong><br>
      Memola Medios S.A.S. — CUIT 30-71863222-2<br>
      consignatarias.com.ar
    </div>
  </div>

  <div class="pie">
    Memola Medios S.A.S. · CUIT 30-71863222-2 · Mercedes, Corrientes, República Argentina<br>
    consignatarias.com.ar — información pública del mercado ganadero argentino
  </div>
</body></html>`
}

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

function main() {
  if (!existsSync(FIRMA)) throw new Error(`falta la firma en ${FIRMA}`)
  mkdirSync(SALIDA, { recursive: true })
  for (const p of PROVINCIAS) {
    const tmp = join(tmpdir(), `nota-${p.id}.html`)
    writeFileSync(tmp, html(p))
    const pdf = join(SALIDA, `nota-ministerio-${p.id}-${HOY.toISOString().slice(0, 10)}.pdf`)
    execFileSync(CHROME, [
      '--headless', '--disable-gpu', '--no-pdf-header-footer',
      `--print-to-pdf=${pdf}`, `file://${tmp}`,
    ], { stdio: 'ignore' })
    process.stderr.write(`✓ ${pdf}\n`)
  }
}

main()
