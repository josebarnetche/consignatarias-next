import { describe, it, expect } from 'vitest'
import {
  META,
  getDepartamentos,
  getDepartamentosPublicables,
  getProvincias,
  getDepartamento,
  aniosDisponibles,
  ultimoAnio,
  indiceTernerosVaca,
  desteteEstimado,
  escala,
  rankingProvincial,
  puestoEnProvincia,
  tendencia,
  totalProvincial,
  aniosConRuido,
  ultimoAnioCon,
  tieneDatoReciente,
  hayCompraDeTerneros,
  pesoInvernada,
  TECHO_BIOLOGICO_INDICE,
  PROPORCION_VIENTRES_NEA,
} from './panel'

describe('panel productivo — integridad del dato', () => {
  it('cubre las 24 jurisdicciones', () => {
    expect(getProvincias()).toHaveLength(24)
  })

  it('no parte Entre Ríos en dos por la tilde de 2025', () => {
    const er = getProvincias().filter((p) => p.clave.startsWith('ENTRE'))
    expect(er).toHaveLength(1)
    // Y su serie tiene que llegar hasta el último año, no cortarse en 2024.
    const parana = getDepartamento(er[0].slug, 'parana')
    expect(parana?.serie[ultimoAnio()]).toBeDefined()
    expect(parana?.serie[2024]).toBeDefined()
  })

  it('unifica los departamentos que el origen tipea mal en la columna sin tilde', () => {
    // BIEDMA por Viedma (2021-2025), MBUCURUYA por Mburucuyá, USUHAIA, ULLUN.
    const viedma = getDepartamento('chubut', 'viedma')
    expect(viedma).not.toBeNull()
    expect(viedma!.serie[2019]).toBeDefined()
    expect(viedma!.serie[ultimoAnio()]).toBeDefined()

    const mburucuya = getDepartamento('corrientes', 'mburucuya')
    expect(mburucuya).not.toBeNull()
    expect(mburucuya!.serie[2019]).toBeDefined()
  })

  it('reúne bajo un solo departamento los que el origen renombró a mitad de serie', () => {
    // MAGyP pasó de "9 de Julio" a "Nueve de Julio" en Santa Fe: sin unificarlos, el
    // partido más grande de la provincia (2.158 establecimientos) queda partido en dos.
    const nueveJulio = getDepartamento('santa-fe', 'nueve-de-julio')
    expect(nueveJulio).not.toBeNull()
    expect(nueveJulio!.serie[2012]).toBeDefined()
    expect(nueveJulio!.serie[ultimoAnio()]).toBeDefined()
    expect(getDepartamento('santa-fe', '9-de-julio')).toBeNull()

    // Y lo mismo con las abreviaturas de Buenos Aires.
    const brandsen = getDepartamento('buenos-aires', 'coronel-brandsen')!
    expect(brandsen.serie[2012]).toBeDefined()
    expect(brandsen.serie[ultimoAnio()]).toBeDefined()
    expect(getDepartamento('buenos-aires', 'brandsen')).toBeNull()
  })

  it('ningún departamento con producción real pierde su dato reciente', () => {
    // Un departamento con 100+ establecimientos que deja de aparecer es un renombre sin
    // mapear, no un partido que se quedó sin ganado.
    const huerfanos = getDepartamentosPublicables().filter(
      (d) => (d.up ?? 0) >= 100 && !tieneDatoReciente(d),
    )
    expect(huerfanos.map((d) => d.clave)).toEqual([])
  })

  it('Corrientes tiene exactamente sus 25 departamentos', () => {
    const cor = getDepartamentos().filter((d) => d.provincia === 'CORRIENTES')
    expect(cor).toHaveLength(25)
  })

  it('los slugs son únicos', () => {
    const vistos = new Set<string>()
    for (const d of getDepartamentos()) {
      const s = `${d.slugProvincia}/${d.slugDepartamento}`
      expect(vistos.has(s)).toBe(false)
      vistos.add(s)
    }
  })

  it('la serie departamental arranca en 2012 — antes sólo hay total provincial', () => {
    const anios = aniosDisponibles()
    expect(anios[0]).toBe(2012)
    expect(anios).not.toContain(2011)
    expect(ultimoAnio()).toBeGreaterThanOrEqual(2025)
  })

  it('el rango de años es la unión de todos, no la serie del primer departamento', () => {
    // Hay departamentos que no cubren el rango completo: preguntarle a uno cualquiera
    // devolvía 2023 como último año del panel.
    const parciales = getDepartamentos().filter((d) => ultimoAnioCon(d) !== ultimoAnio())
    expect(parciales.length).toBeGreaterThan(0)
    expect(ultimoAnio()).toBe(Math.max(...getDepartamentos().map((d) => ultimoAnioCon(d)!)))
  })

  it('la suma de los departamentos cierra contra el total provincial', () => {
    const anio = ultimoAnio()
    for (const p of getProvincias()) {
      const total = totalProvincial(p.clave, anio)
      if (!total?.total) continue
      const suma = getDepartamentos()
        .filter((d) => d.provincia === p.clave && d.serie[anio])
        .reduce((acc, d) => acc + d.serie[anio].total, 0)
      expect(Math.abs(suma - total.total) / total.total).toBeLessThan(0.01)
    }
  })
})

describe('umbral de privacidad', () => {
  it('deja fuera de lo publicable a los departamentos con menos de 10 UP', () => {
    for (const d of getDepartamentosPublicables()) {
      expect(d.up).not.toBeNull()
      expect(d.up!).toBeGreaterThanOrEqual(META.minUpPublicable)
    }
  })

  it('no publica un departamento cuyo agregado describiría un solo establecimiento', () => {
    // San Isidro: 1 UP, 2 cabezas. Publicar su composición es publicar el rodeo de alguien.
    const sanIsidro = getDepartamento('buenos-aires', 'san-isidro')
    expect(sanIsidro?.publicable).toBe(false)
  })

  it('los no publicables siguen en el panel para que los totales cierren', () => {
    expect(getDepartamentos().length).toBeGreaterThan(getDepartamentosPublicables().length)
  })
})

describe('indicadores', () => {
  const fila = {
    vacas: 100, vaquillonas: 0, novillos: 0, novillitos: 0,
    terneros: 30, terneras: 25, toros: 0, toritos: 0, bueyes: 0,
    total: 200, up: 4,
  }

  it('el índice terneros/vaca suma terneros y terneras', () => {
    expect(indiceTernerosVaca(fila)).toBeCloseTo(0.55, 5)
  })

  it('devuelve null en vez de dividir por cero', () => {
    expect(indiceTernerosVaca({ ...fila, vacas: 0 })).toBeNull()
    expect(escala({ ...fila, up: null })).toBeNull()
    expect(escala({ ...fila, up: 0 })).toBeNull()
  })

  it('el destete estimado corrige por la proporción de vientres del NEA', () => {
    expect(desteteEstimado(fila)).toBeCloseTo(0.55 / PROPORCION_VIENTRES_NEA, 5)
    // Y es siempre mayor que el índice medido: hay menos vientres que vacas.
    expect(desteteEstimado(fila)!).toBeGreaterThan(indiceTernerosVaca(fila)!)
  })

  it('permite otra proporción de vientres, porque 0,83 es un supuesto del NEA', () => {
    expect(desteteEstimado(fila, 1)).toBeCloseTo(0.55, 5)
  })

  it('la escala son cabezas por unidad productiva', () => {
    expect(escala(fila)).toBe(50)
  })
})

describe('el índice no miente en zona de engorde', () => {
  const anio = ultimoAnio()

  it('no llama destete a un cociente biológicamente imposible', () => {
    // La Cocha (Tucumán) da 4,17 terneros por vaca en 2025. Una vaca pare uno: el exceso
    // son terneros comprados para engordar. Publicar eso como "417 % de destete" sería un
    // disparate, así que el destete estimado no se calcula ahí.
    const laCocha = getDepartamento('tucuman', 'la-cocha')!
    const f = laCocha.serie[anio]
    expect(indiceTernerosVaca(f)!).toBeGreaterThan(1)
    expect(hayCompraDeTerneros(f)).toBe(true)
    expect(desteteEstimado(f)).toBeNull()
  })

  it('sigue dando destete donde el rodeo es de cría', () => {
    const mercedes = getDepartamento('corrientes', 'mercedes')!
    const f = mercedes.serie[anio]
    expect(hayCompraDeTerneros(f)).toBe(false)
    expect(desteteEstimado(f)).not.toBeNull()
    expect(desteteEstimado(f)!).toBeLessThan(1)
  })

  it('distingue la cuenca de cría de la zona que retiene y engorda', () => {
    // Mercedes cría: 0,43 novillos y novillitos por vaca.
    const mercedes = getDepartamento('corrientes', 'mercedes')!
    expect(pesoInvernada(mercedes.serie[anio])!).toBeLessThan(0.6)
    // Gaiman engorda: casi tantos novillos como vacas (0,99).
    const gaiman = getDepartamento('chubut', 'gaiman')!
    expect(pesoInvernada(gaiman.serie[anio])!).toBeGreaterThan(0.8)
  })

  it('los dos indicadores son complementarios, no intercambiables', () => {
    // La Cocha compra terneros y los vende jóvenes: no llega a novillo, así que
    // `pesoInvernada` la ve como cría (0,05) mientras `hayCompraDeTerneros` la delata.
    // Una ficha que use uno solo de los dos se equivoca en la mitad de los casos.
    const laCocha = getDepartamento('tucuman', 'la-cocha')!.serie[anio]
    expect(pesoInvernada(laCocha)!).toBeLessThan(0.2)
    expect(hayCompraDeTerneros(laCocha)).toBe(true)
  })

  it('el techo afecta a una minoría acotada, no a la mayoría del panel', () => {
    const conCompra = getDepartamentosPublicables().filter(
      (d) => d.serie[anio] && hayCompraDeTerneros(d.serie[anio]),
    )
    expect(conCompra.length).toBeGreaterThan(0)
    expect(conCompra.length).toBeLessThan(getDepartamentosPublicables().length * 0.15)
  })

  it('el techo está por debajo de 1: una vaca no pare más de un ternero', () => {
    expect(TECHO_BIOLOGICO_INDICE).toBeLessThanOrEqual(1)
  })
})

describe('Corrientes — el gradiente sur→norte que INTA midió en el animal', () => {
  const anio = ultimoAnio()

  it('Curuzú Cuatiá casi duplica a General Paz', () => {
    const cc = getDepartamento('corrientes', 'curuzu-cuatia')!
    const gp = getDepartamento('corrientes', 'general-paz')!
    const iCC = indiceTernerosVaca(cc.serie[anio])!
    const iGP = indiceTernerosVaca(gp.serie[anio])!
    expect(iCC).toBeGreaterThan(0.6)
    expect(iGP).toBeLessThan(0.4)
    expect(iCC / iGP).toBeGreaterThan(1.6)
  })

  it('el ranking provincial ordena de mayor a menor y numera desde 1', () => {
    const r = rankingProvincial('CORRIENTES', anio)
    expect(r.length).toBe(25)
    expect(r[0].puesto).toBe(1)
    expect(r[0].de).toBe(25)
    for (let i = 1; i < r.length; i++) {
      expect(r[i].indice).toBeLessThanOrEqual(r[i - 1].indice)
    }
  })

  it('ubica a Mercedes en la mitad de arriba de su provincia', () => {
    const mercedes = getDepartamento('corrientes', 'mercedes')!
    const p = puestoEnProvincia(mercedes, anio)!
    expect(p.puesto).toBeLessThanOrEqual(Math.ceil(p.de / 2))
  })
})

describe('tendencia', () => {
  it('Mercedes perdió stock y ganó eficiencia entre 2012 y 2025', () => {
    const t = tendencia(getDepartamento('corrientes', 'mercedes')!, 2012, 2025)!
    expect(t.stockVar).toBeLessThan(-0.1)        // cayó más de 10 %
    expect(t.indiceDeltaPuntos!).toBeGreaterThan(0)  // pero mejoró
  })

  it('General Paz perdió stock sin moverse un punto', () => {
    const t = tendencia(getDepartamento('corrientes', 'general-paz')!, 2012, 2025)!
    expect(t.stockVar).toBeLessThan(0)
    expect(Math.abs(t.indiceDeltaPuntos!)).toBeLessThan(2)
  })

  it('devuelve null si falta alguno de los dos años', () => {
    expect(tendencia(getDepartamento('corrientes', 'mercedes')!, 2007, 2025)).toBeNull()
  })
})

describe('ruido declarado', () => {
  it('marca los años en que el origen trajo filas duplicadas', () => {
    const capSarmiento = getDepartamento('buenos-aires', 'capitan-sarmiento')!
    const ruido = aniosConRuido(capSarmiento)
    expect(ruido).toEqual([2012, 2013, 2014, 2015, 2016, 2017, 2018])
    // Y desde 2019, cuando el origen lo corrigió, la serie está limpia.
    expect(ruido).not.toContain(2019)
  })

  it('la enorme mayoría de los departamentos no tiene ruido', () => {
    const conRuido = new Set(META.colisiones.map((c) => c.departamento))
    expect(conRuido.size).toBeLessThan(5)
  })
})

describe('metadatos y trazabilidad', () => {
  it('deja registrada la fuente oficial y la fecha de generación', () => {
    expect(META.organismo).toContain('MAGyP')
    expect(META.url).toContain('magyp.gob.ar')
    expect(META.generado).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('declara que el dato es agregado y sin personas', () => {
    expect(META.nota).toContain('No contiene identificación de personas')
  })
})

describe('el ranking mide lo que dice medir', () => {
  const anio = ultimoAnio()

  it('excluye a las zonas que compran terneros', () => {
    // La Cocha da 417 % y salía primera de Tucumán: el ranking premiaba comprar terneros
    // en un indicador de eficiencia reproductiva.
    const r = rankingProvincial('TUCUMAN', anio)
    expect(r.some((p) => p.departamento.slugDepartamento === 'la-cocha')).toBe(false)
    for (const p of r) expect(p.indice).toBeLessThanOrEqual(TECHO_BIOLOGICO_INDICE)
  })

  it('un departamento de engorde no tiene puesto en el ranking de cría', () => {
    const laCocha = getDepartamento('tucuman', 'la-cocha')!
    expect(puestoEnProvincia(laCocha, anio)).toBeNull()
  })

  it('los de cría siguen rankeando normal', () => {
    const mercedes = getDepartamento('corrientes', 'mercedes')!
    const p = puestoEnProvincia(mercedes, anio)
    expect(p).not.toBeNull()
    expect(p!.puesto).toBeGreaterThan(0)
  })
})
