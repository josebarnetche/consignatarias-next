'use client'

import { ImagenTema } from '@/components/ui/ImagenTema'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams, useRouter } from 'next/navigation'
import ProfileProgressTracker from '@/components/onboarding/ProfileProgressTracker'
import { ProActivatedModule, type NextStep } from '@/components/welcome'
import { WhatsAppIconButton } from '@/components/share/WhatsAppShare'
import { LayoutDashboard, CalendarDays, Pencil, BarChart3, CreditCard, Building2, Inbox, Package, Eye, TrendingUp } from 'lucide-react'
import QRCode from '@/components/QRCode'
import { UpgradeConfirmTracker } from '@/components/UpgradeConfirmTracker'
import MarketIntelPanel from '@/components/MarketIntelPanel'
import MagPulse from '@/components/MagPulse'
import { trackEvent } from '@/lib/analytics'
import { EmptyState } from '@/components/ui'
import PerformanceMes from '@/components/dashboard/PerformanceMes'
import Distribucion from '@/components/dashboard/Distribucion'
import BenchmarkMercado from '@/components/dashboard/BenchmarkMercado'
import type { Benchmark } from '@/lib/reports/benchmark'
import CarteraPanel from '@/components/dashboard/CarteraPanel'
import type { Cartera } from '@/lib/reports/cartera'
import type { Territorio } from '@/lib/reports/territorio'
import { TerritorioPanel } from '@/components/dashboard/TerritorioPanel'
import ParticipacionMercado from '@/components/dashboard/ParticipacionMercado'
import type { Participacion } from '@/lib/reports/participacion'
import type { Bandeja } from '@/lib/reports/bandeja'
import AgendaRegionalPanel from '@/components/dashboard/AgendaRegionalPanel'
import type { AgendaRegional } from '@/lib/reports/agenda-regional'
import type { ResumenDistribucion } from '@/lib/promotion'
import type { Performance } from '@/lib/reports/performance'
import type { ConsignatariaPlanStatus } from '@/lib/features'
import { BENEFICIOS_PRO_CONSIGNATARIA } from '@/lib/pro-consignataria-beneficios'
import OrigenVisitas from '@/components/dashboard/OrigenVisitas'
import PreofertasManager, { type PreofertaFirma, type OfertaRecibida } from '@/components/dashboard/PreofertasManager'
import ResultadoVsMercado from '@/components/dashboard/ResultadoVsMercado'
import BusquedasGoogle from '@/components/dashboard/BusquedasGoogle'
import CambiarContrasena from '@/components/dashboard/CambiarContrasena'
import type { BusquedasFicha } from '@/lib/gsc/fichas'
import type { ResultadoVsMercado as ResultadoVsMercadoDatos } from '@/lib/reports/resultado-vs-mercado'
import type { OrigenVisitas as OrigenVisitasDatos } from '@/lib/reports/origen-visitas'
import { provinciaNombre } from '@/lib/ui/tokens'
import { mensajeError } from '@/lib/ui/mensaje-error'
import { Marco, Kpi, Vacio, SoloPro, BotonPrimario, BotonSecundario, fmt } from '@/components/panel/PanelUi'
import ConsultasCRM from '@/components/panel/ConsultasCRM'
import { ETAPAS, ETAPA_LABEL, etapaDe, origenConsulta, type Etapa } from '@/lib/leads/pipeline'

interface Consignataria {
  display_name: string
  canonical_slug: string
  verified: boolean
  phone?: string | null
  email?: string | null
  website?: string | null
  description?: string | null
  whatsapp?: string | null
  cuit?: string | null
  logo_url?: string | null
  /** Fondo para un logo blanco del directorio (color de la marca). */
  logo_fondo?: string | null
}

interface Claim {
  id: string
  consignataria_slug: string
  status: string
  created_at: string
  consignatarias: { display_name: string; canonical_slug: string } | null
}

interface ScrapedAuction {
  title: string
  date: string
  location: string
  time: string | null
  /** "fecha|LOCALIDAD": con esto la corrección de la firma reemplaza a este remate. */
  clave?: string
  province?: string
  type?: string
  main_category?: string
  estimated_heads?: number | null
  description?: string
  catalog_url?: string | null
  youtube_url?: string | null
}

interface OwnerAuction {
  id: number
  title: string
  date: string
  time: string | null
  location: string | null
  province: string | null
  type: string
  main_category: string
  estimated_heads: number | null
  description: string | null
  catalog_url: string | null
  youtube_url: string | null
  flyer_url?: string | null
  reemplaza_clave?: string | null
  status: string
}

interface AuctionResult {
  id: string
  auction_date: string
  auction_title: string
  total_heads_sold: number | null
  average_price: number | null
}

interface CompletedFields {
  phone: boolean
  email: boolean
  website: boolean
  description: boolean
  whatsapp: boolean
}

interface Subscription {
  plan_name: string
  status: string
  current_period_end: string | null
  rebill_subscription_id: string | null
}

interface Frigorifico {
  cuit: string
  display_name: string
  verified: boolean
  phone?: string | null
  email?: string | null
  website?: string | null
  description?: string | null
  whatsapp?: string | null
  location?: string | null
  logo_url?: string | null
  habilitacion_nivel?: string | null
  habilitacion_verificada?: boolean | null
}

interface FrigoClaim {
  id: string
  frigorifico_cuit: string
  frigorifico_name: string
  status: string
  created_at: string
}

export interface FrigoProduct {
  id: number
  producto: string
  categoria: string | null
  estado: string | null
  presentacion?: string | null
  unidad_venta: string | null
  unidades_por_bulto: number | null
  pedido_minimo: number | null
  precio_modo: string | null
  precio_desde?: number | null
  precio_kg?: number | null
  segmento: string | null
  disponibilidad?: string | null
  interprovincial: boolean
  status: string | null
}

export interface FrigoRfq {
  id: number
  provincia_entrega: string
  tipo_comprador: string | null
  nombre: string | null
  empresa: string | null
  whatsapp: string | null
  email: string
  mensaje: string | null
  producto_snapshot: unknown
  estado: string | null
  created_at: string
}

interface Lead {
  id: number
  name: string
  phone: string | null
  email: string | null
  message: string | null
  source: string | null
  status: string | null
  notes?: string | null
  contacted_at?: string | null
  updated_at?: string | null
  created_at: string
}

interface Props {
  email: string
  /** Performance del mes vs el anterior. Null si no se pudo calcular. */
  performance?: Performance | null
  /** Distribución de sus remates. Null si todavía no salió en ningún canal. */
  distribucion?: ResumenDistribucion | null
  /** Cómo vendió vs el mercado de Cañuelas. Null si no opera en el MAG. */
  benchmark?: Benchmark | null
  /** Su cartera de remitentes en el MAG: fugas, capturas y concentración. */
  cartera?: Cartera | null
  /** El mapa de partidos: dónde tiene remitentes y dónde no. */
  territorio?: Territorio | null
  /** El titular del territorio, ya redactado en el servidor. */
  territorioTitular?: string
  /** Cuota de mercado en Cañuelas y si está creciendo. */
  participacion?: Participacion | null
  /** Todo lo que hay que atender hoy, en una lista ordenada. */
  bandeja?: Bandeja | null
  /** ¿La firma opera en el MAG? Si no, no se le ofrece lo que no vamos a darle. */
  hayDatosMag?: boolean
  /** Su agenda contra la del resto de la provincia. Sirve también fuera del MAG. */
  agenda?: AgendaRegional | null
  consignataria: Consignataria | null
  claims: Claim[]
  scrapedAuctions: ScrapedAuction[]
  ownerAuctions: OwnerAuction[]
  auctionResults: AuctionResult[]
  viewCount: number
  whatsappClicks: number
  leadsCount: number
  followersCount?: number
  marksCount?: number
  leads?: Lead[]
  totalWatchers: number
  viewPercentile: number
  provincialRank: { position: number; total: number; province: string }
  completedFields: CompletedFields | null
  subscription: Subscription | null
  /** Estado de plan decidido en el server (getConsignatariaPlanStatus). Única fuente. */
  plan?: ConsignatariaPlanStatus
  origenVisitas?: OrigenVisitasDatos | null
  vistaAdmin?: VistaAdmin | null
  preofertasFirma?: PreofertaFirma[]
  ofertasFirma?: OfertaRecibida[]
  resultadosVR?: ResultadoVsMercadoDatos[] | null
  busquedasGoogle?: BusquedasFicha | null
  frigorifico?: Frigorifico | null
  frigoClaims?: FrigoClaim[]
  frigoProducts?: FrigoProduct[]
  frigoRfqs?: FrigoRfq[]
  frigoIsPro?: boolean
  dteCount?: number
  alreadyRedeemed?: boolean
}

/** "Ver como" de admin: el panel de una firma, con el plan forzado o el real. */
export interface VistaAdmin {
  slug: string
  vista: 'pro' | 'free' | 'real'
}

const PLAN_FREE: ConsignatariaPlanStatus = { isPro: false, tier: 'free', source: null, periodEnd: null }

function formatDate(d: string) {
  const parts = d.split('-')
  if (parts.length < 3) return d
  return `${parts[2]}/${parts[1]}`
}

type TabKey = 'resumen' | 'leads' | 'remates' | 'preofertas' | 'editar' | 'resultados' | 'audiencia' | 'mercado' | 'plan' | 'frigorifico' | 'catalogo' | 'pedidos'

export default function DashboardClient({
  email, consignataria, claims, scrapedAuctions, ownerAuctions: initialOwnerAuctions,
  auctionResults, viewCount, whatsappClicks, leadsCount, followersCount = 0, marksCount = 0, leads = [], totalWatchers, provincialRank, completedFields, subscription, plan = PLAN_FREE, origenVisitas = null, vistaAdmin = null, preofertasFirma = [], ofertasFirma = [], resultadosVR = null, busquedasGoogle = null, frigorifico, frigoClaims = [],
  frigoProducts = [], frigoRfqs = [], frigoIsPro = false,
  dteCount = 0, alreadyRedeemed = false, performance = null, distribucion = null, benchmark = null, cartera = null, territorio = null, territorioTitular = '', participacion = null, bandeja = null, hayDatosMag = false, agenda = null,
}: Props) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const justUpgraded = searchParams.get('upgraded') === 'true'
  const tabParam = searchParams.get('tab') as TabKey | null
  const [showUpgradeToast, setShowUpgradeToast] = useState(justUpgraded)
  const [upgradeConfirmed, setUpgradeConfirmed] = useState(false)
  const [upgradePollCount, setUpgradePollCount] = useState(0)
  const [activeTab, setActiveTab] = useState<TabKey>(tabParam || 'resumen')
  const [ownerAuctions, setOwnerAuctions] = useState(initialOwnerAuctions)



  // Points redemption state
  const [isRedeeming, setIsRedeeming] = useState(false)
  const [hasRedeemed, setHasRedeemed] = useState(alreadyRedeemed)
  const [redeemError, setRedeemError] = useState<string | null>(null)

  // El plan lo decide el server (`plan`, la misma regla que gatea los datos). Acá no
  // se recalcula: si el cliente dijera PRO y el server no, el panel mostraría los
  // bloques pagos vacíos; al revés, mostraría muestras de ejemplo con los datos reales
  // ya en mano.
  const tierLabel = plan.isPro ? (plan.tier === 'enterprise' ? 'ENTERPRISE' : 'PRO') : 'FREE'

  // PRO ya activo vs todavía procesando el pago.
  const proActivated = plan.isPro || upgradeConfirmed
  const proConfirming = justUpgraded && !proActivated

  // Próximos pasos de activación PRO — destinos reales del dashboard.
  const profileComplete = completedFields
    ? Object.values(completedFields).every(Boolean)
    : false
  const proNextSteps: NextStep[] = (tierLabel === 'PRO' || tierLabel === 'ENTERPRISE') && consignataria
    ? [
        {
          label: 'Completá los datos de tu perfil',
          done: profileComplete,
          onClick: () => { setActiveTab('editar'); setShowUpgradeToast(false) },
        },
        {
          label: 'Cargá tu primer remate destacado',
          done: ownerAuctions.length > 0,
          onClick: () => { setActiveTab('remates'); setShowUpgradeToast(false) },
        },
        {
          label: 'Exportá tu calendario de remates',
          done: false,
          href: '/calendario-exportar',
        },
      ]
    : []

  // Handle points redemption
  const handleRedeemPoints = async () => {
    setIsRedeeming(true)
    setRedeemError(null)
    
    try {
      const res = await fetch('/api/redeem-points', { method: 'POST' })
      const data = await res.json()
      
      if (res.ok) {
        setHasRedeemed(true)
        // Show success and refresh to get updated subscription
        window.location.reload()
      } else {
        setRedeemError(mensajeError(data, 'Error al canjear puntos'))
      }
    } catch {
      setRedeemError('Error de conexión')
    } finally {
      setIsRedeeming(false)
    }
  }

  // Poll subscription status after upgrade redirect
  useEffect(() => {
    if (!justUpgraded || plan.isPro || upgradeConfirmed) return
    if (upgradePollCount >= 12) return // Stop after 60s (12 x 5s)

    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/subscription-status')
        const data = await res.json()
        if (data.status === 'active') {
          setUpgradeConfirmed(true)
          // El server recalcula el plan y manda los bloques PRO con el dato real.
          router.refresh()
        } else {
          setUpgradePollCount(prev => prev + 1)
        }
      } catch {
        setUpgradePollCount(prev => prev + 1)
      }
    }, 5000)

    return () => clearTimeout(timer)
  }, [justUpgraded, plan.isPro, upgradeConfirmed, upgradePollCount, router])

  // NAVEGACIÓN DEL CRM (19-10-2026). Las claves viejas se mantienen (`leads`,
  // `editar`) porque hay enlaces y redirecciones que las usan (?tab=resultados).
  const hoy = new Date().toISOString().slice(0, 10)
  const proximos = [
    ...ownerAuctions.map((a) => ({ date: a.date, time: a.time, title: a.title, location: a.location, propio: true })),
    ...scrapedAuctions.map((a) => ({ date: a.date, time: a.time, title: a.title, location: a.location, propio: false })),
  ]
    .filter((a) => a.date >= hoy)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''))
  const consultasNuevas = leads.filter((l) => (l.status ?? 'new') === 'new').length
  const esPro = tierLabel !== 'FREE'

  const tabs: { key: TabKey; label: string; count?: number; icon: React.ReactNode }[] = [
    { key: 'resumen', label: 'Inicio', icon: <LayoutDashboard className="h-4 w-4" /> },
  ]
  if (consignataria?.verified) {
    tabs.push({ key: 'leads', label: 'Consultas', count: consultasNuevas, icon: <Inbox className="h-4 w-4" /> })
    tabs.push({ key: 'remates', label: 'Remates', count: proximos.length, icon: <CalendarDays className="h-4 w-4" /> })
    tabs.push({ key: 'resultados', label: 'Resultados', count: auctionResults.length, icon: <BarChart3 className="h-4 w-4" /> })
    tabs.push({ key: 'preofertas', label: 'Pre-ofertas', count: ofertasFirma.length, icon: <Package className="h-4 w-4" /> })
    tabs.push({ key: 'audiencia', label: 'Audiencia', icon: <Eye className="h-4 w-4" /> })
    tabs.push({ key: 'mercado', label: 'Mercado', icon: <TrendingUp className="h-4 w-4" /> })
    tabs.push({ key: 'editar', label: 'Perfil', icon: <Pencil className="h-4 w-4" /> })
  }
  tabs.push({ key: 'plan', label: 'Mi plan', icon: <CreditCard className="h-4 w-4" /> })
  if (frigorifico) {
    tabs.push({ key: 'frigorifico', label: 'Frigorífico', icon: <Building2 className="h-4 w-4" /> })
    if (frigorifico.verified) {
      tabs.push({ key: 'catalogo', label: 'Catálogo', count: frigoProducts.length, icon: <Package className="h-4 w-4" /> })
      tabs.push({ key: 'pedidos', label: 'Pedidos', count: frigoRfqs.length, icon: <Inbox className="h-4 w-4" /> })
    }
  }

  const hasPendingClaim = claims.some(c => c.status === 'pending') || frigoClaims.some(c => c.status === 'pending')
  const hasVerified = consignataria?.verified || frigorifico?.verified
  const irA = (t: TabKey) => {
    setActiveTab(t)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // La ficha, campo por campo: lo que el productor ve cuando entra al perfil.
  const ficha = consignataria
    ? [
        { campo: 'Logo', listo: !!consignataria.logo_url },
        { campo: 'WhatsApp', listo: !!consignataria.whatsapp },
        { campo: 'Teléfono', listo: !!consignataria.phone },
        { campo: 'Email de contacto', listo: !!consignataria.email },
        { campo: 'Sitio web', listo: !!consignataria.website },
        { campo: 'Descripción', listo: !!consignataria.description },
      ]
    : []
  const fichaLista = ficha.filter((f) => f.listo).length
  const linkGo = consignataria ? `https://consignatarias.com.ar/go/${consignataria.canonical_slug}` : ''

  const encabezado = (kicker: string, titulo: string, sub?: React.ReactNode, acciones?: React.ReactNode) => (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-xxs font-medium text-accent">{kicker}</p>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-ink text-balance">{titulo}</h1>
        {sub && <p className="mt-1.5 max-w-2xl text-sm text-zinc-400">{sub}</p>}
      </div>
      {acciones && <div className="flex shrink-0 flex-wrap gap-2">{acciones}</div>}
    </div>
  )

  return (
    <div className="relative">
      <div className="lienzo-puntos pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
      <div className="panel-crm relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-10">
      {vistaAdmin && (
        <div className="mb-6 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3">
          <p className="text-sm text-zinc-100">
            Estás viendo el panel de <strong>{consignataria?.display_name ?? vistaAdmin.slug}</strong> como lo vería
            su dueño{vistaAdmin.vista === 'pro' ? ' con PRO' : vistaAdmin.vista === 'free' ? ' sin PRO' : ', con su plan real'}.
            Es de sólo lectura: los cambios no se guardan.
          </p>
          <div className="mt-2 flex flex-wrap gap-3 text-xs">
            {(['pro', 'free', 'real'] as const).map((v) => (
              <a
                key={v}
                href={`/dashboard?como=${vistaAdmin.slug}&vista=${v}`}
                className={vistaAdmin.vista === v ? 'font-semibold text-ink underline' : 'text-accent hover:underline'}
              >
                {v === 'pro' ? 'Vista PRO' : v === 'free' ? 'Vista FREE' : 'Plan real'}
              </a>
            ))}
            <a href="/admin/ver-como" className="text-zinc-400 hover:underline">Otra firma</a>
            <a href="/dashboard" className="text-zinc-400 hover:underline">Salir</a>
          </div>
        </div>
      )}
      {/* Fire the GA4 pro_upgrade conversion only once PRO is DB-confirmed
          (subscription prop or polled /api/subscription-status), never on the
          bare ?upgraded=true redirect param. */}
      <UpgradeConfirmTracker
        confirmed={proActivated}
        plan={subscription?.plan_name || (tierLabel === 'ENTERPRISE' ? 'ENTERPRISE' : 'PRO_CONSIGNATARIA')}
        price={tierLabel === 'ENTERPRISE' ? 0 : 45000}
        dedupeId={subscription?.rebill_subscription_id ?? null}
      />
      {showUpgradeToast && (tierLabel === 'PRO' || tierLabel === 'ENTERPRISE' || proConfirming) && (
        <div className="mb-6">
          <ProActivatedModule
            tier={tierLabel === 'ENTERPRISE' ? 'ENTERPRISE' : 'PRO'}
            periodEnd={subscription?.current_period_end}
            confirming={proConfirming}
            steps={proNextSteps}
            onClose={() => setShowUpgradeToast(false)}
          />
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[232px_minmax(0,1fr)]">
        {/* ── Barra lateral: la firma y las secciones ── */}
        <aside className="min-w-0 lg:sticky lg:top-20 lg:self-start">
          <div className="flex items-center gap-3">
            <span
              className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-terminal-border bg-zinc-100"
              style={consignataria?.logo_fondo ? { backgroundColor: consignataria.logo_fondo } : undefined}
            >
              {consignataria?.logo_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={consignataria.logo_url} alt={consignataria.display_name} className="h-full w-full object-contain p-1" />
              ) : (
                <ImagenTema src="/marca/iconos-color/casa-remates.png" alt="" className="h-7 w-7" />
              )}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">
                {consignataria?.display_name ?? frigorifico?.display_name ?? 'Mi panel'}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[0.625rem]">
                {(consignataria?.verified || frigorifico?.verified) && <span className="text-positive">Verificada</span>}
                <span className={esPro ? 'font-bold text-accent' : 'text-zinc-500'}>{esPro ? `★ ${tierLabel}` : 'Plan FREE'}</span>
              </p>
            </div>
          </div>
          <p className="mt-2 truncate text-[0.625rem] text-zinc-500">{email}</p>

          {(consignataria || frigorifico) && (
            <nav className="-mx-4 mt-5 flex gap-1 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0" aria-label="Secciones del panel">
              {tabs.map((tab) => {
                const activo = activeTab === tab.key
                return (
                  <button
                    key={tab.key}
                    onClick={() => irA(tab.key)}
                    aria-current={activo ? 'page' : undefined}
                    className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                      activo ? 'bg-accent/[0.09] font-medium text-accent' : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-ink'
                    }`}
                  >
                    {tab.icon}
                    <span className="whitespace-nowrap lg:flex-1 lg:text-left">{tab.label}</span>
                    {tab.count != null && tab.count > 0 && (
                      <span className={`rounded-full px-1.5 text-[0.625rem] tabular-nums ${activo ? 'bg-accent/15 text-accent' : 'bg-zinc-800 text-zinc-400'}`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>
          )}

          {consignataria && (
            <div className="mt-5 hidden space-y-1.5 border-t border-terminal-border pt-4 text-xs lg:block">
              <Link href={`/consignatarias/${consignataria.canonical_slug}`} className="block text-zinc-400 hover:text-accent">
                Ver tu perfil público ↗
              </Link>
              <a href={`/go/${consignataria.canonical_slug}`} target="_blank" rel="noopener noreferrer" className="block text-zinc-400 hover:text-accent">
                Tu página con QR ↗
              </a>
            </div>
          )}
        </aside>

        {/* ── Contenido ── */}
        <main key={activeTab} className="page-transition min-w-0 space-y-12">
      {/* ============ INICIO ============ */}
      {activeTab === 'resumen' && consignataria?.verified && (
        <>
          {encabezado(
            'Inicio',
            consignataria.display_name,
            proximos[0]
              ? <>Próximo remate: <span className="text-zinc-200">{new Date(proximos[0].date + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>{proximos[0].location ? ` · ${proximos[0].location}` : ''}</>
              : 'No hay remates próximos tuyos en el calendario.',
            <>
              <BotonPrimario onClick={() => irA('remates')}>+ Cargar remate</BotonPrimario>
              <BotonSecundario href="/dashboard/resultados/nuevo">Cargar resultado</BotonSecundario>
            </>,
          )}

          {/* Indicadores: todos de la base, en cero si no hubo nada. */}
          <Marco nombre="Últimos 30 días" cuerpo="p-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 [&>*]:border-terminal-border [&>*]:border-b sm:[&>*]:border-r">
              <Kpi
                etiqueta="Vistas de tu perfil"
                valor={viewCount}
                cambio={performance ? { delta: performance.cambios.vistas.delta } : null}
                detalle={provincialRank.position > 0 ? `#${provincialRank.position} en ${provincialRank.province} por remates` : undefined}
              />
              <Kpi
                etiqueta="Consultas recibidas"
                valor={leadsCount}
                cambio={performance ? { delta: performance.cambios.leads.delta } : null}
                detalle={consultasNuevas > 0 ? `${consultasNuevas} sin responder` : 'Ninguna pendiente'}
                onClick={() => irA('leads')}
              />
              <Kpi etiqueta="Clics en tu WhatsApp" valor={whatsappClicks} detalle="Desde tu perfil" />
              <Kpi etiqueta="Productores que te siguen" valor={followersCount} detalle="Reciben tus remates" />
              <Kpi etiqueta="Marcas en tus remates" valor={marksCount + totalWatchers} detalle="Agendaron un remate tuyo" />
            </div>
          </Marco>

          <div className="grid grid-cols-[minmax(0,1fr)] gap-x-5 gap-y-12 xl:grid-cols-3">
            {/* Pipeline */}
            <Marco
              nombre="Consultas"
              titulo="Pipeline de consultas"
              accion={<button onClick={() => irA('leads')} className="text-accent hover:underline">Ver todas →</button>}
              className="xl:col-span-2"
            >
              {leads.length === 0 ? (
                <Vacio
                  titulo="Todavía no recibiste consultas."
                  texto="Entran desde el formulario de tu perfil, tu página con QR y la ficha de cada remate. Te avisamos por mail y quedan acá para que las sigas."
                  accion={<BotonSecundario onClick={() => { navigator.clipboard.writeText(linkGo); trackEvent('referral_link_copy', { consignataria_slug: consignataria.canonical_slug, surface: 'panel_inicio' }) }}>Copiar el link de tu página</BotonSecundario>}
                />
              ) : (
                <>
                  <div className="flex h-2 overflow-hidden rounded-full bg-zinc-800" aria-hidden="true">
                    {ETAPAS.map((e) => {
                      const n = leads.filter((l) => etapaDe(l.status) === e).length
                      return n ? <span key={e} className={TONO_ETAPA_BARRA[e]} style={{ width: `${(n / leads.length) * 100}%` }} /> : null
                    })}
                  </div>
                  <dl className="mt-3 grid grid-cols-4 gap-2">
                    {ETAPAS.map((e) => (
                      <div key={e}>
                        <dt className="text-[0.625rem] text-zinc-500">{ETAPA_LABEL[e]}</dt>
                        <dd className="text-lg font-semibold tabular-nums text-ink">{leads.filter((l) => etapaDe(l.status) === e).length}</dd>
                      </div>
                    ))}
                  </dl>
                  <ul className="mt-4 divide-y divide-terminal-border border-t border-terminal-border">
                    {leads.slice(0, 5).map((l) => (
                      <li key={l.id}>
                        <button onClick={() => irA('leads')} className="flex w-full items-center gap-3 py-2.5 text-left hover:text-accent">
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONO_ETAPA_BARRA[etapaDe(l.status)]}`} aria-hidden="true" />
                          <span className="w-28 shrink-0 truncate text-sm text-ink">{esPro ? l.name : l.name.split(' ')[0]}</span>
                          <span className="min-w-0 flex-1 truncate text-xs text-zinc-500">{l.message || origenConsulta(l.source)}</span>
                          <span className="shrink-0 text-[0.625rem] tabular-nums text-zinc-500">
                            {new Date(l.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Marco>

            {/* Próximos remates */}
            <Marco
              nombre="Remates"
              titulo="Próximos remates"
              accion={<button onClick={() => irA('remates')} className="text-accent hover:underline">Gestionar →</button>}
            >
              {proximos.length === 0 ? (
                <Vacio
                  titulo="Sin remates próximos."
                  texto="Cargá tu próximo remate y sale en el calendario, en tu perfil y en el mail semanal."
                  accion={<BotonPrimario onClick={() => irA('remates')}>+ Cargar remate</BotonPrimario>}
                />
              ) : (
                <ul className="space-y-3">
                  {proximos.slice(0, 5).map((a, i) => {
                    const d = new Date(a.date + 'T12:00:00')
                    return (
                      <li key={`${a.date}-${i}`} className="flex gap-3">
                        <span className="grid w-11 shrink-0 place-items-center rounded-lg border border-terminal-border py-1.5 text-center leading-none">
                          <span className="text-[0.625rem] uppercase text-zinc-500">{d.toLocaleDateString('es-AR', { month: 'short' }).replace('.', '')}</span>
                          <span className="mt-0.5 text-lg font-semibold tabular-nums text-ink">{d.getDate()}</span>
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm text-ink">{a.title}</span>
                          <span className="block truncate text-xxs text-zinc-500">
                            {[a.time, a.location].filter(Boolean).join(' · ') || 'Sin lugar cargado'}
                            {!a.propio && ' · del calendario'}
                          </span>
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Marco>

            {/* Vistas por día (PRO) */}
            <Marco nombre="Audiencia" titulo="Vistas de tu perfil por día" className="xl:col-span-2"
              accion={esPro ? <button onClick={() => irA('audiencia')} className="text-accent hover:underline">Ver de dónde llegan →</button> : undefined}
            >
              {esPro ? (
                origenVisitas ? (
                  <BarrasDiarias datos={origenVisitas.porDia} />
                ) : (
                  <Vacio titulo="Todavía no hay vistas registradas." texto="Cada visita a tu perfil se cuenta acá, día por día." />
                )
              ) : (
                <SoloPro
                  titulo="Quién te mira, día por día"
                  beneficio={`Este mes tu perfil tuvo ${fmt(viewCount)} ${viewCount === 1 ? 'vista' : 'vistas'}. Con PRO las ves día por día y sabés si llegan desde Google, el calendario o una IA.`}
                  desde="panel_inicio"
                />
              )}
            </Marco>

            {/* Para hacer */}
            <Marco nombre="Pendientes" titulo="Para hacer">
              {bandeja && bandeja.entradas.length > 0 ? (
                <ul className="space-y-3">
                  {bandeja.entradas.slice(0, 6).map((e) => (
                    <li key={e.id} className="flex gap-2.5">
                      <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${URGENCIA_TONO[e.urgencia]}`} aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block text-sm text-ink">{e.titulo}</span>
                        <span className="block text-xxs text-zinc-500">{e.detalle}</span>
                        {e.href && e.accion && <Link href={e.href} className="text-xxs text-accent hover:underline">{e.accion} →</Link>}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <Vacio titulo="Nada pendiente." texto="Acá aparecen las consultas sin responder, los remates de la semana y lo que le falta a tu ficha." />
              )}
            </Marco>

            {/* Ficha */}
            <Marco nombre="Ficha" titulo={`Tu ficha · ${fichaLista} de ${ficha.length}`}
              accion={<button onClick={() => irA('editar')} className="text-accent hover:underline">Completar →</button>}
            >
              <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800" aria-hidden="true">
                <span className="block h-full rounded-full bg-accent transition-all" style={{ width: `${(fichaLista / ficha.length) * 100}%` }} />
              </div>
              <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
                {ficha.map((f) => (
                  <li key={f.campo} className={`flex items-center gap-2 text-xs ${f.listo ? 'text-zinc-300' : 'text-zinc-500'}`}>
                    <span className={f.listo ? 'text-positive' : 'text-zinc-600'} aria-hidden="true">{f.listo ? '✓' : '○'}</span>
                    {f.campo}
                  </li>
                ))}
              </ul>
            </Marco>

            {/* Resultados */}
            <Marco nombre="Resultados" titulo="Tus últimos resultados" className="xl:col-span-2"
              accion={<Link href="/dashboard/resultados/nuevo" className="text-accent hover:underline">+ Cargar resultado</Link>}
            >
              {auctionResults.length === 0 ? (
                <Vacio
                  titulo="Todavía no cargaste resultados."
                  texto="Cargá los promedios de cada remate: arman tu historial de precios y, con PRO, se comparan contra el Valor de Referencia de esa semana."
                />
              ) : (
                <ul className="divide-y divide-terminal-border">
                  {auctionResults.slice(0, 5).map((r) => (
                    <li key={r.id} className="flex items-center gap-4 py-2.5 text-sm">
                      <span className="w-14 shrink-0 text-xxs tabular-nums text-zinc-500">{formatDate(r.auction_date)}</span>
                      <span className="min-w-0 flex-1 truncate text-ink">{r.auction_title}</span>
                      {r.total_heads_sold != null && <span className="hidden text-xxs tabular-nums text-zinc-500 sm:inline">{fmt(r.total_heads_sold)} cab.</span>}
                      {r.average_price != null && <span className="text-xs tabular-nums text-ink">${Number(r.average_price).toLocaleString('es-AR')}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </Marco>
          </div>
        </>
      )}

      {/* Inicio de una cuenta sin firma verificada (claims, frigorífico, nueva) */}
      {activeTab === 'resumen' && !consignataria?.verified && (
        <>
          {encabezado('Inicio', frigorifico?.display_name ?? 'Tu panel', email)}
          {claims.length > 0 && (
            <Marco nombre="Solicitudes" titulo="Mis solicitudes" cuerpo="p-0">
              <ul className="divide-y divide-terminal-border">
                {claims.map(claim => (
                  <li key={claim.id} className="flex items-center gap-4 px-5 py-3">
                    <span className="flex-1 text-sm text-ink">{claim.consignatarias?.display_name || claim.consignataria_slug}</span>
                    <span className={`rounded-sm border px-1.5 py-0.5 text-[0.625rem] font-semibold ${
                      claim.status === 'pending' ? 'border-warning/40 text-warning'
                        : claim.status === 'approved' ? 'border-positive/40 text-positive'
                        : 'border-negative/40 text-negative'
                    }`}>
                      {claim.status === 'pending' ? 'Pendiente' : claim.status === 'approved' ? 'Aprobada' : 'Rechazada'}
                    </span>
                  </li>
                ))}
              </ul>
            </Marco>
          )}
          {!hasVerified && hasPendingClaim && <ClaimEnEspera claims={claims} />}
          {!consignataria && !frigorifico && claims.length === 0 && frigoClaims.length === 0 && (
            <Marco nombre="Primeros pasos" titulo="Reclamá tu firma">
              <p className="max-w-xl text-sm text-zinc-400">
                Buscá tu consignataria o tu frigorífico y reclamá el perfil. Cuando lo verifiquemos, este panel se abre con tus remates, tus consultas y tus números.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <BotonPrimario href="/consignatarias">Buscar mi consignataria →</BotonPrimario>
                <BotonSecundario href="/frigorificos">Buscar mi frigorífico</BotonSecundario>
              </div>
            </Marco>
          )}
          {frigorifico && (
            <Marco nombre="Frigorífico" titulo={frigorifico.display_name}
              accion={<button onClick={() => irA('frigorifico')} className="text-accent hover:underline">Abrir →</button>}
            >
              <dl className="grid grid-cols-2 gap-4">
                <div><dt className="text-xxs text-zinc-500">Productos en catálogo</dt><dd className="text-2xl font-semibold tabular-nums text-ink">{fmt(frigoProducts.length)}</dd></div>
                <div><dt className="text-xxs text-zinc-500">Pedidos recibidos</dt><dd className="text-2xl font-semibold tabular-nums text-ink">{fmt(frigoRfqs.length)}</dd></div>
              </dl>
            </Marco>
          )}
        </>
      )}

      {/* ============ CONSULTAS ============ */}
      {activeTab === 'leads' && consignataria?.verified && (
        <>
          {encabezado(
            'Consultas',
            'Quién te buscó',
            'Cada consulta entra como “Nueva”. Movela de etapa cuando le escribas y anotá lo que hablaron: queda guardado en tu cuenta.',
          )}
          <ConsultasCRM slug={consignataria.canonical_slug} inicial={leads} esPro={esPro} soloLectura={!!vistaAdmin} />
        </>
      )}

      {/* ============ REMATES ============ */}
      {activeTab === 'remates' && consignataria?.verified && (
        <>
          {encabezado(
            'Remates',
            'Tus remates',
            'Cargá los nuevos y corregí los que el sitio encontró solo. Lo que cargás se ve al instante en tu perfil y en menos de una hora en el calendario y el mail semanal.',
          )}
          <AuctionManager
            slug={consignataria.canonical_slug}
            displayName={consignataria.display_name}
            ownerAuctions={ownerAuctions}
            scrapedAuctions={scrapedAuctions}
            onAuctionsChange={setOwnerAuctions}
          />
        </>
      )}

      {/* ============ RESULTADOS ============ */}
      {activeTab === 'resultados' && consignataria && (
        <>
          {encabezado(
            'Resultados',
            'Promedios de tus remates',
            'Cabezas vendidas y precio por categoría de cada remate. Es tu historial de precios.',
            <BotonPrimario href="/dashboard/resultados/nuevo">+ Cargar resultado</BotonPrimario>,
          )}
          <Marco nombre="Resultados" cuerpo="p-0">
            {auctionResults.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-terminal-border text-left text-xxs text-zinc-500">
                    <th className="px-5 py-2.5 font-normal">Fecha</th>
                    <th className="px-2 py-2.5 font-normal">Remate</th>
                    <th className="hidden px-2 py-2.5 text-right font-normal sm:table-cell">Cabezas</th>
                    <th className="px-2 py-2.5 text-right font-normal">Promedio</th>
                    <th className="px-5 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-terminal-border">
                  {auctionResults.map(r => (
                    <tr key={r.id}>
                      <td className="px-5 py-3 text-xxs tabular-nums text-zinc-500">{formatDate(r.auction_date)}</td>
                      <td className="max-w-0 truncate px-2 py-3 text-ink">{r.auction_title}</td>
                      <td className="hidden px-2 py-3 text-right tabular-nums text-zinc-400 sm:table-cell">{r.total_heads_sold != null ? fmt(r.total_heads_sold) : '—'}</td>
                      <td className="px-2 py-3 text-right tabular-nums text-ink">{r.average_price != null ? `$${Number(r.average_price).toLocaleString('es-AR')}` : '—'}</td>
                      <td className="px-5 py-3 text-right"><Link href={`/dashboard/resultados/${r.id}`} className="text-xs text-accent hover:underline">Editar</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-5">
                <Vacio
                  titulo="Todavía no cargaste resultados."
                  texto="Elegí el remate, cargá las cabezas y el precio por categoría. Te sugerimos los remates de los últimos 90 días que todavía no tienen resultado."
                  accion={<BotonPrimario href="/dashboard/resultados/nuevo">+ Cargar el primero</BotonPrimario>}
                />
              </div>
            )}
          </Marco>
          <Marco nombre="Contra el mercado" titulo={esPro && resultadosVR && resultadosVR.length > 0 ? undefined : 'Tu precio contra el Valor de Referencia'} incrustado={!!(esPro && resultadosVR && resultadosVR.length > 0)}>
            {esPro ? (
              resultadosVR && resultadosVR.length > 0 ? (
                <ResultadoVsMercado resultados={resultadosVR} />
              ) : (
                <Vacio titulo="Sin resultados para comparar." texto="Cuando cargues un resultado con precio por categoría, aparece acá contra el Valor de Referencia de esa semana." />
              )
            ) : (
              <SoloPro titulo="Tu precio contra el mercado" beneficio="Cada categoría de tu remate contra el Valor de Referencia de esa semana. El número para pelear una consignación." desde="resultados" />
            )}
          </Marco>
        </>
      )}

      {/* ============ PRE-OFERTAS ============ */}
      {activeTab === 'preofertas' && consignataria?.verified && (
        <>
          {encabezado('Pre-ofertas', 'Lotes y ofertas', 'Publicá un lote antes del remate y recibí ofertas de compradores.')}
          <PreofertasManager slug={consignataria.canonical_slug} esPro={plan.isPro} inicial={preofertasFirma} ofertas={ofertasFirma} />
        </>
      )}

      {/* ============ AUDIENCIA ============ */}
      {activeTab === 'audiencia' && consignataria?.verified && (
        <>
          {encabezado('Audiencia', 'Quién te mira', 'Las visitas a tu perfil, de dónde llegan y qué buscan en Google cuando aparece tu ficha.')}
          {esPro ? (
            <>
              {performance && (
                <Marco nombre="Mes contra mes" incrustado>
                  <PerformanceMes perf={performance} />
                </Marco>
              )}
              <Marco nombre="Origen de las visitas" incrustado={!!origenVisitas}>
                {origenVisitas ? <OrigenVisitas d={origenVisitas} /> : <Vacio titulo="Todavía no hay visitas registradas." />}
              </Marco>
              <Marco nombre="Google" titulo={busquedasGoogle ? undefined : 'Lo que buscan en Google'} incrustado={!!busquedasGoogle}>
                {busquedasGoogle ? (
                  <BusquedasGoogle d={busquedasGoogle} />
                ) : (
                  <Vacio titulo="Todavía sin búsquedas." texto="Search Console se actualiza una vez por semana. Cuando tu ficha aparezca en Google, ves acá qué escribió la gente." />
                )}
              </Marco>
              <Marco nombre="Distribución" titulo={distribucion ? undefined : 'A cuántos les llegaron tus remates'} incrustado={!!distribucion}>
                {distribucion ? (
                  <Distribucion dist={distribucion} />
                ) : (
                  <Vacio titulo="Tus remates todavía no salieron en el mail semanal." texto="Cada envío queda registrado con la cantidad de productores a los que les llegó." />
                )}
              </Marco>
            </>
          ) : (
            <>
              <Marco nombre="Este mes" cuerpo="p-0">
                <div className="grid grid-cols-2 sm:grid-cols-3 [&>*]:border-terminal-border [&>*]:border-b sm:[&>*]:border-r">
                  <Kpi etiqueta="Vistas de tu perfil" valor={viewCount} />
                  <Kpi etiqueta="Clics en tu WhatsApp" valor={whatsappClicks} />
                  <Kpi etiqueta="Productores que te siguen" valor={followersCount} />
                </div>
              </Marco>
              <SoloPro
                titulo="Audiencia completa"
                beneficio="Tus vistas día por día, si llegan desde Google, el calendario o una IA, qué escriben en Google cuando aparece tu ficha y a cuántos productores les llegó cada remate en el mail semanal."
                desde="audiencia"
              />
            </>
          )}
        </>
      )}

      {/* ============ MERCADO ============ */}
      {activeTab === 'mercado' && consignataria?.verified && (
        <>
          {encabezado('Mercado', 'Tu firma en el mercado', 'Con quién compartís fecha en tu provincia y cómo se mueve el Mercado de Cañuelas.')}
          <Marco nombre="Agenda regional" titulo={agenda ? undefined : 'Tu agenda contra la de tu provincia'} incrustado={!!agenda}>
            {agenda ? <AgendaRegionalPanel a={agenda} /> : <Vacio titulo="Sin remates en tu provincia para comparar." />}
          </Marco>
          {hayDatosMag && (
            esPro ? (
              <>
                {territorio && <Marco nombre="Territorio" incrustado><TerritorioPanel t={territorio} titular={territorioTitular} /></Marco>}
                {cartera && <Marco nombre="Cartera" incrustado><CarteraPanel c={cartera} /></Marco>}
                {benchmark && <Marco nombre="Precio" incrustado><BenchmarkMercado b={benchmark} /></Marco>}
                {participacion && <Marco nombre="Participación" incrustado><ParticipacionMercado p={participacion} /></Marco>}
              </>
            ) : (
              <SoloPro
                titulo="Tu negocio en Cañuelas"
                beneficio="Tu cartera de remitentes (quién dejó de consignarte y a quién le ganaste un cliente), tu precio contra el promedio de las 22 casas, tu cuota y en qué partidos no tenés remitentes."
                desde="mercado"
              />
            )
          )}
          <Marco nombre="Cañuelas" incrustado>
            <MagPulse />
          </Marco>
          <Marco nombre="Competencia" incrustado>
            <MarketIntelPanel />
          </Marco>
        </>
      )}

      {/* ============ PERFIL ============ */}
      {activeTab === 'editar' && consignataria?.verified && (
        <>
          {encabezado(
            'Perfil',
            'Tu ficha pública',
            'Lo que ve el productor cuando entra a tu perfil.',
            <BotonSecundario href={`/consignatarias/${consignataria.canonical_slug}`}>Ver tu perfil ↗</BotonSecundario>,
          )}
          <ProfileEditForm
            slug={consignataria.canonical_slug}
            initial={{
              phone: consignataria.phone || '',
              email: consignataria.email || '',
              website: consignataria.website || '',
              description: consignataria.description || '',
              whatsapp: consignataria.whatsapp || '',
              cuit: consignataria.cuit || '',
            }}
            logoUrl={consignataria.logo_url}
          />
          <Marco nombre="Link y QR" titulo="Tu página con QR">
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
              <QRCode url={`${linkGo}?utm_source=qr`} size={140} showDownload={true} />
              <div className="flex-1 space-y-3">
                <p className="text-sm text-zinc-400">
                  Usalo en catálogos, tarjetas y carteles: el que lo escanea ve tu próximo remate y te puede consultar.
                </p>
                <p className="break-all rounded-md border border-terminal-border bg-terminal-bg/40 px-3 py-2 font-mono text-xs text-zinc-300">{linkGo}</p>
                <div className="flex flex-wrap gap-2">
                  <BotonSecundario onClick={() => { navigator.clipboard.writeText(linkGo); trackEvent('referral_link_copy', { consignataria_slug: consignataria.canonical_slug, surface: 'dashboard_qr' }) }}>Copiar link</BotonSecundario>
                  <BotonSecundario href={`https://wa.me/?text=${encodeURIComponent(`Mirá mis próximos remates: ${linkGo}`)}`} externo>Compartir por WhatsApp</BotonSecundario>
                  <BotonSecundario href={`/api/calendario/${consignataria.canonical_slug}`}>Agregar al calendario</BotonSecundario>
                </div>
              </div>
            </div>
          </Marco>
          <Marco nombre="Widget" titulo="Tus remates en tu web">
            {esPro ? (
              <div className="space-y-3">
                <p className="text-sm text-zinc-400">Copiá este código y pegalo en tu sitio. Se actualiza solo con tus remates.</p>
                <pre className="overflow-x-auto rounded-md border border-terminal-border bg-terminal-bg/40 p-3 font-mono text-[0.6875rem] text-zinc-300">
                  {`<iframe src="https://consignatarias.com.ar/api/widget/${consignataria.canonical_slug}" width="400" height="300" frameborder="0"></iframe>`}
                </pre>
                <div className="flex flex-wrap gap-2">
                  <BotonSecundario onClick={() => { navigator.clipboard.writeText(`<iframe src="https://consignatarias.com.ar/api/widget/${consignataria.canonical_slug}" width="400" height="300" frameborder="0"></iframe>`); trackEvent('widget_code_copy', { consignataria_slug: consignataria.canonical_slug }) }}>Copiar código</BotonSecundario>
                  <BotonSecundario href={`/api/widget/${consignataria.canonical_slug}?theme=light`} externo>Ver tema claro</BotonSecundario>
                  <BotonSecundario href={`/api/widget/${consignataria.canonical_slug}?theme=dark`} externo>Ver tema oscuro</BotonSecundario>
                </div>
              </div>
            ) : (
              <SoloPro titulo="Widget de remates" beneficio="Tus próximos remates en tu propia web, con un código que se pega una vez y se actualiza solo." desde="widget" />
            )}
          </Marco>
        </>
      )}

      {/* ============ MI PLAN ============ */}
      {activeTab === 'plan' && (
        <>
          {encabezado('Mi plan', esPro ? `PRO Consignataria` : 'Plan FREE', esPro && subscription?.current_period_end ? `Activo hasta el ${new Date(subscription.current_period_end).toLocaleDateString('es-AR')}.` : undefined)}
          <SubscriptionPanel tier={tierLabel} subscription={subscription} plan={plan} />
          {consignataria?.verified && !esPro && (
            <div>
              <ProfileProgressTracker
                profile={{
                  cuit: consignataria.cuit,
                  phone: consignataria.phone,
                  email: consignataria.email,
                  whatsapp: consignataria.whatsapp,
                  website: consignataria.website,
                  description: consignataria.description,
                  logo: consignataria.logo_url,
                  dteCount,
                  remateCount: ownerAuctions.length,
                  hasResults: auctionResults.length > 0,
                }}
                alreadyRedeemed={hasRedeemed}
                onRedeem={handleRedeemPoints}
              />
              {redeemError && <p className="mt-2 text-xs text-negative">{redeemError}</p>}
              {isRedeeming && <p className="mt-2 text-xs text-warning">Canjeando puntos…</p>}
            </div>
          )}
          {esPro && consignataria && (
            <Marco nombre="Reporte" titulo="Reporte mensual en PDF">
              <p className="text-sm text-zinc-400">Tus vistas, consultas y remates del mes, listo para compartir.</p>
              <div className="mt-4"><BotonSecundario href={`/api/consignatarias/${consignataria.canonical_slug}/report`}>Descargar reporte</BotonSecundario></div>
            </Marco>
          )}
          {!vistaAdmin && <CambiarContrasena />}
        </>
      )}

      {/* ============ FRIGORÍFICO ============ */}
      {activeTab === 'frigorifico' && frigorifico && (
        <>
          {encabezado('Frigorífico', frigorifico.display_name, undefined, <BotonSecundario href={`/frigorificos/${frigorifico.cuit}`}>Ver perfil público ↗</BotonSecundario>)}
          {frigorifico.verified && <FrigoProCTA cuit={frigorifico.cuit} email={email} isPro={frigoIsPro} />}
          {frigorifico.verified && (
            <>
              <FrigorificoEditForm cuit={frigorifico.cuit} initial={{ phone: frigorifico.phone || '', email: frigorifico.email || '', website: frigorifico.website || '', description: frigorifico.description || '', whatsapp: frigorifico.whatsapp || '', location: frigorifico.location || '', logoUrl: frigorifico.logo_url || null }} />
              <HabilitacionForm cuit={frigorifico.cuit} nivel={frigorifico.habilitacion_nivel || ''} verificada={!!frigorifico.habilitacion_verificada} />
            </>
          )}
        </>
      )}
      {activeTab === 'catalogo' && frigorifico && (
        <>
          {encabezado('Catálogo', 'Productos de carne')}
          <FrigoProductManager cuit={frigorifico.cuit} initial={frigoProducts} />
        </>
      )}
      {activeTab === 'pedidos' && frigorifico && (
        <>
          {encabezado('Pedidos', 'Pedidos mayoristas')}
          <FrigoPedidos rfqs={frigoRfqs} />
        </>
      )}
        </main>
      </div>
      </div>
    </div>
  )
}

const TONO_ETAPA_BARRA: Record<Etapa, string> = {
  new: 'bg-accent',
  contacted: 'bg-warning',
  converted: 'bg-positive',
  archived: 'bg-zinc-600',
}

const URGENCIA_TONO: Record<'urgente' | 'atencion' | 'buena' | 'info', string> = {
  urgente: 'bg-negative',
  atencion: 'bg-warning',
  buena: 'bg-positive',
  info: 'bg-zinc-500',
}

/** Barras de vistas por día (30 días). Un día sin vistas es una raya en cero, no un hueco. */
function BarrasDiarias({ datos }: { datos: { dia: string; vistas: number }[] }) {
  const max = Math.max(1, ...datos.map((d) => d.vistas))
  const total = datos.reduce((s, d) => s + d.vistas, 0)
  const corto = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
  return (
    <div>
      <p className="text-xxs text-zinc-500">
        <strong className="text-2xl font-semibold tabular-nums text-ink">{fmt(total)}</strong> vistas en 30 días
      </p>
      <div className="mt-4 flex h-36 items-end gap-[3px]" role="img" aria-label={`Vistas por día, ${fmt(total)} en total`}>
        {datos.map((d) => (
          <span
            key={d.dia}
            title={`${corto(d.dia)}: ${d.vistas}`}
            className={`flex-1 rounded-t-sm ${d.vistas ? 'bg-accent' : 'bg-zinc-800'}`}
            style={{ height: d.vistas ? `${Math.max(4, (d.vistas / max) * 100)}%` : '2px' }}
          />
        ))}
      </div>
      {datos.length > 0 && (
        <div className="mt-2 flex justify-between text-[0.625rem] text-zinc-500">
          <span>{corto(datos[0].dia)}</span>
          <span>{corto(datos[datos.length - 1].dia)}</span>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  AUCTION MANAGER                                                     */
/* ------------------------------------------------------------------ */

interface AuctionManagerProps {
  slug: string
  displayName: string
  ownerAuctions: OwnerAuction[]
  scrapedAuctions: ScrapedAuction[]
  onAuctionsChange: (auctions: OwnerAuction[]) => void
}

const EMPTY_AUCTION = {
  title: '',
  date: '',
  time: '',
  location: '',
  province: '',
  type: 'general',
  main_category: 'mixto',
  estimated_heads: '',
  description: '',
  catalog_url: '',
  youtube_url: '',
  flyer_url: '',
}

const PROVINCIAS_REMATE = ['BUENOS AIRES', 'CORRIENTES', 'ENTRE RIOS', 'SANTA FE', 'CORDOBA', 'LA PAMPA', 'CHACO', 'FORMOSA', 'MISIONES', 'SANTIAGO DEL ESTERO', 'SAN LUIS', 'SALTA', 'TUCUMAN', 'JUJUY', 'RIO NEGRO', 'NEUQUEN', 'CHUBUT', 'MENDOZA', 'CATAMARCA', 'LA RIOJA', 'SAN JUAN', 'SANTA CRUZ', 'TIERRA DEL FUEGO']

export function AuctionManager({ slug, displayName, ownerAuctions, scrapedAuctions, onAuctionsChange }: AuctionManagerProps) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(EMPTY_AUCTION)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)
  // Si el formulario corrige un remate del calendario: la clave de ese remate.
  const [reemplaza, setReemplaza] = useState<string | null>(null)
  const [subiendoFlyer, setSubiendoFlyer] = useState(false)
  const router = useRouter()

  async function subirFlyer(file: File) {
    setSubiendoFlyer(true)
    setFeedback(null)
    try {
      const fd = new FormData()
      fd.append('flyer', file)
      const res = await fetch(`/api/consignatarias/${slug}/flyer`, { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) {
        setFeedback({ type: 'err', msg: mensajeError(data, 'No se pudo subir el flyer') })
        return
      }
      setForm(f => ({ ...f, flyer_url: data.url }))
    } catch {
      setFeedback({ type: 'err', msg: 'Error de conexion al subir el flyer' })
    } finally {
      setSubiendoFlyer(false)
    }
  }

  function startCompletar(a: ScrapedAuction) {
    setEditingId(null)
    setReemplaza(a.clave ?? null)
    setForm({
      title: a.title,
      date: a.date,
      time: a.time || '',
      location: a.location || '',
      province: a.province || '',
      type: a.type || 'general',
      main_category: a.main_category || 'mixto',
      estimated_heads: a.estimated_heads?.toString() || '',
      description: a.description || '',
      catalog_url: a.catalog_url || '',
      youtube_url: a.youtube_url || '',
      flyer_url: '',
    })
    setShowForm(true)
    setFeedback(null)
  }

  function startCreate() {
    setEditingId(null)
    setReemplaza(null)
    setForm(EMPTY_AUCTION)
    setShowForm(true)
    setFeedback(null)
  }

  function startEdit(auction: OwnerAuction) {
    setEditingId(auction.id)
    setReemplaza(null)
    setForm({
      title: auction.title,
      date: auction.date,
      time: auction.time || '',
      location: auction.location || '',
      province: auction.province || '',
      type: auction.type,
      main_category: auction.main_category,
      estimated_heads: auction.estimated_heads?.toString() || '',
      description: auction.description || '',
      catalog_url: auction.catalog_url || '',
      youtube_url: auction.youtube_url || '',
      flyer_url: auction.flyer_url || '',
    })
    setShowForm(true)
    setFeedback(null)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setFeedback(null)

    const payload = {
      ...form,
      estimated_heads: form.estimated_heads ? parseInt(form.estimated_heads) : null,
      time: form.time || null,
      location: form.location || null,
      province: form.province || null,
      description: form.description || null,
      catalog_url: form.catalog_url || null,
      youtube_url: form.youtube_url || null,
      flyer_url: form.flyer_url || null,
      ...(!editingId && reemplaza ? { reemplaza_clave: reemplaza } : {}),
    }

    try {
      const url = editingId
        ? `/api/consignatarias/${slug}/auctions/${editingId}`
        : `/api/consignatarias/${slug}/auctions`

      const res = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        setFeedback({ type: 'err', msg: mensajeError(data, 'Error al guardar') })
        return
      }

      const saved = await res.json()

      if (editingId) {
        onAuctionsChange(ownerAuctions.map(a => a.id === editingId ? saved : a))
      } else {
        onAuctionsChange([...ownerAuctions, saved])
      }

      setShowForm(false)
      setForm(EMPTY_AUCTION)
      setEditingId(null)
      setReemplaza(null)
      setFeedback({ type: 'ok', msg: `${editingId ? 'Remate actualizado' : reemplaza ? 'Remate corregido' : 'Remate creado'}. Ya se ve en tu perfil; el calendario general y el mail semanal lo toman en menos de una hora.` })
      router.refresh()
    } catch {
      setFeedback({ type: 'err', msg: 'Error de conexion' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Eliminar este remate?')) return
    setDeleting(id)

    try {
      const res = await fetch(`/api/consignatarias/${slug}/auctions/${id}`, { method: 'DELETE' })
      if (res.ok) {
        onAuctionsChange(ownerAuctions.filter(a => a.id !== id))
        router.refresh()
      }
    } catch {
      // ignore
    } finally {
      setDeleting(null)
    }
  }

  const inputClass = 'w-full bg-terminal-bg border border-terminal-border text-zinc-200 text-xxs font-terminal px-2 py-1.5 rounded-terminal focus:outline-none focus:border-accent transition-colors'

  // Un remate del calendario recién corregido deja de listarse al instante, sin esperar
  // a que el servidor vuelva a armar la página (en el server se filtra igual, page.tsx).
  const corregidos = new Set(ownerAuctions.map(a => a.reemplaza_clave).filter(Boolean))
  scrapedAuctions = scrapedAuctions.filter(a => !a.clave || !corregidos.has(a.clave))

  return (
    <div className="space-y-4">
      {/* Create button + feedback */}
      <div className="terminal-panel">
        <div className="terminal-panel-header flex items-center justify-between">
          <span className="text-zinc-200 text-label tracking-widest">MIS REMATES</span>
          <button
            onClick={startCreate}
            className="px-3 py-1 bg-positive/10 border border-positive/30 text-positive text-xxs font-terminal uppercase tracking-wider hover:bg-positive/20 transition-colors"
          >
            + Agregar remate
          </button>
        </div>
        {feedback && !showForm && (
          <div className="px-panel py-2">
            <span className={`text-xxs font-terminal ${feedback.type === 'ok' ? 'text-positive' : 'text-negative'}`}>{feedback.msg}</span>
          </div>
        )}
      </div>

      {/* Auction form (create/edit) */}
      {showForm && (
        <div className="terminal-panel border-accent/30">
          <div className="terminal-panel-header flex items-center justify-between">
            <span className="text-zinc-200 text-label tracking-widest">{editingId ? 'EDITAR REMATE' : reemplaza ? 'CORREGIR REMATE DEL CALENDARIO' : 'NUEVO REMATE'}</span>
            <button onClick={() => { setShowForm(false); setEditingId(null); setReemplaza(null) }} className="text-xxs font-terminal text-zinc-500 hover:text-zinc-400">Cancelar</button>
          </div>
          <form onSubmit={handleSave} className="px-panel py-3 space-y-3">
            {reemplaza && (
              <p className="text-xxs font-terminal text-zinc-400">
                Precargamos lo que figura en el calendario. Lo que guardes reemplaza a ese remate en tu perfil, en el calendario y en el mail semanal.
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xxs text-zinc-500 uppercase font-terminal block mb-1">Titulo *</label>
                <input type="text" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inputClass} placeholder="Remate feria de invernada" />
              </div>
              <div>
                <label className="text-xxs text-zinc-500 uppercase font-terminal block mb-1">Fecha *</label>
                <input type="date" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className="text-xxs text-zinc-500 uppercase font-terminal block mb-1">Hora</label>
                <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className="text-xxs text-zinc-500 uppercase font-terminal block mb-1">Ubicacion</label>
                <input type="text" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className={inputClass} placeholder="Mercedes, Buenos Aires" />
              </div>
              <div>
                <label className="text-xxs text-zinc-500 uppercase font-terminal block mb-1">Provincia</label>
                <select value={form.province} onChange={e => setForm(f => ({ ...f, province: e.target.value }))} className={inputClass}>
                  <option value="">Elegí la provincia</option>
                  {[...new Set([...PROVINCIAS_REMATE, ...(form.province ? [form.province] : [])])].map(p => (
                    <option key={p} value={p}>{provinciaNombre(p)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xxs text-zinc-500 uppercase font-terminal block mb-1">Tipo</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className={inputClass}>
                  <option value="general">General</option>
                  <option value="invernada">Invernada</option>
                  <option value="cria">Cria</option>
                  <option value="reproductores">Reproductores</option>
                  <option value="especial">Especial</option>
                </select>
              </div>
              <div>
                <label className="text-xxs text-zinc-500 uppercase font-terminal block mb-1">Categoria</label>
                <select value={form.main_category} onChange={e => setForm(f => ({ ...f, main_category: e.target.value }))} className={inputClass}>
                  <option value="mixto">Mixto</option>
                  <option value="terneros">Terneros</option>
                  <option value="novillos">Novillos</option>
                  <option value="vaquillonas">Vaquillonas</option>
                  <option value="vaca_gorda">Vaca gorda</option>
                  <option value="toros">Toros</option>
                </select>
              </div>
              <div>
                <label className="text-xxs text-zinc-500 uppercase font-terminal block mb-1">Cabezas estimadas</label>
                <input type="number" value={form.estimated_heads} onChange={e => setForm(f => ({ ...f, estimated_heads: e.target.value }))} className={inputClass} placeholder="500" />
              </div>
              <div>
                <label className="text-xxs text-zinc-500 uppercase font-terminal block mb-1">URL catalogo</label>
                <input type="url" value={form.catalog_url} onChange={e => setForm(f => ({ ...f, catalog_url: e.target.value }))} className={inputClass} placeholder="https://..." />
              </div>
              <div>
                <label className="text-xxs text-zinc-500 uppercase font-terminal block mb-1">URL YouTube</label>
                <input type="url" value={form.youtube_url} onChange={e => setForm(f => ({ ...f, youtube_url: e.target.value }))} className={inputClass} placeholder="https://youtube.com/..." />
              </div>
            </div>
            <div>
              <label className="text-xxs text-zinc-500 uppercase font-terminal block mb-1">Flyer del remate</label>
              <div className="flex items-start gap-3">
                {form.flyer_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.flyer_url} alt="Flyer del remate" className="w-24 h-auto rounded-terminal border border-terminal-border" />
                )}
                <div className="space-y-1">
                  <label className="inline-block px-3 py-1 border border-terminal-border text-xxs font-terminal text-zinc-300 hover:border-accent cursor-pointer rounded-terminal">
                    {subiendoFlyer ? 'Subiendo...' : form.flyer_url ? 'Cambiar flyer' : 'Subir flyer'}
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={subiendoFlyer}
                      onChange={e => { const f = e.target.files?.[0]; if (f) subirFlyer(f); e.target.value = '' }} />
                  </label>
                  {form.flyer_url && (
                    <button type="button" onClick={() => setForm(f => ({ ...f, flyer_url: '' }))} className="block text-xxs font-terminal text-zinc-500 hover:text-negative">Quitar flyer</button>
                  )}
                  <p className="text-[10px] font-terminal text-zinc-600">JPG, PNG o WebP, hasta 5 MB. Se muestra en la ficha del remate.</p>
                </div>
              </div>
            </div>
            <div>
              <label className="text-xxs text-zinc-500 uppercase font-terminal block mb-1">Descripcion</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={`${inputClass} resize-none`} rows={2} maxLength={500} placeholder="Detalles del remate..." />
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" disabled={saving || subiendoFlyer} className="px-4 py-1.5 bg-positive/10 border border-positive/30 text-positive text-xxs font-terminal uppercase tracking-wider hover:bg-positive/20 transition-colors disabled:opacity-50">
                {saving ? 'Guardando...' : editingId || reemplaza ? 'Guardar cambios' : 'Crear remate'}
              </button>
              {feedback && <span className={`text-xxs font-terminal ${feedback.type === 'ok' ? 'text-positive' : 'text-negative'}`}>{feedback.msg}</span>}
            </div>
          </form>
        </div>
      )}

      {/* Owner auctions list */}
      {ownerAuctions.length > 0 && (
        <div className="terminal-panel">
          <div className="terminal-panel-header">
            <span className="text-zinc-400 text-xxs tracking-widest">TUS REMATES (CARGADOS O CORREGIDOS POR VOS)</span>
          </div>
          <div className="divide-y divide-terminal-border">
            {ownerAuctions.map(a => {
              const shareMsg = `🐄 *${a.title}*\n\n📅 ${formatDate(a.date)}${a.time ? ` a las ${a.time}` : ''}\n📍 ${a.location || 'Argentina'}\n${a.estimated_heads ? `🔢 ${a.estimated_heads.toLocaleString('es-AR')} cabezas\n` : ''}🏢 ${displayName}\n\n👉 Ver más: https://consignatarias.com.ar/consignatarias/${slug}`
              return (
                <div key={a.id} className="px-panel py-2 flex items-center gap-3">
                  <span className="text-xxs font-terminal text-zinc-500 tabular-nums w-12 flex-shrink-0">{formatDate(a.date)}</span>
                  {a.time && <span className="text-xxs font-terminal text-zinc-500 w-12 flex-shrink-0">{a.time}</span>}
                  <span className="text-data font-terminal text-zinc-300 flex-1 truncate">{a.title}</span>
                  {a.flyer_url && <span className="text-[10px] font-terminal text-positive flex-shrink-0">Flyer</span>}
                  <span className="text-xxs font-terminal text-zinc-500 hidden sm:inline">{a.location}</span>
                  <WhatsAppIconButton message={shareMsg} size="sm" className="flex-shrink-0" />
                  <button onClick={() => startEdit(a)} className="text-xxs font-terminal text-accent hover:underline flex-shrink-0">Editar</button>
                  <button onClick={() => handleDelete(a.id)} disabled={deleting === a.id} className="text-xxs font-terminal text-zinc-500 hover:text-negative flex-shrink-0 disabled:opacity-50">
                    {deleting === a.id ? '...' : 'Eliminar'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Scraped auctions (read-only) */}
      {scrapedAuctions.length > 0 && (
        <div className="terminal-panel">
          <div className="terminal-panel-header flex items-center justify-between">
            <span className="text-zinc-400 text-xxs tracking-widest">REMATES DEL CALENDARIO (AUTOMATICOS)</span>
            <span className="text-xxs text-zinc-500 font-terminal">{scrapedAuctions.length}</span>
          </div>
          <div className="divide-y divide-terminal-border">
            {scrapedAuctions.map((a, i) => {
              const shareMsg = `🐄 *${a.title}*\n\n📅 ${formatDate(a.date)}${a.time ? ` a las ${a.time}` : ''}\n📍 ${a.location || 'Argentina'}\n🏢 ${displayName}\n\n👉 Ver más: https://consignatarias.com.ar/consignatarias/${slug}`
              return (
                <div key={i} className="px-panel py-2 flex items-center gap-4">
                  <span className="text-xxs font-terminal text-zinc-500 tabular-nums w-12 flex-shrink-0">{formatDate(a.date)}</span>
                  {a.time && <span className="text-xxs font-terminal text-zinc-500 w-12 flex-shrink-0">{a.time}</span>}
                  <span className="text-data font-terminal text-zinc-400 flex-1 truncate">{a.title}</span>
                  <span className="text-xxs font-terminal text-zinc-500 hidden sm:inline">{a.location}</span>
                  <WhatsAppIconButton message={shareMsg} size="sm" className="flex-shrink-0" />
                  <button onClick={() => startCompletar(a)} className="text-xxs font-terminal text-accent hover:underline flex-shrink-0">Editar</button>
                </div>
              )
            })}
          </div>
          <div className="px-panel py-2">
            <span className="text-[10px] font-terminal text-zinc-700">Los encontramos solos en tu web o en la de tus remates. Con Editar los corregís, sumás catálogo, video o flyer: tu versión reemplaza a la nuestra.</span>
          </div>
        </div>
      )}

      {ownerAuctions.length === 0 && scrapedAuctions.length === 0 && !showForm && (
        <div className="terminal-panel">
          <EmptyState
            icon="martillo"
            compact
            title="No hay remates cargados todavia."
            cta={
              <button onClick={startCreate} className="text-xxs font-terminal text-positive hover:underline">
                Agregar tu primer remate →
              </button>
            }
          />
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  PROFILE EDIT FORM                                                  */
/* ------------------------------------------------------------------ */

interface ProfileEditFormProps {
  slug: string
  initial: { phone: string; email: string; website: string; description: string; whatsapp: string; cuit: string }
  logoUrl?: string | null
}

function ProfileEditForm({ slug, initial, logoUrl: initialLogoUrl }: ProfileEditFormProps) {
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl || '')
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoFeedback, setLogoFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setFeedback(null)
    try {
      const res = await fetch(`/api/consignatarias/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json()
        setFeedback({ type: 'err', msg: mensajeError(data, 'Error al guardar') })
        return
      }
      setFeedback({ type: 'ok', msg: 'Perfil actualizado. Los cambios se reflejan en tu perfil publico.' })
    } catch {
      setFeedback({ type: 'err', msg: 'Error de conexion' })
    } finally {
      setSaving(false)
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoUploading(true)
    setLogoFeedback(null)
    try {
      const fd = new FormData()
      fd.append('logo', file)
      const res = await fetch(`/api/consignatarias/${slug}/logo`, { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) {
        setLogoFeedback({ type: 'err', msg: mensajeError(data, 'Error al subir logo') })
        return
      }
      setLogoUrl(data.logo_url)
      setLogoFeedback({ type: 'ok', msg: 'Logo actualizado' })
    } catch {
      setLogoFeedback({ type: 'err', msg: 'Error de conexion' })
    } finally {
      setLogoUploading(false)
      e.target.value = ''
    }
  }

  const inputClass = 'w-full bg-terminal-bg border border-terminal-border text-zinc-200 text-xxs font-terminal px-2 py-1.5 rounded-terminal focus:outline-none focus:border-accent transition-colors'

  return (
    <div className="terminal-panel">
      <div className="terminal-panel-header"><span className="text-zinc-200 text-label tracking-widest">EDITAR PERFIL</span></div>
      <form onSubmit={handleSubmit} className="px-panel py-3 space-y-3">
        <p className="text-xxs font-terminal text-zinc-500">Los datos que completes se muestran en tu perfil publico.</p>

        {/* Logo upload */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-terminal border border-terminal-border bg-terminal-bg flex items-center justify-center overflow-hidden flex-shrink-0 relative">
            {logoUrl ? (
              <Image src={logoUrl} alt="Logo" className="object-contain" fill unoptimized />
            ) : (
              <span className="text-zinc-700 text-xxs font-terminal">LOGO</span>
            )}
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-xxs text-zinc-500 uppercase font-terminal block">Logo</label>
            <label className={`inline-block px-3 py-1 bg-accent/10 border border-accent/30 text-accent text-xxs font-terminal uppercase tracking-wider hover:bg-accent/20 transition-colors ${logoUploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}>
              {logoUploading ? 'Subiendo...' : 'Subir imagen'}
              <input type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" onChange={handleLogoUpload} className="hidden" disabled={logoUploading} />
            </label>
            <p className="text-[10px] text-zinc-700 font-terminal">JPG, PNG, WebP o SVG. Max 2 MB.</p>
            {logoFeedback && <span className={`text-xxs font-terminal ${logoFeedback.type === 'ok' ? 'text-positive' : 'text-negative'}`}>{logoFeedback.msg}</span>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xxs text-zinc-500 uppercase font-terminal block mb-1">Telefono</label>
            <input type="text" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inputClass} placeholder="+54 11 1234-5678" />
          </div>
          <div>
            <label className="text-xxs text-zinc-500 uppercase font-terminal block mb-1">Email</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputClass} placeholder="contacto@ejemplo.com" />
          </div>
          <div>
            <label className="text-xxs text-zinc-500 uppercase font-terminal block mb-1">Sitio web</label>
            <input type="text" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} className={inputClass} placeholder="https://ejemplo.com" />
          </div>
          <div>
            <label className="text-xxs text-zinc-500 uppercase font-terminal block mb-1">WhatsApp</label>
            <input type="text" value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} className={inputClass} placeholder="+54 11 1234-5678" />
          </div>
          <div>
            <label className="text-xxs text-zinc-500 uppercase font-terminal block mb-1">CUIT</label>
            <input type="text" value={form.cuit} onChange={e => setForm(f => ({ ...f, cuit: e.target.value }))} className={inputClass} placeholder="20-12345678-9" />
          </div>
        </div>
        <div>
          <label className="text-xxs text-zinc-500 uppercase font-terminal block mb-1">Descripcion</label>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={`${inputClass} resize-none`} rows={3} maxLength={1000} placeholder="Breve descripcion de la consignataria..." />
          <span className="text-[10px] text-zinc-700 font-terminal">{form.description.length}/1000</span>
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="px-4 py-1.5 bg-accent/10 border border-accent/30 text-accent text-xxs font-terminal uppercase tracking-wider hover:bg-accent/20 transition-colors disabled:opacity-50">
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
          {feedback && <span className={`text-xxs font-terminal ${feedback.type === 'ok' ? 'text-positive' : 'text-negative'}`}>{feedback.msg}</span>}
        </div>
      </form>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  FRIGORIFICO EDIT FORM                                               */
/* ------------------------------------------------------------------ */

function FrigorificoEditForm({ cuit, initial }: { cuit: string; initial: { phone: string; email: string; website: string; description: string; whatsapp: string; location: string; logoUrl: string | null } }) {
  const { logoUrl: initialLogo, ...initialFields } = initial
  const [form, setForm] = useState(initialFields)
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogo)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setFeedback(null)
    try {
      const res = await fetch(`/api/frigorificos/${cuit}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) { const data = await res.json(); setFeedback({ type: 'err', msg: mensajeError(data, 'Error al guardar') }); return }
      setFeedback({ type: 'ok', msg: 'Perfil actualizado' })
    } catch { setFeedback({ type: 'err', msg: 'Error de conexion' }) }
    finally { setSaving(false) }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)
    setFeedback(null)
    try {
      const fd = new FormData()
      fd.append('logo', file)
      const res = await fetch(`/api/frigorificos/${cuit}/logo`, { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { setFeedback({ type: 'err', msg: mensajeError(data, 'Error al subir el logo') }); return }
      setLogoUrl(data.logo_url)
      setFeedback({ type: 'ok', msg: 'Logo actualizado' })
    } catch { setFeedback({ type: 'err', msg: 'Error de conexion' }) }
    finally { setUploadingLogo(false) }
  }

  const inputClass = 'w-full bg-terminal-bg border border-terminal-border text-zinc-200 text-xxs font-terminal px-2 py-1.5 rounded-terminal focus:outline-none focus:border-accent transition-colors'

  return (
    <div className="terminal-panel">
      <div className="terminal-panel-header"><span className="text-zinc-200 text-label tracking-widest">EDITAR FRIGORIFICO</span></div>
      <div className="px-panel py-3 space-y-3">
        {/* Logo — subida (JPG/PNG/WebP/SVG, máx 2 MB) */}
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-terminal border border-terminal-border bg-zinc-100 flex items-center justify-center flex-shrink-0 overflow-hidden p-1">
            {logoUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
              : <span className="text-xxs text-zinc-500 font-terminal">Sin logo</span>}
          </div>
          <div>
            <label className="text-xxs text-zinc-500 uppercase font-terminal block mb-1">Logo</label>
            <label className="inline-block px-3 py-1.5 bg-accent/10 border border-accent/30 text-accent text-xxs font-terminal uppercase tracking-wider hover:bg-accent/20 transition-colors cursor-pointer rounded-terminal">
              {uploadingLogo ? 'Subiendo...' : 'Subir logo'}
              <input type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" onChange={handleLogoUpload} disabled={uploadingLogo} className="hidden" />
            </label>
            <p className="text-[10px] text-zinc-700 font-terminal mt-1">JPG, PNG, WebP o SVG · máx 2 MB</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="text-xxs text-zinc-500 uppercase font-terminal block mb-1">Telefono</label><input type="text" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inputClass} placeholder="+54 11 1234-5678" /></div>
            <div><label className="text-xxs text-zinc-500 uppercase font-terminal block mb-1">WhatsApp</label><input type="text" value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} className={inputClass} placeholder="+54 9 11 1234-5678" /></div>
            <div><label className="text-xxs text-zinc-500 uppercase font-terminal block mb-1">Email</label><input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputClass} placeholder="contacto@ejemplo.com" /></div>
            <div><label className="text-xxs text-zinc-500 uppercase font-terminal block mb-1">Sitio web</label><input type="text" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} className={inputClass} placeholder="https://ejemplo.com" /></div>
            <div><label className="text-xxs text-zinc-500 uppercase font-terminal block mb-1">Localidad</label><input type="text" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className={inputClass} placeholder="Ciudad, Provincia" /></div>
          </div>
          <div><label className="text-xxs text-zinc-500 uppercase font-terminal block mb-1">Descripcion</label><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={`${inputClass} resize-none`} rows={3} maxLength={1000} /><span className="text-[10px] text-zinc-700 font-terminal">{form.description.length}/1000</span></div>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving} className="px-4 py-1.5 bg-accent/10 border border-accent/30 text-accent text-xxs font-terminal uppercase tracking-wider hover:bg-accent/20 transition-colors disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar cambios'}</button>
            {feedback && <span className={`text-xxs font-terminal ${feedback.type === 'ok' ? 'text-positive' : 'text-negative'}`}>{feedback.msg}</span>}
          </div>
        </form>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  FRIGORIFICO — ACTIVAR PRO (vitrina de carne + RFQ)                 */
/* ------------------------------------------------------------------ */

/**
 * Lo que ve una firma que reclamó su perfil y está esperando la aprobación.
 *
 * Antes decía una sola línea —"Tu solicitud esta siendo revisada"— y nada más: sin
 * plazo, sin qué hacer mientras tanto y sin forma de apurarlo. Es el momento más
 * frágil del onboarding: la firma ya hizo el esfuerzo de reclamar y queda en una
 * pantalla muerta. Al 23-ago-2026 el flujo **nunca fue usado por una firma real**
 * (los dos claims de la base son pruebas del founder), así que esto es la primera
 * versión que va a ver alguien de verdad.
 *
 * Tres cosas concretas: qué pasa después, su perfil público para que vea que ya
 * existe, y un atajo para destrabarlo por WhatsApp. La aprobación es manual, así que
 * el atajo no es un adorno: es el camino rápido de verdad.
 */
function ClaimEnEspera({ claims }: { claims: Claim[] }) {
  const pendiente = claims.find((c) => c.status === 'pending')
  if (!pendiente) return null

  const nombre = pendiente.consignatarias?.display_name ?? pendiente.consignataria_slug
  const slug = pendiente.consignatarias?.canonical_slug ?? pendiente.consignataria_slug
  const dias = Math.floor((Date.now() - new Date(pendiente.created_at).getTime()) / 86_400_000)

  const wa = `https://wa.me/5493773418130?text=${encodeURIComponent(
    `Hola, soy de ${nombre}. Reclamé el perfil en consignatarias.com.ar y quería saber cómo va la verificación.`,
  )}`

  return (
    <div className="terminal-panel border-warning/20">
      <div className="terminal-panel-header">
        <span className="text-zinc-200 text-label tracking-widest">VERIFICANDO TU FIRMA</span>
      </div>
      <div className="px-panel py-4 space-y-3">
        <p className="text-data font-terminal text-zinc-300">
          Estamos verificando que <span className="text-zinc-100">{nombre}</span> es tuya.
          {dias === 0
            ? ' La pedimos hoy.'
            : ` La pediste hace ${dias} ${dias === 1 ? 'día' : 'días'}.`}
        </p>

        <ul className="space-y-1.5 text-xxs font-terminal text-zinc-400">
          <li>· Cuando la aprobemos te llega un email y el panel se abre solo.</li>
          <li>· Ahí vas a poder cargar remates, editar tus datos y ver quién te buscó.</li>
          <li>· Mientras tanto tu perfil ya está publicado y recibiendo visitas.</li>
        </ul>

        {/* Se revisa a mano, así que el atajo por WhatsApp no es decorativo: es
            literalmente la forma más rápida de destrabarlo. */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-1">
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-terminal bg-emerald-500 px-3 py-1.5 text-xxs font-semibold text-white hover:bg-emerald-400 transition-colors"
          >
            Apurar por WhatsApp
          </a>
          <Link
            href={`/consignatarias/${slug}`}
            className="text-xxs font-terminal text-accent hover:text-accent-bright transition-colors"
          >
            Ver tu perfil público →
          </Link>
        </div>

        {dias >= 2 && (
          <p className="text-[10px] leading-snug text-warning/80">
            Está tardando más de lo normal. Escribinos y lo resolvemos en el momento.
          </p>
        )}
      </div>
    </div>
  )
}

function FrigoProCTA({ cuit, email, isPro }: { cuit: string; email: string; isPro: boolean }) {
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  if (isPro) {
    return (
      <div className="terminal-panel">
        <div className="terminal-panel-header flex items-center justify-between">
          <span className="text-zinc-200 text-label tracking-widest">PRO FRIGORÍFICO</span>
          <span className="text-xxs font-terminal px-1.5 py-0.5 border border-accent/40 text-accent rounded-terminal">ACTIVO</span>
        </div>
        <div className="px-panel py-3">
          <p className="text-[11px] text-zinc-500 font-terminal">Tu vitrina de carne y el pedido mayorista están publicados en tu perfil. Cargá productos en la pestaña Catálogo.</p>
        </div>
      </div>
    )
  }

  async function activar() {
    setLoading(true); setErr(null)
    try {
      const res = await fetch('/api/frigorifico/checkout-public', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cuit, email }),
      })
      const data = await res.json()
      if (!res.ok || !data.checkoutUrl) { setErr(mensajeError(data, 'No se pudo iniciar el pago')); return }
      window.location.href = data.checkoutUrl
    } catch { setErr('Error de conexión') }
    finally { setLoading(false) }
  }

  return (
    <div className="terminal-panel">
      <div className="terminal-panel-header"><span className="text-zinc-200 text-label tracking-widest">ACTIVÁ PRO FRIGORÍFICO</span></div>
      <div className="px-panel py-3 space-y-3">
        <p className="text-[11px] text-zinc-400 font-terminal leading-relaxed">
          Publicá tu <strong className="text-zinc-200">catálogo de carne</strong> y recibí <strong className="text-zinc-200">pedidos mayoristas</strong> de compradores de todo el país directo en tu perfil. <strong className="text-accent">ARS 45.000/mes</strong>, cancelás cuando quieras.
        </p>
        <button onClick={activar} disabled={loading} className="px-4 py-2 bg-accent/10 border border-accent/40 text-accent text-xxs font-terminal uppercase tracking-wider hover:bg-accent/20 transition-colors disabled:opacity-50 rounded-terminal">
          {loading ? 'Redirigiendo…' : 'Activar PRO · ARS 45.000/mes'}
        </button>
        {err && <p className="text-xxs text-negative font-terminal">{err}</p>}
        <p className="text-[10px] text-zinc-600 font-terminal">Pago seguro vía Rebill. Se activa automáticamente al confirmar.</p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  FRIGORIFICO — HABILITACIÓN (constancia → verificación admin)       */
/* ------------------------------------------------------------------ */

function HabilitacionForm({ cuit, nivel: initialNivel, verificada }: { cuit: string; nivel: string; verificada: boolean }) {
  const [nivel, setNivel] = useState(initialNivel)
  const [nro, setNro] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)
  const inputClass = 'w-full bg-terminal-bg border border-terminal-border text-zinc-200 text-xxs font-terminal px-2 py-1.5 rounded-terminal focus:outline-none focus:border-accent transition-colors'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nivel) { setFeedback({ type: 'err', msg: 'Elegí el nivel de habilitación' }); return }
    setSaving(true); setFeedback(null)
    try {
      const fd = new FormData()
      fd.append('nivel', nivel)
      fd.append('nro', nro)
      if (file) fd.append('doc', file)
      const res = await fetch(`/api/frigorificos/${cuit}/habilitacion`, { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { setFeedback({ type: 'err', msg: mensajeError(data, 'Error al enviar') }); return }
      setFeedback({ type: 'ok', msg: 'Declaración enviada. La verificamos y activamos tu badge de alcance.' })
    } catch { setFeedback({ type: 'err', msg: 'Error de conexión' }) }
    finally { setSaving(false) }
  }

  return (
    <div className="terminal-panel">
      <div className="terminal-panel-header flex items-center justify-between">
        <span className="text-zinc-200 text-label tracking-widest">HABILITACIÓN SENASA</span>
        {verificada
          ? <span className="text-xxs font-terminal px-1.5 py-0.5 border border-positive/30 text-positive rounded-terminal">VERIFICADA</span>
          : initialNivel
            ? <span className="text-xxs font-terminal px-1.5 py-0.5 border border-amber-500/30 text-amber-300 rounded-terminal">EN REVISIÓN</span>
            : null}
      </div>
      <form onSubmit={handleSubmit} className="px-panel py-3 space-y-3">
        <p className="text-[11px] text-zinc-500 font-terminal leading-relaxed">
          Declará tu nivel de habilitación y subí la constancia. Sólo con <strong className="text-zinc-300">tránsito federal verificado</strong> tu perfil muestra el badge «Habilitado para envío nacional» y podés ofrecer venta interprovincial. La verificamos a mano — nadie se auto-habilita.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xxs text-zinc-500 uppercase font-terminal block mb-1">Nivel</label>
            <select value={nivel} onChange={e => setNivel(e.target.value)} className={inputClass}>
              <option value="">Elegí…</option>
              <option value="nacional">Nacional (tránsito federal)</option>
              <option value="provincial">Provincial</option>
              <option value="municipal">Municipal</option>
            </select>
          </div>
          <div><label className="text-xxs text-zinc-500 uppercase font-terminal block mb-1">N° de habilitación</label><input type="text" value={nro} onChange={e => setNro(e.target.value)} className={inputClass} /></div>
        </div>
        <div>
          <label className="text-xxs text-zinc-500 uppercase font-terminal block mb-1">Constancia (PDF/foto)</label>
          <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={e => setFile(e.target.files?.[0] || null)} className="text-xxs font-terminal text-zinc-400 file:mr-2 file:px-2 file:py-1 file:border file:border-terminal-border file:bg-terminal-bg file:text-accent file:rounded-terminal file:text-xxs" />
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="px-4 py-1.5 bg-accent/10 border border-accent/30 text-accent text-xxs font-terminal uppercase tracking-wider hover:bg-accent/20 transition-colors disabled:opacity-50 rounded-terminal">{saving ? 'Enviando…' : 'Enviar declaración'}</button>
          {feedback && <span className={`text-xxs font-terminal ${feedback.type === 'ok' ? 'text-positive' : 'text-negative'}`}>{feedback.msg}</span>}
        </div>
      </form>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  FRIGORIFICO — CATALOGO (productos de carne)                        */
/* ------------------------------------------------------------------ */

const EMPTY_PRODUCT = {
  producto: '', categoria: 'vacuno', estado: 'fresco', presentacion: 'suelto',
  unidad_venta: 'kg', unidades_por_bulto: '', pedido_minimo: '1', precio_modo: 'consultar',
  segmento: 'carnicerias', interprovincial: false,
}

function FrigoProductManager({ cuit, initial }: { cuit: string; initial: FrigoProduct[] }) {
  const [items, setItems] = useState<FrigoProduct[]>(initial)
  const [form, setForm] = useState(EMPTY_PRODUCT)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)

  const inputClass = 'w-full bg-terminal-bg border border-terminal-border text-zinc-200 text-xxs font-terminal px-2 py-1.5 rounded-terminal focus:outline-none focus:border-accent transition-colors'

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.producto.trim()) { setFeedback({ type: 'err', msg: 'El nombre del producto es obligatorio' }); return }
    setSaving(true); setFeedback(null)
    try {
      const res = await fetch(`/api/frigorificos/${cuit}/products`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          unidades_por_bulto: form.unidades_por_bulto ? Number(form.unidades_por_bulto) : null,
          pedido_minimo: form.pedido_minimo ? Number(form.pedido_minimo) : 1,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setFeedback({ type: 'err', msg: mensajeError(data, 'Error al agregar') }); return }
      setItems(prev => [data as FrigoProduct, ...prev])
      setForm(EMPTY_PRODUCT); setShowForm(false)
      setFeedback({ type: 'ok', msg: 'Producto agregado' })
    } catch { setFeedback({ type: 'err', msg: 'Error de conexión' }) }
    finally { setSaving(false) }
  }

  async function handleDelete(id: number) {
    if (!confirm('¿Eliminar este producto?')) return
    try {
      const res = await fetch(`/api/frigorificos/${cuit}/products/${id}`, { method: 'DELETE' })
      if (res.ok) setItems(prev => prev.filter(p => p.id !== id))
    } catch { /* noop */ }
  }

  return (
    <div className="terminal-panel">
      <div className="terminal-panel-header flex items-center justify-between">
        <span className="text-zinc-200 text-label tracking-widest">CATÁLOGO MAYORISTA</span>
        <button onClick={() => setShowForm(s => !s)} className="text-xxs font-terminal text-accent hover:underline">{showForm ? 'Cancelar' : '+ Agregar producto'}</button>
      </div>
      <div className="px-panel py-3 space-y-3">
        <p className="text-[11px] text-zinc-500 font-terminal">Cargá tus productos de carne/embutidos. Los compradores mayoristas te piden cotización desde tu perfil público.</p>

        {showForm && (
          <form onSubmit={handleAdd} className="space-y-3 border border-terminal-border rounded-terminal p-3">
            <div><label className="text-xxs text-zinc-500 uppercase font-terminal block mb-1">Producto *</label><input type="text" value={form.producto} onChange={e => setForm(f => ({ ...f, producto: e.target.value }))} className={inputClass} placeholder="Ej: Caja mayorista salamín x300u" /></div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div><label className="text-xxs text-zinc-500 uppercase font-terminal block mb-1">Categoría</label>
                <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} className={inputClass}>
                  {['vacuno','cerdo','cordero','embutidos','elaborados','combos'].map(c => <option key={c} value={c}>{c}</option>)}
                </select></div>
              <div><label className="text-xxs text-zinc-500 uppercase font-terminal block mb-1">Estado</label>
                <select value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))} className={inputClass}>
                  {['fresco','curado','congelado','envasado_al_vacio'].map(c => <option key={c} value={c}>{c.replace(/_/g,' ')}</option>)}
                </select></div>
              <div><label className="text-xxs text-zinc-500 uppercase font-terminal block mb-1">Venta por</label>
                <select value={form.unidad_venta} onChange={e => setForm(f => ({ ...f, unidad_venta: e.target.value }))} className={inputClass}>
                  {['kg','caja','unidad','pack','media_res'].map(c => <option key={c} value={c}>{c.replace(/_/g,' ')}</option>)}
                </select></div>
              <div><label className="text-xxs text-zinc-500 uppercase font-terminal block mb-1">U/bulto</label><input type="number" min={0} value={form.unidades_por_bulto} onChange={e => setForm(f => ({ ...f, unidades_por_bulto: e.target.value }))} className={inputClass} placeholder="300" /></div>
              <div><label className="text-xxs text-zinc-500 uppercase font-terminal block mb-1">Pedido mín.</label><input type="number" min={1} value={form.pedido_minimo} onChange={e => setForm(f => ({ ...f, pedido_minimo: e.target.value }))} className={inputClass} /></div>
              <div><label className="text-xxs text-zinc-500 uppercase font-terminal block mb-1">Segmento</label>
                <select value={form.segmento} onChange={e => setForm(f => ({ ...f, segmento: e.target.value }))} className={inputClass}>
                  {['carnicerias','gastronomia','distribuidores','minorista'].map(c => <option key={c} value={c}>{c}</option>)}
                </select></div>
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" disabled={saving} className="px-4 py-1.5 bg-accent/10 border border-accent/30 text-accent text-xxs font-terminal uppercase tracking-wider hover:bg-accent/20 transition-colors disabled:opacity-50 rounded-terminal">{saving ? 'Guardando…' : 'Agregar'}</button>
            </div>
          </form>
        )}
        {feedback && <p className={`text-xxs font-terminal ${feedback.type === 'ok' ? 'text-positive' : 'text-negative'}`}>{feedback.msg}</p>}

        {items.length === 0 ? (
          <p className="text-xxs text-zinc-600 font-terminal py-2">Todavía no cargaste productos.</p>
        ) : (
          <div className="divide-y divide-terminal-border">
            {items.map(p => (
              <div key={p.id} className="py-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-data font-terminal text-zinc-200 truncate">{p.producto}</p>
                  <p className="text-[10px] text-zinc-500 font-terminal">{[p.categoria, p.estado, p.unidad_venta, p.unidades_por_bulto ? `${p.unidades_por_bulto} u/bulto` : null].filter(Boolean).join(' · ')}{p.status === 'paused' ? ' · PAUSADO' : ''}</p>
                </div>
                <button onClick={() => handleDelete(p.id)} className="text-[10px] font-terminal text-negative hover:underline flex-shrink-0">Eliminar</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  FRIGORIFICO — PEDIDOS (RFQ mayoristas recibidos)                   */
/* ------------------------------------------------------------------ */

function FrigoPedidos({ rfqs }: { rfqs: FrigoRfq[] }) {
  return (
    <div className="terminal-panel">
      <div className="terminal-panel-header"><span className="text-zinc-200 text-label tracking-widest">PEDIDOS MAYORISTAS</span></div>
      <div className="px-panel py-3">
        {rfqs.length === 0 ? (
          <p className="text-xxs text-zinc-600 font-terminal py-2">Todavía no recibiste pedidos. Cuando un comprador pida cotización desde tu perfil, aparece acá.</p>
        ) : (
          <div className="divide-y divide-terminal-border">
            {rfqs.map(r => {
              const snap = Array.isArray(r.producto_snapshot) ? (r.producto_snapshot as Array<{ producto?: string; cantidad?: number }>) : []
              return (
                <div key={r.id} className="py-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-data font-terminal text-zinc-200">{r.empresa || r.nombre || r.email}</span>
                    <span className="text-[10px] text-zinc-500 font-terminal tabular-nums">{formatDate(r.created_at.slice(0, 10))}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 font-terminal">Entrega en <span className="text-zinc-200">{r.provincia_entrega}</span>{r.tipo_comprador ? ` · ${r.tipo_comprador}` : ''}</p>
                  {snap.length > 0 && <p className="text-[11px] text-zinc-400 font-terminal">{snap.map(s => `${s.cantidad ?? ''} × ${s.producto ?? ''}`.trim()).join(' · ')}</p>}
                  {r.mensaje && <p className="text-[11px] text-zinc-500 font-terminal italic">«{r.mensaje}»</p>}
                  <div className="flex items-center gap-3 pt-0.5">
                    {r.whatsapp && <a href={`https://wa.me/${r.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-[10px] font-terminal text-accent hover:underline">WhatsApp</a>}
                    <a href={`mailto:${r.email}`} className="text-[10px] font-terminal text-accent hover:underline">{r.email}</a>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  SUBSCRIPTION PANEL                                                  */
/* ------------------------------------------------------------------ */

function SubscriptionPanel({ tier, subscription, plan }: { tier: string; subscription: Subscription | null; plan: ConsignatariaPlanStatus }) {
  const [cancelling, setCancelling] = useState(false)
  const [cancelFeedback, setCancelFeedback] = useState<string | null>(null)
  const [cancelled, setCancelled] = useState(false)
  // (Se sacó el contador de "lugares fundador": contaba suscripciones de OTRO
  // producto —PRO abierto, user_subscriptions— contra un cupo de 50 que no existe.
  // Escasez inventada; revisión del 17-10-2026.)

  async function handleCancel() {
    if (!confirm('Cancelar suscripcion? Tu plan sigue activo hasta el fin del periodo.')) return
    setCancelling(true)
    try {
      const res = await fetch('/api/subscriptions/cancel', { method: 'POST' })
      if (!res.ok) { const d = await res.json(); setCancelFeedback(mensajeError(d, 'Error')); return }
      setCancelled(true)
      setCancelFeedback('Suscripcion cancelada.')
    } catch { setCancelFeedback('Error de conexion') }
    finally { setCancelling(false) }
  }

  return (
    <div className="terminal-panel">
      <div className="terminal-panel-header flex items-center justify-between">
        <span className="text-zinc-200 text-label tracking-widest">MI PLAN</span>
        <span className={`text-xxs font-terminal px-1.5 py-0.5 border rounded-terminal ${
          tier === 'PRO' ? 'border-accent/40 text-accent' : tier === 'ENTERPRISE' ? 'border-purple-500/30 text-purple-400' : 'border-zinc-600/30 text-zinc-500'
        }`}>{tier}</span>
      </div>
      <div className="px-panel py-3 space-y-3">
        {plan.isPro && !plan.source && !subscription ? (
          <p className="text-xs text-zinc-300">
            Vista previa de administrador: así ve la firma su panel con PRO activo. Lo que pagaría:
            ARS 45.000/mes, sin permanencia.
          </p>
        ) : plan.source === 'featured' ? (
          // Destaque manual: PRO sin cargo y sin vencimiento, otorgado por nosotros.
          <div className="space-y-2">
            <p className="text-xs text-zinc-200">Tu firma tiene PRO sin cargo, otorgado por consignatarias.com.ar.</p>
            <ul className="text-xxs font-terminal text-zinc-400 space-y-1 list-none">
              {BENEFICIOS_PRO_CONSIGNATARIA.map((b) => <li key={b}>→ {b}</li>)}
            </ul>
          </div>
        ) : subscription && subscription.status === 'cancelled' && plan.isPro ? (
          <p className="text-xs text-zinc-300">
            Cancelaste la suscripción. Seguís con PRO hasta el{' '}
            <span className="tabular-nums text-zinc-100">{subscription.current_period_end ? formatDate(subscription.current_period_end.slice(0, 10)) : 'fin del período'}</span>,
            que es lo que ya pagaste.
          </p>
        ) : subscription && subscription.status === 'past_due' ? (
          <p className="text-xs text-warning">
            El último cobro no pasó. Mientras no se regularice, tu firma figura como FREE. Revisá el medio de pago en Rebill o escribinos a agro@memola.com.ar.
          </p>
        ) : subscription && (tier === 'PRO' || tier === 'ENTERPRISE') ? (
          <>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xxs text-zinc-500 uppercase font-terminal">Estado:</span>
                <span className="text-xxs font-terminal text-positive">ACTIVA</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xxs text-zinc-500 uppercase font-terminal">Vencimiento:</span>
                <span className="text-xxs font-terminal text-zinc-300 tabular-nums">{subscription.current_period_end ? formatDate(subscription.current_period_end.slice(0, 10)) : '—'}</span>
              </div>
            </div>
            {!cancelled && (
              <button onClick={handleCancel} disabled={cancelling} className="text-xxs font-terminal text-zinc-500 hover:text-negative transition-colors disabled:opacity-50">
                {cancelling ? 'Cancelando...' : 'Cancelar suscripcion'}
              </button>
            )}
            {cancelFeedback && <span className="text-xxs font-terminal text-zinc-500">{cancelFeedback}</span>}
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-xxs font-terminal text-zinc-500">Tu plan actual es gratuito. Con PRO (ARS 45.000/mes, sin permanencia):</p>
            <ul className="text-xxs font-terminal text-zinc-400 space-y-1 list-none">
              {BENEFICIOS_PRO_CONSIGNATARIA.map((b) => <li key={b}>→ {b}</li>)}
            </ul>
            <Link href="/planes?audience=consignataria&from=dashboard-subscription" className="inline-flex items-center gap-2 px-4 py-2 bg-amber-400/15 border border-amber-500/40 text-amber-400 text-xxs font-terminal uppercase tracking-wider hover:bg-amber-400/25 transition-colors">
              <span>★</span> Activar PRO Consignataria — $45.000/mes
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
