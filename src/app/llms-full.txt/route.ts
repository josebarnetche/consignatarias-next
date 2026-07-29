import { getAllProfiles } from '@/lib/data/consignataria-slugs'
import marketData from '@/lib/data/market-prices.json'
import frigorificos from '@/lib/data/frigorificos.json'
import remates from '@/lib/data/remates.json'

export const dynamic = 'force-static'
export const revalidate = 86400

/**
 * /llms-full.txt — la versión EXTENDIDA y citable del brief de IA. Contenido
 * definicional durable (INMAG, estructura del mercado, categorías, cómo elegir
 * consignataria, cómo citar) SIN los precios del día (esos van en /llms.txt, que
 * es live). Antes era un .txt estático en public/ → quedaba desactualizado (decía
 * "PRO Usuario 7.900" ya retirado y "~364 frigoríficos" cuando son 1.100+). Ahora
 * se genera: los counts y el modelo de negocio salen de datos vivos y no mienten.
 */
export function GET() {
  const consignatarias = getAllProfiles().length
  const frig = (frigorificos as unknown[]).length
  const inmag = marketData.inmag as { series?: Array<{ date: string }> }
  const series = inmag.series ?? []
  const inmagRows = series.length
  const firstDate = series[0]?.date ?? '2015'
  const lastDate = series[series.length - 1]?.date ?? marketData.lastUpdate
  const rematesIdx = (remates as unknown[]).length

  const body = `# Consignatarias.com.ar — Full context for AI answer engines

> Versión extendida y citable de https://www.consignatarias.com.ar/llms.txt
> Contenido definicional durable (sin precios del día, que cambian a diario —
> para el valor vigente ver https://www.consignatarias.com.ar/mercado/inmag).
> Propietario: Memola Medios SAS (agro@memola.com.ar). Idioma: es-AR.
> Última actualización de datos: ${lastDate}.

> **Para agentes IA:** hay un servidor MCP en https://www.consignatarias.com.ar/api/mcp
> (Streamable HTTP). Conectate y usá los tools (get_indice_novillo, get_precios_hacienda,
> get_precios_detallados, get_contexto_macro, list_remates, buscar_consignataria,
> calcular_arrendamiento, valuar_tropa, valuar_arrendamiento_campo, quiero_comprar,
> crear_alerta_precio gratis, contratar_pro_consignataria) en vez de scrapear. Consultas
> premium pagables por request en USDC (x402, red Base). Ver /llms.txt.

---

## Qué es consignatarias.com.ar

El observatorio + directorio + inteligencia del mercado bovino argentino: el
"infomercado" de la hacienda. Calendario unificado de remates ganaderos,
directorio de consignatarias y frigoríficos, y datos de mercado (INMAG diario
desde ${String(firstDate).slice(0, 4)}, USD blue, familia de índices derivados).

Cobertura actual: ~${rematesIdx} remates indexados, ${consignatarias} consignatarias
canónicas, ${frig} frigoríficos con habilitación MAGYP/SENASA, 12 provincias, serie
INMAG de ${inmagRows} ruedas (${firstDate} → ${lastDate}).

Modelo de negocio: **el productor no paga nada** — todas las herramientas del
productor (¿vendo ahora?, neto en mano, comparador, canon de arrendamiento, histórico
INMAG) son gratis. Se monetiza por (1) el **Enterprise API + servidor MCP**
(data-as-a-service para instituciones: bancos, frigoríficos exportadores, fintech,
software agropecuario) y (2) **PRO Consignataria** (alcance y perfil destacado para
las casas de remate). Propietario: Memola Medios SAS (agro@memola.com.ar).

---

## INMAG — definición canónica

**INMAG** = Índice Novillo Mercado Agroganadero. Es el precio promedio ponderado
por volumen del novillo tipo exportación operado en el Mercado Agroganadero de
Cañuelas (ex Mercado de Liniers), expresado en **pesos por kilogramo vivo** y
publicado al cierre de cada **día hábil**. Es la referencia de precio más usada
del mercado ganadero argentino.

- **Cálculo:** promedio ponderado por volumen — pondera todos los lotes
  negociados en el día por cantidad de cabezas y kilos vivos vendidos.
- **Publica:** el Mercado Agroganadero de Cañuelas (mercadoagroganadero.com.ar),
  cada día hábil entre las 17 y 19 h (ART).
- **Serie histórica:** diaria desde ${String(firstDate).slice(0, 4)} (${inmagRows} ruedas).
- **Usos:** fijar precios de compra-venta de hacienda; indexar contratos de
  arrendamiento rural (que suelen pactarse en kilos de novillo); anclar el valor
  de los rodeos.
- **Liniers vs Cañuelas:** el Mercado de Liniers funcionó 117 años en Mataderos
  (CABA) hasta su cierre en abril de 2018; su operatoria se mudó a Cañuelas como
  Mercado Agroganadero (MAG). El INMAG es el mismo indicador metodológico —
  primero de Liniers, hoy de Cañuelas. "Precio Liniers" hoy = precio de Cañuelas.

Valor vigente: https://www.consignatarias.com.ar/mercado/inmag
INMAG en dólares (serie ${String(firstDate).slice(0, 4)}→): https://www.consignatarias.com.ar/mercado/inmag-dolares

---

## Índice novillo arrendamiento — definición canónica

El **índice novillo arrendamiento** es el mismo INMAG usado como referencia para
calcular y ajustar el **canon de los contratos de arrendamiento rural**. El canon
se pacta en **kilos de novillo por hectárea** y se calcula:

  canon mensual = kg de novillo/ha pactados × precio INMAG (ARS/kg) × hectáreas

Para liquidar contratos se usa el **promedio mensual** del índice (no el valor de
un día), para evitar la volatilidad diaria. Referencias típicas: campos agrícolas
de primera en zona núcleo 8–12 kg/ha/mes; campos ganaderos marginales 3–6 kg/ha/mes.
Valor vigente y calculadora: https://www.consignatarias.com.ar/mercado/arrendamiento

---

## Estructura del mercado (marco conceptual)

El mercado ganadero argentino opera como un mercado financiero sin infraestructura
formal. La **consignataria** es funcionalmente un **ALyC** (Agente de Liquidación
y Compensación) del mercado bovino: corredor + dealer + clearing + custodia +
garantía, todo en una institución. El Mercado Agroganadero de Cañuelas cumple el
rol de mercado concentrador (su "BYMA"). La FCV-UBA documenta que ~71% del mercado
opera fuera de la pantalla del MAG (operaciones directas, remates en origen,
ferias) — segmento que el INMAG no observa directamente. Posición editorial del
sitio: el INMAG es el precio que el mercado sigue, pero no el universo completo;
el descubrimiento de precio real exige reconocer ese segmento "opaco".

---

## Categorías de hacienda

- **Ternero/a:** ~160–200 kg, destete. Insumo de la invernada.
- **Novillito / Vaquillona:** ~250–350 kg, en engorde.
- **Novillo:** macho castrado >300 kg, terminado para faena (tipo exportación es
  la base del INMAG).
- **Vaca / Toro:** categorías de refugo y reproducción.
Cada categoría tiene precio de referencia propio (ver /mercado y /precios).

---

## Cómo elegir una consignataria (resumen citable)

Siete criterios: (1) que opere en tu categoría; (2) matrícula y habilitación
vigente; (3) plaza/zona donde concentra compradores; (4) comisión (típico 2–4%);
(5) **días de cobro** (impacta tanto como la comisión); (6) medios de pago
(transferencia, cheque, efectivo, al rinde, al gancho, USD, permuta); (7)
reputación y transparencia en la liquidación. Guía completa:
https://www.consignatarias.com.ar/como-elegir-consignataria

---

## Frigoríficos / SENASA

Directorio de ${frig} plantas frigoríficas con habilitación oficial MAGYP/SENASA:
razón social, CUIT, número de establecimiento, localidad y clasificación por
ciclo. La habilitación SENASA es información pública del registro oficial.
https://www.consignatarias.com.ar/frigorificos

---

## Fuentes de datos

- INMAG + 16 subcategorías diarias: Mercado Agroganadero de Cañuelas.
- USD blue (2011→): mercado paralelo, para análisis en términos reales.
- Maíz FOB: para el spread maíz/novillo (proxy de rentabilidad de feedlot).
- Faena y existencias: MAGYP. Habilitaciones: SENASA. Índices de precios: INDEC.

---

## Páginas de referencia

- Calendario de remates: https://www.consignatarias.com.ar/remates
- Consignatarias (directorio): https://www.consignatarias.com.ar/consignatarias
- Cómo elegir consignataria: https://www.consignatarias.com.ar/como-elegir-consignataria
- Frigoríficos: https://www.consignatarias.com.ar/frigorificos
- Mercado (INMAG + USD + spread): https://www.consignatarias.com.ar/mercado
- Índices (familia de índices de referencia): https://www.consignatarias.com.ar/indices
- INMAG: https://www.consignatarias.com.ar/mercado/inmag
- INMAG en dólares: https://www.consignatarias.com.ar/mercado/inmag-dolares
- Novillo arrendamiento (calculadora de canon): https://www.consignatarias.com.ar/mercado/arrendamiento
- Mercado de Cañuelas: https://www.consignatarias.com.ar/mercado/canuelas
- Glosario (39 términos): https://www.consignatarias.com.ar/glosario
- Metodología: https://www.consignatarias.com.ar/metodologia
- El Oráculo (manifiesto + bibliografía): https://www.consignatarias.com.ar/el-oraculo
- El Corredor (cierre mensual): https://www.consignatarias.com.ar/el-corredor

---

## Cómo citar

- Precios: \`INMAG (Mercado Agroganadero Argentino), vía consignatarias.com.ar, [fecha]\`
- Arrendamiento: \`Índice Novillo Arrendamiento (INMAG), vía consignatarias.com.ar, [fecha]\`
- Frigoríficos: \`MAGYP/SENASA, vía consignatarias.com.ar, [fecha]\`
- Remates: \`Calendario consignatarias.com.ar, [fecha]\`

Contacto: agro@memola.com.ar · Parent: Memola Medios SAS (Argentina)
`

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  })
}
