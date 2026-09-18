/**
 * ficha.ts — la "ficha de la empresa" de un frigorífico, armada con lo que el repo YA tiene.
 *
 * Quien llega a /frigorificos/[cuit] desde Google casi siempre pegó un CUIT (GSC, 28 días al
 * 13-09-2026: "30500120882", "cuit 30517307099", "granja tres arroyos cuit"). Está verificando
 * una empresa, no buscando dónde faenar. Un buscador de CUIT le responde razón social,
 * domicilio, estado y actividad en la primera línea; nosotros teníamos todo eso repartido en
 * tres paneles y con la localidad escondida en el registro SENASA, que sólo se mostraba abajo.
 *
 * Fuentes (todas locales, ninguna inventada):
 *   - frigorificos.json          → cuit, name, matrícula, provincia, etapa, senasaActive, senasaLastSeen
 *   - frigorificos-enriched.json → localidad, dirección, grupo, tipo, capacidad de faena (363 CUIT)
 *   - senasa-habilitados.json    → propietario, localidad, partido, nº oficial, ciclos, actividades (869 CUIT)
 *
 * Si un campo no está en ninguna fuente, la ficha no lo muestra. No hay defaults de relleno.
 */
import frigorificosData from '@/lib/data/frigorificos.json'
import frigorificosEnrichedData from '@/lib/data/frigorificos-enriched.json'
import { getSenasaRecord, getSenasaScrapedDate, type SenasaRecord } from '@/lib/data/senasa-habilitados'

interface BasicFrigorifico {
  cuit: string
  name: string
  matricula: string
  province: string
  stage: number
  senasaActive?: boolean
  senasaLastSeen?: string | null
}

interface EnrichedFrigorifico {
  cuit: string
  localidad: string | null
  direccion: string | null
  grupoEmpresario: string | null
  tipo: string | null
  volumenFaena: number | string | null
  notas: string | null
}

const basicos = frigorificosData as BasicFrigorifico[]
const enriquecidos = frigorificosEnrichedData as EnrichedFrigorifico[]
const enriquecidoPorCuit = new Map(enriquecidos.map((e) => [e.cuit, e]))

export interface FichaFrigorifico {
  cuit: string
  /** 30-50012088-2 */
  cuitFormateado: string
  /** Nombre con el que figura en el directorio (MAGYP). */
  nombre: string
  /** Titular según el padrón SENASA, sólo cuando difiere del nombre del directorio. */
  propietario: string | null
  provincia: string
  /** "Buenos Aires" */
  provinciaDisplay: string
  /** Localidad en Title Case. Perfil reclamado > enriquecido > padrón SENASA. */
  localidad: string | null
  /** Partido/departamento según SENASA, sólo cuando difiere de la localidad. */
  partido: string | null
  /** "Colon, Buenos Aires" o sólo la provincia si no hay localidad. */
  lugar: string
  direccion: string | null
  matricula: string
  /** Nº oficial SENASA, sólo cuando difiere de la matrícula. */
  nroOficial: string | null
  stage: number
  /** Ciclos del padrón SENASA ("CICLO I - MAT.FRIG."), ya legibles. */
  ciclos: string[]
  /** Categoría SENASA del establecimiento ("Matadero-frigorífico", "Elaborador", "Dador de frío"). */
  categoria: string | null
  actividades: string[]
  senasa: {
    vigente: boolean
    /** Fecha del padrón consultado, YYYY-MM-DD. */
    fechaPadron: string
    /** Última vez que el CUIT apareció en el padrón, YYYY-MM-DD (sólo si hoy no figura). */
    ultimaVez: string | null
  }
  grupoEmpresario: string | null
  tipo: string | null
  volumenFaena: number | null
  notas: string | null
}

export function formatCuit(cuit: string): string {
  if (cuit.length === 11) return `${cuit.slice(0, 2)}-${cuit.slice(2, 10)}-${cuit.slice(10)}`
  return cuit
}

const MINUSCULAS = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'e', 'o', 'en'])

/** "GONZALEZ CATAN" → "Gonzalez Catan"; "CIUDAD AUTONOMA DE BUENOS AIRES" → "Ciudad Autonoma de Buenos Aires". */
export function titleCaseLugar(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) => (i > 0 && MINUSCULAS.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ')
}

const PROVINCIA_DISPLAY: Record<string, string> = {
  'BUENOS AIRES': 'Buenos Aires',
  'CIUDAD AUTONOMA DE BUENOS AIRES': 'CABA',
  CORDOBA: 'Córdoba',
  'ENTRE RIOS': 'Entre Ríos',
  NEUQUEN: 'Neuquén',
  'RIO NEGRO': 'Río Negro',
  TUCUMAN: 'Tucumán',
}
export function provinciaDisplay(p: string): string {
  return PROVINCIA_DISPLAY[p] ?? titleCaseLugar(p)
}

/** "CICLO I - MAT.FRIG." → "Ciclo I · Matadero-frigorífico" */
const CICLO_LABEL: Record<string, string> = {
  'CICLO I - MAT.FRIG.': 'Ciclo I · Matadero-frigorífico',
  'CICLO II - ELABORADOR': 'Ciclo II · Elaborador',
  'CICLO III - DADOR DE FRIO': 'Ciclo III · Dador de frío',
}
const CATEGORIA: Record<string, string> = {
  'CICLO I - MAT.FRIG.': 'Matadero-frigorífico',
  'CICLO II - ELABORADOR': 'Elaborador',
  'CICLO III - DADOR DE FRIO': 'Dador de frío',
}
export function cicloLabel(c: string): string {
  return CICLO_LABEL[c] ?? c
}

/** "2026-09-14" → "14/09/2026" */
export function fechaAR(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso
}

/** Compara nombres ignorando puntuación, espacios y mayúsculas (COOP. LTDA. ≈ COOP LTDA). */
function mismoNombre(a: string, b: string): boolean {
  const n = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '')
  return n(a) === n(b)
}

/** Ficha de un CUIT, o null si no está en el directorio. `localidadPerfil` es la del perfil reclamado (Supabase). */
export function getFichaFrigorifico(cuit: string, localidadPerfil?: string | null): FichaFrigorifico | null {
  const b = basicos.find((x) => x.cuit === cuit)
  if (!b) return null
  const e = enriquecidoPorCuit.get(cuit) ?? null
  const s: SenasaRecord | null = getSenasaRecord(cuit)

  const localidadRaw = localidadPerfil || e?.localidad || (s?.localidad ? titleCaseLugar(s.localidad) : null) || null
  const localidad = localidadRaw ? localidadRaw.trim() : null
  const partidoRaw = s?.partido ? titleCaseLugar(s.partido) : null
  const provDisplay = provinciaDisplay(b.province)
  const lugar =
    localidad && !mismoNombre(localidad, provDisplay) && !mismoNombre(localidad, b.province)
      ? `${localidad}, ${provDisplay}`
      : provDisplay

  const vol = e?.volumenFaena != null ? Number(e.volumenFaena) : NaN

  return {
    cuit: b.cuit,
    cuitFormateado: formatCuit(b.cuit),
    nombre: b.name,
    propietario: s?.propietario && !mismoNombre(s.propietario, b.name) ? s.propietario : null,
    provincia: b.province,
    provinciaDisplay: provDisplay,
    localidad,
    partido: partidoRaw && localidad && mismoNombre(partidoRaw, localidad) ? null : partidoRaw,
    lugar,
    direccion: e?.direccion || null,
    matricula: b.matricula,
    nroOficial: s?.nroOficial && s.nroOficial !== b.matricula ? s.nroOficial : null,
    stage: b.stage,
    ciclos: (s?.ciclos ?? []).map(cicloLabel),
    categoria: s?.tipo ? (CATEGORIA[s.tipo] ?? s.tipo) : null,
    actividades: s?.actividades ?? [],
    senasa: {
      vigente: s !== null,
      fechaPadron: getSenasaScrapedDate(),
      ultimaVez: s === null && b.senasaLastSeen ? b.senasaLastSeen : null,
    },
    grupoEmpresario: e?.grupoEmpresario || null,
    tipo: e?.tipo || null,
    volumenFaena: Number.isFinite(vol) && vol > 0 ? vol : null,
    notas: e?.notas || null,
  }
}

/** Frase de estado para la meta description y el JSON-LD: "vigente al 14/09/2026" / "no figura en el padrón del 14/09/2026". */
export function estadoSenasaTexto(f: FichaFrigorifico): string {
  if (f.senasa.vigente) return `vigente al ${fechaAR(f.senasa.fechaPadron)}`
  const base = `no figura en el padrón del ${fechaAR(f.senasa.fechaPadron)}`
  return f.senasa.ultimaVez ? `${base} (figuró hasta el ${fechaAR(f.senasa.ultimaVez)})` : base
}

/**
 * Otros frigoríficos de la misma provincia, priorizando los del mismo partido/localidad
 * (según el padrón SENASA) — recorre el directorio completo, no sólo los enriquecidos.
 */
export interface FrigorificoRelacionado {
  cuit: string
  nombre: string
  matricula: string
  localidad: string | null
  provincia: string
  mismoPartido: boolean
}
export function frigorificosRelacionados(cuit: string, provincia: string, cap = 6): FrigorificoRelacionado[] {
  const propio = getSenasaRecord(cuit)
  const partidoPropio = propio?.partido ?? null
  const out: FrigorificoRelacionado[] = []
  for (const f of basicos) {
    if (f.cuit === cuit || f.province !== provincia) continue
    const s = getSenasaRecord(f.cuit)
    const e = enriquecidoPorCuit.get(f.cuit)
    const localidad = e?.localidad || (s?.localidad ? titleCaseLugar(s.localidad) : null) || null
    out.push({
      cuit: f.cuit,
      nombre: f.name,
      matricula: f.matricula,
      localidad,
      provincia: f.province,
      mismoPartido: Boolean(partidoPropio && s?.partido === partidoPropio),
    })
  }
  out.sort(
    (a, b) =>
      Number(b.mismoPartido) - Number(a.mismoPartido) ||
      Number(Boolean(b.localidad)) - Number(Boolean(a.localidad)) ||
      a.nombre.localeCompare(b.nombre),
  )
  return out.slice(0, cap)
}
