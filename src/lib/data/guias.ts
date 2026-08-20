/**
 * Índice de guías del sitio.
 *
 * Existían cincuenta páginas explicativas sin un solo lugar desde donde
 * llegar: se entraba por búsqueda y se salía. Esto las junta para el lector,
 * y de paso les da enlaces internos, que es lo que hace que el buscador las
 * trate como parte de un cuerpo y no como cincuenta hojas sueltas.
 */
export interface Guia {
  href: string
  label: string
  /** Una línea de qué resuelve. Sin esto el índice es una lista de links. */
  hint: string
}

export interface GrupoGuias {
  titulo: string
  /** Qué unifica al grupo, para que el índice se lea y no solo se escanee. */
  bajada: string
  guias: Guia[]
}

export const GUIAS: GrupoGuias[] = [
  {
    titulo: 'Vender hacienda',
    bajada: 'Cómo se vende, con quién, cuánto se lleva cada uno y qué queda de neto.',
    guias: [
      { href: '/vender-hacienda-guia', label: 'Cómo vender hacienda', hint: 'La guía completa del productor' },
      { href: '/como-vender-hacienda', label: 'Consignación, remate o venta directa', hint: 'Los tres caminos y cuándo conviene cada uno' },
      { href: '/vender-en-remate-vs-venta-directa-vs-consignacion', label: 'Comparativa de los tres canales', hint: 'Costos, tiempos y riesgo, lado a lado' },
      { href: '/conviene-vender-la-hacienda-ahora-o-esperar', label: '¿Conviene vender ahora o esperar?', hint: 'Qué mirar antes de decidir' },
      { href: '/como-leer-una-liquidacion-de-hacienda', label: 'Cómo leer una liquidación', hint: 'Renglón por renglón, qué te descuentan' },
      { href: '/cuanto-cobra-de-comision-una-consignataria', label: 'Cuánto cobra de comisión una consignataria', hint: 'Porcentajes reales del mercado' },
      { href: '/precio-de-tranquera', label: 'Precio de tranquera vs precio de mercado', hint: 'El neto que de verdad cobra el productor' },
      { href: '/cuanto-cuesta-el-flete-de-hacienda', label: 'Cuánto cuesta el flete', hint: 'La jaula por kilómetro y por piso' },
      { href: '/desbaste-de-la-hacienda', label: 'Qué es el desbaste (o merma)', hint: 'Cómo se calcula y cuánto pesa en el precio' },
    ],
  },
  {
    titulo: 'Campos: comprar, vender y tasar',
    bajada: 'Lo que cuesta la tierra, los papeles de la operación y cómo se pacta un arrendamiento.',
    guias: [
      { href: '/campos/valuar', label: '¿Cuánto vale mi campo?', hint: 'Tasador con 15 provincias y 52 zonas relevadas' },
      { href: '/como-comprar-un-campo', label: 'Cómo comprar un campo', hint: 'Qué papeles pedir antes de señar' },
      { href: '/como-vender-un-campo', label: 'Cómo vender un campo', hint: 'Precio, carpeta y tiempos reales' },
      { href: '/impuestos-por-la-venta-de-un-campo', label: 'Impuestos por la venta de un campo', hint: 'El ITI está derogado: qué rige hoy' },
      { href: '/creditos-para-comprar-un-campo', label: 'Créditos y financiación', hint: 'Cómo se paga un campo en cuotas' },
      { href: '/inmobiliarias-rurales', label: 'Inmobiliarias rurales', hint: 'Qué hacen, qué cobran y cómo elegir' },
      { href: '/como-publicar-un-campo', label: 'Cómo publicar tu campo', hint: 'Qué datos hacen que el aviso funcione' },
      { href: '/como-se-calcula-el-canon-de-arrendamiento', label: 'Cómo se calcula el canon', hint: 'Kilos de novillo por hectárea, explicado' },
      { href: '/impuesto-de-sellos-arrendamiento', label: 'Impuesto de sellos en el arrendamiento', hint: 'Alícuota por provincia' },
      { href: '/que-es-la-aparceria', label: 'Qué es la aparcería', hint: 'Contrato rural vs arrendamiento' },
      { href: '/que-es-la-capitalizacion-de-hacienda', label: 'Qué es la capitalización', hint: 'Contrato de pastoreo y engorde' },
    ],
  },
  {
    titulo: 'Precios y categorías',
    bajada: 'Qué se paga por cada categoría y cómo se lee un precio de hacienda.',
    guias: [
      { href: '/precio-del-novillo-en-pie', label: 'Precio del novillo en pie', hint: 'Referencia del día' },
      { href: '/precio-del-ternero-en-pie', label: 'Precio del ternero en pie', hint: 'La categoría que arranca el ciclo' },
      { href: '/precio-de-la-vaca-en-pie', label: 'Precio de la vaca en pie', hint: 'Conserva y manufactura' },
      { href: '/precio-de-la-carne-hoy', label: 'Precio de la carne hoy', hint: 'Del gancho a la góndola' },
      { href: '/cuanto-vale-una-vaca', label: 'Cuánto vale una vaca', hint: 'Por categoría y estado' },
      { href: '/cuanto-vale-un-toro', label: 'Cuánto vale un toro', hint: 'Reposición y genética' },
      { href: '/categorias-de-hacienda', label: 'Categorías de hacienda', hint: 'El mapa completo' },
      { href: '/novillo-vs-vaquillona', label: 'Novillo, novillito, vaquillona, ternero y vaca', hint: 'Diferencias y precios' },
      { href: '/cuanto-pesa-un-novillo', label: 'Cuánto pesa un novillo', hint: 'Pesos de referencia por categoría' },
      { href: '/cuanto-pesa-una-media-res', label: 'Cuánto pesa una media res', hint: 'Kilos y rinde' },
      { href: '/rendimiento-al-gancho', label: 'Rendimiento al gancho', hint: 'De kilo vivo a kilo res' },
    ],
  },
  {
    titulo: 'Producción',
    bajada: 'Cría, recría, invernada y cuánto puede sostener un campo.',
    guias: [
      { href: '/que-es-la-cria-y-recria', label: 'Qué es la cría y la recría', hint: 'Las dos primeras etapas' },
      { href: '/que-es-la-invernada', label: 'Qué es la invernada', hint: 'Del ternero al novillo' },
      { href: '/que-es-el-destete', label: 'Qué es el destete', hint: 'Y qué es el destete precoz' },
      { href: '/que-es-un-feedlot', label: 'Qué es un feedlot', hint: 'Engorde a corral' },
      { href: '/feedlot-vs-pastoril', label: 'Feedlot vs pastoril', hint: 'Qué conviene para engordar' },
      { href: '/que-es-el-equivalente-vaca', label: 'Qué es el equivalente vaca (EV)', hint: 'La unidad que ordena la receptividad' },
      { href: '/como-se-calcula-la-carga-animal', label: 'Cómo se calcula la carga animal', hint: 'EV por hectárea' },
      { href: '/razas-bovinas-argentina', label: 'Razas bovinas en Argentina', hint: 'Cuál para qué ambiente' },
    ],
  },
  {
    titulo: 'Remates y firmas',
    bajada: 'Cómo funciona un remate y cómo elegir con quién operar.',
    guias: [
      { href: '/que-es-una-consignataria', label: 'Qué es una consignataria', hint: 'Y cuánto cobra' },
      { href: '/como-elegir-consignataria', label: 'Cómo elegir una consignataria', hint: 'Qué mirar antes de entregar hacienda' },
      { href: '/como-abrir-una-consignataria', label: 'Cómo abrir una consignataria', hint: 'Matrícula, SIOCAL, SENASA y capital' },
      { href: '/como-funciona-un-remate-ganadero', label: 'Cómo funciona un remate', hint: 'Pujas, comisión y gastos' },
      { href: '/que-es-el-mag', label: 'Qué es el MAG', hint: 'Cañuelas, y por qué ya no es Liniers' },
      { href: '/que-es-el-rosgan', label: 'Qué es el ROSGAN', hint: 'Remate televisado y catálogo' },
      { href: '/que-es-una-tropa-de-hacienda', label: 'Qué es una tropa', hint: 'La unidad con la que se mueve la hacienda' },
    ],
  },
  {
    titulo: 'Trámites y sanidad',
    bajada: 'SENASA, RENSPA, DT-e y el calendario de vacunación.',
    guias: [
      { href: '/que-es-senasa', label: 'Qué es el SENASA', hint: 'Y qué controla' },
      { href: '/que-es-el-renspa', label: 'Qué es el RENSPA', hint: 'Alta gratis, paso a paso' },
      { href: '/que-es-el-dte', label: 'Qué es el DT-e', hint: 'Documento de tránsito electrónico' },
      { href: '/que-es-la-guia-de-hacienda', label: 'Qué es la guía de hacienda', hint: 'Guía única de traslado' },
      { href: '/como-sacar-el-boleto-de-marca', label: 'Cómo sacar el boleto de marca', hint: 'Marca y señal de ganado' },
      { href: '/calendario-sanitario-bovino', label: 'Calendario sanitario bovino', hint: 'Aftosa y plan sanitario' },
      { href: '/buenas-practicas', label: 'Buenas Prácticas Ganaderas', hint: '14 temas de la Guía Red BPA' },
    ],
  },
]

export const TOTAL_GUIAS = GUIAS.reduce((n, g) => n + g.guias.length, 0)
