import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import frigorificosData from '@/lib/data/frigorificos.json'
import { getFrigorificoProfile } from '@/lib/dal/frigorificos'
import { BreadcrumbSchema } from '@/components/seo/JsonLd'
import {
  getSenasaRecord,
  isHabilitadoVigente,
  getSenasaScrapedDate,
} from '@/lib/data/senasa-habilitados'
import { getCurrentSession } from '@/lib/user-tier'
import { PaywallCard } from '@/components/Paywall'
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
}

const frigorificos = frigorificosData as BasicFrigorifico[]

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
  if (stage === 1) return 'Planta habilitada para faena y desposte de reses. Autorizada para transito federal.'
  if (stage === 2) return 'Planta habilitada para desposte y procesamiento de medias reses. Sin faena propia.'
  return 'Deposito frigorifico habilitado para almacenamiento y conservacion de carnes.'
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
  const title = `${f.name} (CUIT ${formatCuit(f.cuit)}) — Frigorífico ${f.province} | Mat. SENASA ${f.matricula}`
  const description = `${f.name}: CUIT ${formatCuit(f.cuit)}, matrícula SENASA ${f.matricula}, ${stageName(f.stage)} en ${localidadStr}. Datos oficiales MAGYP/SENASA actualizados 2026.`

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
  const grupoEmpresario = profile?.grupoEmpresario || null
  const tipo = profile?.tipo || null
  const direccion = profile?.direccion || null

  const hasContact = phone || email || website

  // SENASA habilitación check: cross-reference with current registry snapshot.
  // Free users see the verdict (vigente/no encontrada). PRO users get the
  // full record (propietario + actividades + partido/localidad).
  const senasaRecord = getSenasaRecord(cuit)
  const senasaVigente = senasaRecord !== null
  const senasaScrapedDate = getSenasaScrapedDate()
  const session = await getCurrentSession()
  const isPro = session.tier === 'pro'

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

      {/* Header */}
      <div className="terminal-panel">
        <div className="terminal-panel-header flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-zinc-200 text-label tracking-widest">FICHA DEL ESTABLECIMIENTO</span>
            {verified && (
              <span className="text-xxs font-terminal px-1.5 py-0.5 border border-positive/30 text-positive rounded-terminal">
                VERIFICADO
              </span>
            )}
          </div>
          <span className={`text-xxs font-terminal px-1.5 py-0.5 border rounded-terminal ${stageBorderColor(basicF.stage)} ${stageColor(basicF.stage)}`}>
            ETAPA {basicF.stage}
          </span>
        </div>
        <div className="px-panel py-4">
          <h1 className="text-lg font-medium text-zinc-100 leading-tight">
            {name}
          </h1>
          <p className="text-xxs font-terminal text-zinc-500 mt-1">
            {localidad || province}
          </p>
        </div>
      </div>

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
              {isPro ? (
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
              ) : (
                <div className="mt-3">
                  <PaywallCard
                    loggedIn={session.user !== null}
                    feature="El detalle SENASA (propietario, actividades autorizadas, ciclos habilitados)"
                    redirectTo={`/frigorificos/${cuit}`}
                  />
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

      {/* Stage description */}
      <div className="terminal-panel">
        <div className="terminal-panel-header">
          <span className="text-zinc-200 text-label tracking-widest">HABILITACION</span>
        </div>
        <div className="px-panel py-3">
          <p className="text-data font-terminal text-zinc-400 leading-relaxed">
            {stageDescription(basicF.stage)}
          </p>
          <p className="text-xxs font-terminal text-zinc-500 mt-2">
            Fuente: Registro Nacional SENASA / MAGyP
          </p>
        </div>
      </div>

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
        <div className="terminal-panel border-amber-500/30 bg-amber-500/5">
          <div className="terminal-panel-header" style={{ borderBottomColor: 'rgba(245, 158, 11, 0.3)' }}>
            <span className="text-amber-400 text-label tracking-widest">¿ES TU FRIGORIFICO?</span>
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
              className="inline-block px-4 py-2.5 bg-amber-500/20 border border-amber-500/40 text-amber-400 text-data font-terminal rounded-terminal hover:bg-amber-500/30 transition-colors"
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
