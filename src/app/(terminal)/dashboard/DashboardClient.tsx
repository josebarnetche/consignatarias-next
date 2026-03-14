'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import WelcomeChecklist from '@/components/onboarding/WelcomeChecklist'
import { WhatsAppIconButton } from '@/components/share/WhatsAppShare'
import QRCode from '@/components/QRCode'

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
  current_period_end: string
  rebill_subscription_id: string
}

interface Frigorifico {
  cuit: string
  display_name: string
  verified: boolean
  phone?: string | null
  email?: string | null
  website?: string | null
  description?: string | null
}

interface FrigoClaim {
  id: string
  frigorifico_cuit: string
  frigorifico_name: string
  status: string
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
  viewPercentile: number
  provincialRank: { position: number; total: number; province: string }
  completedFields: CompletedFields | null
  subscription: Subscription | null
  frigorifico?: Frigorifico | null
  frigoClaims?: FrigoClaim[]
}

function formatDate(d: string) {
  const parts = d.split('-')
  if (parts.length < 3) return d
  return `${parts[2]}/${parts[1]}`
}

type TabKey = 'resumen' | 'remates' | 'editar' | 'resultados' | 'plan' | 'frigorifico'

export default function DashboardClient({
  email, consignataria, claims, scrapedAuctions, ownerAuctions: initialOwnerAuctions,
  auctionResults, viewCount, viewPercentile, provincialRank, completedFields, subscription, frigorifico, frigoClaims = [],
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

  const tierLabel = (upgradeConfirmed || subscription)
    ? (subscription?.plan_name || '').toLowerCase().includes('enterprise')
      ? 'ENTERPRISE'
      : 'PRO'
    : 'FREE'

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

  // Build tab list
  const tabs: { key: TabKey; label: string }[] = [
    { key: 'resumen', label: 'Resumen' },
  ]
  if (consignataria?.verified) {
    tabs.push({ key: 'remates', label: `Remates (${scrapedAuctions.length + ownerAuctions.length})` })
    tabs.push({ key: 'editar', label: 'Editar perfil' })
    tabs.push({ key: 'resultados', label: 'Resultados' })
  }
  tabs.push({ key: 'plan', label: 'Mi plan' })
  if (frigorifico) {
    tabs.push({ key: 'frigorifico', label: 'Frigorifico' })
  }

  const hasPendingClaim = claims.some(c => c.status === 'pending') || frigoClaims.some(c => c.status === 'pending')
  const hasVerified = consignataria?.verified || frigorifico?.verified

  return (
    <div className="max-w-3xl mx-auto px-2 sm:px-4 py-4 space-y-4">
      {/* Post-upgrade celebration */}
      {showUpgradeToast && (
        <div className="terminal-panel border-amber-500/40" style={{ boxShadow: '0 0 20px rgba(251, 191, 36, 0.1)' }}>
          <div className="px-panel py-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-amber-400 font-terminal text-lg">&#9733;</span>
                <div>
                  <div className="text-amber-300 font-terminal text-data font-semibold">
                    {(subscription || upgradeConfirmed) ? 'PRO activado!' : 'Pago recibido — activando PRO...'}
                  </div>
                  <div className="text-zinc-400 text-xxs font-terminal mt-0.5">
                    {(subscription || upgradeConfirmed)
                      ? 'Tu perfil esta destacado y tus remates aparecen con badge dorado.'
                      : 'Procesando tu suscripcion. Esto puede tomar unos segundos.'}
                  </div>
                </div>
              </div>
              <button onClick={() => setShowUpgradeToast(false)} className="text-zinc-500 text-xxs font-terminal hover:text-zinc-400 flex-shrink-0">Cerrar</button>
            </div>
            {(subscription || upgradeConfirmed) ? (
              <div className="flex flex-wrap gap-2">
                <button onClick={() => { setActiveTab('remates'); setShowUpgradeToast(false) }} className="px-3 py-1.5 bg-amber-400/10 border border-amber-500/30 text-amber-400 text-xxs font-terminal uppercase tracking-wider hover:bg-amber-400/20 transition-colors">
                  Crear remate destacado
                </button>
                <button onClick={() => { setActiveTab('editar'); setShowUpgradeToast(false) }} className="px-3 py-1.5 bg-accent/10 border border-accent/30 text-accent text-xxs font-terminal uppercase tracking-wider hover:bg-accent/20 transition-colors">
                  Completar perfil
                </button>
                {consignataria && (
                  <Link href={`/consignatarias/${consignataria.canonical_slug}`} className="px-3 py-1.5 bg-positive/10 border border-positive/30 text-positive text-xxs font-terminal uppercase tracking-wider hover:bg-positive/20 transition-colors">
                    Ver perfil publico
                  </Link>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-xxs font-terminal text-zinc-500">Verificando suscripcion...</span>
              </div>
            )}
          </div>
        </div>
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
              <span className="text-xxs font-terminal px-1.5 py-0.5 border border-amber-500/30 text-amber-400 rounded-terminal">{tierLabel}</span>
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
                className={`px-4 py-2.5 text-xxs font-terminal uppercase tracking-wider transition-colors border-b-2 flex-shrink-0 ${
                  activeTab === tab.key
                    ? 'text-accent border-accent bg-accent/5'
                    : 'text-zinc-500 border-transparent hover:text-zinc-300 hover:border-zinc-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ============ TAB: RESUMEN ============ */}
      {activeTab === 'resumen' && (
        <>
          {showChecklist && completedFields && consignataria && (
            <WelcomeChecklist profileSlug={consignataria.canonical_slug} displayName={consignataria.display_name} completedFields={completedFields} />
          )}

          {consignataria?.verified && (
            <div className={`terminal-panel ${tierLabel !== 'FREE' ? 'border-amber-500/20' : ''}`}>
              <div className="terminal-panel-header flex items-center justify-between">
                <span className="text-zinc-200 text-label tracking-widest">📊 TU IMPACTO</span>
                {tierLabel !== 'FREE' && (
                  <span className="text-xxs text-amber-400 font-terminal">PRO Analytics</span>
                )}
              </div>
              <div className="px-panel py-4">
                {/* Main stat - view count */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-3xl font-terminal tabular-nums text-zinc-100 font-bold">
                      {viewCount.toLocaleString('es-AR')}
                    </div>
                    <div className="text-xxs text-zinc-500 uppercase font-terminal mt-1">
                      personas vieron tu perfil
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-zinc-400 font-terminal">últimos 30 días</div>
                    {viewCount > 0 && (
                      <div className="text-xs text-positive font-terminal mt-1">
                        ↑ activo
                      </div>
                    )}
                  </div>
                </div>

                {/* Stats grid for PRO users */}
                {tierLabel !== 'FREE' && (
                  <div className="grid grid-cols-3 gap-3 pt-3 border-t border-terminal-border">
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

                {/* Upgrade CTA for free users */}
                {tierLabel === 'FREE' && (
                  <div className="mt-4 p-3 bg-amber-500/5 border border-amber-500/20 rounded-terminal">
                    <p className="text-xxs font-terminal text-zinc-400 mb-2">
                      🔒 Con PRO verás: visitas diarias, comparación con el rubro, clicks en WhatsApp, y más.
                    </p>
                    <Link 
                      href="/planes" 
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xxs font-terminal uppercase tracking-wider hover:bg-amber-500/20 transition-colors rounded-terminal"
                    >
                      ★ Ver planes PRO
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
                    
                    {/* Copy URL button */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`https://consignatarias.com.ar/go/${consignataria.canonical_slug}`)
                          alert('Link copiado!')
                        }}
                        className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white text-xxs font-terminal uppercase tracking-wider rounded-terminal transition-colors"
                      >
                        📋 Copiar link
                      </button>
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(`Mirá mis próximos remates: https://consignatarias.com.ar/go/${consignataria.canonical_slug}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-[#25D366] hover:bg-[#20BD5A] text-white text-xxs font-terminal uppercase tracking-wider rounded-terminal transition-colors text-center"
                      >
                        📤 Compartir
                      </a>
                    </div>
                  </div>
                </div>
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
              <div className="px-panel py-6 text-center space-y-3">
                <p className="text-zinc-500 text-data font-terminal">No tenes un perfil verificado.</p>
                <div className="flex items-center justify-center gap-4">
                  <Link href="/consignatarias" className="px-4 py-2 bg-positive/10 border border-positive/30 text-positive text-xxs font-terminal uppercase tracking-wider hover:bg-positive/20 transition-colors">
                    Verificar consignataria →
                  </Link>
                  <Link href="/frigorificos" className="px-4 py-2 bg-accent/10 border border-accent/30 text-accent text-xxs font-terminal uppercase tracking-wider hover:bg-accent/20 transition-colors">
                    Verificar frigorifico →
                  </Link>
                </div>
              </div>
            </div>
          )}
        </>
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
            <div className="px-panel py-6 text-center">
              <p className="text-xxs font-terminal text-zinc-500">No hay resultados. Subi los resultados de tus remates completados.</p>
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
            <FrigorificoEditForm cuit={frigorifico.cuit} initial={{ phone: frigorifico.phone || '', email: frigorifico.email || '', website: frigorifico.website || '', description: frigorifico.description || '' }} />
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
          <div className="px-panel py-6 text-center space-y-2">
            <p className="text-xxs font-terminal text-zinc-500">No hay remates cargados todavia.</p>
            <button onClick={startCreate} className="text-xxs font-terminal text-positive hover:underline">
              Agregar tu primer remate →
            </button>
          </div>
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
          <div className="w-16 h-16 rounded-terminal border border-terminal-border bg-terminal-bg flex items-center justify-center overflow-hidden flex-shrink-0">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
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

function FrigorificoEditForm({ cuit, initial }: { cuit: string; initial: { phone: string; email: string; website: string; description: string } }) {
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
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

  const inputClass = 'w-full bg-terminal-bg border border-terminal-border text-zinc-200 text-xxs font-terminal px-2 py-1.5 rounded-terminal focus:outline-none focus:border-accent transition-colors'

  return (
    <div className="terminal-panel">
      <div className="terminal-panel-header"><span className="text-zinc-200 text-label tracking-widest">EDITAR FRIGORIFICO</span></div>
      <form onSubmit={handleSubmit} className="px-panel py-3 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="text-xxs text-zinc-500 uppercase font-terminal block mb-1">Telefono</label><input type="text" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inputClass} placeholder="+54 11 1234-5678" /></div>
          <div><label className="text-xxs text-zinc-500 uppercase font-terminal block mb-1">Email</label><input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputClass} placeholder="contacto@ejemplo.com" /></div>
          <div><label className="text-xxs text-zinc-500 uppercase font-terminal block mb-1">Sitio web</label><input type="text" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} className={inputClass} placeholder="https://ejemplo.com" /></div>
        </div>
        <div><label className="text-xxs text-zinc-500 uppercase font-terminal block mb-1">Descripcion</label><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={`${inputClass} resize-none`} rows={3} maxLength={1000} /><span className="text-[10px] text-zinc-700 font-terminal">{form.description.length}/1000</span></div>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="px-4 py-1.5 bg-accent/10 border border-accent/30 text-accent text-xxs font-terminal uppercase tracking-wider hover:bg-accent/20 transition-colors disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar cambios'}</button>
          {feedback && <span className={`text-xxs font-terminal ${feedback.type === 'ok' ? 'text-positive' : 'text-negative'}`}>{feedback.msg}</span>}
        </div>
      </form>
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
          tier === 'PRO' ? 'border-amber-500/30 text-amber-400' : tier === 'ENTERPRISE' ? 'border-purple-500/30 text-purple-400' : 'border-zinc-600/30 text-zinc-500'
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
                <span className="text-xxs font-terminal text-zinc-300 tabular-nums">{formatDate(subscription.current_period_end.slice(0, 10))}</span>
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
            <p className="text-xxs font-terminal text-zinc-500">Tu plan actual es gratuito. Upgrade a PRO para:</p>
            <ul className="text-xxs font-terminal text-zinc-400 space-y-1 list-none">
              <li>→ Perfil destacado con badge dorado</li>
              <li>→ Analytics avanzados</li>
              <li>→ Resultados de remates en tu pagina</li>
              <li>→ Soporte prioritario</li>
            </ul>
            <Link href="/planes" className="inline-block px-4 py-1.5 bg-amber-400/10 border border-amber-500/30 text-amber-400 text-xxs font-terminal uppercase tracking-wider hover:bg-amber-400/20 transition-colors">
              Ver planes y precios →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
