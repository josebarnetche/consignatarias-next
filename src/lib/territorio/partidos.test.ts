import { describe, it, expect } from 'vitest'
import { partidoDeOrigen, origenesSinResolver, normalizar, SIN_PARTIDO } from './partidos'

/**
 * Los 117 orígenes que el MAG declara para Buenos Aires, tal como vienen en
 * `mag_consignataria_sales_lots.localidad` (consultado el 30-ago-2026).
 *
 * Están acá y no se leen de la base a propósito: el test tiene que fallar cuando el
 * diccionario deja de cubrir lo que el mercado escribe, no cuando la base está caída.
 */
const ORIGENES = `25 DE MAYO|9 DE JULIO|A. ALSINA|ADOLFO ALSINA|ALBERTI|AMEGHINO|AMERICA|ARRECIFES|AYACUCHO B|AZUL|BAHIA BLANCA|BALCARCE|BARADERO|BENITO JUAREZ|BERISSO|BOLIVAR|BRAGADO|BRANDSEN|CAMPANA|CAÑUELAS|CAPITAN SARMIENTO|CARHUE|CARLOS CASARES|CARLOS TEJEDOR|CARMEN DE ARECO|CASTELLI|CHACABUCO|CHASCOMUS|CHIVILCOY|CNEL. DORREGO|CNEL. PRINGLES|CNEL. SUAREZ|COLON|DAIREAUX|DOLORES|E. CRUZ|ENSENADA|ESCOBAR|EZEIZA|FLORENTINO AMEGHINO|GONZALES CHAVES|GORCHS|GRAL. ALVARADO|GRAL. ALVEAR|GRAL. ARENALES|GRAL. BELGRANO|GRAL. GUIDO|GRAL. LA MADRID|GRAL. LAS HERAS|GRAL. LAVALLE B|GRAL. MADARIAGA|GRAL. PAZ|GRAL. PINTO|GRAL. PUEYRREDON|GRAL. RODRIGUEZ|GRAL. VIAMONTE|GRAL. VILLEGAS|GUAMINI|H. IRIGOYEN|JUNIN|L. N. ALEM B|LA PLATA|LAPRIDA|LAS FLORES|LEZAMA|LINCOLN|LOBERIA|LOBOS|LUJAN|MAGDALENA|MAIPU|MAR CHIQUITA|MAR DEL PLATA|MARCOS PAZ|MERCEDES|MONTE|NAVARRO|NECOCHEA|OLAVARRIA|PATAGONES|PEHUAJO|PELLEGRINI|PERGAMINO|PICHINCHA|PIEDRITAS|PILA|PILAR|PRESIDENTE PERON|PUAN|PUNTA INDIO|RAMALLO|RAUCH|RIVADAVIA B|ROJAS|ROQUE PEREZ|SAAVEDRA|SALADILLO|SALLIQUELO|SALTO|SAN A. DE ARECO|SAN A. GILES|SAN CAYETANO|SAN NICOLAS|SAN PEDRO|SAN VICENTE|SANTA REGINA|SUIPACHA|TANDIL|TAPALQUE|TORDILLO|TORNQUIST|TRENQUE LAUQUEN|TRES ARROYOS|TRES LOMAS|VERONICA (PDO. PUNTA|VILLARINO|ZARATE`.split(
  '|',
)

describe('cobertura del padrón de partidos', () => {
  it('no queda ningún origen del mercado sin resolver', () => {
    // Si esto falla, el mercado empezó a escribir un origen nuevo y hay que agregarlo a
    // ALIAS. Mientras tanto, ese partido desaparece del mapa de todas las firmas.
    expect(origenesSinResolver(ORIGENES)).toEqual([])
  })

  it('resuelve al menos el 97 % de los orígenes', () => {
    const ok = ORIGENES.filter((o) => partidoDeOrigen(o)).length
    expect(ok / ORIGENES.length).toBeGreaterThan(0.97)
  })

  it('los únicos descartes son los que no son partidos bonaerenses', () => {
    const nulos = ORIGENES.filter((o) => !partidoDeOrigen(o))
    expect(nulos.map(normalizar).every((n) => SIN_PARTIDO.has(n))).toBe(true)
    expect(nulos).toHaveLength(2)
  })
})

describe('las tres familias de alias', () => {
  it('abreviaturas del mercado', () => {
    expect(partidoDeOrigen('GRAL. VILLEGAS')?.nombre).toBe('General Villegas')
    expect(partidoDeOrigen('CNEL. SUAREZ')?.nombre).toBe('Coronel Suárez')
    expect(partidoDeOrigen('A. ALSINA')?.nombre).toBe('Adolfo Alsina')
    expect(partidoDeOrigen('SAN A. GILES')?.nombre).toBe('San Andrés de Giles')
  })

  it('números con cifra que el padrón escribe con palabra', () => {
    expect(partidoDeOrigen('9 DE JULIO')?.nombre).toBe('Nueve de Julio')
    expect(partidoDeOrigen('25 DE MAYO')?.nombre).toBe('Veinticinco de Mayo')
  })

  it('pueblos que no son cabecera de partido', () => {
    // El remitente declara de dónde salió la hacienda, no el partido.
    expect(partidoDeOrigen('CARHUE')?.nombre).toBe('Adolfo Alsina')
    expect(partidoDeOrigen('PIEDRITAS')?.nombre).toBe('General Villegas')
    expect(partidoDeOrigen('SANTA REGINA')?.nombre).toBe('General Villegas')
    expect(partidoDeOrigen('GORCHS')?.nombre).toBe('General Belgrano')
    expect(partidoDeOrigen('AMERICA')?.nombre).toBe('Rivadavia')
  })

  it('el sufijo de desambiguación de provincia del mercado', () => {
    // Hay un Ayacucho en San Luis y una Rivadavia en Mendoza: el MAG les pone " B".
    expect(partidoDeOrigen('AYACUCHO B')?.nombre).toBe('Ayacucho')
    expect(partidoDeOrigen('RIVADAVIA B')?.nombre).toBe('Rivadavia')
  })

  it('la Ñ reparada matchea igual que cualquier otro origen', () => {
    expect(partidoDeOrigen('CAÑUELAS')?.nombre).toBe('Cañuelas')
  })
})

describe('no adivina', () => {
  it('devuelve null para lo que no es un partido bonaerense', () => {
    expect(partidoDeOrigen('PICHINCHA')).toBeNull()
    expect(partidoDeOrigen('E. CRUZ')).toBeNull()
    expect(partidoDeOrigen('ROSARIO')).toBeNull()
  })

  it('devuelve null para vacío o nulo', () => {
    expect(partidoDeOrigen('')).toBeNull()
    expect(partidoDeOrigen(null)).toBeNull()
    expect(partidoDeOrigen(undefined)).toBeNull()
    expect(partidoDeOrigen('   ')).toBeNull()
  })
})

describe('el partido resuelto trae su dato del padrón', () => {
  it('Ayacucho, el de mayor stock de la provincia', () => {
    const d = partidoDeOrigen('AYACUCHO B')!
    const f = d.serie[2025]
    expect(f.total).toBeGreaterThan(800_000)
    expect(d.up).toBeGreaterThan(1_500)
  })

  it('el slug sirve para linkear a la ficha pública', () => {
    const d = partidoDeOrigen('RAUCH')!
    expect(d.slugProvincia).toBe('buenos-aires')
    expect(d.slugDepartamento).toBe('rauch')
  })
})
