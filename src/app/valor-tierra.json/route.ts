import { TIERRA, anosDeArrendamiento, precioSoja } from '@/lib/valuacion-campos'

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
    rinde_soja_qq_ha: t.rinde_soja_qq_ha ?? null,
    // Los años se calculan CON EL CANON DE SOJA, no con el helper general: en una
    // zona mixta ese helper devuelve los años de la vía ganadera, y mezclarlos con
    // un canon en quintales daba un número que no correspondía a ninguna de las dos.
    arrendamiento_agricola: t.qq_soja_ha_anio
      ? {
          qq_soja_ha_anio: t.qq_soja_ha_anio,
          canon_usd_ha_anio: Math.round(t.qq_soja_ha_anio * precioSoja().usdQuintal),
          anios_equivalentes_al_valor_de_la_tierra: Math.round(
            t.usd_ha / (t.qq_soja_ha_anio * precioSoja().usdQuintal),
          ),
          canon_relevado: !!t.qq_fuente,
          fuente_canon: t.qq_fuente ?? null,
        }
      : null,
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
    soja_referencia: {
      usd_quintal: Number(precioSoja().usdQuintal.toFixed(2)),
      fob_usd_tonelada: precioSoja().fob,
      fecha: precioSoja().fecha,
      desactualizado: precioSoja().desactualizado,
      nota: 'El FOB de MAGYP llevado a precio disponible, que es con el que se liquida el arrendamiento.',
    },
    metodologia: {
      resumen:
        'Cruce de tasadores con serie publicada, catastro provincial con modelo espacial y avisos de venta. Los avisos son precio pedido y se ajustan antes de compararlos con valores de operación.',
      aptitud:
        'La tierra agrícola no se valúa con canon ganadero: su precio lo explica el rendimiento en granos, no la carga animal.',
      arrendamiento:
        'El canon GANADERO se pacta en kg de novillo por hectárea. Los avisos lo publican por año; el pago suele ser mensual y se liquida con el promedio del período anterior. El canon AGRÍCOLA se pacta en quintales de soja por hectárea por año — es la misma mecánica en otra moneda, y por eso el campo agrícola se valúa con soja y no con hacienda.',
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
