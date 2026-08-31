import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, sep } from 'node:path'
import { getProductosPublicados } from './productos-datos'

/**
 * Un producto publicado tiene que estar ofrecido desde alguna página con tráfico.
 *
 * EL AGUJERO QUE ESTE TEST TAPA
 * Medido el 31-ago-2026: `/mercado/arrendamiento` tuvo **1.839 sesiones** y su landing,
 * `/informes/canon-de-arrendamiento`, **una**. Sumando los cuatro temas monetizables:
 * 4.303 sesiones contra 1 visita a una landing de producto, y cero compras en dos meses
 * con el circuito de pago funcionando.
 *
 * No fallaba nada. Los siete productos existían, con landing, FAQ, imágenes, JSON-LD y
 * checkout probado. Simplemente no había ningún enlace desde donde estaba la gente, y eso
 * no rompe ningún build ni ningún test — se ve sólo mirando analítica dos meses después.
 *
 * De ahí este test: un producto que se puede comprar y del que nadie se entera es igual a
 * un producto que no existe.
 */
describe('los productos publicados se ofrecen desde el sitio', () => {
  const APP = join(process.cwd(), 'src', 'app')

  function archivosTsx(dir: string, acc: string[] = []): string[] {
    for (const entrada of readdirSync(dir)) {
      const ruta = join(dir, entrada)
      if (statSync(ruta).isDirectory()) archivosTsx(ruta, acc)
      else if (entrada.endsWith('.tsx') || entrada.endsWith('.ts')) acc.push(ruta)
    }
    return acc
  }

  const paginas = archivosTsx(APP).map((ruta) => ({ ruta, texto: readFileSync(ruta, 'utf8') }))

  /**
   * Productos sin página de tráfico propia, a propósito y con motivo escrito.
   * Sumar algo acá es una decisión comercial, no una forma de callar el test.
   */
  const SIN_PAGINA_DE_TRAFICO: Record<string, string> = {
    // Su audiencia son las casas de remate del interior. Quien visita /consignatarias es
    // un productor buscando con quién vender: ofrecerle prospección sería un desajuste
    // de audiencia, no una oportunidad.
    'informe-prospeccion-provincial': 'B2B — se vende dirigido, no por tráfico del directorio',
    // Es el plan, no un informe: vive en /planes y /pro, que ya están en la navegación.
    'pro-abierto': 'plan, ya enlazado desde la navegación',
    // Se vende desde las 478 fichas por partido vía CtaInformeTracker, no con OfrecerInforme.
    'informe-productivo-departamento': 'ofrecido desde las fichas de productividad',
  }

  const publicados = getProductosPublicados()

  it('hay productos publicados que revisar', () => {
    expect(publicados.length).toBeGreaterThan(0)
  })

  it.each(publicados.map((p) => [p.slug, p.landing] as const))(
    '%s se ofrece desde alguna página',
    (slug, landing) => {
      if (slug in SIN_PAGINA_DE_TRAFICO) return

      // Alguien que no sea la propia landing tiene que nombrarlo.
      const ofrecido = paginas.filter(
        (p) => p.texto.includes(`"${slug}"`) || p.texto.includes(`'${slug}'`),
      )
      const fuera = ofrecido.filter((p) => !p.ruta.includes(landing.replace(/\//g, sep)))

      expect(
        fuera.length,
        `El producto "${slug}" no se ofrece desde ninguna página fuera de su landing. ` +
          `Una landing sin puente recibe ~0 visitas: es lo que pasó con canon-de-arrendamiento ` +
          `(1.839 sesiones en /mercado/arrendamiento contra 1 en la landing). Enlazalo con ` +
          `<OfrecerInforme> desde la página del tema, o declaralo en SIN_PAGINA_DE_TRAFICO ` +
          `con el motivo.`,
      ).toBeGreaterThan(0)
    },
  )

  it('las excepciones declaradas existen de verdad', () => {
    // Que no queden motivos escritos para productos que ya no están: sería una
    // exención silenciosa esperando a un slug reciclado.
    const todos = new Set(publicados.map((p) => p.slug))
    const fantasmas = Object.keys(SIN_PAGINA_DE_TRAFICO).filter((s) => !todos.has(s))
    expect(fantasmas, `excepciones para productos inexistentes: ${fantasmas.join(', ')}`).toEqual([])
  })
})
