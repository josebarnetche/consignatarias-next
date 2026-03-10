'use client'

import { useState } from 'react'
import Link from 'next/link'
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

interface Props {
  email: string
  consignataria: Consignataria | null
  claims: Claim[]
  auctions: Auction[]
  auctionResults: AuctionResult[]
  viewCount: number
  completedFields: CompletedFields | null
}

function formatDate(d: string) {
  const [, m, day] = d.split('-')
  return `${day}/${m}`
}

export default function DashboardClient({ email, consignataria, claims, auctions, auctionResults, viewCount, completedFields }: Props) {
  const showChecklist = consignataria && completedFields && Object.values(completedFields).filter(Boolean).length < 5

  return (
    <div className="max-w-3xl mx-auto px-2 sm:px-4 py-4 space-y-4">
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
            <p className="text-xxs font-terminal text-zinc-600">
              Los perfiles PRO tienen analytics avanzados
            </p>
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

      {/* No consignataria */}
      {!consignataria && claims.length === 0 && (
        <div className="terminal-panel">
          <div className="px-panel py-6 text-center space-y-2">
            <p className="text-zinc-500 text-data font-terminal">
              No tenés una consignataria verificada.
            </p>
            <Link
              href="/consignatarias"
              className="text-xxs text-accent font-terminal hover:underline"
            >
              Buscá tu consignataria y solicitá la verificación →
            </Link>
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
