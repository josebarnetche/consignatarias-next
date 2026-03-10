'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import WelcomeChecklist from '@/components/onboarding/WelcomeChecklist'

interface Consignataria {
  display_name: string
  canonical_slug: string
  verified: boolean
  phone?: string | null
  email?: string | null
  website?: string | null
  description?: string | null
  whatsapp?: string | null
}

interface Claim {
  id: string
  consignataria_slug: string
  status: string
  created_at: string
  consignatarias: { display_name: string; canonical_slug: string } | null
}

interface Auction {
  title: string
  date: string
  location: string
  time: string | null
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
  auctions: Auction[]
  auctionResults: AuctionResult[]
  viewCount: number
  completedFields: CompletedFields | null
  subscription: Subscription | null
  frigorifico?: Frigorifico | null
  frigoClaims?: FrigoClaim[]
}

function formatDate(d: string) {
  const [, m, day] = d.split('-')
  return `${day}/${m}`
}

export default function DashboardClient({ email, consignataria, claims, auctions, auctionResults, viewCount, completedFields, subscription, frigorifico, frigoClaims = [] }: Props) {
  const showChecklist = consignataria && completedFields && Object.values(completedFields).filter(Boolean).length < 5
  const searchParams = useSearchParams()
  const justUpgraded = searchParams.get('upgraded') === 'true'
  const [showUpgradeToast, setShowUpgradeToast] = useState(justUpgraded)

  const tierLabel = subscription
    ? subscription.plan_name.toLowerCase().includes('enterprise')
      ? 'ENTERPRISE'
      : 'PRO'
    : 'FREE'

  useEffect(() => {
    if (showUpgradeToast) {
      const timer = setTimeout(() => setShowUpgradeToast(false), 8000)
      return () => clearTimeout(timer)
    }
  }, [showUpgradeToast])

  return (
    <div className="max-w-3xl mx-auto px-2 sm:px-4 py-4 space-y-4">
      {/* Post-upgrade celebration */}
      {showUpgradeToast && (
        <div className="terminal-panel border-amber-500/30">
          <div className="px-panel py-3 flex items-center gap-3">
            <span className="text-amber-400 font-terminal text-data">&#9733; PRO</span>
            <span className="text-zinc-200 text-xxs font-terminal">
              Bienvenido a PRO! Tu perfil ya esta destacado.
            </span>
            <button
              onClick={() => setShowUpgradeToast(false)}
              className="ml-auto text-zinc-600 text-xxs font-terminal hover:text-zinc-400"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="terminal-panel">
        <div className="terminal-panel-header">
          <span className="text-zinc-200 text-label tracking-widest">MI PANEL</span>
        </div>
        <div className="px-panel py-3">
          <span className="text-xxs text-zinc-500 font-terminal">{email}</span>
        </div>
      </div>

      {/* Onboarding checklist — shown first when profile is incomplete */}
      {showChecklist && completedFields && (
        <WelcomeChecklist
          profileSlug={consignataria.canonical_slug}
          displayName={consignataria.display_name}
          completedFields={completedFields}
        />
      )}

      {/* MI PLAN */}
      {consignataria && (
        <SubscriptionPanel
          tier={tierLabel}
          subscription={subscription}
        />
      )}

      {/* Analytics */}
      {consignataria && consignataria.verified && (
        <div className="terminal-panel">
          <div className="terminal-panel-header">
            <span className="text-zinc-200 text-label tracking-widest">ANALYTICS</span>
          </div>
          <div className="px-panel py-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xxs text-zinc-600 uppercase font-terminal">Vistas ultimos 30 dias:</span>
              <span className="text-data font-terminal tabular-nums text-zinc-200">{viewCount}</span>
            </div>
            {tierLabel === 'FREE' ? (
              <p className="text-xxs font-terminal text-zinc-500">
                Tu perfil tuvo {viewCount} vistas este mes. Los perfiles PRO reciben 3x mas visibilidad.
                <Link href="/planes" className="text-amber-400 hover:underline ml-1">
                  Upgrade a PRO →
                </Link>
              </p>
            ) : (
              <p className="text-xxs font-terminal text-zinc-600">
                Analytics avanzados disponibles con tu plan PRO.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Consignataria */}
      {consignataria && (
        <div className="terminal-panel">
          <div className="terminal-panel-header flex items-center justify-between">
            <span className="text-zinc-200 text-label tracking-widest">MI CONSIGNATARIA</span>
            {consignataria.verified && (
              <span className="text-xxs font-terminal px-1.5 py-0.5 border border-positive/30 text-positive rounded-terminal">
                VERIFICADA
              </span>
            )}
          </div>
          <div className="px-panel py-3 space-y-2">
            <div className="text-data font-terminal text-zinc-200">
              {consignataria.display_name}
            </div>
            <Link
              href={`/consignatarias/${consignataria.canonical_slug}`}
              className="text-xxs text-accent font-terminal hover:underline"
            >
              Ver perfil público →
            </Link>
          </div>
        </div>
      )}

      {/* Edit Profile */}
      {consignataria && consignataria.verified && (
        <ProfileEditForm
          slug={consignataria.canonical_slug}
          initial={{
            phone: consignataria.phone || '',
            email: consignataria.email || '',
            website: consignataria.website || '',
            description: consignataria.description || '',
            whatsapp: consignataria.whatsapp || '',
          }}
        />
      )}

      {/* Upcoming auctions */}
      {auctions.length > 0 && (
        <div className="terminal-panel">
          <div className="terminal-panel-header flex items-center justify-between">
            <span className="text-zinc-200 text-label tracking-widest">PRÓXIMOS REMATES</span>
            <span className="text-xxs text-zinc-600 font-terminal">{auctions.length}</span>
          </div>
          <div className="divide-y divide-terminal-border">
            {auctions.map((a, i) => (
              <div key={i} className="px-panel py-2 flex items-center gap-4">
                <span className="text-xxs font-terminal text-zinc-500 tabular-nums w-12 flex-shrink-0">
                  {formatDate(a.date)}
                </span>
                {a.time && (
                  <span className="text-xxs font-terminal text-zinc-600 w-12 flex-shrink-0">
                    {a.time}
                  </span>
                )}
                <span className="text-data font-terminal text-zinc-300 flex-1 truncate">
                  {a.title}
                </span>
                <span className="text-xxs font-terminal text-zinc-600 hidden sm:inline">
                  {a.location}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Auction results */}
      {consignataria && (
        <div className="terminal-panel">
          <div className="terminal-panel-header flex items-center justify-between">
            <span className="text-zinc-200 text-label tracking-widest">RESULTADOS</span>
            <Link
              href="/dashboard/resultados/nuevo"
              className="text-xxs font-terminal text-accent hover:underline"
            >
              Cargar resultado →
            </Link>
          </div>
          {auctionResults.length > 0 ? (
            <div className="divide-y divide-terminal-border">
              {auctionResults.map(r => (
                <div key={r.id} className="px-panel py-2 flex items-center gap-4">
                  <span className="text-xxs font-terminal text-zinc-500 tabular-nums w-12 flex-shrink-0">
                    {formatDate(r.auction_date)}
                  </span>
                  <span className="text-data font-terminal text-zinc-300 flex-1 truncate">
                    {r.auction_title}
                  </span>
                  {r.total_heads_sold != null && (
                    <span className="text-xxs font-terminal text-zinc-500 hidden sm:inline">
                      {r.total_heads_sold} cab.
                    </span>
                  )}
                  {r.average_price != null && (
                    <span className="text-xxs font-terminal text-positive tabular-nums">
                      ${Number(r.average_price).toLocaleString('es-AR')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="px-panel py-3">
              <span className="text-xxs font-terminal text-zinc-600">
                No hay resultados cargados. Subí los resultados de tus remates completados.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Claims status */}
      {claims.length > 0 && (
        <div className="terminal-panel">
          <div className="terminal-panel-header">
            <span className="text-zinc-200 text-label tracking-widest">MIS SOLICITUDES</span>
          </div>
          <div className="divide-y divide-terminal-border">
            {claims.map(claim => (
              <div key={claim.id} className="px-panel py-2 flex items-center gap-4">
                <span className="text-data font-terminal text-zinc-300 flex-1">
                  {claim.consignatarias?.display_name || claim.consignataria_slug}
                </span>
                <span className={`text-xxs font-terminal px-1.5 py-0.5 border rounded-terminal ${
                  claim.status === 'pending'
                    ? 'border-warning/30 text-warning'
                    : claim.status === 'approved'
                    ? 'border-positive/30 text-positive'
                    : 'border-negative/30 text-negative'
                }`}>
                  {claim.status === 'pending' ? 'PENDIENTE'
                    : claim.status === 'approved' ? 'APROBADA'
                    : 'RECHAZADA'}
                </span>
                <span className="text-xxs font-terminal text-zinc-600">
                  {formatDate(claim.created_at.slice(0, 10))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Frigorifico */}
      {frigorifico && (
        <div className="terminal-panel">
          <div className="terminal-panel-header flex items-center justify-between">
            <span className="text-zinc-200 text-label tracking-widest">MI FRIGORIFICO</span>
            {frigorifico.verified && (
              <span className="text-xxs font-terminal px-1.5 py-0.5 border border-positive/30 text-positive rounded-terminal">
                VERIFICADO
              </span>
            )}
          </div>
          <div className="px-panel py-3 space-y-2">
            <div className="text-data font-terminal text-zinc-200">
              {frigorifico.display_name}
            </div>
            <Link
              href={`/frigorificos/${frigorifico.cuit}`}
              className="text-xxs text-accent font-terminal hover:underline"
            >
              Ver perfil publico →
            </Link>
          </div>
        </div>
      )}

      {/* Frigorifico Edit Profile */}
      {frigorifico && frigorifico.verified && (
        <FrigorificoEditForm
          cuit={frigorifico.cuit}
          initial={{
            phone: frigorifico.phone || '',
            email: frigorifico.email || '',
            website: frigorifico.website || '',
            description: frigorifico.description || '',
          }}
        />
      )}

      {/* Frigorifico claims status */}
      {frigoClaims.length > 0 && (
        <div className="terminal-panel">
          <div className="terminal-panel-header">
            <span className="text-zinc-200 text-label tracking-widest">MIS SOLICITUDES (FRIGORIFICOS)</span>
          </div>
          <div className="divide-y divide-terminal-border">
            {frigoClaims.map(claim => (
              <div key={claim.id} className="px-panel py-2 flex items-center gap-4">
                <span className="text-data font-terminal text-zinc-300 flex-1">
                  {claim.frigorifico_name}
                </span>
                <span className={`text-xxs font-terminal px-1.5 py-0.5 border rounded-terminal ${
                  claim.status === 'pending'
                    ? 'border-warning/30 text-warning'
                    : claim.status === 'approved'
                    ? 'border-positive/30 text-positive'
                    : 'border-negative/30 text-negative'
                }`}>
                  {claim.status === 'pending' ? 'PENDIENTE'
                    : claim.status === 'approved' ? 'APROBADA'
                    : 'RECHAZADA'}
                </span>
                <span className="text-xxs font-terminal text-zinc-600">
                  {formatDate(claim.created_at.slice(0, 10))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No consignataria and no frigorifico */}
      {!consignataria && !frigorifico && claims.length === 0 && frigoClaims.length === 0 && (
        <div className="terminal-panel">
          <div className="px-panel py-6 text-center space-y-2">
            <p className="text-zinc-500 text-data font-terminal">
              No tenes un perfil verificado.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link
                href="/consignatarias"
                className="text-xxs text-accent font-terminal hover:underline"
              >
                Verificar consignataria →
              </Link>
              <Link
                href="/frigorificos"
                className="text-xxs text-accent font-terminal hover:underline"
              >
                Verificar frigorifico →
              </Link>
            </div>
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
  initial: {
    phone: string
    email: string
    website: string
    description: string
    whatsapp: string
  }
}

function ProfileEditForm({ slug, initial }: ProfileEditFormProps) {
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)

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

      setFeedback({ type: 'ok', msg: 'Perfil actualizado' })
    } catch {
      setFeedback({ type: 'err', msg: 'Error de conexion' })
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'w-full bg-terminal-bg border border-terminal-border text-zinc-200 text-xxs font-terminal px-2 py-1.5 rounded-terminal focus:outline-none focus:border-accent transition-colors'

  return (
    <div className="terminal-panel">
      <div className="terminal-panel-header">
        <span className="text-zinc-200 text-label tracking-widest">EDITAR PERFIL</span>
      </div>
      <form onSubmit={handleSubmit} className="px-panel py-3 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xxs text-zinc-600 uppercase font-terminal block mb-1">Telefono</label>
            <input
              type="text"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              className={inputClass}
              placeholder="+54 11 1234-5678"
            />
          </div>
          <div>
            <label className="text-xxs text-zinc-600 uppercase font-terminal block mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className={inputClass}
              placeholder="contacto@ejemplo.com"
            />
          </div>
          <div>
            <label className="text-xxs text-zinc-600 uppercase font-terminal block mb-1">Sitio web</label>
            <input
              type="text"
              value={form.website}
              onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
              className={inputClass}
              placeholder="https://ejemplo.com"
            />
          </div>
          <div>
            <label className="text-xxs text-zinc-600 uppercase font-terminal block mb-1">WhatsApp</label>
            <input
              type="text"
              value={form.whatsapp}
              onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))}
              className={inputClass}
              placeholder="+54 11 1234-5678"
            />
          </div>
        </div>
        <div>
          <label className="text-xxs text-zinc-600 uppercase font-terminal block mb-1">Descripcion</label>
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            className={`${inputClass} resize-none`}
            rows={3}
            maxLength={1000}
            placeholder="Breve descripcion de la consignataria..."
          />
          <span className="text-[10px] text-zinc-700 font-terminal">{form.description.length}/1000</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-1.5 bg-accent/10 border border-accent/30 text-accent text-xxs font-terminal uppercase tracking-wider hover:bg-accent/20 transition-colors disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
          {feedback && (
            <span className={`text-xxs font-terminal ${feedback.type === 'ok' ? 'text-positive' : 'text-negative'}`}>
              {feedback.msg}
            </span>
          )}
        </div>
      </form>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  FRIGORIFICO EDIT FORM                                               */
/* ------------------------------------------------------------------ */

interface FrigorificoEditFormProps {
  cuit: string
  initial: {
    phone: string
    email: string
    website: string
    description: string
  }
}

function FrigorificoEditForm({ cuit, initial }: FrigorificoEditFormProps) {
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setFeedback(null)

    try {
      const res = await fetch(`/api/frigorificos/${cuit}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const data = await res.json()
        setFeedback({ type: 'err', msg: data.error || 'Error al guardar' })
        return
      }

      setFeedback({ type: 'ok', msg: 'Perfil actualizado' })
    } catch {
      setFeedback({ type: 'err', msg: 'Error de conexion' })
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'w-full bg-terminal-bg border border-terminal-border text-zinc-200 text-xxs font-terminal px-2 py-1.5 rounded-terminal focus:outline-none focus:border-accent transition-colors'

  return (
    <div className="terminal-panel">
      <div className="terminal-panel-header">
        <span className="text-zinc-200 text-label tracking-widest">EDITAR FRIGORIFICO</span>
      </div>
      <form onSubmit={handleSubmit} className="px-panel py-3 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xxs text-zinc-600 uppercase font-terminal block mb-1">Telefono</label>
            <input
              type="text"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              className={inputClass}
              placeholder="+54 11 1234-5678"
            />
          </div>
          <div>
            <label className="text-xxs text-zinc-600 uppercase font-terminal block mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className={inputClass}
              placeholder="contacto@ejemplo.com"
            />
          </div>
          <div>
            <label className="text-xxs text-zinc-600 uppercase font-terminal block mb-1">Sitio web</label>
            <input
              type="text"
              value={form.website}
              onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
              className={inputClass}
              placeholder="https://ejemplo.com"
            />
          </div>
        </div>
        <div>
          <label className="text-xxs text-zinc-600 uppercase font-terminal block mb-1">Descripcion</label>
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            className={`${inputClass} resize-none`}
            rows={3}
            maxLength={1000}
            placeholder="Breve descripcion del frigorifico..."
          />
          <span className="text-[10px] text-zinc-700 font-terminal">{form.description.length}/1000</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-1.5 bg-accent/10 border border-accent/30 text-accent text-xxs font-terminal uppercase tracking-wider hover:bg-accent/20 transition-colors disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
          {feedback && (
            <span className={`text-xxs font-terminal ${feedback.type === 'ok' ? 'text-positive' : 'text-negative'}`}>
              {feedback.msg}
            </span>
          )}
        </div>
      </form>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  SUBSCRIPTION PANEL                                                  */
/* ------------------------------------------------------------------ */

interface SubscriptionPanelProps {
  tier: 'FREE' | 'PRO' | 'ENTERPRISE'
  subscription: Subscription | null
}

function SubscriptionPanel({ tier, subscription }: SubscriptionPanelProps) {
  const [cancelling, setCancelling] = useState(false)
  const [cancelFeedback, setCancelFeedback] = useState<string | null>(null)
  const [cancelled, setCancelled] = useState(false)

  async function handleCancel() {
    if (!confirm('Estas seguro que queres cancelar tu suscripcion? Tu plan seguira activo hasta el fin del periodo actual.')) {
      return
    }

    setCancelling(true)
    setCancelFeedback(null)

    try {
      const res = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
      })

      if (!res.ok) {
        const data = await res.json()
        setCancelFeedback(data.error || 'Error al cancelar')
        return
      }

      setCancelled(true)
      setCancelFeedback('Suscripcion cancelada. Tu plan sigue activo hasta el fin del periodo.')
    } catch {
      setCancelFeedback('Error de conexion')
    } finally {
      setCancelling(false)
    }
  }

  const badgeColors = {
    FREE: 'border-zinc-600/30 text-zinc-500',
    PRO: 'border-amber-500/30 text-amber-400',
    ENTERPRISE: 'border-purple-500/30 text-purple-400',
  }

  return (
    <div className="terminal-panel">
      <div className="terminal-panel-header flex items-center justify-between">
        <span className="text-zinc-200 text-label tracking-widest">MI PLAN</span>
        <span className={`text-xxs font-terminal px-1.5 py-0.5 border rounded-terminal ${badgeColors[tier]}`}>
          {tier}
        </span>
      </div>
      <div className="px-panel py-3 space-y-3">
        {subscription && (tier === 'PRO' || tier === 'ENTERPRISE') ? (
          <>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xxs text-zinc-600 uppercase font-terminal">Estado:</span>
                <span className={`text-xxs font-terminal ${
                  subscription.status === 'active' ? 'text-positive' : 'text-warning'
                }`}>
                  {subscription.status === 'active' ? 'ACTIVA' : 'PAGO PENDIENTE'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xxs text-zinc-600 uppercase font-terminal">Proximo vencimiento:</span>
                <span className="text-xxs font-terminal text-zinc-300 tabular-nums">
                  {formatDate(subscription.current_period_end.slice(0, 10))}
                </span>
              </div>
            </div>
            {!cancelled && (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="text-xxs font-terminal text-zinc-600 hover:text-negative transition-colors disabled:opacity-50"
                >
                  {cancelling ? 'Cancelando...' : 'Cancelar suscripcion'}
                </button>
                {cancelFeedback && (
                  <span className="text-xxs font-terminal text-zinc-500">{cancelFeedback}</span>
                )}
              </div>
            )}
            {cancelled && cancelFeedback && (
              <span className="text-xxs font-terminal text-zinc-500">{cancelFeedback}</span>
            )}
          </>
        ) : (
          <div className="space-y-2">
            <p className="text-xxs font-terminal text-zinc-500">
              Destaca tu perfil, analytics completos, soporte prioritario.
            </p>
            <Link
              href="/planes"
              className="inline-block px-4 py-1.5 bg-amber-400/10 border border-amber-500/30 text-amber-400 text-xxs font-terminal uppercase tracking-wider hover:bg-amber-400/20 transition-colors"
            >
              Upgrade a PRO →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
