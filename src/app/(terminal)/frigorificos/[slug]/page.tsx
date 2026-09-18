import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import frigorificosData from '@/lib/data/frigorificos.json'
import existenciasData from '@/lib/data/existencias-bovinas.json'
import { getFrigorificoProfile } from '@/lib/dal/frigorificos'
import { getFrigorificoPlanStatus, frigorificoPuedeInterprovincial } from '@/lib/features'
import { createServiceClient } from '@/lib/supabase'
import CompraMayorista, { type VitrinaProduct } from './CompraMayorista'
import BadgeConfianza from '@/components/frigorifico/BadgeConfianza'
import LoginGate from '@/components/LoginGate'
import FrigorificoLeadCapture from '@/components/leads/FrigorificoLeadCapture'
import FrigorificoConsultaGeneral from '@/components/leads/FrigorificoConsultaGeneral'
import { getDemandaFicha, VENTANA_DIAS } from '@/lib/demanda-fichas'
import SubscribeStrip from '@/components/SubscribeStrip'
import { BreadcrumbSchema, QAPageSchema } from '@/components/seo/JsonLd'
import {
  getSenasaRecord,
  getSenasaScrapedDate,
} from '@/lib/data/senasa-habilitados'
import { getCurrentSession } from '@/lib/user-tier'
import {
  getFichaFrigorifico,
  estadoSenasaTexto,
  fechaAR,
  formatCuit,
  frigorificosRelacionados,
  type FichaFrigorifico,
} from '@/lib/frigorificos/ficha'
import {
  isFrigorificoProvinceSlug,
  frigorificoProvinceSlugs,
  frigorificoProvinceMetadata,
  frigorificoProvinceSlugFor,
  frigorificoProvinceCount,
  FrigorificoProvinceView,
} from '../_views/FrigorificoProvinceView'

interface BasicFrigorifico {
  cuit: string
  name: string
  matricula: string
  province: string
  stage: number
  senasaActive?: boolean
  senasaLastSeen?: string | null
  source?: string
}

const frigorificos = frigorificosData as BasicFrigorifico[]

const EXISTENCIAS = existenciasData as unknown as Record<string, { total: number; year: number }>

// Cattle stock for a province ("Existencias bovinas en X: N cabezas").
function existenciasFor(province: string): { total: number; year: number } | null {
  return EXISTENCIAS[(province || '').toUpperCase()] ?? null
}

// Data-derived summary built from the establishment's own fields — unique per
// CUIT (name + matrícula + localidad vary), survives the boilerplate audit.
const CICLO_NOUN: Record<number, string> = {
  1: 'matadero-frigorífico de Ciclo I (faena y desposte)',
  2: 'sala de desposte de Ciclo II',
  3: 'depósito frigorífico de Ciclo III',
}
const TIPO_FRASE: Record<string, string> = {
  exportador: 'con perfil exportador',
  consumo_interno: 'orientado al consumo interno',
  consumo_local: 'orientado al consumo local',
  ambos: 'que abastece exportación y consumo interno',
}
function frigorificoSummary(f: {
  name: string; matricula: string; stage: number; localidad: string | null
  province: string; grupoEmpresario: string | null; tipo: string | null; volumenFaena: number | string | null
}): string {
  const lugar = f.localidad || f.province
  const ciclo = CICLO_NOUN[f.stage] ?? `establecimiento de etapa ${f.stage}`
  let s = `${f.name} es un ${ciclo} habilitado por SENASA/MAGYP bajo la matrícula ${f.matricula}, con sede en ${lugar} (${f.province}).`
  if (f.grupoEmpresario) s += ` Integra el ${f.grupoEmpresario}.`
  if (f.tipo) s += ` Es un establecimiento ${TIPO_FRASE[f.tipo] ?? `de tipo ${String(f.tipo).replace(/_/g, ' ')}`}.`
  const vol = Number(f.volumenFaena)
  if (Number.isFinite(vol) && vol > 0) s += ` Su capacidad declarada de faena es de ${vol.toLocaleString('es-AR')} cabezas por mes.`
  return s
}

// Other frigoríficos in the same province: anclas variadas sobre el directorio completo
// (antes recorría sólo los 363 enriquecidos; ahora prioriza el mismo partido SENASA).
function relatedFrigAnchor(r: { nombre: string; matricula: string; localidad: string | null; provincia: string }, i: number): string {
  const lugar = r.localidad || r.provincia
  switch (i % 4) {
    case 0: return r.nombre
    case 1: return `${r.nombre} — Mat. ${r.matricula}`
    case 2: return `${r.nombre} (${lugar})`
    default: return `${r.nombre}, frigorífico en ${lugar}`
  }
}

function stageName(stage: number): string {
  if (stage === 1) return 'Etapa 1 — Faena + Desposte'
  if (stage === 2) return 'Etapa 2 — Desposte'
  return 'Etapa 3 — Deposito'
}

function stageDescription(stage: number): string {
  // La Etapa/Ciclo describe el ESLABÓN PRODUCTIVO (faena/desposte/depósito),
  // NO la jurisdicción de tránsito. El alcance (federal / provincial / municipal)
  // depende de la habilitación del establecimiento, que el registro scrapeado no
  // acredita por sí solo — por eso NO se afirma "tránsito federal" acá (se explica
  // en genérico más abajo). Afirmarlo por establecimiento sin constancia es un
  // claim regulatorio sin base.
  if (stage === 1) return 'Planta habilitada para faena y desposte de reses.'
  if (stage === 2) return 'Planta habilitada para desposte y procesamiento de medias reses. Sin faena propia.'
  return 'Deposito frigorifico habilitado para almacenamiento y conservacion de carnes.'
}

// SENASA cycle explainer — reference content keyed to the establishment's
// actual stage. Helps a buyer/seller understand what this habilitación allows,
// and feeds long-tail queries ("qué es ciclo I", "tránsito federal frigorífico").
function cicloExplainer(stage: number): { ciclo: string; body: string } {
  if (stage === 1)
    return {
      ciclo: 'Ciclo I — Matadero-frigorífico',
      body: 'Establecimiento habilitado para faena: el animal llega en pie y se transforma en reses y medias reses. Es el eslabón donde la hacienda viva se convierte en carcasa, y suele integrar también el desposte en cortes.',
    }
  if (stage === 2)
    return {
      ciclo: 'Ciclo II — Desposte y procesamiento',
      body: 'Sala de desposte que recibe medias reses y las elabora en cortes y productos cárnicos. No realiza faena propia: trabaja sobre carne que ya pasó por un matadero (Ciclo I).',
    }
  return {
    ciclo: 'Ciclo III — Depósito y frío',
    body: 'Depósito frigorífico y dador de frío: almacenamiento y conservación de carnes bajo cadena de frío. No faena ni desposta — es la etapa logística de la cadena.',
  }
}

function stageColor(stage: number): string {
  if (stage === 1) return 'text-positive'
  if (stage === 2) return 'text-warning'
  return 'text-negative'
}

function stageBorderColor(stage: number): string {
  if (stage === 1) return 'border-positive/30'
  if (stage === 2) return 'border-warning/30'
  return 'border-negative/30'
}

export const dynamicParams = true

export function generateStaticParams() {
  // Merged route: CUIT slugs + province slugs.
  // Discrimination happens at runtime via isFrigorificoProvinceSlug.
  const cuitSlugs = frigorificos.map((f) => f.cuit)
  const provinceSlugs = frigorificoProvinceSlugs()
  const all = Array.from(new Set([...cuitSlugs, ...provinceSlugs]))
  return all.map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params

  // Province branch
  if (isFrigorificoProvinceSlug(slug)) {
    const meta = await frigorificoProvinceMetadata(slug)
    return meta ?? {}
  }

  // CUIT branch (original behavior)
  const cuit = slug
  const f = frigorificos.find((x) => x.cuit === cuit)
  if (!f) return { title: 'Frigorifico no encontrado' }

  // La localidad sale de la ficha (perfil enriquecido o padrón SENASA): antes se leía un
  // campo `localidad` que frigorificos.json no tiene, así que 4 de las 5 fichas con más
  // impresiones decían "BUENOS AIRES" donde el padrón ya tenía "Colon" o "Gonzalez Catan".
  const ficha = getFichaFrigorifico(cuit)
  const localidadStr = ficha?.lugar || f.province
  // El usuario pega el CUIT crudo (ej "30500120882") y la ficha rankea, pero si el título
  // muestra sólo la razón social no reconoce el match → CTR ~0. Arrancamos el título con el
  // CUIT formateado (el número pegado aparece literal en el SERP) seguido de la razón social.
  const title = `CUIT ${formatCuit(f.cuit)} — ${f.name} (Frigorífico SENASA, ${localidadStr})`
  // Description con la forma de respuesta de un buscador de CUIT: identificador, razón social,
  // lugar, estado con fecha. La búsqueda es "a quién pertenece este CUIT", no "dónde faenar".
  const estado = ficha ? estadoSenasaTexto(ficha) : 'según padrón'
  const description = ficha
    ? `CUIT ${ficha.cuitFormateado} · ${f.name} · ${localidadStr} · habilitación SENASA ${estado} · ${ficha.categoria ?? stageName(f.stage)}, Mat. ${f.matricula}. Datos oficiales SENASA/MAGYP.`
    : `CUIT ${formatCuit(f.cuit)} · ${f.name} · ${localidadStr} · ${stageName(f.stage)}, Mat. ${f.matricula}. Datos oficiales SENASA/MAGYP.`

  return {
    title,
    description,
    openGraph: {
      images: [{ url: '/og-frigorificos.png', width: 1200, height: 630 }],
      title,
      description,
      url: `https://www.consignatarias.com.ar/frigorificos/${f.cuit}`,
      type: 'website',
    },
    alternates: {
      canonical: `https://www.consignatarias.com.ar/frigorificos/${f.cuit}`,
    },
  }
}

// LocalBusiness (subtipo de Organization) con la ficha completa: identificador fiscal en los
// dos formatos, razón social/titular, dirección hasta donde el dato llega, y las propiedades
// registrales (matrícula, ciclos, estado en el padrón con fecha) como additionalProperty.
// Sin priceRange ni ningún valor que no venga de una fuente.
function LocalBusinessSchema({
  ficha,
  phone,
  email,
  website,
}: {
  ficha: FichaFrigorifico
  phone: string | null
  email: string | null
  website: string | null
}) {
  const url = `https://www.consignatarias.com.ar/frigorificos/${ficha.cuit}`
  const prop = (name: string, value: string) => ({ '@type': 'PropertyValue', name, value })
  const additionalProperty = [
    prop('Matrícula SENASA/MAGYP', ficha.matricula),
    ...(ficha.nroOficial ? [prop('Nº oficial SENASA', ficha.nroOficial)] : []),
    ...(ficha.categoria ? [prop('Categoría SENASA', ficha.categoria)] : []),
    ...(ficha.ciclos.length ? [prop('Ciclos habilitados', ficha.ciclos.join('; '))] : []),
    prop('Estado en el padrón SENASA', `Habilitación ${estadoSenasaTexto(ficha)}`),
    ...(ficha.volumenFaena ? [prop('Capacidad de faena declarada (cabezas/mes)', String(ficha.volumenFaena))] : []),
  ]
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': url,
    name: ficha.nombre,
    ...(ficha.propietario && { legalName: ficha.propietario, alternateName: ficha.propietario }),
    description: `${ficha.nombre}, CUIT ${ficha.cuitFormateado}: ${ficha.categoria ?? stageName(ficha.stage)} en ${ficha.lugar}, Argentina. Habilitación SENASA ${estadoSenasaTexto(ficha)}, matrícula ${ficha.matricula}.`,
    url,
    // Asociación número→entidad: el CUIT como identificador fiscal de la empresa,
    // para que una búsqueda por el CUIT crudo (o con guiones) resuelva a esta ficha.
    taxID: ficha.cuitFormateado,
    vatID: ficha.cuit,
    identifier: [
      { '@type': 'PropertyValue', propertyID: 'CUIT', value: ficha.cuit },
      { '@type': 'PropertyValue', propertyID: 'CUIT', value: ficha.cuitFormateado },
    ],
    ...(phone && { telephone: phone }),
    ...(email && { email }),
    ...(website && { sameAs: website.startsWith('http') ? website : `https://${website}` }),
    address: {
      '@type': 'PostalAddress',
      ...(ficha.localidad && { addressLocality: ficha.localidad }),
      addressRegion: ficha.provinciaDisplay,
      addressCountry: 'AR',
      ...(ficha.direccion && { streetAddress: ficha.direccion }),
    },
    ...(ficha.grupoEmpresario && { memberOf: { '@type': 'Organization', name: ficha.grupoEmpresario } }),
    ...(ficha.actividades.length > 0 && { knowsAbout: ficha.actividades }),
    additionalProperty,
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

// QAPage inline: responde literalmente "¿a qué empresa corresponde el CUIT NNN?".
// El número crudo aparece en la pregunta (head-query) y la respuesta trae el dato
// exacto (razón social + habilitación) para que la IA/SERP cite la asociación.
function CuitQAPageSchema({ ficha }: { ficha: FichaFrigorifico }) {
  const titular = ficha.propietario ? ` (titular según SENASA: ${ficha.propietario})` : ''
  const answer = `El CUIT ${ficha.cuitFormateado} corresponde a ${ficha.nombre}${titular}, ${ficha.categoria ? `${ficha.categoria.toLowerCase()} ` : 'frigorífico '}con sede en ${ficha.lugar}, Argentina. Habilitación SENASA ${estadoSenasaTexto(ficha)}, matrícula ${ficha.matricula}. Datos oficiales SENASA/MAGYP.`
  return (
    <QAPageSchema
      question={`¿A qué empresa corresponde el CUIT ${ficha.cuit}?`}
      answer={answer}
      url={`https://www.consignatarias.com.ar/frigorificos/${ficha.cuit}`}
      id={`https://www.consignatarias.com.ar/frigorificos/${ficha.cuit}#qapage`}
    />
  )
}

export default async function FrigorificoDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  // Province branch — render province directory view
  if (isFrigorificoProvinceSlug(slug)) {
    return <FrigorificoProvinceView provincia={slug} />
  }

  // CUIT branch (original behavior). Validate format then lookup.
  const cuit = slug
  const basicF = frigorificos.find((x) => x.cuit === cuit)
  if (!basicF) notFound()

  // Try to get enriched profile from DAL (merges JSON + Supabase)
  const profile = await getFrigorificoProfile(cuit)

  // Use enriched data if available, fallback to basic
  const name = profile?.name || basicF.name
  const province = profile?.province || basicF.province
  const phone = profile?.phone || null
  const email = profile?.email || null
  const website = profile?.website || null
  const description = profile?.description || null
  const verified = profile?.verified || false
  /** Demanda medida de ESTA planta (agregado, últimos 30 días). Ver src/lib/demanda-fichas.ts */
  const demanda = getDemandaFicha('frigorifico', cuit)
  const logoUrl = profile?.logoUrl || null
  const whatsapp = profile?.whatsapp || null
  const habilitacionNivel = profile?.habilitacionNivel || null
  const habilitacionVerificada = profile?.habilitacionVerificada || false
  const grupoEmpresario = profile?.grupoEmpresario || null
  const tipo = profile?.tipo || null
  const direccion = profile?.direccion || null
  const volumenFaena = profile?.volumenFaena || null

  const hasContact = phone || email || website || whatsapp

  // SENASA habilitación check: cross-reference with current registry snapshot.
  // Free users see the verdict (vigente/no encontrada). PRO users get the
  // full record (propietario + actividades + partido/localidad).
  const senasaRecord = getSenasaRecord(cuit)
  const senasaVigente = senasaRecord !== null
  const senasaScrapedDate = getSenasaScrapedDate()
  const session = await getCurrentSession()
  const isPro = session.tier === 'pro'

  // Vitrina de carne: el gate es el plan del DUEÑO del frigorífico (no el del
  // visitante). Sólo se muestra el catálogo + RFQ si el frigorífico es PRO y
  // cargó productos activos. El gate regulatorio (envío interprovincial) se
  // resuelve por constancia verificada, no por el dato scrapeado.
  const [ownerPlan, puedeInterprovincial] = await Promise.all([
    getFrigorificoPlanStatus(cuit),
    frigorificoPuedeInterprovincial(cuit),
  ])
  let vitrinaProducts: VitrinaProduct[] = []
  if (ownerPlan.isPro) {
    const svc = createServiceClient()
    if (svc) {
      const { data } = await svc
        .from('frigorifico_products')
        .select('id, producto, categoria, estado, unidad_venta, unidades_por_bulto, pedido_minimo, precio_modo, segmento, interprovincial')
        .eq('frigorifico_cuit', cuit)
        .eq('status', 'active')
        .order('segmento', { ascending: true })
      vitrinaProducts = (data as VitrinaProduct[]) || []
    }
  }
  const tieneVitrina = ownerPlan.isPro && vitrinaProducts.length > 0

  // Ficha de la empresa: una sola estructura (directorio + enriquecido + padrón SENASA) que
  // alimenta el bloque alto, la meta description y el JSON-LD. La localidad del perfil
  // reclamado pisa a la del padrón.
  const ficha = getFichaFrigorifico(cuit, profile?.localidad ?? null)
  if (!ficha) notFound()

  // Enrichment: data-derived summary, province neighbours, cattle stock.
  const summary = frigorificoSummary({ name, matricula: basicF.matricula, stage: basicF.stage, localidad: ficha.localidad, province, grupoEmpresario, tipo, volumenFaena })
  const relatedFrigs = frigorificosRelacionados(cuit, province)
  // Sólo enlazamos la página de provincia si existe (CABA y La Rioja recién se sumaron;
  // "SIN DETERMINAR" no tiene página y no la va a tener).
  const provinceSlug = frigorificoProvinceSlugFor(province)
  const provinceCount = frigorificoProvinceCount(province)
  const existencias = existenciasFor(province)
  const localidadStr = ficha.lugar
  const rowClass = 'px-panel py-2.5 flex items-start justify-between gap-3'
  const labelClass = 'text-xxs font-terminal text-zinc-500 uppercase tracking-wider shrink-0'
  const valueClass = 'text-data font-terminal text-zinc-200 text-right'

  return (
    <>
      <LocalBusinessSchema ficha={ficha} phone={phone} email={email} website={website} />
      <CuitQAPageSchema ficha={ficha} />
      <BreadcrumbSchema items={[
        { name: 'Inicio', url: 'https://www.consignatarias.com.ar' },
        { name: 'Frigoríficos', url: 'https://www.consignatarias.com.ar/frigorificos' },
        { name: `Mat. ${basicF.matricula}`, url: `https://www.consignatarias.com.ar/frigorificos/${cuit}` },
      ]} />
    <div className="max-w-2xl mx-auto px-2 sm:px-4 py-4 space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xxs font-terminal text-zinc-500">
        <Link href="/frigorificos" className="hover:text-zinc-400 transition-colors">
          FRIGORIFICOS
        </Link>
        <span>/</span>
        <span className="text-zinc-400">MAT. {basicF.matricula}</span>
      </div>

      {/* IDENTIDAD — marca (monograma con el color de la etapa) + nombre grande,
          estilo ficha de establecimiento habilitado. Lo primero que ve el usuario:
          quién es y su habilitación de un vistazo. */}
      <div className="terminal-panel">
        <div className="terminal-panel-header flex items-center justify-between">
          <span className="text-zinc-200 text-label tracking-widest">FICHA DEL ESTABLECIMIENTO</span>
          <span className={`text-xxs font-terminal px-1.5 py-0.5 border rounded-terminal ${stageBorderColor(basicF.stage)} ${stageColor(basicF.stage)}`}>
            ETAPA {basicF.stage}
          </span>
        </div>
        <div className="px-panel pt-4 pb-4 flex items-start gap-3 sm:gap-4">
          {logoUrl ? (
            /* Logo cargado por el frigorífico reclamado → tarjeta clara, legible siempre. */
            <div className="rounded-terminal border border-terminal-border bg-zinc-100 flex-shrink-0 flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 p-1.5 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoUrl} alt={`Logo de ${name}`} className="max-w-full max-h-full object-contain" />
            </div>
          ) : (
            <div
              className={`rounded-terminal border ${stageBorderColor(basicF.stage)} bg-terminal-bg/60 flex-shrink-0 flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20`}
              aria-hidden
            >
              <span className={`text-2xl sm:text-3xl font-bold ${stageColor(basicF.stage)}`}>
                {name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-zinc-50 tracking-tight leading-tight">
                {name}
              </h1>
              {verified && (
                <span className="text-xxs font-terminal px-1.5 py-0.5 border border-positive/30 text-positive rounded-terminal">
                  VERIFICADO
                </span>
              )}
            </div>
            <p className="text-xxs font-terminal text-zinc-500 uppercase tracking-widest mt-1">
              Frigorífico{tipo ? ` · ${tipo.replace(/_/g, ' ')}` : ''}
            </p>
            <div className="mt-2">
              <BadgeConfianza
                senasaActive={senasaVigente}
                senasaScrapedDate={senasaScrapedDate}
                verified={verified}
                habilitacionNivel={habilitacionNivel}
                habilitacionVerificada={habilitacionVerificada}
                province={province}
              />
            </div>
            {/* Answer-first: reconocimiento del CUIT crudo como primera oración citable —
                el dato exacto (razón social + habilitación) en la 1ª frase de la ficha. */}
            <p className="text-data font-terminal text-zinc-300 leading-relaxed mt-2.5">
              El CUIT <span className="text-zinc-100 tabular-nums">{ficha.cuitFormateado}</span> corresponde a{' '}
              <span className="text-zinc-100">{name}</span>, {ficha.categoria ? ficha.categoria.toLowerCase() : 'frigorífico'} con sede en {localidadStr}.
              Habilitación SENASA <span className={senasaVigente ? 'text-positive' : 'text-zinc-100'}>{estadoSenasaTexto(ficha)}</span>, Mat. {basicF.matricula}.
            </p>
            <div className="flex items-center gap-x-2 gap-y-1 flex-wrap mt-2.5 text-xxs font-terminal">
              <span className="px-1.5 py-0.5 border border-terminal-border text-zinc-400 rounded-terminal">
                {localidadStr}
              </span>
              <span className="px-1.5 py-0.5 border border-terminal-border text-zinc-400 rounded-terminal tabular-nums">
                Mat. {basicF.matricula}
              </span>
              <span
                className={`px-1.5 py-0.5 border rounded-terminal tabular-nums ${
                  senasaVigente ? 'border-positive/30 text-positive' : 'border-zinc-700 text-zinc-500'
                }`}
              >
                {senasaVigente ? `SENASA vigente · ${fechaAR(ficha.senasa.fechaPadron)}` : `SENASA s/registro · ${fechaAR(ficha.senasa.fechaPadron)}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Vitrina de carne + RFQ mayorista — sólo si el frigorífico es PRO y cargó
          productos. El gate de envío interprovincial se pasa al form (§3.3). */}
      {tieneVitrina && (
        <CompraMayorista
          cuit={cuit}
          frigorificoName={name}
          frigoProvince={province}
          puedeInterprovincial={puedeInterprovincial}
          products={vitrinaProducts}
        />
      )}

      {/* Captura de venta a faena — el productor llegó al perfil de la planta →
          intención de venderle. Lo conectamos (comisión), no publicamos su dato. */}
      <FrigorificoLeadCapture source={`frigorifico:${slug}`} frigorificoName={name} />

      {/* FICHA DE LA EMPRESA — lo que el que pegó un CUIT quiere en 3 segundos: razón social,
          CUIT en los dos formatos, dónde está, estado SENASA con fecha, matrícula, ciclo.
          Cada fila aparece sólo si el dato existe en alguna fuente. */}
      <div className="terminal-panel" id="ficha">
        <div className="terminal-panel-header flex items-center justify-between">
          <span className="text-zinc-200 text-label tracking-widest">FICHA DE LA EMPRESA</span>
          <span className="text-xxs font-terminal text-zinc-500 tabular-nums">padrón SENASA {fechaAR(ficha.senasa.fechaPadron)}</span>
        </div>
        <dl className="divide-y divide-terminal-border">
          <div className={rowClass}>
            <dt className={labelClass}>Razón social</dt>
            <dd className={valueClass}>{ficha.nombre}</dd>
          </div>
          {ficha.propietario && (
            <div className={rowClass}>
              <dt className={labelClass}>Titular (SENASA)</dt>
              <dd className={valueClass}>{ficha.propietario}</dd>
            </div>
          )}
          <div className={rowClass}>
            <dt className={labelClass}>CUIT</dt>
            <dd className={`${valueClass} tabular-nums`}>
              {ficha.cuitFormateado}
              <span className="block text-xxs text-zinc-500">{ficha.cuit}</span>
            </dd>
          </div>
          {ficha.localidad && (
            <div className={rowClass}>
              <dt className={labelClass}>Localidad</dt>
              <dd className={valueClass}>{ficha.localidad}</dd>
            </div>
          )}
          {ficha.partido && (
            <div className={rowClass}>
              <dt className={labelClass}>Partido / Depto.</dt>
              <dd className={valueClass}>{ficha.partido}</dd>
            </div>
          )}
          <div className={rowClass}>
            <dt className={labelClass}>Provincia</dt>
            <dd className={valueClass}>
              {provinceSlug ? (
                <Link href={`/frigorificos/${provinceSlug}`} className="text-accent hover:underline">{ficha.provinciaDisplay}</Link>
              ) : (
                ficha.provinciaDisplay
              )}
            </dd>
          </div>
          {direccion && (
            <div className={rowClass}>
              <dt className={labelClass}>Dirección</dt>
              <dd className={valueClass}>{direccion}</dd>
            </div>
          )}
          <div className={rowClass}>
            <dt className={labelClass}>Estado SENASA</dt>
            <dd className={`${valueClass} ${senasaVigente ? 'text-positive' : 'text-zinc-300'}`}>
              {senasaVigente ? 'Habilitación vigente' : 'No figura en el padrón'}
              <span className="block text-xxs text-zinc-500 tabular-nums">
                {senasaVigente
                  ? `padrón del ${fechaAR(ficha.senasa.fechaPadron)}`
                  : ficha.senasa.ultimaVez
                    ? `consultado el ${fechaAR(ficha.senasa.fechaPadron)} · figuró hasta el ${fechaAR(ficha.senasa.ultimaVez)}`
                    : `consultado el ${fechaAR(ficha.senasa.fechaPadron)}`}
              </span>
            </dd>
          </div>
          <div className={rowClass}>
            <dt className={labelClass}>Matrícula</dt>
            <dd className={`${valueClass} tabular-nums`}>
              {ficha.matricula}
              {ficha.nroOficial && <span className="block text-xxs text-zinc-500">Nº oficial SENASA {ficha.nroOficial}</span>}
            </dd>
          </div>
          <div className={rowClass}>
            <dt className={labelClass}>Etapa</dt>
            <dd className={`${valueClass} ${stageColor(basicF.stage)}`}>{stageName(basicF.stage)}</dd>
          </div>
          {ficha.categoria && (
            <div className={rowClass}>
              <dt className={labelClass}>Categoría SENASA</dt>
              <dd className={valueClass}>{ficha.categoria}</dd>
            </div>
          )}
          {grupoEmpresario && (
            <div className={rowClass}>
              <dt className={labelClass}>Grupo</dt>
              <dd className={valueClass}>{grupoEmpresario}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* QUÉ SABEMOS DE SU ACTIVIDAD — ciclos y actividades autorizadas del padrón SENASA,
          capacidad de faena y perfil comercial cuando el enriquecido los tiene. No hay dato de
          faena por planta ni de remates/consignatarias vinculadas en el repo: no se muestra. */}
      {(ficha.ciclos.length > 0 || ficha.actividades.length > 0 || ficha.volumenFaena || tipo) && (
        <div className="terminal-panel">
          <div className="terminal-panel-header">
            <span className="text-zinc-200 text-label tracking-widest">QUÉ SABEMOS DE SU ACTIVIDAD</span>
          </div>
          <div className="divide-y divide-terminal-border">
            {ficha.ciclos.length > 0 && (
              <div className="px-panel py-2.5">
                <span className={`${labelClass} block mb-1.5`}>Ciclos habilitados ({ficha.ciclos.length})</span>
                <div className="flex flex-wrap gap-1">
                  {ficha.ciclos.map((c) => (
                    <span key={c} className="text-xxs font-terminal px-1.5 py-0.5 border border-positive/30 text-positive rounded-terminal">{c}</span>
                  ))}
                </div>
              </div>
            )}
            {ficha.volumenFaena && (
              <div className={rowClass}>
                <span className={labelClass}>Capacidad de faena declarada</span>
                <span className={`${valueClass} tabular-nums`}>{ficha.volumenFaena.toLocaleString('es-AR')} cabezas/mes</span>
              </div>
            )}
            {tipo && (
              <div className={rowClass}>
                <span className={labelClass}>Perfil comercial</span>
                <span className={valueClass}>{TIPO_FRASE[tipo] ?? tipo.replace(/_/g, ' ')}</span>
              </div>
            )}
            {ficha.actividades.length > 0 && (
              <div className="px-panel py-2.5">
                <span className={`${labelClass} block mb-1.5`}>Actividades autorizadas por SENASA ({ficha.actividades.length})</span>
                <ul className="space-y-1">
                  {ficha.actividades.map((a) => (
                    <li key={a} className="text-data font-terminal text-zinc-300 leading-relaxed">· {a}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Data-derived summary + cattle stock (unique per establishment / province) */}
      <div className="terminal-panel">
        <div className="terminal-panel-header">
          <span className="text-zinc-200 text-label tracking-widest">RESUMEN</span>
        </div>
        <div className="px-panel py-3 space-y-2">
          <p className="text-data font-terminal text-zinc-400 leading-relaxed">{summary}</p>
          {existencias && (
            <p className="text-xxs font-terminal text-zinc-500">
              Existencias bovinas en {province}:{' '}
              <span className="text-zinc-300 tabular-nums">{existencias.total.toLocaleString('es-AR')}</span> cabezas
              <span className="text-zinc-600"> · SENASA {existencias.year}</span>
            </p>
          )}
        </div>
      </div>

      {/* SENASA habilitación verification */}
      <div className="terminal-panel">
        <div className="terminal-panel-header flex items-center justify-between">
          <span className="text-zinc-200 text-label tracking-widest">HABILITACION SENASA</span>
          <span
            className={`text-xxs font-terminal px-1.5 py-0.5 border rounded-terminal ${
              senasaVigente
                ? 'border-positive/30 text-positive'
                : 'border-zinc-700 text-zinc-500'
            }`}
          >
            {senasaVigente ? 'VIGENTE' : 'NO ENCONTRADA'}
          </span>
        </div>
        <div className="px-panel py-3">
          {senasaVigente ? (
            <>
              <p className="text-data font-terminal text-zinc-300 leading-relaxed">
                {basicF.name} figura en el registro oficial SENASA de
                establecimientos habilitados al{' '}
                <span className="text-positive tabular-nums">{senasaScrapedDate}</span>
                {senasaRecord!.ciclos.length > 1
                  ? ` (${senasaRecord!.ciclos.length} ciclos)`
                  : ''}.
              </p>
              {/* Los campos del registro (titular, partido, localidad, nº oficial, ciclos,
                  actividades) viven arriba, en FICHA DE LA EMPRESA y QUÉ SABEMOS DE SU
                  ACTIVIDAD. Acá queda el veredicto con fecha y el ancla al bloque. */}
              <p className="text-xxs font-terminal text-zinc-500 leading-relaxed mt-2">
                Titular, partido, ciclos y actividades autorizadas: ver{' '}
                <a href="#ficha" className="text-accent hover:underline">la ficha de la empresa</a>.
              </p>
              {!isPro && (
                <div className="mt-3 pt-3 border-t border-terminal-border">
                  <p className="text-xxs font-terminal text-zinc-500 leading-relaxed">
                    <span className="text-accent">PRO:</span> alertas de cambios de habilitación,
                    comparador entre establecimientos, exportá el padrón y accedé vía API.{' '}
                    <Link href="/planes" rel="nofollow" className="text-accent hover:underline">Ver planes →</Link>
                  </p>
                </div>
              )}
            </>
          ) : (
            <>
              <p className="text-data font-terminal text-zinc-400 leading-relaxed">
                {basicF.name} <span className="text-zinc-200">no aparece</span> en
                el registro oficial SENASA Ciclo I/II/III al{' '}
                <span className="text-zinc-300 tabular-nums">{senasaScrapedDate}</span>.
              </p>
              <p className="text-xxs font-terminal text-zinc-500 leading-relaxed mt-2">
                Esto puede significar: habilitación dada de baja, registro bajo
                un CUIT distinto, o establecimiento incorporado a otra
                categoría (avícola/pesquero). Verificá directamente con SENASA
                antes de operar.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Contact info */}
      {hasContact && (
        <div className="terminal-panel">
          <div className="terminal-panel-header">
            <span className="text-zinc-200 text-label tracking-widest">CONTACTO</span>
          </div>
          <LoginGate feature="Los datos de contacto de la planta" minHeight={120} redirectTo={`/frigorificos/${slug}`}>
          <div className="divide-y divide-terminal-border">
            {phone && (
              <div className="px-panel py-2.5 flex items-center justify-between">
                <span className="text-xxs font-terminal text-zinc-500 uppercase tracking-wider">Telefono</span>
                <span className="text-data font-terminal text-zinc-200">{phone}</span>
              </div>
            )}
            {whatsapp && (
              <div className="px-panel py-2.5 flex items-center justify-between">
                <span className="text-xxs font-terminal text-zinc-500 uppercase tracking-wider">WhatsApp</span>
                <a
                  href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-data font-terminal text-accent hover:underline"
                >
                  {whatsapp}
                </a>
              </div>
            )}
            {email && (
              <div className="px-panel py-2.5 flex items-center justify-between">
                <span className="text-xxs font-terminal text-zinc-500 uppercase tracking-wider">Email</span>
                <a href={`mailto:${email}`} className="text-data font-terminal text-accent hover:underline">{email}</a>
              </div>
            )}
            {website && (
              <div className="px-panel py-2.5 flex items-center justify-between">
                <span className="text-xxs font-terminal text-zinc-500 uppercase tracking-wider">Web</span>
                <a
                  href={website.startsWith('http') ? website : `https://${website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-data font-terminal text-accent hover:underline"
                >
                  {website}
                </a>
              </div>
            )}
          </div>
          </LoginGate>
        </div>
      )}

      {/* Description */}
      {description && (
        <div className="terminal-panel">
          <div className="terminal-panel-header">
            <span className="text-zinc-200 text-label tracking-widest">DESCRIPCION</span>
          </div>
          <div className="px-panel py-3">
            <p className="text-data font-terminal text-zinc-400 leading-relaxed">
              {description}
            </p>
          </div>
        </div>
      )}

      {/* Stage description + SENASA cycle glossary */}
      <div className="terminal-panel">
        <div className="terminal-panel-header">
          <span className="text-zinc-200 text-label tracking-widest">QUE SIGNIFICA ESTA HABILITACION</span>
        </div>
        <div className="px-panel py-3 space-y-3">
          <div>
            <p className={`text-data font-terminal ${stageColor(basicF.stage)} mb-1`}>
              {cicloExplainer(basicF.stage).ciclo}
            </p>
            <p className="text-data font-terminal text-zinc-400 leading-relaxed">
              {cicloExplainer(basicF.stage).body}
            </p>
          </div>
          <div className="pt-3 border-t border-terminal-border">
            <p className="text-xxs font-terminal text-zinc-500 uppercase tracking-wider mb-1">Tránsito federal vs. provincial</p>
            <p className="text-data font-terminal text-zinc-400 leading-relaxed">
              Un establecimiento con <span className="text-zinc-200">tránsito federal</span> (inspección SENASA) puede
              comercializar en todo el país y acceder al circuito de exportación. La habilitación de{' '}
              <span className="text-zinc-200">tránsito provincial</span> limita la venta al consumo dentro de {province}.
            </p>
          </div>
          <p className="text-xxs font-terminal text-zinc-500">
            Fuente: Registro Nacional SENASA / MAGyP. {stageDescription(basicF.stage)}
          </p>
        </div>
      </div>

      {/* Other frigoríficos in the same province (unique anchors + internal links) */}
      {relatedFrigs.length > 0 && (
        <div className="terminal-panel">
          <div className="terminal-panel-header flex items-center justify-between">
            <span className="text-zinc-200 text-label tracking-widest">OTROS FRIGORIFICOS EN {province}</span>
            <span className="text-xxs font-terminal text-zinc-500 tabular-nums">{relatedFrigs.length}</span>
          </div>
          <div className="divide-y divide-terminal-border">
            {relatedFrigs.map((r, i) => (
              <Link key={r.cuit} href={`/frigorificos/${r.cuit}`} className="block px-panel py-2.5 hover:bg-zinc-800/40 transition-colors">
                <span className="text-data font-terminal text-accent hover:underline">{relatedFrigAnchor(r, i)}</span>
                <span className="block text-xxs font-terminal text-zinc-500 mt-0.5">
                  Mat. SENASA {r.matricula}{r.localidad ? ` · ${r.localidad}` : ` · ${r.provincia}`}{r.mismoPartido ? ' · mismo partido' : ''}
                </span>
              </Link>
            ))}
          </div>
          {provinceSlug && (
            <div className="px-panel py-2 border-t border-terminal-border">
              <Link href={`/frigorificos/${provinceSlug}`} className="text-xxs font-terminal text-accent hover:underline">
                Ver los {provinceCount} frigoríficos de {ficha.provinciaDisplay} →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* PRO upsell for verified frigoríficos */}
      {verified && (
        <div className="terminal-panel border-positive/30">
          <div className="terminal-panel-header" style={{ borderBottomColor: 'rgba(34, 197, 94, 0.3)' }}>
            <span className="text-positive text-label tracking-widest">✓ PERFIL VERIFICADO</span>
          </div>
          <div className="px-panel py-4 space-y-3">
            <p className="text-data font-terminal text-zinc-300">
              Este frigorífico verificó su información. ¿Querés destacar tu perfil?
            </p>
            <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded">
              <p className="text-xxs font-terminal text-amber-400 mb-2">FRIGORIFICO DESTACADO — $30.000/mes</p>
              <ul className="space-y-1 text-xxs font-terminal text-zinc-400">
                <li>• Aparecé primero en búsquedas de tu provincia</li>
                <li>• Badge dorado destacado en el directorio</li>
                <li>• Promoción en newsletter semanal</li>
              </ul>
            </div>
            <a
              href="mailto:agro@memola.com.ar?subject=Consulta%20Frigorifico%20Destacado%20-%20${encodeURIComponent(name)}"
              className="inline-block px-4 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-data font-terminal rounded-terminal hover:bg-amber-500/20 transition-colors"
            >
              Consultar →
            </a>
          </div>
        </div>
      )}

      {/* Claim CTA - prominent for unclaimed profiles */}
      {!verified && (
        <div className="terminal-panel border-sky-500/30 bg-sky-500/5">
          <div className="terminal-panel-header" style={{ borderBottomColor: 'rgba(56, 189, 248, 0.3)' }}>
            <span className="text-accent text-label tracking-widest">¿ES TU FRIGORIFICO?</span>
          </div>
          <div className="px-panel py-4 space-y-3">
            {demanda ? (
              /* La evidencia primero. Un dueño de planta no necesita que le prometan
                 visibilidad: necesita ver cuánta ya tiene y no está aprovechando. */
              <p className="text-data font-terminal text-zinc-200">
                En los últimos {VENTANA_DIAS} días,{' '}
                <strong className="text-accent">{demanda.visitas} personas</strong> miraron esta ficha
                {demanda.consultas > 0 ? (
                  <>
                    {' '}y{' '}
                    <strong className="text-accent">
                      {demanda.consultas === 1 ? 'una dejó una consulta' : `${demanda.consultas} dejaron una consulta`}
                    </strong>{' '}
                    que no pudimos derivarte porque no tenemos tu contacto.
                  </>
                ) : (
                  <> y no encontraron un teléfono al que llamarte.</>
                )}
              </p>
            ) : null}
            <p className="text-data font-terminal text-zinc-300">
              Reclamá este perfil gratis y actualizá tu información de contacto para que compradores te encuentren.
            </p>
            <ul className="space-y-1.5 text-xxs font-terminal text-zinc-400">
              <li className="flex items-center gap-2">
                <span className="text-positive">✓</span>
                Badge de verificado en el directorio
              </li>
              <li className="flex items-center gap-2">
                <span className="text-positive">✓</span>
                Información de contacto visible
              </li>
              <li className="flex items-center gap-2">
                <span className="text-positive">✓</span>
                Recibí consultas de compradores directamente
              </li>
            </ul>
            <Link
              href={`/frigorificos/verificar?cuit=${basicF.cuit}`}
              rel="nofollow"
              className="inline-block px-4 py-2.5 bg-sky-500/20 border border-sky-500/40 text-accent text-data font-terminal rounded-terminal hover:bg-sky-500/30 transition-colors"
            >
              Reclamar perfil gratis →
            </Link>
          </div>
        </div>
      )}

      {/* Contact/Inquiry form for lead gen — reemplaza el mailto crudo (perdía
          consultas reales sin registrar ninguna, ver FrigorificoConsultaGeneral) */}
      {!hasContact && !verified && (
        <FrigorificoConsultaGeneral
          source={`frigorifico:${slug}:otra-consulta`}
          frigorificoName={name}
          province={province}
        />
      )}

      {/* Captura — reporte mensual de faena. El visitante de un perfil de planta
          está mirando el eslabón de faena; le ofrecemos el dato agregado. */}
      <SubscribeStrip
        mode="newsletter"
        source="frigorificos"
        channel="perfil-frigorifico"
        eyebrow="Reporte mensual · faena"
        title="El pulso de la faena, cada mes"
        body="Cabezas faenadas a nivel nacional, variación mensual e interanual y el acumulado de 12 meses. El dato que mueve el precio del gordo, directo a tu correo."
        cta="Recibir el reporte"
      />

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Link
          href="/frigorificos"
          className="px-4 py-2 border border-terminal-border text-zinc-400 text-data font-terminal rounded-terminal hover:border-zinc-500 transition-colors"
        >
          ← Volver al directorio
        </Link>
      </div>
    </div>
    </>
  )
}
