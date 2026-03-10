import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import frigorificosData from '@/lib/data/frigorificos.json'

interface Frigorifico {
  cuit: string
  name: string
  matricula: string
  province: string
  stage: number
}

const frigorificos = frigorificosData as Frigorifico[]

function formatCuit(cuit: string): string {
  if (cuit.length === 11) {
    return `${cuit.slice(0, 2)}-${cuit.slice(2, 10)}-${cuit.slice(10)}`
  }
  return cuit
}

function stageName(stage: number): string {
  if (stage === 1) return 'Etapa 1 — Faena + Desposte'
  if (stage === 2) return 'Etapa 2 — Desposte'
  return 'Etapa 3 — Depósito'
}

function stageDescription(stage: number): string {
  if (stage === 1) return 'Planta habilitada para faena y desposte de reses. Autorizada para tránsito federal.'
  if (stage === 2) return 'Planta habilitada para desposte y procesamiento de medias reses. Sin faena propia.'
  return 'Depósito frigorífico habilitado para almacenamiento y conservación de carnes.'
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
  if (!f) return { title: 'Frigorífico no encontrado' }

  const title = `${f.name} — Frigorífico Mat. ${f.matricula} | Consignatarias.com.ar`
  const description = `Ficha de ${f.name}: CUIT ${formatCuit(f.cuit)}, matrícula ${f.matricula}, ${f.province}. ${stageName(f.stage)}. Registro SENASA/MAGYP.`

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

export default async function FrigorificoDetailPage({
  params,
}: {
  params: Promise<{ cuit: string }>
}) {
  const { cuit } = await params
  const f = frigorificos.find((x) => x.cuit === cuit)
  if (!f) notFound()

  return (
    <div className="max-w-2xl mx-auto px-2 sm:px-4 py-4 space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xxs font-terminal text-zinc-600">
        <Link href="/frigorificos" className="hover:text-zinc-400 transition-colors">
          FRIGORIFICOS
        </Link>
        <span>/</span>
        <span className="text-zinc-400">MAT. {f.matricula}</span>
      </div>

      {/* Header */}
      <div className="terminal-panel">
        <div className="terminal-panel-header flex items-center justify-between">
          <span className="text-zinc-200 text-label tracking-widest">FICHA DEL ESTABLECIMIENTO</span>
          <span className={`text-xxs font-terminal px-1.5 py-0.5 border rounded-terminal ${stageBorderColor(f.stage)} ${stageColor(f.stage)}`}>
            ETAPA {f.stage}
          </span>
        </div>
        <div className="px-panel py-4">
          <h1 className="text-lg font-medium text-zinc-100 leading-tight">
            {f.name}
          </h1>
          <p className="text-xxs font-terminal text-zinc-500 mt-1">
            {f.province}
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
            <span className="text-data font-terminal text-zinc-200 tabular-nums">{formatCuit(f.cuit)}</span>
          </div>
          <div className="px-panel py-2.5 flex items-center justify-between">
            <span className="text-xxs font-terminal text-zinc-500 uppercase tracking-wider">Matrícula</span>
            <span className="text-data font-terminal text-zinc-200 tabular-nums">{f.matricula}</span>
          </div>
          <div className="px-panel py-2.5 flex items-center justify-between">
            <span className="text-xxs font-terminal text-zinc-500 uppercase tracking-wider">Provincia</span>
            <span className="text-data font-terminal text-zinc-200">{f.province}</span>
          </div>
          <div className="px-panel py-2.5 flex items-center justify-between">
            <span className="text-xxs font-terminal text-zinc-500 uppercase tracking-wider">Etapa</span>
            <span className={`text-data font-terminal ${stageColor(f.stage)}`}>
              {stageName(f.stage)}
            </span>
          </div>
        </div>
      </div>

      {/* Stage description */}
      <div className="terminal-panel">
        <div className="terminal-panel-header">
          <span className="text-zinc-200 text-label tracking-widest">HABILITACIÓN</span>
        </div>
        <div className="px-panel py-3">
          <p className="text-data font-terminal text-zinc-400 leading-relaxed">
            {stageDescription(f.stage)}
          </p>
          <p className="text-xxs font-terminal text-zinc-600 mt-2">
            Fuente: Registro Nacional SENASA / MAGyP
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Link
          href={`/frigorificos/verificar?cuit=${f.cuit}`}
          className="px-4 py-2 bg-positive/10 border border-positive/30 text-positive text-data font-terminal rounded-terminal hover:bg-positive/20 transition-colors"
        >
          Reclamar este perfil
        </Link>
        <Link
          href="/frigorificos"
          className="px-4 py-2 border border-terminal-border text-zinc-400 text-data font-terminal rounded-terminal hover:border-zinc-500 transition-colors"
        >
          Volver al directorio
        </Link>
      </div>
    </div>
  )
}
