/**
 * Constructores puros de schema.org (sin JSX) — la lógica que antes vivía suelta en
 * src/components/seo/JsonLd.tsx y en cada página. Están acá para poder testearlos
 * (vitest corre en node y no importa .tsx) y para que la regla viva en UN lugar:
 * la URL de cada Event, la zona horaria, la licencia de cada Dataset, el @id de la org.
 *
 * Los componentes de JsonLd.tsx los envuelven en <script type="application/ld+json">
 * con jsonLd(). Nada de acá importa datos pesados (remates.json, perfiles): lo
 * importa JsonLd.tsx, que también llega a componentes cliente.
 */
import { rematePath, type RemateSlugInput } from '@/lib/remate-slug'
import { getCity, provinciaNombre } from '@/lib/ui/tokens'

/* ------------------------------------------------------------------ */
/*  ENTIDAD: la org y el sitio, con @id estable                         */
/* ------------------------------------------------------------------ */

export const SITE = 'https://www.consignatarias.com.ar'
/** @id de la Organization (la emite el layout raíz). Todo publisher/author/creator propio la referencia. */
export const ORG_ID = `${SITE}/#org`
export const WEBSITE_ID = `${SITE}/#website`
export const ORG_REF = { '@id': ORG_ID } as const
/** Nombre de la marca, tal cual se escribe en todo el sitio. */
export const MARCA = 'consignatarias.com.ar'
/** Razón social (legalName de la org; seller de lo que se factura). */
export const RAZON_SOCIAL = 'Memola Medios SAS'

/* ------------------------------------------------------------------ */
/*  LICENCIAS de los Dataset (ver /licencia-datos)                      */
/* ------------------------------------------------------------------ */

/** Compilaciones e índices propios: citar es libre, republicar se licencia. */
export const LICENCIA_PROPIA = `${SITE}/licencia-datos`
/** Solo para lo que se publica declaradamente abierto (p. ej. /valor-tierra.json). */
export const LICENCIA_CC_BY = 'https://creativecommons.org/licenses/by/4.0/'

/** Fuente de las series ajenas (INMAG y categorías del MAG): se cita, no se licencia. */
export const FUENTE_MAG = {
  name: 'Mercado Agroganadero de Cañuelas',
  url: 'https://www.mercadoagroganadero.com.ar',
} as const

/** Descargas públicas para `distribution` de los Dataset. */
export const DESCARGA_PRECIOS = {
  url: `${SITE}/precios.json`,
  encodingFormat: 'application/json',
  name: 'Precios del día (INMAG y categorías)',
} as const
export const DESCARGA_SERIE_INMAG = {
  url: `${SITE}/api/market/history`,
  encodingFormat: 'application/json',
  name: 'Serie diaria del INMAG',
} as const
export const DESCARGA_VALOR_TIERRA = {
  url: `${SITE}/valor-tierra.json`,
  encodingFormat: 'application/json',
  name: 'Valor de la tierra por provincia y zona',
} as const

export const OG_REMATES = `${SITE}/og-remates.png`

/* ------------------------------------------------------------------ */
/*  FECHAS                                                              */
/* ------------------------------------------------------------------ */

const ART_OFFSET_MS = 3 * 3600 * 1000

/** Fecha de hoy en Argentina (UTC-3, sin horario de verano), "YYYY-MM-DD". */
export function hoyART(now: Date = new Date()): string {
  return new Date(now.getTime() - ART_OFFSET_MS).toISOString().slice(0, 10)
}

/**
 * `priceValidUntil` de lo que vendemos: fin del año SIGUIENTE al actual. Una fecha
 * fija ('2026-12-31') vencía sola y el Offer pasaba a inválido sin que nadie tocara
 * nada; así siempre queda entre 12 y 24 meses por delante del build.
 */
export function finDelAnioSiguiente(now: Date = new Date()): string {
  return `${now.getUTCFullYear() + 1}-12-31`
}

/** "YYYY-MM-DDTHH:MM:00-03:00" a partir de un instante. */
function isoART(d: Date): string {
  return `${new Date(d.getTime() - ART_OFFSET_MS).toISOString().slice(0, 16)}:00-03:00`
}

const HORA_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/

/** Inicio de un remate: con hora → ISO con -03:00; sin hora → solo la fecha (válido para Event). */
export function remateStartDate(date: string, time?: string | null): string {
  const t = time?.trim()
  if (!t || !HORA_RE.test(t)) return date
  const [h, m] = t.split(':')
  return `${date}T${h.padStart(2, '0')}:${m}:00-03:00`
}

/**
 * Fin estimado: inicio + `horas`, con aritmética de fecha (antes sumaba 4 a la hora
 * como texto: perdía los minutos y con un remate a las 20:00 daba "T24:00", inválido).
 * Sin hora devuelve la misma fecha.
 */
export function remateEndDate(date: string, time?: string | null, horas = 4): string {
  const start = remateStartDate(date, time)
  if (start === date) return date
  return isoART(new Date(new Date(start).getTime() + horas * 3600 * 1000))
}

/* ------------------------------------------------------------------ */
/*  BREADCRUMB                                                          */
/* ------------------------------------------------------------------ */

export interface BreadcrumbNodo {
  name: string
  /** Sin url (o vacía) → el ListItem va sin `item`: válido para Google en el último nivel. */
  url?: string | null
}

export function buildBreadcrumbList(items: BreadcrumbNodo[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      ...(it.url ? { item: it.url } : {}),
    })),
  }
}

/* ------------------------------------------------------------------ */
/*  DATASET                                                             */
/* ------------------------------------------------------------------ */

export interface DatasetInput {
  name: string
  description: string
  url: string
  keywords?: string[]
  /**
   * OBLIGATORIA, para que nadie herede una licencia por defecto:
   * - compilación o índice propio → LICENCIA_PROPIA (/licencia-datos);
   * - publicado declaradamente abierto → LICENCIA_CC_BY;
   * - serie ajena (INMAG, categorías del MAG) → `null`, y se declara `fuente`.
   */
  license: string | null
  /** Serie de un tercero: va como creator, sourceOrganization e isBasedOn. Nosotros, como publisher. */
  fuente?: { name: string; url: string }
  /** Fecha REAL del último dato. Sin ella se omite (antes era la fecha del build: simulaba frescura). */
  dateModified?: string | null
  variableMeasured?: {
    name: string
    unitText: string
    value?: number
    observationDate?: string
  }
  temporalCoverage?: string
  distribution?: Array<{ url: string; encodingFormat: string; name?: string }>
  updateFrequency?: string
  /** Provincia o lugar que cubre; por defecto, Argentina. */
  spatialCoverage?: string
}

export function buildDataset(d: DatasetInput) {
  const fuente = d.fuente
    ? { '@type': 'Organization', name: d.fuente.name, url: d.fuente.url }
    : null
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: d.name,
    description: d.description,
    url: d.url,
    ...(d.keywords?.length ? { keywords: d.keywords.join(', ') } : {}),
    ...(d.dateModified ? { dateModified: d.dateModified } : {}),
    ...(fuente
      ? { creator: fuente, sourceOrganization: fuente, isBasedOn: d.fuente!.url, publisher: ORG_REF }
      : { creator: ORG_REF, publisher: ORG_REF }),
    ...(d.license ? { license: d.license } : {}),
    isAccessibleForFree: true,
    spatialCoverage: {
      '@type': 'Place',
      name: d.spatialCoverage?.trim() || 'Argentina',
    },
    ...(d.variableMeasured
      ? {
          variableMeasured: {
            '@type': 'PropertyValue',
            name: d.variableMeasured.name,
            unitText: d.variableMeasured.unitText,
            ...(d.variableMeasured.value != null ? { value: d.variableMeasured.value } : {}),
            ...(d.variableMeasured.observationDate
              ? { observationDate: d.variableMeasured.observationDate }
              : {}),
          },
        }
      : {}),
    ...(d.temporalCoverage ? { temporalCoverage: d.temporalCoverage } : {}),
    ...(d.updateFrequency ? { datasetTimeInterval: d.updateFrequency } : {}),
    ...(d.distribution?.length
      ? {
          distribution: d.distribution.map((x) => ({
            '@type': 'DataDownload',
            contentUrl: x.url,
            encodingFormat: x.encodingFormat,
            ...(x.name ? { name: x.name } : {}),
          })),
        }
      : {}),
  }
}

/* ------------------------------------------------------------------ */
/*  REMATE → Event                                                      */
/* ------------------------------------------------------------------ */

export interface RemateEventInput extends RemateSlugInput {
  title?: string | null
  consignatariaName: string
  location?: string | null
  time?: string | null
  description?: string | null
  estimatedHeads?: number | null
  youtubeUrl?: string | null
}

export interface RemateEventOpts {
  /** undefined → la ficha `/remates/{slug}`; null → sin url (remate sin ficha, p. ej. cargado por la firma). */
  url?: string | null
  /** URL del perfil de la consignataria en el sitio. */
  organizerUrl?: string
  name?: string
  description?: string
}

/** PostalAddress sin campos vacíos: ciudad solo si existe, provincia legible solo si existe. */
export function remateAddress(location?: string | null, province?: string | null) {
  const region = provinciaNombre(province)
  let city = getCity(location ?? '')
  // "Buenos Aires" como ciudad cuando es la provincia: no es una localidad.
  if (city && region && city.toLowerCase() === region.toLowerCase()) city = ''
  return {
    '@type': 'PostalAddress',
    ...(city ? { addressLocality: city } : {}),
    ...(region ? { addressRegion: region } : {}),
    addressCountry: 'AR',
  }
}

const esHttp = (u?: string | null): u is string => !!u && /^https?:\/\//i.test(u.trim())

export function buildRemateEvent(r: RemateEventInput, opts: RemateEventOpts = {}) {
  const address = remateAddress(r.location, r.province)
  // Place.name es requerido: ciudad → provincia → país. Nunca vacío.
  const placeName = address.addressLocality || address.addressRegion || 'Argentina'
  const place = { '@type': 'Place', name: placeName, address }
  const stream = esHttp(r.youtubeUrl) ? r.youtubeUrl.trim() : null
  const url = opts.url === undefined ? `${SITE}${rematePath(r)}` : opts.url
  const tipo = r.type || 'general'
  const name = opts.name || r.title?.trim() || `Remate ${tipo} - ${r.consignatariaName}`
  const description =
    opts.description ||
    r.description?.trim() ||
    `Remate de ${tipo} organizado por ${r.consignatariaName}${r.estimatedHeads ? ` (~${r.estimatedHeads} cabezas)` : ''}`

  return {
    '@type': 'Event',
    name,
    description,
    startDate: remateStartDate(r.date, r.time),
    endDate: remateEndDate(r.date, r.time),
    eventStatus: 'https://schema.org/EventScheduled',
    // Con transmisión: mixto, y la transmisión como VirtualLocation (Mixed sin
    // VirtualLocation es inválido). Sin transmisión: presencial.
    eventAttendanceMode: stream
      ? 'https://schema.org/MixedEventAttendanceMode'
      : 'https://schema.org/OfflineEventAttendanceMode',
    location: stream ? [place, { '@type': 'VirtualLocation', url: stream }] : place,
    image: [OG_REMATES],
    organizer: {
      '@type': 'Organization',
      name: r.consignatariaName,
      ...(opts.organizerUrl ? { url: opts.organizerUrl } : {}),
    },
    ...(url ? { url } : {}),
  }
}

/**
 * ItemList de remates. `numberOfItems` es la cantidad EMITIDA (antes declaraba el
 * total antes de cortar a 10: decía 263 y listaba 10).
 */
export function buildRematesItemList(
  remates: Array<{ remate: RemateEventInput; opts?: RemateEventOpts }>,
  { name, description, max = 10 }: { name: string; description?: string; max?: number },
) {
  const top = remates.slice(0, max)
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    ...(description ? { description } : {}),
    numberOfItems: top.length,
    itemListElement: top.map(({ remate, opts }, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: buildRemateEvent(remate, opts),
    })),
  }
}

/* ------------------------------------------------------------------ */
/*  VIDEO de la transmisión (YouTube)                                   */
/* ------------------------------------------------------------------ */

/** ID de 11 caracteres de una URL de YouTube (watch, youtu.be, embed, live, shorts). */
export function youtubeVideoId(url?: string | null): string | null {
  if (!url) return null
  const m = url.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/live\/|\/shorts\/|\/v\/)([A-Za-z0-9_-]{11})(?![A-Za-z0-9_-])/)
  return m ? m[1] : null
}

export interface RemateVideoInput {
  name: string
  description: string
  youtubeUrl?: string | null
  date: string
  time?: string | null
  publisherName?: string
  now?: Date
}

/**
 * VideoObject de la transmisión. Solo con un ID de video real (un canal no es un video).
 * - Sin `contentUrl`: tiene que ser el archivo de video, no la página de YouTube.
 * - Sin `duration` inventada.
 * - `uploadDate` nunca en el futuro: el inicio del remate o hoy, lo que sea menor.
 * - `isLiveBroadcast` solo el día del remate y en horario (−30 min a +5 h del inicio).
 */
export function buildRemateVideo(v: RemateVideoInput) {
  const id = youtubeVideoId(v.youtubeUrl)
  if (!id) return null
  const now = v.now ?? new Date()
  const start = remateStartDate(v.date, v.time)
  const startMs = new Date(start === v.date ? `${v.date}T00:00:00-03:00` : start).getTime()
  const uploadDate = startMs <= now.getTime() ? start : hoyART(now)
  const conHora = start !== v.date
  const enVivo =
    conHora &&
    v.date === hoyART(now) &&
    now.getTime() >= startMs - 30 * 60 * 1000 &&
    now.getTime() <= startMs + 5 * 3600 * 1000

  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: v.name,
    description: v.description,
    thumbnailUrl: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
    uploadDate,
    embedUrl: `https://www.youtube.com/embed/${id}`,
    ...(enVivo
      ? {
          publication: {
            '@type': 'BroadcastEvent',
            isLiveBroadcast: true,
            startDate: start,
            endDate: remateEndDate(v.date, v.time, 5),
          },
        }
      : {}),
    ...(v.publisherName ? { publisher: { '@type': 'Organization', name: v.publisherName } } : {}),
  }
}
