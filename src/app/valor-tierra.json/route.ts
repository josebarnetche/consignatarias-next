import { TIERRA, anosDeArrendamiento } from '@/lib/valuacion-campos'

/**
 * Superficie citable del relevamiento de valor de la tierra (CC-BY).
 *
 * Mismo criterio que precios.json: pensada para que un buscador con IA o un
 * agente pueda tomar el número CON su fuente y su fecha, en vez de estimarlo.
 * Cada fila viaja con de dónde salió, cuándo, y con cuántas observaciones — y
 * con la aptitud, que es lo que evita el error de tasar campo agrícola con
 * canon de hacienda.
 *
 * Lo que NO está acá: las provincias sin dato confiable. Preferimos que falten
 * a que aparezcan estimadas.
 */
export const dynamic = 'force-static'
export const revalidate = 86400

const FECHA_RELEVAMIENTO = '2026-08-09'

export function GET() {
  const filas = TIERRA.map((t) => ({
    provincia: t.provincia,
    zona: t.zona ?? null,
    region: t.region,
    aptitud: t.aptitud ?? null,
    usd_ha: t.usd_ha,
    rango_usd_ha: { p25: t.p25, p75: t.p75 },
    productividad_kg_ha_anio: t.kg_ha_ano,
    arrendamiento_tipico: t.kg_ha_mes_canon
      ? {
          kg_novillo_ha_mes: t.kg_ha_mes_canon,
          kg_novillo_ha_anio: Math.round(t.kg_ha_mes_canon * 12),
          anios_equivalentes_al_valor_de_la_tierra: anosDeArrendamiento(t).anos,
          canon_relevado: !!t.canon_fuente,
          fuente_canon: t.canon_fuente ?? null,
        }
      : null,
    observaciones: t.n,
    fuente: t.fuente ?? null,
    fecha_dato: t.fecha ?? null,
  }))

  const body = {
    schema: 'https://consignatarias.com.ar/valor-tierra.json',
    as_of: FECHA_RELEVAMIENTO,
    license: 'CC-BY-4.0',
    license_url: 'https://creativecommons.org/licenses/by/4.0/',
    attribution: 'Relevamiento de consignatarias.com.ar',
    citation: `Valor de la tierra por provincia y zona, consignatarias.com.ar, ${FECHA_RELEVAMIENTO}`,
    unit: 'USD por hectárea',
    metodologia: {
      resumen:
        'Cruce de tasadores con serie publicada, catastro provincial con modelo espacial y avisos de venta. Los avisos son precio pedido y se ajustan antes de compararlos con valores de operación.',
      aptitud:
        'La tierra agrícola no se valúa con canon ganadero: su precio lo explica el rendimiento en granos, no la carga animal.',
      arrendamiento:
        'El canon se pacta en kg de novillo por hectárea. Los avisos lo publican por año; el pago suele ser mensual y se liquida con el promedio del período anterior.',
      url: 'https://www.consignatarias.com.ar/campos/valuar',
    },
    cobertura: {
      provincias: filas.filter((f) => !f.zona).length,
      zonas: filas.filter((f) => f.zona).length,
      sin_dato:
        'Mendoza y San Juan quedan fuera porque mezclan finca vitivinícola con campo ganadero y una mediana no describe el mercado. Neuquén, Tucumán y Jujuy, por muestra insuficiente.',
    },
    filas,
  }

  return Response.json(body, {
    headers: {
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
