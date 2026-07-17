import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import frigorificosData from '@/lib/data/frigorificos.json'
import frigorificosEnrichedData from '@/lib/data/frigorificos-enriched.json'
import existenciasData from '@/lib/data/existencias-bovinas.json'
import { getFrigorificoProfile } from '@/lib/dal/frigorificos'
import { getFrigorificoPlanStatus, frigorificoPuedeInterprovincial } from '@/lib/features'
import { createServiceClient } from '@/lib/supabase'
import CompraMayorista, { type VitrinaProduct } from './CompraMayorista'
import BadgeConfianza from '@/components/frigorifico/BadgeConfianza'
import { BreadcrumbSchema, QAPageSchema } from '@/components/seo/JsonLd'
import {
  getSenasaRecord,
  getSenasaScrapedDate,
} from '@/lib/data/senasa-habilitados'
import { getCurrentSession } from '@/lib/user-tier'
import {
  isFrigorificoProvinceSlug,
  frigorificoProvinceSlugs,
  frigorificoProvinceMetadata,
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

interface EnrichedFrig {
  cuit: string; name: string; matricula: string; province: string; stage: number
  grupoEmpresario: string | null; tipo: string | null; localidad: string | null
  direccion: string | null; volumenFaena: number | string | null; notas: string | null
}
const frigorificosEnriched = frigorificosEnrichedData as EnrichedFrig[]
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

// Other frigoríficos in the same province (unique anchors + internal links).
function relatedFrigorificos(cuit: string, province: string, cap = 6): EnrichedFrig[] {
  const seen = new Set<string>([cuit])
  const out: EnrichedFrig[] = []
  for (const f of frigorificosEnriched) {
    if (f.province !== province || seen.has(f.cuit)) continue
    seen.add(f.cuit)
    out.push(f)
  }
  out.sort((a, b) => (b.localidad ? 1 : 0) - (a.localidad ? 1 : 0) || a.name.localeCompare(b.name))
  return out.slice(0, cap)
}
function relatedFrigAnchor(r: EnrichedFrig, i: number): string {
  const lugar = r.localidad || r.province
  switch (i % 4) {
    case 0: return r.name
    case 1: return `${r.name} — Mat. ${r.matricula}`
    case 2: return `${r.name} (${lugar})`
    default: return `${r.name}, frigorífico en ${lugar}`
  }
}
function formatCuit(cuit: string): string {
  if (cuit.length === 11) {
    return `${cuit.slice(0, 2)}-${cuit.slice(2, 10)}-${cuit.slice(10)}`
  }
  return cuit
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

  const localidadStr = (f as { localidad?: string }).localidad || f.province
  // El usuario pega el CUIT crudo (ej "30500120882") y la ficha rankea, pero si el título
  // muestra sólo la razón social no reconoce el match → CTR ~0. Arrancamos el título con el
  // CUIT formateado (el número pegado aparece literal en el SERP) seguido de la razón social.
  const title = `CUIT ${formatCuit(f.cuit)} — ${f.name} (Frigorífico SENASA, ${localidadStr})`
  const description = `${f.name} en ${localidadStr}: frigorífico habilitado SENASA, ${stageName(f.stage)}, Mat. ${f.matricula}, CUIT ${formatCuit(f.cuit)}. Datos oficiales MAGYP/SENASA, actualizado 2026.`

  return {
    title,
    description,
    openGraph: {
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

function LocalBusinessSchema({ 
  name, 
  cuit, 
  province, 
  localidad, 
  phone, 
  email, 
  website,
  direccion,
  stage 
}: { 
  name: string
  cuit: string
  province: string
  localidad: string | null
  phone: string | null
  email: string | null
  website: string | null
  direccion: string | null
  stage: number
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `https://www.consignatarias.com.ar/frigorificos/${cuit}`,
    name,
    description: `Frigorífico ${stage === 1 ? 'de faena y desposte' : stage === 2 ? 'de desposte' : 'depósito'} en ${localidad || province}, Argentina. Matricula SENASA/MAGYP.`,
    url: `https://www.consignatarias.com.ar/frigorificos/${cuit}`,
    // Asociación número→entidad: el CUIT como identificador fiscal de la empresa,
    // para que una búsqueda por el CUIT crudo resuelva a este establecimiento.
    taxID: cuit,
    vatID: cuit,
    identifier: {
      '@type': 'PropertyValue',
      propertyID: 'CUIT',
      value: cuit,
    },
    ...(phone && { telephone: phone }),
    ...(email && { email }),
    ...(website && { sameAs: website.startsWith('http') ? website : `https://${website}` }),
    address: {
      '@type': 'PostalAddress',
      addressLocality: localidad || province,
      addressRegion: province,
      addressCountry: 'AR',
      ...(direccion && { streetAddress: direccion }),
    },
    areaServed: {
      '@type': 'Country',
      name: 'Argentina',
    },
    priceRange: '$$',
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
function CuitQAPageSchema({
  cuit,
  name,
  localidad,
  province,
  stage,
  matricula,
}: {
  cuit: string
  name: string
  localidad: string | null
  province: string
  stage: number
  matricula: string
}) {
  const localidadStr = localidad || province
  const answer = `El CUIT ${formatCuit(cuit)} corresponde a ${name}, un frigorífico habilitado por SENASA (${stageName(stage)}, matrícula ${matricula}) con sede en ${localidadStr}, Argentina. Datos oficiales MAGYP/SENASA.`
  return (
    <QAPageSchema
      question={`¿A qué empresa corresponde el CUIT ${cuit}?`}
      answer={answer}
      url={`https://www.consignatarias.com.ar/frigorificos/${cuit}`}
      id={`https://www.consignatarias.com.ar/frigorificos/${cuit}#qapage`}
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
  const localidad = profile?.localidad || null
  const phone = profile?.phone || null
  const email = profile?.email || null
  const website = profile?.website || null
  const description = profile?.description || null
  const verified = profile?.verified || false
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

  // Enrichment: data-derived summary, province neighbours, cattle stock.
  const summary = frigorificoSummary({ name, matricula: basicF.matricula, stage: basicF.stage, localidad, province, grupoEmpresario, tipo, volumenFaena })
  const relatedFrigs = relatedFrigorificos(cuit, province)
  const provinceSlug = (province || '').toLowerCase().replace(/\s+/g, '-')
  const existencias = existenciasFor(province)
  const localidadStr = localidad || province

  return (
    <>
      <LocalBusinessSchema
        name={name}
        cuit={cuit}
        province={province}
        localidad={localidad}
        phone={phone}
        email={email}
        website={website}
        direccion={direccion}
        stage={basicF.stage}
      />
      <CuitQAPageSchema
        cuit={cuit}
        name={name}
        localidad={localidad}
        province={province}
        stage={basicF.stage}
        matricula={basicF.matricula}
      />
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
              El CUIT <span className="text-zinc-100 tabular-nums">{formatCuit(basicF.cuit)}</span> corresponde a{' '}
              <span className="text-zinc-100">{name}</span>, frigorífico habilitado SENASA ({stageName(basicF.stage)}, Mat. {basicF.matricula}) en {localidadStr}.
            </p>
            <div className="flex items-center gap-x-2 gap-y-1 flex-wrap mt-2.5 text-xxs font-terminal">
              <span className="px-1.5 py-0.5 border border-terminal-border text-zinc-400 rounded-terminal">
                {localidad ? `${localidad}, ${province}` : province}
              </span>
              <span className="px-1.5 py-0.5 border border-terminal-border text-zinc-400 rounded-terminal tabular-nums">
                Mat. {basicF.matricula}
              </span>
              <span
                className={`px-1.5 py-0.5 border rounded-terminal ${
                  senasaVigente ? 'border-positive/30 text-positive' : 'border-zinc-700 text-zinc-500'
                }`}
              >
                {senasaVigente ? 'SENASA vigente' : 'SENASA s/registro'}
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

      {/* Data grid */}
      <div className="terminal-panel">
        <div className="terminal-panel-header">
          <span className="text-zinc-200 text-label tracking-widest">DATOS REGISTRALES</span>
        </div>
        <div className="divide-y divide-terminal-border">
          <div className="px-panel py-2.5 flex items-center justify-between">
            <span className="text-xxs font-terminal text-zinc-500 uppercase tracking-wider">CUIT</span>
            <span className="text-data font-terminal text-zinc-200 tabular-nums">{formatCuit(basicF.cuit)}</span>
          </div>
          <div className="px-panel py-2.5 flex items-center justify-between">
            <span className="text-xxs font-terminal text-zinc-500 uppercase tracking-wider">Matricula</span>
            <span className="text-data font-terminal text-zinc-200 tabular-nums">{basicF.matricula}</span>
          </div>
          <div className="px-panel py-2.5 flex items-center justify-between">
            <span className="text-xxs font-terminal text-zinc-500 uppercase tracking-wider">Provincia</span>
            <span className="text-data font-terminal text-zinc-200">{province}</span>
          </div>
          <div className="px-panel py-2.5 flex items-center justify-between">
            <span className="text-xxs font-terminal text-zinc-500 uppercase tracking-wider">Etapa</span>
            <span className={`text-data font-terminal ${stageColor(basicF.stage)}`}>
              {stageName(basicF.stage)}
            </span>
          </div>
          {grupoEmpresario && (
            <div className="px-panel py-2.5 flex items-center justify-between">
              <span className="text-xxs font-terminal text-zinc-500 uppercase tracking-wider">Grupo</span>
              <span className="text-data font-terminal text-zinc-200">{grupoEmpresario}</span>
            </div>
          )}
          {tipo && (
            <div className="px-panel py-2.5 flex items-center justify-between">
              <span className="text-xxs font-terminal text-zinc-500 uppercase tracking-wider">Tipo</span>
              <span className="text-data font-terminal text-zinc-200">{tipo.replace(/_/g, ' ')}</span>
            </div>
          )}
          {direccion && (
            <div className="px-panel py-2.5 flex items-center justify-between">
              <span className="text-xxs font-terminal text-zinc-500 uppercase tracking-wider">Direccion</span>
              <span className="text-data font-terminal text-zinc-200 text-right max-w-[60%]">{direccion}</span>
            </div>
          )}
          {volumenFaena && (
            <div className="px-panel py-2.5 flex items-center justify-between">
              <span className="text-xxs font-terminal text-zinc-500 uppercase tracking-wider">Capacidad de faena</span>
              <span className="text-data font-terminal text-zinc-200 text-right max-w-[60%]">{volumenFaena}</span>
            </div>
          )}
        </div>
      </div>

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
              {/* Registry data is public SENASA info — shown to everyone so the
                  page carries real, per-establishment unique content (indexable).
                  PRO is reserved for the value-add layer (alerts, exports, comparador). */}
              <div className="mt-3 pt-3 border-t border-terminal-border divide-y divide-terminal-border">
                  {senasaRecord!.propietario && (
                    <div className="py-2 flex items-start justify-between gap-3">
                      <span className="text-xxs font-terminal text-zinc-500 uppercase tracking-wider">Propietario</span>
                      <span className="text-data font-terminal text-zinc-200 text-right">{senasaRecord!.propietario}</span>
                    </div>
                  )}
                  {senasaRecord!.partido && (
                    <div className="py-2 flex items-start justify-between gap-3">
                      <span className="text-xxs font-terminal text-zinc-500 uppercase tracking-wider">Partido</span>
                      <span className="text-data font-terminal text-zinc-200 text-right">{senasaRecord!.partido}</span>
                    </div>
                  )}
                  {senasaRecord!.localidad && (
                    <div className="py-2 flex items-start justify-between gap-3">
                      <span className="text-xxs font-terminal text-zinc-500 uppercase tracking-wider">Localidad</span>
                      <span className="text-data font-terminal text-zinc-200 text-right">{senasaRecord!.localidad}</span>
                    </div>
                  )}
                  {senasaRecord!.nroOficial && (
                    <div className="py-2 flex items-start justify-between gap-3">
                      <span className="text-xxs font-terminal text-zinc-500 uppercase tracking-wider">Nº Oficial</span>
                      <span className="text-data font-terminal text-zinc-200 tabular-nums">{senasaRecord!.nroOficial}</span>
                    </div>
                  )}
                  {senasaRecord!.ciclos.length > 0 && (
                    <div className="py-2">
                      <span className="text-xxs font-terminal text-zinc-500 uppercase tracking-wider block mb-1.5">Ciclos habilitados</span>
                      <div className="flex flex-wrap gap-1">
                        {senasaRecord!.ciclos.map(c => (
                          <span key={c} className="text-xxs font-terminal px-1.5 py-0.5 border border-positive/30 text-positive rounded-terminal">{c}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {senasaRecord!.actividades.length > 0 && (
                    <div className="py-2">
                      <span className="text-xxs font-terminal text-zinc-500 uppercase tracking-wider block mb-1.5">Actividades autorizadas ({senasaRecord!.actividades.length})</span>
                      <ul className="space-y-1">
                        {senasaRecord!.actividades.map(a => (
                          <li key={a} className="text-data font-terminal text-zinc-300 leading-relaxed">· {a}</li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>
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
                  Mat. SENASA {r.matricula}{r.localidad ? ` · ${r.localidad}` : ` · ${r.province}`}
                </span>
              </Link>
            ))}
          </div>
          <div className="px-panel py-2 border-t border-terminal-border">
            <Link href={`/frigorificos/${provinceSlug}`} className="text-xxs font-terminal text-accent hover:underline">
              Ver todos los frigoríficos de {province} →
            </Link>
          </div>
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

      {/* Contact/Inquiry form for lead gen */}
      {!hasContact && !verified && (
        <div className="terminal-panel">
          <div className="terminal-panel-header">
            <span className="text-zinc-200 text-label tracking-widest">CONSULTAR ESTE FRIGORIFICO</span>
          </div>
          <div className="px-panel py-4">
            <p className="text-data font-terminal text-zinc-500 mb-3">
              ¿Necesitás contactar a este frigorífico? Dejá tu consulta y te conectamos.
            </p>
            <a
              href={`mailto:agro@memola.com.ar?subject=Consulta%20Frigorifico%20${encodeURIComponent(name)}%20(Mat.%20${basicF.matricula})&body=Hola,%20necesito%20contactar%20al%20frigorifico%20${encodeURIComponent(name)}.%0A%0AMi%20consulta:%20`}
              className="inline-block px-4 py-2 bg-accent/10 border border-accent/30 text-accent text-data font-terminal rounded-terminal hover:bg-accent/20 transition-colors"
            >
              Enviar consulta
            </a>
          </div>
        </div>
      )}

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
