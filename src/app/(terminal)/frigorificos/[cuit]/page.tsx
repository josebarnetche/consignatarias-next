import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import frigorificosData from '@/lib/data/frigorificos.json'
import { getFrigorificoProfile } from '@/lib/dal/frigorificos'
import { BreadcrumbSchema } from '@/components/seo/JsonLd'

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

export function generateStaticParams() {
  return frigorificos.map((f) => ({ cuit: f.cuit }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ cuit: string }>
}): Promise<Metadata> {
  const { cuit } = await params
  const f = frigorificos.find((x) => x.cuit === cuit)
  if (!f) return { title: 'Frigorifico no encontrado' }

  const title = `${f.name} — Frigorifico Mat. ${f.matricula} | Consignatarias.com.ar`
  const description = `Ficha de ${f.name}: CUIT ${formatCuit(f.cuit)}, matricula ${f.matricula}, ${f.province}. ${stageName(f.stage)}. Registro SENASA/MAGYP.`

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
  params: Promise<{ cuit: string }>
}) {
  const { cuit } = await params
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

      {/* Actions */}
      <div className="flex items-center gap-3">
        {!verified && (
          <Link
            href={`/frigorificos/verificar?cuit=${basicF.cuit}`}
            className="px-4 py-2 bg-positive/10 border border-positive/30 text-positive text-data font-terminal rounded-terminal hover:bg-positive/20 transition-colors"
          >
            Reclamar este perfil
          </Link>
        )}
        <Link
          href="/frigorificos"
          className="px-4 py-2 border border-terminal-border text-zinc-400 text-data font-terminal rounded-terminal hover:border-zinc-500 transition-colors"
        >
          Volver al directorio
        </Link>
      </div>
    </div>
    </>
  )
}
