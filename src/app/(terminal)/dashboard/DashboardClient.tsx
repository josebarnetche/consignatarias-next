'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams, useRouter } from 'next/navigation'
import WelcomeChecklist from '@/components/onboarding/WelcomeChecklist'
import ProfileProgressTracker from '@/components/onboarding/ProfileProgressTracker'
import { WelcomeHero, ProActivatedModule, type NextStep } from '@/components/welcome'
import { WhatsAppIconButton } from '@/components/share/WhatsAppShare'
import { LayoutDashboard, CalendarDays, Pencil, BarChart3, CreditCard, Building2, Inbox } from 'lucide-react'
import QRCode from '@/components/QRCode'
import { UpgradeConfirmTracker } from '@/components/UpgradeConfirmTracker'
import MarketIntelPanel from '@/components/MarketIntelPanel'
import MagPulse from '@/components/MagPulse'
import { trackEvent } from '@/lib/analytics'
import { EmptyState } from '@/components/ui'

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
}

interface FrigoClaim {
  id: string
  frigorifico_cuit: string
  frigorifico_name: string
  status: string
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
  created_at: string
}

interface Props {
  email: string
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
  frigorifico?: Frigorifico | null
  frigoClaims?: FrigoClaim[]
  dteCount?: number
  alreadyRedeemed?: boolean
}

function formatDate(d: string) {
  const parts = d.split('-')
  if (parts.length < 3) return d
  return `${parts[2]}/${parts[1]}`
}

type TabKey = 'resumen' | 'leads' | 'remates' | 'editar' | 'resultados' | 'plan' | 'frigorifico'

export default function DashboardClient({
  email, consignataria, claims, scrapedAuctions, ownerAuctions: initialOwnerAuctions,
  auctionResults, viewCount, whatsappClicks, leadsCount, followersCount = 0, marksCount = 0, leads = [], totalWatchers, viewPercentile, provincialRank, completedFields, subscription, frigorifico, frigoClaims = [],
  dteCount = 0, alreadyRedeemed = false,
}: Props) {
  const showChecklist = consignataria && completedFields && Object.values(completedFields).filter(Boolean).length < 5
  const searchParams = useSearchParams()
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

  const tierLabel = (upgradeConfirmed || subscription || hasRedeemed)
    ? (subscription?.plan_name || '').toLowerCase().includes('enterprise')
      ? 'ENTERPRISE'
      : 'PRO'
    : 'FREE'

  // PRO ya activo (suscripción confirmada) vs todavía procesando el pago.
  const proActivated = !!subscription || upgradeConfirmed
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
        setRedeemError(data.error || 'Error al canjear puntos')
      }
    } catch {
      setRedeemError('Error de conexión')
    } finally {
      setIsRedeeming(false)
    }
  }

  // Poll subscription status after upgrade redirect
  useEffect(() => {
    if (!justUpgraded || subscription || upgradeConfirmed) return
    if (upgradePollCount >= 12) return // Stop after 60s (12 x 5s)

    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/subscription-status')
        const data = await res.json()
        if (data.status === 'active') {
          setUpgradeConfirmed(true)
        } else {
          setUpgradePollCount(prev => prev + 1)
        }
      } catch {
        setUpgradePollCount(prev => prev + 1)
      }
    }, 5000)

    return () => clearTimeout(timer)
  }, [justUpgraded, subscription, upgradeConfirmed, upgradePollCount])

  // Build tab list with icons
  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'resumen', label: 'Resumen', icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
  ]
  if (consignataria?.verified) {
    tabs.push({ key: 'leads', label: `Leads (${leadsCount})`, icon: <Inbox className="w-3.5 h-3.5" /> })
    tabs.push({ key: 'remates', label: `Remates (${scrapedAuctions.length + ownerAuctions.length})`, icon: <CalendarDays className="w-3.5 h-3.5" /> })
    tabs.push({ key: 'editar', label: 'Editar', icon: <Pencil className="w-3.5 h-3.5" /> })
    tabs.push({ key: 'resultados', label: 'Resultados', icon: <BarChart3 className="w-3.5 h-3.5" /> })
  }
  tabs.push({ key: 'plan', label: 'Mi plan', icon: <CreditCard className="w-3.5 h-3.5" /> })
  if (frigorifico) {
    tabs.push({ key: 'frigorifico', label: 'Frigorífico', icon: <Building2 className="w-3.5 h-3.5" /> })
  }

  const hasPendingClaim = claims.some(c => c.status === 'pending') || frigoClaims.some(c => c.status === 'pending')
  const hasVerified = consignataria?.verified || frigorifico?.verified

  return (
    <div className="max-w-3xl mx-auto px-2 sm:px-4 py-4 space-y-4">
      {/* Fire the GA4 pro_upgrade conversion only once PRO is DB-confirmed
          (subscription prop or polled /api/subscription-status), never on the
          bare ?upgraded=true redirect param. */}
      <UpgradeConfirmTracker
        confirmed={proActivated}
        plan={subscription?.plan_name || (tierLabel === 'ENTERPRISE' ? 'ENTERPRISE' : 'PRO_CONSIGNATARIA')}
        price={tierLabel === 'ENTERPRISE' ? 0 : 45000}
        dedupeId={subscription?.rebill_subscription_id ?? null}
      />
      {/* Bienvenida post-upgrade — "ya sos PRO, esto desbloqueaste" + proximos pasos */}
      {showUpgradeToast && (tierLabel === 'PRO' || tierLabel === 'ENTERPRISE' || proConfirming) && (
        <ProActivatedModule
          tier={tierLabel === 'ENTERPRISE' ? 'ENTERPRISE' : 'PRO'}
          periodEnd={subscription?.current_period_end}
          confirming={proConfirming}
          steps={proNextSteps}
          onClose={() => setShowUpgradeToast(false)}
        />
      )}

      {/* Header */}
      <div className="terminal-panel">
        <div className="terminal-panel-header flex items-center justify-between">
          <span className="text-zinc-200 text-label tracking-widest">MI PANEL</span>
          <div className="flex items-center gap-2">
            {consignataria?.verified && (
              <span className="text-xxs font-terminal px-1.5 py-0.5 border border-positive/30 text-positive rounded-terminal">VERIFICADA</span>
            )}
            {(tierLabel === 'PRO' || tierLabel === 'ENTERPRISE') && (
              <span className="text-xxs font-terminal px-1.5 py-0.5 border border-accent/40 text-accent rounded-terminal">{tierLabel}</span>
            )}
          </div>
        </div>
        <div className="px-panel py-3 space-y-1">
          <span className="text-xxs text-zinc-500 font-terminal">{email}</span>
          {consignataria && (
            <div className="flex items-center gap-3">
              <span className="text-data font-terminal text-zinc-200">{consignataria.display_name}</span>
              <Link href={`/consignatarias/${consignataria.canonical_slug}`} className="text-xxs text-accent font-terminal hover:underline">
                Ver perfil publico →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      {(consignataria || frigorifico) && (
        <div className="terminal-panel">
          <div className="flex items-center gap-0 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2.5 text-xxs font-terminal uppercase tracking-wider transition-colors border-b-2 flex-shrink-0 flex items-center gap-1.5 ${
                  activeTab === tab.key
                    ? 'text-accent border-accent bg-accent/5'
                    : 'text-zinc-500 border-transparent hover:text-zinc-300 hover:border-zinc-700'
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.key === 'remates' ? `(${scrapedAuctions.length + ownerAuctions.length})` : ''}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ============ TAB: RESUMEN ============ */}
      {activeTab === 'resumen' && (
        <>
          {/* Saludo + estado de cuenta (dato real de valor) */}
          <WelcomeHero
            email={email}
            displayName={consignataria?.display_name ?? frigorifico?.display_name}
            tier={tierLabel as 'FREE' | 'PRO' | 'ENTERPRISE'}
            periodEnd={subscription?.current_period_end}
            viewCount={consignataria?.verified ? viewCount : null}
            viewPercentile={consignataria?.verified ? viewPercentile : 0}
            provincialRank={provincialRank}
          />

          {/* Pulso del mercado — drip animado de la actividad de Cañuelas (dopamina + progreso) */}
          <div className="mt-4">
            <MagPulse />
          </div>

          {/* Intel de mercado — seguí la actividad de la competencia en el MAG (gancho + upsell) */}
          {consignataria && (
            <div className="mt-4">
              <MarketIntelPanel />
            </div>
          )}

          {showChecklist && completedFields && consignataria && (
            <WelcomeChecklist profileSlug={consignataria.canonical_slug} displayName={consignataria.display_name} completedFields={completedFields} />
          )}

          {/* Points Progress Tracker */}
          {consignataria?.verified && tierLabel === 'FREE' && (
            <>
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
              {redeemError && (
                <div className="mt-2 px-3 py-2 bg-negative/10 border border-negative/30 rounded">
                  <p className="text-negative text-xxs font-terminal">{redeemError}</p>
                </div>
              )}
              {isRedeeming && (
                <div className="mt-2 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded">
                  <p className="text-amber-400 text-xxs font-terminal">Canjeando puntos...</p>
                </div>
              )}
            </>
          )}

          {consignataria?.verified && (
            <div className="terminal-panel">
              <div className="terminal-panel-header flex items-center justify-between">
                <span className="text-zinc-200 text-label tracking-widest">📊 TU IMPACTO — ÚLTIMOS 30 DÍAS</span>
                {tierLabel !== 'FREE' && (
                  <span className="text-xxs text-accent font-terminal">PRO Analytics</span>
                )}
              </div>
              <div className="px-panel py-4">
                {/* Stats grid - always show all 4 metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  {/* Seguidores — el dato B2B: productores suscriptos a tus remates */}
                  <div className="bg-zinc-800/50 rounded-terminal p-3 text-center">
                    <div className="text-2xl font-terminal tabular-nums text-sky-300 font-bold">
                      {followersCount.toLocaleString('es-AR')}
                    </div>
                    <div className="text-[10px] text-zinc-500 uppercase font-terminal mt-1">
                      productores te siguen
                    </div>
                  </div>

                  {/* Marcas en tus remates */}
                  <div className="bg-zinc-800/50 rounded-terminal p-3 text-center">
                    <div className="text-2xl font-terminal tabular-nums text-sky-300 font-bold">
                      {marksCount.toLocaleString('es-AR')}
                    </div>
                    <div className="text-[10px] text-zinc-500 uppercase font-terminal mt-1">
                      marcas en tus remates
                    </div>
                  </div>

                  {/* Views */}
                  <div className="bg-zinc-800/50 rounded-terminal p-3 text-center">
                    <div className="text-2xl font-terminal tabular-nums text-zinc-100 font-bold">
                      {viewCount.toLocaleString('es-AR')}
                    </div>
                    <div className="text-[10px] text-zinc-500 uppercase font-terminal mt-1">
                      vistas perfil
                    </div>
                  </div>
                  
                  {/* WhatsApp Clicks */}
                  <div className="bg-zinc-800/50 rounded-terminal p-3 text-center">
                    <div className="text-2xl font-terminal tabular-nums text-emerald-400 font-bold">
                      {whatsappClicks.toLocaleString('es-AR')}
                    </div>
                    <div className="text-[10px] text-zinc-500 uppercase font-terminal mt-1">
                      clics WhatsApp
                    </div>
                  </div>
                  
                  {/* Leads */}
                  <div className="bg-zinc-800/50 rounded-terminal p-3 text-center relative">
                    <div className={`text-2xl font-terminal tabular-nums font-bold ${leadsCount > 0 ? 'text-positive' : 'text-negative'}`}>
                      {leadsCount}
                    </div>
                    <div className="text-[10px] text-zinc-500 uppercase font-terminal mt-1">
                      leads capturados
                    </div>
                    {/* Show alert dot if WA clicks but no leads */}
                    {whatsappClicks > 0 && leadsCount === 0 && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-negative rounded-full animate-pulse" />
                    )}
                  </div>
                  
                  {/* Provincial Rank */}
                  <div className="bg-zinc-800/50 rounded-terminal p-3 text-center">
                    <div className="text-2xl font-terminal tabular-nums text-amber-400 font-bold">
                      {provincialRank.position > 0 ? `#${provincialRank.position}` : '—'}
                    </div>
                    <div className="text-[10px] text-zinc-500 uppercase font-terminal mt-1 truncate">
                      en {provincialRank.province || 'provincia'}
                    </div>
                  </div>
                </div>

                {/* Gap Alert - THE WOW MOMENT (only if clicks but no leads) */}
                {whatsappClicks > 0 && leadsCount === 0 && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-terminal mb-4">
                    <div className="flex items-start gap-2">
                      <span className="text-amber-400 text-lg">⚠️</span>
                      <div>
                        <p className="text-sm font-terminal text-amber-300 font-medium">
                          {whatsappClicks} personas hicieron clic en tu WhatsApp
                        </p>
                        <p className="text-xxs font-terminal text-zinc-400 mt-1">
                          Pero no tenés forma de saber quiénes son. Activá la captura de leads para contactarlos después.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Demand Signal - Watchers */}
                {(totalWatchers + followersCount) > 0 && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-terminal mb-4">
                    <div className="flex items-start gap-2">
                      <span className="text-emerald-400 text-lg">👁️</span>
                      <div>
                        <p className="text-sm font-terminal text-emerald-300 font-medium">
                          {totalWatchers + followersCount} {(totalWatchers + followersCount) === 1 ? 'productor está' : 'productores están'} pendientes de tus remates
                        </p>
                        <p className="text-xxs font-terminal text-zinc-400 mt-1">
                          Entre seguidores de tu casa y remates en watchlist. Reciben avisos cuando publicás — tu audiencia cautiva.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* PRO extras */}
                {tierLabel !== 'FREE' && viewPercentile > 0 && (
                  <div className="text-center pt-3 border-t border-terminal-border">
                    <span className="text-xs text-zinc-500 font-terminal">
                      Estás en el <span className="text-amber-400 font-bold">Top {100 - viewPercentile}%</span> de consignatarias más vistas del país
                    </span>
                  </div>
                )}

                {/* Stats grid for PRO users - additional metrics */}
                {tierLabel !== 'FREE' && (
                  <div className="grid grid-cols-3 gap-3 pt-3 border-t border-terminal-border mt-3">
                    <div className="bg-zinc-800/50 rounded-terminal p-2.5">
                      <div className="text-lg font-terminal tabular-nums text-zinc-200">
                        {Math.round(viewCount / 30)}
                      </div>
                      <div className="text-[10px] text-zinc-500 uppercase font-terminal">
                        visitas/día
                      </div>
                    </div>
                    <div className="bg-zinc-800/50 rounded-terminal p-2.5">
                      <div className="text-lg font-terminal tabular-nums text-amber-400">
                        {viewPercentile > 0 ? `Top ${100 - viewPercentile}%` : '—'}
                      </div>
                      <div className="text-[10px] text-zinc-500 uppercase font-terminal">
                        vs el país
                      </div>
                    </div>
                    <div className="bg-zinc-800/50 rounded-terminal p-2.5">
                      <div className="text-lg font-terminal tabular-nums text-emerald-400">
                        {provincialRank.position > 0 ? `#${provincialRank.position}` : '—'}
                      </div>
                      <div className="text-[10px] text-zinc-500 uppercase font-terminal truncate" title={provincialRank.province}>
                        en {provincialRank.province || 'provincia'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Upgrade CTA for free users - stronger value prop */}
                {tierLabel === 'FREE' && (
                  <div className="mt-4 p-3 bg-amber-500/5 border border-amber-500/20 rounded-terminal">
                    <p className="text-xxs font-terminal text-zinc-300 mb-1">
                      🔒 Tu perfil es visible pero no destaca
                    </p>
                    <p className="text-xxs font-terminal text-zinc-500 mb-3">
                      Con PRO: cada remate llega a +500 productores por email, analytics de vistas, badge dorado, landing con QR.
                    </p>
                    <Link
                      href="/planes?audience=consignataria&from=dashboard"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xxs font-terminal uppercase tracking-wider hover:bg-amber-500/30 transition-colors rounded-terminal"
                    >
                      ★ Activar PRO Consignataria — $45.000/mes
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick actions */}
          {consignataria?.verified && (
            <div className="terminal-panel">
              <div className="terminal-panel-header"><span className="text-zinc-200 text-label tracking-widest">ACCIONES RAPIDAS</span></div>
              <div className="px-panel py-3 flex flex-wrap gap-3">
                <button onClick={() => setActiveTab('remates')} className="px-3 py-1.5 bg-positive/10 border border-positive/30 text-positive text-xxs font-terminal uppercase tracking-wider hover:bg-positive/20 transition-colors">
                  Agregar remate
                </button>
                <button onClick={() => setActiveTab('editar')} className="px-3 py-1.5 bg-accent/10 border border-accent/30 text-accent text-xxs font-terminal uppercase tracking-wider hover:bg-accent/20 transition-colors">
                  Editar perfil
                </button>
                <button onClick={() => setActiveTab('resultados')} className="px-3 py-1.5 bg-accent/10 border border-accent/30 text-accent text-xxs font-terminal uppercase tracking-wider hover:bg-accent/20 transition-colors">
                  Cargar resultados
                </button>
                <Link href="/mi-cuenta/guias" className="px-3 py-1.5 bg-sky-500/10 border border-sky-500/30 text-accent text-xxs font-terminal uppercase tracking-wider hover:bg-sky-500/20 transition-colors">
                  📄 Mis Guías DT-e
                </Link>
                {tierLabel !== 'FREE' && (
                  <a 
                    href={`/api/consignatarias/${consignataria.canonical_slug}/report`}
                    className="px-3 py-1.5 bg-sky-500/10 border border-sky-500/30 text-accent text-xxs font-terminal uppercase tracking-wider hover:bg-sky-500/20 transition-colors"
                  >
                    📄 Reporte PDF
                  </a>
                )}
              </div>
            </div>
          )}

          {/* QR Code + Landing Page Link */}
          {consignataria?.verified && (
            <div className="terminal-panel">
              <div className="terminal-panel-header flex items-center justify-between">
                <span className="text-zinc-200 text-label tracking-widest">📱 TU LINK Y QR</span>
                <a 
                  href={`/go/${consignataria.canonical_slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xxs font-terminal text-accent hover:text-accent-bright transition-colors"
                >
                  Ver landing →
                </a>
              </div>
              <div className="px-panel py-4">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {/* QR Code */}
                  <div className="flex-shrink-0">
                    <QRCode 
                      url={`https://consignatarias.com.ar/go/${consignataria.canonical_slug}?utm_source=qr`}
                      size={140}
                      showDownload={true}
                    />
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 text-center sm:text-left space-y-3">
                    <p className="text-xxs text-zinc-400 font-terminal">
                      Usá este QR en tus catálogos, tarjetas y carteles. Los compradores escanean y ven tu próximo remate al instante.
                    </p>
                    
                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`https://consignatarias.com.ar/go/${consignataria.canonical_slug}`)
                          trackEvent('referral_link_copy', { consignataria_slug: consignataria.canonical_slug, surface: 'dashboard_qr' })
                          alert('Link copiado!')
                        }}
                        className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white text-xxs font-terminal uppercase tracking-wider rounded-terminal transition-colors"
                      >
                        📋 Copiar
                      </button>
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(`Mirá mis próximos remates: https://consignatarias.com.ar/go/${consignataria.canonical_slug}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => trackEvent('referral_whatsapp_share', { consignataria_slug: consignataria.canonical_slug, surface: 'dashboard_qr' })}
                        className="px-3 py-1.5 bg-[#25D366] hover:bg-[#20BD5A] text-white text-xxs font-terminal uppercase tracking-wider rounded-terminal transition-colors text-center"
                      >
                        📤 WhatsApp
                      </a>
                      <a
                        href={`/api/calendario/${consignataria.canonical_slug}`}
                        className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xxs font-terminal uppercase tracking-wider rounded-terminal transition-colors text-center"
                        title="Agregar a Google Calendar, Apple Calendar u Outlook"
                      >
                        📅 Calendario
                      </a>
                    </div>
                    <p className="text-[10px] text-zinc-600 font-terminal mt-2">
                      El calendario se sincroniza automáticamente con tus remates
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Embeddable Widget - PRO only */}
          {consignataria?.verified && tierLabel !== 'FREE' && (
            <div className="terminal-panel">
              <div className="terminal-panel-header flex items-center justify-between">
                <span className="text-zinc-200 text-label tracking-widest">🔗 WIDGET PARA TU WEB</span>
                <a 
                  href={`/api/widget/${consignataria.canonical_slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xxs font-terminal text-accent hover:text-accent-bright transition-colors"
                >
                  Ver preview →
                </a>
              </div>
              <div className="px-panel py-4 space-y-4">
                <p className="text-xxs text-zinc-400 font-terminal">
                  Mostrá tus próximos remates en tu propia página web. Copiá este código y pegalo en tu sitio:
                </p>
                
                {/* Code snippet */}
                <div className="bg-zinc-900 border border-zinc-800 rounded p-3 font-mono text-[10px] text-zinc-300 overflow-x-auto">
                  <code>{`<iframe src="https://consignatarias.com.ar/api/widget/${consignataria.canonical_slug}" width="400" height="300" frameborder="0"></iframe>`}</code>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      const code = `<iframe src="https://consignatarias.com.ar/api/widget/${consignataria.canonical_slug}" width="400" height="300" frameborder="0"></iframe>`
                      navigator.clipboard.writeText(code)
                      trackEvent('widget_code_copy', { consignataria_slug: consignataria.canonical_slug })
                      alert('Código copiado!')
                    }}
                    className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white text-xxs font-terminal uppercase tracking-wider rounded-terminal transition-colors"
                  >
                    📋 Copiar código
                  </button>
                  <a
                    href={`/api/widget/${consignataria.canonical_slug}?theme=light`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-zinc-200 hover:bg-zinc-100 text-zinc-800 text-xxs font-terminal uppercase tracking-wider rounded-terminal transition-colors"
                  >
                    ☀️ Tema claro
                  </a>
                  <a
                    href={`/api/widget/${consignataria.canonical_slug}?theme=dark`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xxs font-terminal uppercase tracking-wider rounded-terminal transition-colors"
                  >
                    🌙 Tema oscuro
                  </a>
                </div>
                
                <p className="text-[10px] text-zinc-600 font-terminal">
                  Parámetros: ?theme=light|dark &amp; ?max=1-5
                </p>
              </div>
            </div>
          )}

          {/* Upcoming scraped auctions */}
          {scrapedAuctions.length > 0 && (
            <div className="terminal-panel">
              <div className="terminal-panel-header flex items-center justify-between">
                <span className="text-zinc-200 text-label tracking-widest">PROXIMOS REMATES</span>
                <span className="text-xxs text-zinc-500 font-terminal">{scrapedAuctions.length} del scraper</span>
              </div>
              <div className="divide-y divide-terminal-border">
                {scrapedAuctions.map((a, i) => (
                  <div key={i} className="px-panel py-2 flex items-center gap-4">
                    <span className="text-xxs font-terminal text-zinc-500 tabular-nums w-12 flex-shrink-0">{formatDate(a.date)}</span>
                    {a.time && <span className="text-xxs font-terminal text-zinc-500 w-12 flex-shrink-0">{a.time}</span>}
                    <span className="text-data font-terminal text-zinc-300 flex-1 truncate">{a.title}</span>
                    <span className="text-xxs font-terminal text-zinc-500 hidden sm:inline">{a.location}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Claims status */}
          {claims.length > 0 && (
            <div className="terminal-panel">
              <div className="terminal-panel-header"><span className="text-zinc-200 text-label tracking-widest">MIS SOLICITUDES</span></div>
              <div className="divide-y divide-terminal-border">
                {claims.map(claim => (
                  <div key={claim.id} className="px-panel py-2 flex items-center gap-4">
                    <span className="text-data font-terminal text-zinc-300 flex-1">{claim.consignatarias?.display_name || claim.consignataria_slug}</span>
                    <span className={`text-xxs font-terminal px-1.5 py-0.5 border rounded-terminal ${
                      claim.status === 'pending' ? 'border-warning/30 text-warning'
                        : claim.status === 'approved' ? 'border-positive/30 text-positive'
                        : 'border-negative/30 text-negative'
                    }`}>
                      {claim.status === 'pending' ? 'PENDIENTE' : claim.status === 'approved' ? 'APROBADA' : 'RECHAZADA'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!hasVerified && hasPendingClaim && (
            <div className="terminal-panel border-warning/20">
              <div className="px-panel py-4 text-center space-y-2">
                <p className="text-xxs font-terminal text-warning">Tu solicitud esta siendo revisada.</p>
              </div>
            </div>
          )}

          {!consignataria && !frigorifico && claims.length === 0 && frigoClaims.length === 0 && (
            <div className="terminal-panel">
              <div className="terminal-panel-header">
                <span className="text-zinc-200 text-label tracking-widest">PRIMEROS PASOS</span>
              </div>
              <div className="px-panel py-6 space-y-6">
                <p className="text-data font-terminal text-zinc-400">
                  Bienvenido a Consignatarias.com.ar. Para acceder a todas las funciones, completá estos pasos:
                </p>
                
                {/* Step 1 - Active */}
                <div className="flex items-start gap-4 p-3 bg-positive/5 border border-positive/20 rounded-lg">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-positive/20 text-positive flex items-center justify-center font-terminal text-sm font-bold">1</span>
                  <div className="flex-1">
                    <p className="text-data font-terminal text-zinc-200 font-medium">Verificá tu perfil</p>
                    <p className="text-xxs font-terminal text-zinc-500 mt-1">
                      Buscá tu consignataria o frigorífico y reclamá el perfil para poder editarlo y publicar remates.
                    </p>
                    <div className="flex items-center gap-3 mt-3">
                      <Link href="/consignatarias" className="px-3 py-1.5 bg-positive/10 border border-positive/30 text-positive text-xxs font-terminal uppercase tracking-wider hover:bg-positive/20 transition-colors rounded">
                        Buscar consignataria →
                      </Link>
                      <Link href="/frigorificos" className="px-3 py-1.5 bg-accent/10 border border-accent/30 text-accent text-xxs font-terminal uppercase tracking-wider hover:bg-accent/20 transition-colors rounded">
                        Buscar frigorífico →
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Step 2 - Pending */}
                <div className="flex items-start gap-4 p-3 opacity-50">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-zinc-800 text-zinc-500 flex items-center justify-center font-terminal text-sm">2</span>
                  <div>
                    <p className="text-data font-terminal text-zinc-400">Completá tu información</p>
                    <p className="text-xxs font-terminal text-zinc-600 mt-1">
                      Teléfono, email, descripción, logo — cada campo mejora tu visibilidad.
                    </p>
                  </div>
                </div>

                {/* Step 3 - Pending */}
                <div className="flex items-start gap-4 p-3 opacity-50">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-zinc-800 text-zinc-500 flex items-center justify-center font-terminal text-sm">3</span>
                  <div>
                    <p className="text-data font-terminal text-zinc-400">Publicá tus remates</p>
                    <p className="text-xxs font-terminal text-zinc-600 mt-1">
                      Aparecen en el calendario y se envían a +500 productores activos.
                    </p>
                  </div>
                </div>

                {/* Value prop */}
                <div className="pt-4 border-t border-zinc-800/50">
                  <p className="text-xxs font-terminal text-zinc-500 text-center">
                    💡 Con el perfil verificado accedés a: editar información, publicar remates, cargar DTe, ver analytics y más.
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ============ TAB: LEADS ============ */}
      {activeTab === 'leads' && consignataria?.verified && (
        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">Leads · quién te buscó</h2>
            <p className="text-sm text-zinc-400">
              Productores que dejaron sus datos o te contactaron desde tu perfil. Escribiles vos.
            </p>
          </div>
          {leads.length === 0 ? (
            <div className="rounded-terminal border border-terminal-border bg-terminal-panel">
              <EmptyState
                icon="buscador-lupa"
                compact
                title="Todavía no hay leads."
                sub="Cuando un productor deje sus datos o toque tu WhatsApp desde el perfil, aparece acá con nombre y contacto."
              />
            </div>
          ) : (
            <div className="divide-y divide-terminal-border rounded-terminal border border-terminal-border bg-terminal-panel">
              {leads.map((l) => {
                const wa = l.phone ? `https://wa.me/${l.phone.replace(/\D/g, '')}` : null
                const fecha = new Date(l.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
                return (
                  <div key={l.id} className="p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-zinc-100">
                        {l.name}
                        <span className="ml-2 text-xxs uppercase tracking-wider text-zinc-500">{fecha}</span>
                      </div>
                      <div className="text-xs text-zinc-400">
                        {l.phone && <span className="mr-2">{l.phone}</span>}
                        {l.email && <span className="mr-2">{l.email}</span>}
                        {l.source && <span className="text-zinc-600">· {l.source}</span>}
                      </div>
                      {l.message && <div className="text-xs text-zinc-500 mt-1 truncate">{l.message}</div>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {wa && (
                        <a href={wa} target="_blank" rel="noopener noreferrer" className="rounded-terminal bg-emerald-500 hover:bg-emerald-400 px-3 py-1.5 text-xs font-semibold text-white transition-colors">
                          WhatsApp
                        </a>
                      )}
                      {l.email && (
                        <a href={`mailto:${l.email}`} className="rounded-terminal border border-terminal-border px-3 py-1.5 text-xs text-zinc-200 hover:border-accent transition-colors">
                          Email
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ============ TAB: REMATES ============ */}
      {activeTab === 'remates' && consignataria?.verified && (
        <AuctionManager
          slug={consignataria.canonical_slug}
          displayName={consignataria.display_name}
          ownerAuctions={ownerAuctions}
          scrapedAuctions={scrapedAuctions}
          onAuctionsChange={setOwnerAuctions}
        />
      )}

      {/* ============ TAB: EDITAR ============ */}
      {activeTab === 'editar' && consignataria?.verified && (
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
      )}

      {/* ============ TAB: RESULTADOS ============ */}
      {activeTab === 'resultados' && consignataria && (
        <div className="terminal-panel">
          <div className="terminal-panel-header flex items-center justify-between">
            <span className="text-zinc-200 text-label tracking-widest">RESULTADOS DE REMATES</span>
            <Link href="/dashboard/resultados/nuevo" className="px-3 py-1 bg-accent/10 border border-accent/30 text-accent text-xxs font-terminal uppercase tracking-wider hover:bg-accent/20 transition-colors">
              Cargar resultado
            </Link>
          </div>
          {auctionResults.length > 0 ? (
            <div className="divide-y divide-terminal-border">
              {auctionResults.map(r => (
                <div key={r.id} className="px-panel py-2 flex items-center gap-4">
                  <span className="text-xxs font-terminal text-zinc-500 tabular-nums w-12 flex-shrink-0">{formatDate(r.auction_date)}</span>
                  <span className="text-data font-terminal text-zinc-300 flex-1 truncate">{r.auction_title}</span>
                  {r.total_heads_sold != null && <span className="text-xxs font-terminal text-zinc-500 hidden sm:inline">{r.total_heads_sold} cab.</span>}
                  {r.average_price != null && <span className="text-xxs font-terminal text-positive tabular-nums">${Number(r.average_price).toLocaleString('es-AR')}</span>}
                </div>
              ))}
            </div>
          ) : (
            <div className="px-panel py-10 text-center space-y-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-sky-500/10 border border-sky-500/20 mb-2">
                <svg className="w-7 h-7 text-sky-500/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <p className="text-data font-terminal text-zinc-300 font-medium mb-1">
                  Empezá a trackear tus resultados
                </p>
                <p className="text-xxs font-terminal text-zinc-500">
                  Cargá los resultados de tus remates para ver analytics de precios, cabezas y tendencias.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 pt-2 max-w-sm mx-auto">
                <div className="text-center">
                  <div className="text-lg mb-1">📊</div>
                  <p className="text-[10px] text-zinc-600 font-terminal">Precios promedio</p>
                </div>
                <div className="text-center">
                  <div className="text-lg mb-1">📈</div>
                  <p className="text-[10px] text-zinc-600 font-terminal">Tendencias</p>
                </div>
                <div className="text-center">
                  <div className="text-lg mb-1">🎯</div>
                  <p className="text-[10px] text-zinc-600 font-terminal">Comparativas</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============ TAB: MI PLAN ============ */}
      {activeTab === 'plan' && <SubscriptionPanel tier={tierLabel} subscription={subscription} />}

      {/* ============ TAB: FRIGORIFICO ============ */}
      {activeTab === 'frigorifico' && frigorifico && (
        <>
          <div className="terminal-panel">
            <div className="terminal-panel-header flex items-center justify-between">
              <span className="text-zinc-200 text-label tracking-widest">MI FRIGORIFICO</span>
              {frigorifico.verified && <span className="text-xxs font-terminal px-1.5 py-0.5 border border-positive/30 text-positive rounded-terminal">VERIFICADO</span>}
            </div>
            <div className="px-panel py-3 space-y-2">
              <div className="text-data font-terminal text-zinc-200">{frigorifico.display_name}</div>
              <Link href={`/frigorificos/${frigorifico.cuit}`} className="text-xxs text-accent font-terminal hover:underline">Ver perfil publico →</Link>
            </div>
          </div>
          {frigorifico.verified && (
            <FrigorificoEditForm cuit={frigorifico.cuit} initial={{ phone: frigorifico.phone || '', email: frigorifico.email || '', website: frigorifico.website || '', description: frigorifico.description || '', whatsapp: frigorifico.whatsapp || '', location: frigorifico.location || '', logoUrl: frigorifico.logo_url || null }} />
          )}
        </>
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
}

function AuctionManager({ slug, displayName, ownerAuctions, scrapedAuctions, onAuctionsChange }: AuctionManagerProps) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(EMPTY_AUCTION)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)
  const router = useRouter()

  function startCreate() {
    setEditingId(null)
    setForm(EMPTY_AUCTION)
    setShowForm(true)
    setFeedback(null)
  }

  function startEdit(auction: OwnerAuction) {
    setEditingId(auction.id)
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
        setFeedback({ type: 'err', msg: data.error || 'Error al guardar' })
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
      setFeedback({ type: 'ok', msg: editingId ? 'Remate actualizado' : 'Remate creado' })
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
            <span className="text-zinc-200 text-label tracking-widest">{editingId ? 'EDITAR REMATE' : 'NUEVO REMATE'}</span>
            <button onClick={() => { setShowForm(false); setEditingId(null) }} className="text-xxs font-terminal text-zinc-500 hover:text-zinc-400">Cancelar</button>
          </div>
          <form onSubmit={handleSave} className="px-panel py-3 space-y-3">
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
                <input type="text" value={form.province} onChange={e => setForm(f => ({ ...f, province: e.target.value }))} className={inputClass} placeholder="BUENOS AIRES" />
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
              <label className="text-xxs text-zinc-500 uppercase font-terminal block mb-1">Descripcion</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={`${inputClass} resize-none`} rows={2} maxLength={500} placeholder="Detalles del remate..." />
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" disabled={saving} className="px-4 py-1.5 bg-positive/10 border border-positive/30 text-positive text-xxs font-terminal uppercase tracking-wider hover:bg-positive/20 transition-colors disabled:opacity-50">
                {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear remate'}
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
            <span className="text-zinc-400 text-xxs tracking-widest">REMATES CARGADOS POR VOS</span>
          </div>
          <div className="divide-y divide-terminal-border">
            {ownerAuctions.map(a => {
              const shareMsg = `🐄 *${a.title}*\n\n📅 ${formatDate(a.date)}${a.time ? ` a las ${a.time}` : ''}\n📍 ${a.location || 'Argentina'}\n${a.estimated_heads ? `🔢 ${a.estimated_heads.toLocaleString('es-AR')} cabezas\n` : ''}🏢 ${displayName}\n\n👉 Ver más: https://consignatarias.com.ar/consignatarias/${slug}`
              return (
                <div key={a.id} className="px-panel py-2 flex items-center gap-3">
                  <span className="text-xxs font-terminal text-zinc-500 tabular-nums w-12 flex-shrink-0">{formatDate(a.date)}</span>
                  {a.time && <span className="text-xxs font-terminal text-zinc-500 w-12 flex-shrink-0">{a.time}</span>}
                  <span className="text-data font-terminal text-zinc-300 flex-1 truncate">{a.title}</span>
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
                  <span className="text-xxs font-terminal text-zinc-700 hidden sm:inline">{a.location}</span>
                  <WhatsAppIconButton message={shareMsg} size="sm" className="flex-shrink-0" />
                </div>
              )
            })}
          </div>
          <div className="px-panel py-2">
            <span className="text-[10px] font-terminal text-zinc-700">Estos remates se actualizan automaticamente por nuestro scraper diario.</span>
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
        setFeedback({ type: 'err', msg: data.error || 'Error al guardar' })
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
        setLogoFeedback({ type: 'err', msg: data.error || 'Error al subir logo' })
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
      if (!res.ok) { const data = await res.json(); setFeedback({ type: 'err', msg: data.error || 'Error al guardar' }); return }
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
      if (!res.ok) { setFeedback({ type: 'err', msg: data.error || 'Error al subir el logo' }); return }
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
/*  SUBSCRIPTION PANEL                                                  */
/* ------------------------------------------------------------------ */

function SubscriptionPanel({ tier, subscription }: { tier: string; subscription: Subscription | null }) {
  const [cancelling, setCancelling] = useState(false)
  const [cancelFeedback, setCancelFeedback] = useState<string | null>(null)
  const [cancelled, setCancelled] = useState(false)
  const [spotsRemaining, setSpotsRemaining] = useState<number | null>(null)

  // Fetch founder spots for scarcity messaging
  useEffect(() => {
    if (tier === 'FREE') {
      fetch('/api/stats/pro-spots')
        .then(r => r.json())
        .then(d => {
          if (d.success && d.data) {
            setSpotsRemaining(d.data.remaining)
          }
        })
        .catch(() => {})
    }
  }, [tier])

  async function handleCancel() {
    if (!confirm('Cancelar suscripcion? Tu plan sigue activo hasta el fin del periodo.')) return
    setCancelling(true)
    try {
      const res = await fetch('/api/subscriptions/cancel', { method: 'POST' })
      if (!res.ok) { const d = await res.json(); setCancelFeedback(d.error || 'Error'); return }
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
        {subscription && (tier === 'PRO' || tier === 'ENTERPRISE') ? (
          <>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xxs text-zinc-500 uppercase font-terminal">Estado:</span>
                <span className={`text-xxs font-terminal ${subscription.status === 'active' ? 'text-positive' : 'text-warning'}`}>
                  {subscription.status === 'active' ? 'ACTIVA' : 'PAGO PENDIENTE'}
                </span>
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
            {/* Founder spots scarcity indicator */}
            {spotsRemaining !== null && spotsRemaining > 0 && spotsRemaining <= 25 && (
              <div className={`px-2 py-1.5 rounded text-center ${
                spotsRemaining <= 10 
                  ? 'bg-red-500/15 border border-red-500/50' 
                  : 'bg-amber-500/15 border border-amber-500/40'
              }`}>
                <span className={`text-xxs font-terminal uppercase tracking-wider ${
                  spotsRemaining <= 10 ? 'text-red-400' : 'text-amber-400'
                }`}>
                  {spotsRemaining <= 10 ? '🔥' : '⚡'} {spotsRemaining} lugares disponibles a $45.000/mes
                </span>
              </div>
            )}
            
            <div className="flex items-center gap-2 mb-2">
              <span className="text-amber-400 text-base">📧</span>
              <p className="text-xs font-terminal text-zinc-200 font-medium">Cada remate tuyo → +500 productores</p>
            </div>
            <p className="text-xxs font-terminal text-zinc-500">Tu plan actual es gratuito. Con PRO:</p>
            <ul className="text-xxs font-terminal text-zinc-400 space-y-1 list-none">
              <li>→ Tus remates enviados por email a toda nuestra base</li>
              <li>→ Perfil destacado con badge dorado</li>
              <li>→ Analytics: vistas, ranking provincial</li>
              <li>→ Landing personalizada con QR para catálogos</li>
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
