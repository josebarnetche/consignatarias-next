/**
 * Capa Sanidad / SENASA — reglas del régimen sanitario ganadero argentino,
 * codificadas desde resoluciones SENASA PÚBLICAS, cada una con su cita.
 *
 * REGLA DE ORO (contenido regulatorio): todo dato acá lleva su `fuente`
 * (Nº de resolución + URL oficial). Para fechas/reglas que dependen del Plan
 * Local del Ente Sanitario o de anexos geográficos, representamos la VENTANA y
 * remitimos a la resolución — nunca afirmamos un día exacto que no podemos citar.
 * Ver [[consignatarias-datos-reales-rule]].
 *
 * Fuente maestra de normativa: Digesto Normativo SENASA (https://digesto.senasa.gob.ar).
 * NO cubre emisión de DT-e / SIGSA / padrón RENSPA (detrás de clave fiscal ARCA).
 */

export const SANIDAD_DISCLAIMER =
  'Información sanitaria de referencia, codificada desde resoluciones SENASA públicas y citada. ' +
  'No reemplaza la consulta a SENASA ni al Ente Sanitario local: los días exactos de vacunación los fija el Plan Local del ente, ' +
  'y los límites geográficos de las zonas/barreras están en los anexos de cada resolución. Verificar vigencia antes de operar.'

export interface Fuente {
  norma: string // ej. "Res. SENASA 711/2025"
  titulo: string
  url: string
}

export const FUENTES: Record<string, Fuente> = {
  ley_24305: { norma: 'Ley 24.305', titulo: 'Sanidad Animal', url: 'https://www.argentina.gob.ar/normativa/nacional/ley-24305-701/texto' },
  aftosa_plan: { norma: 'Res. SENASA 5/2001', titulo: 'Plan Nacional de Erradicación de la Fiebre Aftosa', url: 'https://www.argentina.gob.ar/senasa/programas-sanitarios/cadena-animal/bovinos-y-bubalinos/bovinos-y-bubalinos-produccion-primaria/fiebre-aftosa' },
  aftosa_calendario_2026: { norma: 'Res. SENASA 711/2025', titulo: 'Calendario de vacunación antiaftosa 2026', url: 'https://www.argentina.gob.ar/noticias/calendario-de-vacunacion-2026-para-las-campanas-contra-la-fiebre-aftosa' },
  aftosa_2027: { norma: 'Res. SENASA 201/2026', titulo: 'Elección de veterinario privado acreditado para vacunar (anunciada para 2027 — verificar vigencia)', url: 'https://digesto.senasa.gob.ar/' },
  brucelosis_plan: { norma: 'Res. SENASA 67/2019', titulo: 'Plan Nacional de Control y Erradicación de Brucelosis Bovina', url: 'https://www.argentina.gob.ar/normativa/nacional/resoluci%C3%B3n-67-2019-319485/texto' },
  brucelosis_estrategica: { norma: 'Res. SENASA 957/2024', titulo: 'Vacunación estratégica RB51 y DeltaPGM en adultas', url: 'https://www.argentina.gob.ar/noticias/avanza-vacunacion-estrategica-antibrucelica-con-cepas-rb51-y-deltapgm' },
  brucelosis_movimiento: { norma: 'Res. SENASA 421/2025', titulo: 'Requisitos serológicos de brucelosis para movimiento/exposiciones', url: 'https://www.argentina.gob.ar/normativa/nacional/resoluci%C3%B3n-421-2025-413903/texto' },
  tuberculosis_plan: { norma: 'Res. SENASA 128/2012', titulo: 'Plan Nacional de Control y Erradicación de la Tuberculosis Bovina', url: 'https://www.argentina.gob.ar/senasa/programas-sanitarios/cadena-animal/bovinos-y-bubalinos/bovinos-y-bubalinos-producci%C3%B3n-primaria/tuberculosis-bovina' },
  garrapata_plan: { norma: 'Res. SENASA 382/2017', titulo: 'Plan Nacional de Control y/o Erradicación de la Garrapata del Bovino', url: 'https://www.argentina.gob.ar/normativa/nacional/resoluci%C3%B3n-382-2017-275903/actualizacion' },
  garrapata_actualizacion: { norma: 'Res. SENASA 917/2024', titulo: 'Actualización del Plan Nacional de la Garrapata', url: 'https://www.argentina.gob.ar/normativa/nacional/resoluci%C3%B3n-917-2024-402629/texto' },
  transporte: { norma: 'Res. SENASA 723/2025', titulo: 'Verificación de habilitación de medios de transporte de animales', url: 'https://www.argentina.gob.ar/normativa/nacional/resoluci%C3%B3n-723-2025-417744/texto' },
  dte: { norma: 'DT-e (SIGSA)', titulo: 'Documento de Tránsito electrónico', url: 'https://www.argentina.gob.ar/senasa/micrositios/dte' },
  renspa: { norma: 'RENSPA', titulo: 'Registro Nacional Sanitario de Productores Agropecuarios', url: 'https://www.argentina.gob.ar/senasa/micrositios/renspa' },
  renspa_consulta: { norma: 'Consulta pública RENSPA', titulo: 'Búsqueda de Productores Agropecuarios', url: 'https://aps2.senasa.gov.ar/registros/faces/publico/personas/tc_productoresagropecuarios.jsp' },
  renspa_formato: { norma: 'RENSPA — estructura del código', titulo: '17 caracteres, formato 00.000.0.00000.00 (Infoleg / Instructivo MAGyP)', url: 'https://servicios.infoleg.gob.ar/infolegInternet/anexos/65000-69999/69503/norma.htm' },
}

// ── RENSPA: validación/decodificación de estructura ──────────────────────────
// Formato oficial: 17 caracteres, máscara 00.000.0.00000.00
//   PP (provincia) · DDD (departamento/partido) · J (jurisdicción de oficina local)
//   · EEEEE (predio/establecimiento, único en el departamento) · RR (productor en el predio)
export interface RenspaDecode {
  valido: boolean
  normalizado?: string
  provincia?: string
  departamento?: string
  jurisdiccion?: string
  establecimiento?: string
  productor?: string
  error?: string
}

export function decodeRenspa(input: string): RenspaDecode {
  const raw = (input || '').trim()
  const digits = raw.replace(/\D/g, '')
  // 17 caracteres en total, de los cuales 13 son dígitos (los otros 4 son los puntos
  // del formato 00.000.0.00000.00): provincia(2)+departamento(3)+jurisdicción(1)+predio(5)+productor(2).
  if (digits.length !== 13) {
    return { valido: false, error: `El RENSPA tiene 13 dígitos (formato 00.000.0.00000.00, 17 caracteres con los puntos); recibí ${digits.length}.` }
  }
  const normalizado = `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 6)}.${digits.slice(6, 11)}.${digits.slice(11, 13)}`
  return {
    valido: true,
    normalizado,
    provincia: digits.slice(0, 2),
    departamento: digits.slice(2, 5),
    jurisdiccion: digits.slice(5, 6),
    establecimiento: digits.slice(6, 11),
    productor: digits.slice(11, 13),
  }
}

// ── DT-e (Documento de Tránsito electrónico) — ficha de referencia ───────────
export const DTE_INFO = {
  que_es:
    'El DT-e (Documento de Tránsito electrónico) ampara y habilita el tránsito de animales vivos y subproductos en todo el territorio nacional. Reemplaza al DTA en papel. Es el "número de tropa" que identifica cada movimiento de hacienda (por ejemplo, la tropa que llega a un remate o a faena).',
  emision:
    'Se emite en el sistema SIGSA de SENASA. Requiere: RENSPA vigente (origen y destino), clave fiscal ARCA con el servicio habilitado, CBU para el pago de aranceles (SIGAD) y conexión. Si lo gestiona un tercero (consignatario/transportista), necesita autorización del titular del RENSPA. La autogestión es obligatoria cuando interviene un consignatario o un feedlot.',
  requisitos_sanitarios:
    'Al emitir el DT-e, SIGSA valida los requisitos sanitarios del movimiento: RENSPA vigente, vacunación antiaftosa al día según campaña, serología de brucelosis cuando corresponde (Res. 421/2025) y barrera de garrapata si cruza la zona. Ver la tool sanidad_requisitos_movimiento.',
  no_publico:
    'La emisión y consulta del DT-e NO tienen API pública abierta: viven detrás de la clave fiscal ARCA en SIGSA. Esta herramienta explica qué es y qué se necesita; no emite ni consulta el DT-e real.',
  fuentes: ['dte', 'transporte'] as string[],
}

// ── Planes sanitarios (fichas de enfermedad) ────────────────────────────────
export interface PlanSanitario {
  id: 'aftosa' | 'brucelosis' | 'tuberculosis' | 'garrapata'
  enfermedad: string
  agente: string
  especies: string[]
  obligatorio: boolean
  regimen: string
  categorias_afectadas: string
  resumen: string
  zoonosis: boolean
  fuentes: string[] // keys de FUENTES
}

export const PLANES: PlanSanitario[] = [
  {
    id: 'aftosa',
    enfermedad: 'Fiebre aftosa',
    agente: 'Virus de la fiebre aftosa (Aphthovirus)',
    especies: ['bovinos', 'bubalinos'],
    obligatorio: true,
    regimen: 'Vacunación sistemática en la zona libre CON vacunación, según calendario anual. La zona libre SIN vacunación (Patagonia, Valles de Calingasta) no vacuna.',
    categorias_afectadas: '1ra campaña: la totalidad de las categorías bovinas y bubalinas. 2da campaña: solo terneros y terneras (refuerzo).',
    resumen:
      'Plan Nacional de Erradicación (Res. 5/2001). SENASA fija la estrategia; los ~303 Entes Sanitarios ejecutan la vacunación en campo, con Planes Locales aprobados por CONALFA y coordinados con las COPROSA. Cambio anunciado para 2027 (Res. 201/2026, verificar vigencia): el productor podría elegir veterinario privado acreditado para aplicar la vacuna.',
    zoonosis: false,
    fuentes: ['aftosa_plan', 'aftosa_calendario_2026', 'aftosa_2027', 'ley_24305'],
  },
  {
    id: 'brucelosis',
    enfermedad: 'Brucelosis bovina',
    agente: 'Brucella abortus',
    especies: ['bovinos', 'bubalinos'],
    obligatorio: true,
    regimen:
      'Vacunación obligatoria con cepa B19 al 100% de las terneras de 3 a 8 meses, en simultáneo con las campañas antiaftosa, en todo el país salvo la zona libre de brucelosis y tuberculosis (Tierra del Fuego, Antártida e Islas del Atlántico Sur). Res. 957/2024 suma vacunación estratégica voluntaria (RB51 / DeltaPGM) en hembras adultas ≥24 meses en establecimientos con casos.',
    categorias_afectadas: 'Terneras de 3 a 8 meses (B19, obligatoria). Adultas ≥24 meses (RB51/DeltaPGM, estratégica voluntaria).',
    resumen:
      'Plan Nacional de Control y Erradicación (Res. 67/2019). Para movimiento/exposiciones (Res. 421/2025): machos >6 meses y hembras >18 meses requieren 1 diagnóstico serológico negativo dentro de los 60 días corridos previos; exentos los provenientes de Establecimiento Libre de Brucelosis Bovina.',
    zoonosis: true,
    fuentes: ['brucelosis_plan', 'brucelosis_estrategica', 'brucelosis_movimiento'],
  },
  {
    id: 'tuberculosis',
    enfermedad: 'Tuberculosis bovina',
    agente: 'Mycobacterium bovis',
    especies: ['bovinos', 'bubalinos'],
    obligatorio: true,
    regimen:
      'Control y erradicación basado en diagnóstico (tuberculinización) y saneamiento, con foco en tambos y establecimientos de genética. Ingreso obligatorio al plan de todo establecimiento con lesiones compatibles detectadas en faena.',
    categorias_afectadas: 'Bovinos, con énfasis en rodeos lecheros y de genética.',
    resumen: 'Plan Nacional de Control y Erradicación (Res. 128/2012). Zoonosis: Mycobacterium bovis afecta también a las personas.',
    zoonosis: true,
    fuentes: ['tuberculosis_plan'],
  },
  {
    id: 'garrapata',
    enfermedad: 'Garrapata común del bovino y Tristeza',
    agente: 'Rhipicephalus (Boophilus) microplus; Tristeza = Babesia spp. + Anaplasma spp.',
    especies: ['bovinos'],
    obligatorio: true,
    regimen:
      'Esquema de barrera: zona libre (indemne) vs zona de control/erradicación (infestada), con tratamientos garrapaticidas obligatorios y baños/certificación para cruzar la barrera. Res. 917/2024 actualiza las estrategias de tratamiento.',
    categorias_afectadas: 'Bovinos que se mueven a través de la barrera zoosanitaria.',
    resumen:
      'Plan Nacional de Control y/o Erradicación de la Garrapata (Ley 12.566, Dec. 7623/1954, Res. 382/2017, act. Res. 917/2024). La Tristeza bovina (babesiosis + anaplasmosis) es transmitida por la garrapata. Los límites geográficos exactos de la barrera están en los anexos de la Res. 382/2017 y modificatorias.',
    zoonosis: false,
    fuentes: ['garrapata_plan', 'garrapata_actualizacion'],
  },
]

// ── Zonas sanitarias de aftosa (a nivel provincia; los límites finos están en resolución) ──
// estado: 'con_vacunacion' | 'sin_vacunacion' | 'mixta'
export interface ZonaAftosaProvincia {
  provincia: string
  estado: 'con_vacunacion' | 'sin_vacunacion' | 'mixta'
  nota?: string
}

export const ZONAS_AFTOSA: ZonaAftosaProvincia[] = [
  // Zona libre SIN vacunación — Patagonia + Valles de Calingasta (Res. programa aftosa)
  { provincia: 'Tierra del Fuego', estado: 'sin_vacunacion' },
  { provincia: 'Santa Cruz', estado: 'sin_vacunacion' },
  { provincia: 'Chubut', estado: 'sin_vacunacion' },
  { provincia: 'Río Negro', estado: 'mixta', nota: 'Patagonia Norte A/B sin vacunación (al sur del río Colorado/Negro); verificar límite exacto por resolución.' },
  { provincia: 'Neuquén', estado: 'mixta', nota: 'Parte en zona sin vacunación (Patagonia); verificar límite exacto por resolución.' },
  { provincia: 'San Juan', estado: 'mixta', nota: 'Valles de Calingasta: zona sin vacunación. El resto de la provincia, con vacunación.' },
  // Zona libre CON vacunación — norte y centro (unificada mayo 2025)
  ...['Buenos Aires', 'Córdoba', 'Santa Fe', 'Entre Ríos', 'La Pampa', 'Corrientes', 'Misiones', 'Chaco', 'Formosa', 'Santiago del Estero', 'Tucumán', 'Salta', 'Jujuy', 'Catamarca', 'La Rioja', 'Mendoza', 'San Luis'].map(
    (provincia): ZonaAftosaProvincia => ({ provincia, estado: 'con_vacunacion' }),
  ),
]

// ── Calendario de vacunación antiaftosa 2026 (Res. SENASA 711/2025) ──────────
// Ventanas por campaña; el DÍA exacto por distrito lo fija el Plan Local del Ente.
export interface CampanaAftosa {
  campana: '1ra' | '2da'
  ventana: string
  categorias: string
  detalle: string
}

export const CALENDARIO_AFTOSA_2026: CampanaAftosa[] = [
  {
    campana: '1ra',
    ventana: 'Enero a abril 2026',
    categorias: 'Totalidad de las categorías bovinas y bubalinas',
    detalle:
      'Arranque temprano en enero (Jujuy, Catamarca, Tucumán). El grueso del país en torno al 2 y 9 de marzo (Buenos Aires, Santa Fe, Córdoba, Entre Ríos, La Pampa, San Luis, Mendoza, San Juan, Corrientes, Misiones, Chaco, Formosa, Santiago del Estero, Catamarca, Jujuy). Regiones diferenciadas de Salta y La Rioja en abril. Los feedlots pueden optar por vacunación estratégica al ingreso (exentos del 1er ciclo sistemático). El día exacto por distrito lo fija el Plan Local del Ente Sanitario.',
  },
  {
    campana: '2da',
    ventana: 'Segundo semestre 2026 (según Plan Local)',
    categorias: 'Solo terneros y terneras (refuerzo)',
    detalle:
      'Desde 2025/2026 la 2da campaña vacuna únicamente terneros y terneras; se dejan de vacunar sistemáticamente vaquillonas, novillos, novillitos y toritos. Verificar la fecha del distrito con el Ente Sanitario.',
  },
]

// ── Requisitos sanitarios de movimiento (bovinos) ────────────────────────────
export interface RequisitoMovimiento {
  concepto: string
  regla: string
  fuentes: string[]
}

export const REQUISITOS_MOVIMIENTO: RequisitoMovimiento[] = [
  {
    concepto: 'RENSPA',
    regla: 'Origen y destino deben tener RENSPA vigente. Sin RENSPA no se emite el DT-e ni se registra la vacunación.',
    fuentes: ['renspa'],
  },
  {
    concepto: 'DT-e (Documento de Tránsito electrónico)',
    regla: 'Todo movimiento de animales vivos se ampara con DT-e, emitido en SIGSA (requiere clave fiscal ARCA). Reemplaza al DTA en papel. Autogestión obligatoria cuando interviene consignatario o feedlot.',
    fuentes: ['dte'],
  },
  {
    concepto: 'Aftosa al día',
    regla: 'En la zona con vacunación, los animales deben estar con la vacunación antiaftosa vigente según la campaña. Los movimientos hacia/desde la zona sin vacunación (Patagonia) tienen requisitos diferenciales por la barrera zoosanitaria.',
    fuentes: ['aftosa_calendario_2026'],
  },
  {
    concepto: 'Brucelosis (serología para movimiento/exposiciones)',
    regla: 'Machos >6 meses y hembras >18 meses: 1 diagnóstico serológico negativo dentro de los 60 días corridos previos. Exentos los provenientes de Establecimiento Libre de Brucelosis Bovina.',
    fuentes: ['brucelosis_movimiento'],
  },
  {
    concepto: 'Barrera de garrapata',
    regla: 'Para cruzar de zona infestada (control/erradicación) a zona libre se exige tratamiento garrapaticida y baño/certificación. Los límites de la barrera están en los anexos de la Res. 382/2017 y modificatorias.',
    fuentes: ['garrapata_plan', 'garrapata_actualizacion'],
  },
  {
    concepto: 'Transporte',
    regla: 'El medio de transporte de animales debe estar habilitado (Res. 723/2025 establece el plan de verificación).',
    fuentes: ['transporte'],
  },
]

// ── Helpers ──────────────────────────────────────────────────────────────────
export function fuentesDe(keys: string[]): Fuente[] {
  return keys.map((k) => FUENTES[k]).filter(Boolean)
}

export function planPorId(id: string): PlanSanitario | undefined {
  return PLANES.find((p) => p.id === id.toLowerCase().trim())
}

export function zonaAftosaDe(provincia: string): ZonaAftosaProvincia | undefined {
  const q = provincia.toLowerCase().trim()
  return ZONAS_AFTOSA.find((z) => z.provincia.toLowerCase() === q || z.provincia.toLowerCase().includes(q))
}
