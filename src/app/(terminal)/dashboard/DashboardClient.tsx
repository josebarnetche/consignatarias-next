'use client'

import { ImagenTema } from '@/components/ui/ImagenTema'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams, useRouter } from 'next/navigation'
import ProfileProgressTracker from '@/components/onboarding/ProfileProgressTracker'
import { ProActivatedModule, type NextStep } from '@/components/welcome'
import { WhatsAppIconButton } from '@/components/share/WhatsAppShare'
import { LayoutDashboard, CalendarDays, Pencil, BarChart3, CreditCard, Building2, Inbox, Package, TrendingUp } from 'lucide-react'
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
import type { PreofertaFirma, OfertaRecibida } from '@/components/dashboard/PreofertasManager'
import ResultadoVsMercado from '@/components/dashboard/ResultadoVsMercado'
import BusquedasGoogle from '@/components/dashboard/BusquedasGoogle'
import CambiarContrasena from '@/components/dashboard/CambiarContrasena'
import type { BusquedasFicha } from '@/lib/gsc/fichas'
import type { ResultadoVsMercado as ResultadoVsMercadoDatos } from '@/lib/reports/resultado-vs-mercado'
import type { OrigenVisitas as OrigenVisitasDatos } from '@/lib/reports/origen-visitas'
import { provinciaNombre } from '@/lib/ui/tokens'
import { mensajeError } from '@/lib/ui/mensaje-error'
import { Tarjeta, Numero, Vacio, SoloPro, BotonPrimario, BotonSecundario, Hoja, BloqueFecha, fmt } from '@/components/panel/PanelUi'
import ConsultasLista from '@/components/panel/ConsultasLista'
import RematesPanel, { hoyAr } from '@/components/panel/RematesPanel'
import CompartirRemate from '@/components/panel/CompartirRemate'

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
  /** Ficha pública del remate (/remates/…). */
  path?: string | null
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
  path?: string | null
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
  /** Productores que reciben el mail semanal de remates. */
  alcanceMail?: number
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

type TabKey = 'resumen' | 'leads' | 'remates' | 'preofertas' | 'editar' | 'resultados' | 'estadisticas' | 'audiencia' | 'mercado' | 'plan' | 'frigorifico' | 'catalogo' | 'pedidos'

export default function DashboardClient({
  email, consignataria, claims, scrapedAuctions, ownerAuctions: initialOwnerAuctions,
  auctionResults, viewCount, whatsappClicks, leadsCount, followersCount = 0, leads = [], provincialRank, completedFields, subscription, plan = PLAN_FREE, origenVisitas = null, vistaAdmin = null, preofertasFirma = [], ofertasFirma = [], resultadosVR = null, busquedasGoogle = null, frigorifico, frigoClaims = [],
  frigoProducts = [], frigoRfqs = [], frigoIsPro = false,
  dteCount = 0, alreadyRedeemed = false, alcanceMail = 0, performance = null, distribucion = null, benchmark = null, cartera = null, territorio = null, territorioTitular = '', participacion = null, hayDatosMag = false, agenda = null,
}: Props) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const justUpgraded = searchParams.get('upgraded') === 'true'
  const tabParam = searchParams.get('tab') as TabKey | null
  const [showUpgradeToast, setShowUpgradeToast] = useState(justUpgraded)
  const [upgradeConfirmed, setUpgradeConfirmed] = useState(false)
  const [upgradePollCount, setUpgradePollCount] = useState(0)
  const [activeTab, setActiveTab] = useState<TabKey>(tabParam || 'resumen')
  // Viene del server: la hoja de remates hace router.refresh() al guardar.
  const ownerAuctions = initialOwnerAuctions
  // "Cargar remate" desde Inicio abre la hoja de carga al llegar a Remates.
  const [abrirCarga, setAbrirCarga] = useState(false)
  // Los enlaces internos (?tab=…, p. ej. desde la bandeja o los mails) cambian la
  // sección aunque el panel ya esté abierto.
  useEffect(() => {
    if (tabParam) setActiveTab(tabParam)
  }, [tabParam])



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

  // NAVEGACIÓN (v2, 18-10-2026): siete lugares, ordenados por lo que la firma hace.
  // Las claves viejas siguen andando (?tab=leads, ?tab=editar, ?tab=preofertas…)
  // porque hay enlaces en mails y en la bandeja que las usan.
  const hoy = hoyAr()
  const proximos = [
    ...ownerAuctions.map((a) => ({ date: a.date, time: a.time, title: a.title, location: a.location ?? '', path: a.path ?? null })),
    ...scrapedAuctions.map((a) => ({ date: a.date, time: a.time, title: a.title, location: a.location, path: a.path ?? null })),
  ]
    .filter((a) => a.date >= hoy)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''))
  const esPro = tierLabel !== 'FREE'
  const consultasRecientes = leads.filter((l) => Date.now() - new Date(l.created_at).getTime() < 7 * 86_400_000).length
  const [compartirInicio, setCompartirInicio] = useState<null | (typeof proximos)[number] | 'firma'>(null)

  const tabs: { key: TabKey; label: string; count?: number; icon: React.ReactNode }[] = [
    { key: 'resumen', label: 'Inicio', icon: <LayoutDashboard className="h-[18px] w-[18px]" /> },
  ]
  if (consignataria?.verified) {
    tabs.push({ key: 'remates', label: 'Remates', count: proximos.length, icon: <CalendarDays className="h-[18px] w-[18px]" /> })
    tabs.push({ key: 'leads', label: 'Consultas', count: consultasRecientes, icon: <Inbox className="h-[18px] w-[18px]" /> })
    tabs.push({ key: 'resultados', label: 'Resultados', icon: <BarChart3 className="h-[18px] w-[18px]" /> })
    tabs.push({ key: 'estadisticas', label: 'Estadísticas', icon: <TrendingUp className="h-[18px] w-[18px]" /> })
    tabs.push({ key: 'editar', label: 'Mi ficha', icon: <Pencil className="h-[18px] w-[18px]" /> })
  }
  tabs.push({ key: 'plan', label: 'Mi plan', icon: <CreditCard className="h-[18px] w-[18px]" /> })
  if (frigorifico) {
    tabs.push({ key: 'frigorifico', label: 'Frigorífico', icon: <Building2 className="h-[18px] w-[18px]" /> })
    if (frigorifico.verified) {
      tabs.push({ key: 'catalogo', label: 'Catálogo', count: frigoProducts.length, icon: <Package className="h-[18px] w-[18px]" /> })
      tabs.push({ key: 'pedidos', label: 'Pedidos', count: frigoRfqs.length, icon: <Inbox className="h-[18px] w-[18px]" /> })
    }
  }
  // Claves viejas → la sección nueva que las contiene.
  const seccion: TabKey = activeTab === 'preofertas' ? 'remates' : activeTab === 'audiencia' || activeTab === 'mercado' ? 'estadisticas' : activeTab

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
        { campo: 'Email', listo: !!consignataria.email },
        { campo: 'Sitio web', listo: !!consignataria.website },
        { campo: 'Descripción', listo: !!consignataria.description },
      ]
    : []
  const faltaEnFicha = ficha.filter((f) => !f.listo).map((f) => f.campo.toLowerCase())
  const sitio = 'https://www.consignatarias.com.ar'

  // SUGERENCIAS DEL DÍA: el panel mira lo que hay y propone la próxima acción, una por
  // línea y con su botón. Es lo primero que ve la firma: qué hacer hoy, no un tablero.
  const prox = proximos[0]
  const diasAlProx = prox ? Math.round((new Date(prox.date + 'T12:00:00').getTime() - new Date(hoy + 'T12:00:00').getTime()) / 86_400_000) : null
  const cuandoProx = prox
    ? diasAlProx === 0 ? 'hoy' : diasAlProx === 1 ? 'mañana' : `el ${new Date(prox.date + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric' })}`
    : ''
  const sugerencias: { id: string; texto: React.ReactNode; boton: string; accion: () => void }[] = []
  if (consignataria?.verified) {
    const nuevas = leads.filter((l) => (l.status ?? 'new') === 'new' && Date.now() - new Date(l.created_at).getTime() < 14 * 86_400_000).length
    if (nuevas > 0) sugerencias.push({ id: 'consultas', texto: <><strong className="text-ink">{nuevas === 1 ? 'Tenés una consulta nueva.' : `Tenés ${nuevas} consultas nuevas.`}</strong> Contestá rápido: el productor suele escribirle a varias casas.</>, boton: 'Ver consultas', accion: () => irA('leads') })
    if (prox && diasAlProx != null && diasAlProx <= 14) {
      sugerencias.push({
        id: 'compartir',
        texto: <><strong className="text-ink">Tu remate es {cuandoProx}.</strong> {esPro && alcanceMail > 0 ? `Sale primero en el mail semanal a ${fmt(alcanceMail)} productores. ` : ''}Compartilo por WhatsApp con tus clientes: la tarjeta y el QR ya están armados.</>,
        boton: 'Compartir',
        accion: () => setCompartirInicio(prox),
      })
      if (esPro && !preofertasFirma.some((p) => p.fecha_remate === prox.date)) {
        sugerencias.push({ id: 'preofertas', texto: <><strong className="text-ink">Abrí pre-ofertas para {prox.title}.</strong> Cargá los lotes con su video y recibí ofertas antes del martillo.</>, boton: 'Abrir', accion: () => irA('remates') })
      }
    }
    if (!prox) sugerencias.push({ id: 'cargar', texto: <><strong className="text-ink">No tenés remates próximos publicados.</strong> Subí el flyer del próximo y lo distribuimos en el calendario y el mail semanal.</>, boton: 'Cargar remate', accion: () => { setAbrirCarga(true); irA('remates') } })
    if (faltaEnFicha.length > 0 && sugerencias.length < 3) sugerencias.push({ id: 'ficha', texto: <><strong className="text-ink">A tu ficha le falta {faltaEnFicha.slice(0, 2).join(' y ')}.</strong> Las fichas completas reciben más consultas.</>, boton: 'Completar', accion: () => irA('editar') })
  }

  const saludo = consignataria?.display_name ?? frigorifico?.display_name ?? 'tu panel'
  const encabezado = (titulo: string, sub?: React.ReactNode, acciones?: React.ReactNode) => (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-[1.75rem] font-semibold leading-tight tracking-tight text-ink sm:text-[2rem]">{titulo}</h1>
        {sub && <p className="mt-1.5 max-w-2xl text-[0.9375rem] text-zinc-500">{sub}</p>}
      </div>
      {acciones && <div className="flex shrink-0 flex-wrap gap-2">{acciones}</div>}
    </div>
  )

  return (
    <div className="relative min-h-[80vh] bg-gradient-to-b from-accent/[0.035] via-transparent to-transparent">
      <div className="panel-crm relative mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-10">
      {vistaAdmin && (
        <div className="mb-6 rounded-2xl bg-warning/10 px-5 py-4 ring-1 ring-inset ring-warning/30">
          <p className="text-sm text-ink">
            Estás viendo el panel de <strong>{consignataria?.display_name ?? vistaAdmin.slug}</strong> como lo vería
            su dueño{vistaAdmin.vista === 'pro' ? ' con PRO' : vistaAdmin.vista === 'free' ? ' sin PRO' : ', con su plan real'}.
            Es de sólo lectura: los cambios no se guardan.
          </p>
          <div className="mt-2 flex flex-wrap gap-3 text-xs">
            {(['pro', 'free', 'real'] as const).map((v) => (
              <a key={v} href={`/dashboard?como=${vistaAdmin.slug}&vista=${v}`} className={vistaAdmin.vista === v ? 'font-semibold text-ink underline' : 'text-accent hover:underline'}>
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

      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12">
        {/* ── Barra lateral ── */}
        <aside className="min-w-0 lg:sticky lg:top-20 lg:self-start">
          <div className="flex items-center gap-3">
            <span
              className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-zinc-100 ring-1 ring-inset ring-terminal-border"
              style={consignataria?.logo_fondo ? { backgroundColor: consignataria.logo_fondo } : undefined}
            >
              {consignataria?.logo_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={consignataria.logo_url} alt={consignataria.display_name} className="h-full w-full object-contain p-1" />
              ) : (
                <ImagenTema src="/marca/iconos-color/casa-remates.png" alt="" className="h-6 w-6" />
              )}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{saludo}</p>
              <p className="mt-0.5 text-xs">
                <span className={esPro ? 'font-semibold text-accent' : 'text-zinc-500'}>{esPro ? `★ ${tierLabel}` : 'Plan gratis'}</span>
              </p>
            </div>
          </div>

          {(consignataria || frigorifico) && (
            <nav className="-mx-4 mt-6 flex gap-1 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0" aria-label="Secciones del panel">
              {tabs.map((tab) => {
                const activo = seccion === tab.key
                return (
                  <button
                    key={tab.key}
                    onClick={() => irA(tab.key)}
                    aria-current={activo ? 'page' : undefined}
                    className={`flex shrink-0 items-center gap-3 rounded-full px-4 py-2.5 text-[0.9375rem] transition-colors lg:rounded-xl ${
                      activo ? 'bg-accent text-white oscuro:text-zinc-950 font-medium shadow-sm' : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-ink'
                    }`}
                  >
                    {tab.icon}
                    <span className="whitespace-nowrap lg:flex-1 lg:text-left">{tab.label}</span>
                    {tab.count != null && tab.count > 0 && (
                      <span className={`rounded-full px-2 text-xs tabular-nums ${activo ? 'bg-white/20' : 'bg-zinc-800 text-zinc-400'}`}>{tab.count}</span>
                    )}
                  </button>
                )
              })}
            </nav>
          )}

          {consignataria && (
            <div className="mt-6 hidden space-y-2 text-sm lg:block">
              <Link href={`/consignatarias/${consignataria.canonical_slug}`} className="block text-zinc-500 hover:text-accent">Ver mi perfil público ↗</Link>
              <button type="button" onClick={() => setCompartirInicio('firma')} className="block text-zinc-500 hover:text-accent">Compartir mi página ↗</button>
            </div>
          )}
        </aside>

        {/* ── Contenido ── */}
        <main key={seccion} className="page-transition min-w-0 space-y-8">
      {/* ============ INICIO ============ */}
      {seccion === 'resumen' && consignataria?.verified && (
        <>
          {encabezado(`Hola, ${saludo}`, new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Argentina/Buenos_Aires' }))}

          {/* Sugerencias del día */}
          {sugerencias.length > 0 && (
            <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-accent/[0.10] via-accent/[0.04] to-transparent ring-1 ring-inset ring-accent/15">
              <p className="flex items-center gap-2 px-6 pt-5 text-sm font-semibold text-accent">
                <span className="relative flex h-2 w-2" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60 motion-reduce:hidden" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                </span>
                Para hoy
              </p>
              <ul className="divide-y divide-accent/10 px-6 pb-2">
                {sugerencias.slice(0, 3).map((s) => (
                  <li key={s.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
                    <p className="min-w-0 flex-1 text-[0.9375rem] leading-relaxed text-zinc-400">{s.texto}</p>
                    <BotonPrimario onClick={s.accion}>{s.boton}</BotonPrimario>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Alcance: lo que la plataforma hizo por la firma, con número real. */}
          <Tarjeta titulo="Tu alcance" bajada="Lo que movimos por tu firma en los últimos 30 días.">
            <div className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4">
              {esPro && busquedasGoogle?.d28 ? (
                <Numero etiqueta="Veces que apareciste en Google" valor={busquedasGoogle.d28.impresiones} detalle={`${fmt(busquedasGoogle.d28.clics)} entraron a tu ficha`} tono="accent" />
              ) : null}
              <Numero etiqueta="Visitas a tu perfil" valor={viewCount} detalle={provincialRank.position > 0 ? `#${provincialRank.position} en ${provincialRank.province} por remates` : undefined} />
              {esPro ? (
                <Numero etiqueta="Productores que reciben tus remates" valor={alcanceMail} detalle="En el mail semanal, primero" />
              ) : (
                <Numero etiqueta="Productores que te siguen" valor={followersCount} detalle="Reciben tus remates" />
              )}
              {esPro && origenVisitas && origenVisitas.iasTotal > 0 ? (
                <Numero etiqueta="Visitas desde una IA" valor={origenVisitas.iasTotal} detalle="ChatGPT, Gemini y otras · 90 días" />
              ) : (
                <Numero etiqueta="Consultas" valor={leadsCount} detalle={leadsCount ? 'En los últimos 30 días' : 'Todavía ninguna este mes'} />
              )}
            </div>
            {!esPro && (
              <p className="mt-5 border-t border-terminal-border pt-4 text-sm text-zinc-500">
                Con PRO tus remates salen primeros en el mail semanal a {fmt(alcanceMail)} productores y ves cuántas veces te mostró Google.{' '}
                <Link href="/planes?audience=consignataria&from=alcance" className="font-semibold text-accent hover:underline">Ver PRO →</Link>
              </p>
            )}
          </Tarjeta>

          <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-5">
            <Tarjeta titulo="Próximos remates" accion={<button onClick={() => irA('remates')} className="font-medium text-accent hover:underline">Ver todos</button>} className="xl:col-span-3">
              {proximos.length === 0 ? (
                <Vacio titulo="No hay remates próximos." texto="Subí el flyer del próximo y lo distribuimos." accion={<BotonPrimario onClick={() => { setAbrirCarga(true); irA('remates') }}>Cargar remate</BotonPrimario>} />
              ) : (
                <ul className="space-y-4">
                  {proximos.slice(0, 3).map((a, i) => (
                    <li key={`${a.date}-${i}`} className="flex items-center gap-4">
                      <BloqueFecha fecha={a.date} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[0.9375rem] font-medium text-ink">{a.title}</p>
                        <p className="truncate text-sm text-zinc-500">{[a.time ? `${a.time} hs` : null, a.location].filter(Boolean).join(' · ')}</p>
                      </div>
                      <button type="button" onClick={() => setCompartirInicio(a)} className="shrink-0 rounded-full bg-accent/10 px-3.5 py-1.5 text-sm font-semibold text-accent hover:bg-accent/20">
                        Compartir
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Tarjeta>
            <Tarjeta titulo="Consultas" accion={leads.length > 0 ? <button onClick={() => irA('leads')} className="font-medium text-accent hover:underline">Ver todas</button> : undefined} className="xl:col-span-2">
              <ConsultasLista consultas={leads} esPro={esPro} max={3} />
            </Tarjeta>
          </div>
        </>
      )}

      {/* Inicio de una cuenta sin firma verificada (claims, frigorífico, nueva) */}
      {seccion === 'resumen' && !consignataria?.verified && (
        <>
          {encabezado(`Hola`, email)}
          {claims.length > 0 && (
            <Tarjeta titulo="Mis solicitudes" cuerpo="px-5 pb-4 sm:px-6">
              <ul className="divide-y divide-terminal-border">
                {claims.map(claim => (
                  <li key={claim.id} className="flex items-center gap-4 py-3">
                    <span className="flex-1 text-sm text-ink">{claim.consignatarias?.display_name || claim.consignataria_slug}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      claim.status === 'pending' ? 'bg-warning/10 text-warning'
                        : claim.status === 'approved' ? 'bg-positive/10 text-positive'
                        : 'bg-negative/10 text-negative'
                    }`}>
                      {claim.status === 'pending' ? 'Pendiente' : claim.status === 'approved' ? 'Aprobada' : 'Rechazada'}
                    </span>
                  </li>
                ))}
              </ul>
            </Tarjeta>
          )}
          {!hasVerified && hasPendingClaim && <ClaimEnEspera claims={claims} />}
          {!consignataria && !frigorifico && claims.length === 0 && frigoClaims.length === 0 && (
            <Tarjeta titulo="Reclamá tu firma" bajada="Cuando la verifiquemos, este panel se abre con tus remates, tus consultas y tus números.">
              <div className="flex flex-wrap gap-2">
                <BotonPrimario href="/consignatarias">Buscar mi consignataria</BotonPrimario>
                <BotonSecundario href="/frigorificos">Buscar mi frigorífico</BotonSecundario>
              </div>
            </Tarjeta>
          )}
          {frigorifico && (
            <Tarjeta titulo={frigorifico.display_name} accion={<button onClick={() => irA('frigorifico')} className="font-medium text-accent hover:underline">Abrir</button>}>
              <div className="grid grid-cols-2 gap-6">
                <Numero etiqueta="Productos en catálogo" valor={frigoProducts.length} />
                <Numero etiqueta="Pedidos recibidos" valor={frigoRfqs.length} />
              </div>
            </Tarjeta>
          )}
        </>
      )}

      {/* ============ REMATES (con sus pre-ofertas) ============ */}
      {seccion === 'remates' && consignataria?.verified && (
        <>
          {encabezado('Remates', 'Cargá, compartí y abrí pre-ofertas para cada remate.')}
          <RematesPanel
            slug={consignataria.canonical_slug}
            firma={consignataria.display_name}
            esPro={esPro}
            propios={ownerAuctions}
            calendario={scrapedAuctions}
            preofertas={preofertasFirma}
            ofertas={ofertasFirma}
            soloLectura={!!vistaAdmin}
            abrirNuevo={abrirCarga}
          />
        </>
      )}

      {/* ============ CONSULTAS ============ */}
      {seccion === 'leads' && consignataria?.verified && (
        <>
          {encabezado('Consultas', 'Productores que te escribieron desde tu perfil, la ficha de un remate o una pre-oferta. También te llegan por mail.')}
          <Tarjeta>
            <ConsultasLista consultas={leads} esPro={esPro} />
          </Tarjeta>
          {ofertasFirma.length > 0 && (
            <Tarjeta titulo="Ofertas en tus pre-ofertas" bajada="Cada oferta trae el contacto del interesado." accion={<button onClick={() => irA('remates')} className="font-medium text-accent hover:underline">Ver por remate</button>}>
              <ul className="divide-y divide-terminal-border">
                {ofertasFirma.slice(0, 10).map((o) => (
                  <li key={o.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3 text-sm">
                    <span className="font-medium text-ink">{o.nombre ?? 'Sin nombre'}</span>
                    <span className="text-zinc-500">{o.lote_titulo}</span>
                    <span className="tabular-nums text-ink">{o.monto != null ? `$ ${fmt(o.monto)}` : 'Sin monto'}</span>
                  </li>
                ))}
              </ul>
            </Tarjeta>
          )}
        </>
      )}

      {/* ============ RESULTADOS ============ */}
      {seccion === 'resultados' && consignataria && (
        <>
          {encabezado('Resultados', 'Cabezas y precio por categoría de cada remate: tu historial de precios.', <BotonPrimario href="/dashboard/resultados/nuevo">Cargar resultado</BotonPrimario>)}
          <Tarjeta cuerpo="p-0">
            {auctionResults.length > 0 ? (
              <ul className="divide-y divide-terminal-border">
                {auctionResults.map(r => (
                  <li key={r.id} className="flex items-center gap-4 px-5 py-4 sm:px-6">
                    <span className="w-14 shrink-0 text-sm tabular-nums text-zinc-500">{formatDate(r.auction_date)}</span>
                    <span className="min-w-0 flex-1 truncate text-[0.9375rem] text-ink">{r.auction_title}</span>
                    {r.total_heads_sold != null && <span className="hidden text-sm tabular-nums text-zinc-500 sm:inline">{fmt(r.total_heads_sold)} cab.</span>}
                    <span className="text-sm tabular-nums text-ink">{r.average_price != null ? `$${Number(r.average_price).toLocaleString('es-AR')}` : '—'}</span>
                    <Link href={`/dashboard/resultados/${r.id}`} className="text-sm text-accent hover:underline">Editar</Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-5 sm:p-6">
                <Vacio
                  titulo="Todavía no cargaste resultados."
                  texto="Elegí el remate y cargá cabezas y precio por categoría. Te sugerimos los de los últimos 90 días."
                  accion={<BotonPrimario href="/dashboard/resultados/nuevo">Cargar el primero</BotonPrimario>}
                />
              </div>
            )}
          </Tarjeta>
          <Tarjeta titulo={esPro && resultadosVR?.length ? undefined : 'Tu precio contra el mercado'} incrustado={!!(esPro && resultadosVR?.length)}>
            {esPro ? (
              resultadosVR && resultadosVR.length > 0 ? <ResultadoVsMercado resultados={resultadosVR} /> : <Vacio titulo="Sin resultados para comparar." texto="Cuando cargues un resultado con precio por categoría, aparece acá contra el Valor de Referencia de esa semana." />
            ) : (
              <SoloPro titulo="Tu precio contra el mercado" beneficio="Cada categoría de tu remate contra el Valor de Referencia de esa semana. El número para pelear una consignación." desde="resultados" />
            )}
          </Tarjeta>
        </>
      )}

      {/* ============ ESTADÍSTICAS ============ */}
      {seccion === 'estadisticas' && consignataria?.verified && (
        <>
          {encabezado('Estadísticas', 'Quién te mira, de dónde llega y cómo estás en el mercado.')}
          {esPro ? (
            <>
              {performance && <Tarjeta incrustado><PerformanceMes perf={performance} /></Tarjeta>}
              <Tarjeta incrustado={!!origenVisitas} titulo={origenVisitas ? undefined : 'De dónde llegan'}>
                {origenVisitas ? <OrigenVisitas d={origenVisitas} /> : <Vacio titulo="Todavía no hay visitas registradas." />}
              </Tarjeta>
              <Tarjeta incrustado={!!busquedasGoogle} titulo={busquedasGoogle ? undefined : 'Lo que buscan en Google'}>
                {busquedasGoogle ? <BusquedasGoogle d={busquedasGoogle} /> : <Vacio titulo="Todavía sin búsquedas." texto="Search Console se actualiza una vez por semana." />}
              </Tarjeta>
              <Tarjeta incrustado={!!distribucion} titulo={distribucion ? undefined : 'A cuántos les llegaron tus remates'}>
                {distribucion ? <Distribucion dist={distribucion} /> : <Vacio titulo="Tus remates todavía no salieron en el mail semanal." texto={`El próximo envío es el lunes, a ${fmt(alcanceMail)} productores.`} />}
              </Tarjeta>
            </>
          ) : (
            <>
              <Tarjeta>
                <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
                  <Numero etiqueta="Visitas a tu perfil" valor={viewCount} />
                  <Numero etiqueta="Clics en tu WhatsApp" valor={whatsappClicks} />
                  <Numero etiqueta="Productores que te siguen" valor={followersCount} />
                </div>
              </Tarjeta>
              <SoloPro titulo="Estadísticas completas" beneficio="Tus visitas día por día, si llegan desde Google, el calendario o una IA, qué escriben en Google cuando aparece tu ficha y a cuántos productores les llegó cada remate." desde="estadisticas" />
            </>
          )}
          <Tarjeta incrustado={!!agenda} titulo={agenda ? undefined : 'Tu agenda contra la de tu provincia'}>
            {agenda ? <AgendaRegionalPanel a={agenda} /> : <Vacio titulo="Sin remates en tu provincia para comparar." />}
          </Tarjeta>
          {hayDatosMag && (esPro ? (
            <>
              {territorio && <Tarjeta incrustado><TerritorioPanel t={territorio} titular={territorioTitular} /></Tarjeta>}
              {cartera && <Tarjeta incrustado><CarteraPanel c={cartera} /></Tarjeta>}
              {benchmark && <Tarjeta incrustado><BenchmarkMercado b={benchmark} /></Tarjeta>}
              {participacion && <Tarjeta incrustado><ParticipacionMercado p={participacion} /></Tarjeta>}
            </>
          ) : (
            <SoloPro titulo="Tu negocio en Cañuelas" beneficio="Tu cartera de remitentes, tu precio contra el promedio de las 22 casas, tu cuota y en qué partidos no tenés remitentes." desde="mercado" />
          ))}
          <Tarjeta incrustado><MagPulse /></Tarjeta>
          <Tarjeta incrustado><MarketIntelPanel /></Tarjeta>
        </>
      )}

      {/* ============ MI FICHA ============ */}
      {seccion === 'editar' && consignataria?.verified && (
        <>
          {encabezado('Mi ficha', 'Lo que ve el productor cuando entra a tu perfil.', <BotonSecundario href={`/consignatarias/${consignataria.canonical_slug}`}>Ver mi perfil ↗</BotonSecundario>)}
          <Tarjeta titulo="Tu página con QR" bajada="Tu página con tus próximos remates y un botón para consultarte. Ideal para catálogos, tarjetas y carteles.">
            <CompartirRemate
              q={{
                url: `${sitio}/go/${consignataria.canonical_slug}`,
                firma: consignataria.display_name,
                rotulo: 'Mis remates',
                titulo: consignataria.display_name,
                detalle: prox ? `Próximo remate: ${new Date(prox.date + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}${prox.location ? ` · ${prox.location}` : ''}` : undefined,
                archivo: `${consignataria.canonical_slug}-pagina`,
                slugFirma: consignataria.canonical_slug,
              }}
            />
          </Tarjeta>
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
          <Tarjeta titulo="Tus remates en tu web" bajada="Un código que se pega una vez y se actualiza solo.">
            {esPro ? (
              <div className="space-y-3">
                <pre className="overflow-x-auto rounded-xl bg-terminal-bg/60 p-4 font-mono text-xs text-zinc-300">
                  {`<iframe src="${sitio}/api/widget/${consignataria.canonical_slug}" width="400" height="300" frameborder="0"></iframe>`}
                </pre>
                <div className="flex flex-wrap gap-2">
                  <BotonSecundario onClick={() => { navigator.clipboard.writeText(`<iframe src="${sitio}/api/widget/${consignataria.canonical_slug}" width="400" height="300" frameborder="0"></iframe>`); trackEvent('widget_code_copy', { consignataria_slug: consignataria.canonical_slug }) }}>Copiar código</BotonSecundario>
                  <BotonSecundario href={`/api/widget/${consignataria.canonical_slug}?theme=light`} externo>Ver cómo queda</BotonSecundario>
                </div>
              </div>
            ) : (
              <SoloPro titulo="Widget de remates" beneficio="Tus próximos remates en tu propia web, siempre al día." desde="widget" />
            )}
          </Tarjeta>
        </>
      )}

      {/* ============ MI PLAN ============ */}
      {seccion === 'plan' && (
        <>
          {encabezado('Mi plan', esPro ? 'PRO Consignataria' : 'Plan gratis', undefined)}
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
              {redeemError && <p className="mt-2 text-sm text-negative">{redeemError}</p>}
              {isRedeeming && <p className="mt-2 text-sm text-warning">Canjeando puntos…</p>}
            </div>
          )}
          {esPro && consignataria && (
            <Tarjeta titulo="Reporte mensual en PDF" bajada="Tus visitas, consultas y remates del mes, listo para compartir.">
              <BotonSecundario href={`/api/consignatarias/${consignataria.canonical_slug}/report`}>Descargar reporte</BotonSecundario>
            </Tarjeta>
          )}
          {!vistaAdmin && <CambiarContrasena />}
        </>
      )}

      {/* ============ FRIGORÍFICO ============ */}
      {seccion === 'frigorifico' && frigorifico && (
        <>
          {encabezado(frigorifico.display_name, undefined, <BotonSecundario href={`/frigorificos/${frigorifico.cuit}`}>Ver perfil público ↗</BotonSecundario>)}
          {frigorifico.verified && <FrigoProCTA cuit={frigorifico.cuit} email={email} isPro={frigoIsPro} />}
          {frigorifico.verified && (
            <>
              <FrigorificoEditForm cuit={frigorifico.cuit} initial={{ phone: frigorifico.phone || '', email: frigorifico.email || '', website: frigorifico.website || '', description: frigorifico.description || '', whatsapp: frigorifico.whatsapp || '', location: frigorifico.location || '', logoUrl: frigorifico.logo_url || null }} />
              <HabilitacionForm cuit={frigorifico.cuit} nivel={frigorifico.habilitacion_nivel || ''} verificada={!!frigorifico.habilitacion_verificada} />
            </>
          )}
        </>
      )}
      {seccion === 'catalogo' && frigorifico && (
        <>
          {encabezado('Catálogo', 'Tus productos de carne.')}
          <FrigoProductManager cuit={frigorifico.cuit} initial={frigoProducts} />
        </>
      )}
      {seccion === 'pedidos' && frigorifico && (
        <>
          {encabezado('Pedidos', 'Pedidos mayoristas que te llegaron.')}
          <FrigoPedidos rfqs={frigoRfqs} />
        </>
      )}
        </main>
      </div>
      </div>

      {consignataria && (
        <Hoja abierta={compartirInicio != null} titulo={compartirInicio === 'firma' ? 'Compartir mi página' : 'Compartir remate'} bajada="Mandalo por WhatsApp, subí la tarjeta a tu estado o imprimí el QR." onCerrar={() => setCompartirInicio(null)}>
          {compartirInicio != null && (
            <CompartirRemate
              q={compartirInicio === 'firma'
                ? { url: `${sitio}/go/${consignataria.canonical_slug}`, firma: consignataria.display_name, rotulo: 'Mis remates', titulo: consignataria.display_name, archivo: `${consignataria.canonical_slug}-pagina`, slugFirma: consignataria.canonical_slug }
                : {
                    url: compartirInicio.path ? `${sitio}${compartirInicio.path}` : `${sitio}/go/${consignataria.canonical_slug}`,
                    firma: consignataria.display_name,
                    rotulo: 'Próximo remate',
                    titulo: compartirInicio.title,
                    detalle: [new Date(compartirInicio.date + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }), compartirInicio.time ? `${compartirInicio.time} hs` : null, compartirInicio.location || null].filter(Boolean).join(' · '),
                    archivo: `remate-${compartirInicio.date}`,
                    slugFirma: consignataria.canonical_slug,
                  }}
            />
          )}
        </Hoja>
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
      setFeedback({ type: 'ok', msg: 'Listo, ya se ve en tu perfil.' })
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

  const CAMPO = 'mt-1.5 block w-full rounded-xl border border-terminal-border bg-terminal-bg/60 px-3.5 py-2.5 text-[0.9375rem] text-ink placeholder:text-zinc-600 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20'
  const ETIQUETA = 'block text-sm font-medium text-zinc-300'
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-terminal-border bg-terminal-panel p-5 sm:p-6">
      <div>
        <p className="text-base font-semibold text-ink">Datos de tu ficha</p>
        <p className="mt-0.5 text-sm text-zinc-500">Lo que completes se ve en tu perfil público.</p>
      </div>

      {/* Logo */}
      <div className="flex items-center gap-4">
        <span className="relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-zinc-100 ring-1 ring-inset ring-terminal-border">
          {logoUrl ? <Image src={logoUrl} alt="Logo" className="object-contain p-1.5" fill unoptimized /> : <span className="text-xs text-zinc-500">Logo</span>}
        </span>
        <div>
          <label className={`inline-flex cursor-pointer items-center rounded-full bg-zinc-800/70 px-4 py-2 text-sm font-medium text-ink hover:bg-zinc-700/70 ${logoUploading ? 'pointer-events-none opacity-50' : ''}`}>
            {logoUploading ? 'Subiendo…' : logoUrl ? 'Cambiar logo' : 'Subir logo'}
            <input type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" onChange={handleLogoUpload} className="sr-only" disabled={logoUploading} />
          </label>
          <p className="mt-1.5 text-xs text-zinc-500">JPG, PNG, WebP o SVG, hasta 2 MB.</p>
          {logoFeedback && <p className={`mt-1 text-xs ${logoFeedback.type === 'ok' ? 'text-positive' : 'text-negative'}`}>{logoFeedback.msg}</p>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={ETIQUETA}>
          WhatsApp
          <input type="tel" value={form.whatsapp} onChange={set('whatsapp')} placeholder="Ej. 3794 123456" className={CAMPO} />
        </label>
        <label className={ETIQUETA}>
          Teléfono
          <input type="tel" value={form.phone} onChange={set('phone')} placeholder="Ej. 3774 42-1234" className={CAMPO} />
        </label>
        <label className={ETIQUETA}>
          Email de contacto
          <input type="email" value={form.email} onChange={set('email')} placeholder="contacto@tufirma.com" className={CAMPO} />
        </label>
        <label className={ETIQUETA}>
          Sitio web
          <input value={form.website} onChange={set('website')} placeholder="tufirma.com" className={CAMPO} />
        </label>
      </div>
      <label className={ETIQUETA}>
        Quiénes son, en dos líneas
        <textarea value={form.description} onChange={set('description')} rows={3} maxLength={1000} placeholder="Ej. Consignataria de Curuzú Cuatiá. Remates de invernada y cría en el sur de Corrientes desde 1960." className={`${CAMPO} resize-none`} />
      </label>
      <details className="text-sm">
        <summary className="cursor-pointer font-medium text-accent">Más datos (CUIT)</summary>
        <label className={`${ETIQUETA} mt-3`}>
          CUIT
          <input value={form.cuit} onChange={set('cuit')} placeholder="30-12345678-9" className={CAMPO} />
        </label>
      </details>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={saving} className="rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white oscuro:text-zinc-950 hover:bg-accent-bright disabled:opacity-50">
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
        {feedback && <span className={`text-sm ${feedback.type === 'ok' ? 'text-positive' : 'text-negative'}`}>{feedback.msg}</span>}
      </div>
    </form>
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
