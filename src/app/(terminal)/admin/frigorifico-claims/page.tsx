'use client'

import { useState, useEffect, useCallback } from 'react'
import { METODOS_VERIFICACION, type MetodoVerificacion } from '@/lib/claims/aprobar'

interface FrigoClaim {
  id: string
  frigorifico_cuit: string
  frigorifico_name: string
  claimant_name: string | null
  claimant_email: string
  claimant_phone: string | null
  claimant_role: string | null
  status: string
  admin_notes: string | null
  created_at: string
}

type Tab = 'pending' | 'approved' | 'rejected' | 'all'

export default function AdminFrigorificoClaimsPage() {
  const [claims, setClaims] = useState<FrigoClaim[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('pending')
  const [actionError, setActionError] = useState('')
  // Aprobar a mano exige decir cómo se verificó la identidad (lo exige también la API).
  const [verif, setVerif] = useState<Record<string, MetodoVerificacion | ''>>({})

  const fetchClaims = useCallback(async (tab: Tab) => {
    setLoading(true)
    setActionError('')
    try {
      const res = await fetch(`/api/admin/frigorifico-claims?status=${tab}`)
      if (res.status === 401 || res.status === 403) {
        window.location.href = '/login'
        return
      }
      const data = await res.json()
      setClaims(data.claims || [])
    } catch {
      setActionError('Error de conexion')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchClaims(activeTab)
  }, [activeTab, fetchClaims])

  async function handleReview(id: string, status: 'approved' | 'rejected') {
    const notes = status === 'rejected' ? prompt('Motivo del rechazo (opcional):') ?? null : null
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/frigorifico-claims/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, admin_notes: notes || '', ...(status === 'approved' ? { verificacion: verif[id] } : {}) }),
      })
      if (!res.ok) {
        const data = await res.json()
        setActionError(data.error || 'Error')
      } else {
        const data = await res.json().catch(() => ({}))
        if (data.advertencia) setActionError(data.advertencia)
        else if (data.aviso_enviado === false) setActionError('Aprobado, pero el mail de aviso no salió: avisale a mano.')
        fetchClaims(activeTab)
      }
    } catch {
      setActionError('Error de conexion')
    } finally {
      setLoading(false)
    }
  }

  function formatCuit(cuit: string): string {
    if (cuit.length === 11) {
      return `${cuit.slice(0, 2)}-${cuit.slice(2, 10)}-${cuit.slice(10)}`
    }
    return cuit
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'pending', label: 'Pendientes' },
    { key: 'approved', label: 'Aprobados' },
    { key: 'rejected', label: 'Rechazados' },
    { key: 'all', label: 'Todos' },
  ]

  return (
    <div className="space-y-0">
      <div className="terminal-panel">
        <div className="terminal-panel-header flex items-center justify-between">
          <span className="text-zinc-200 text-label tracking-widest">ADMIN — FRIGORIFICOS</span>
          <span className="text-xxs text-zinc-500 font-terminal">{claims.length} resultado(s)</span>
        </div>

        {/* Tabs */}
        <div className="border-b border-terminal-border px-panel py-1.5 flex items-center gap-4">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`text-xxs font-terminal uppercase tracking-wider transition-colors ${
                activeTab === tab.key ? 'text-accent' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {actionError && (
          <div className="px-panel py-2 border-b border-negative/30">
            <span className="text-negative text-data font-terminal">{actionError}</span>
          </div>
        )}

        {loading ? (
          <div className="px-panel py-8 text-center">
            <span className="text-zinc-500 text-data font-terminal">Cargando...</span>
          </div>
        ) : claims.length === 0 ? (
          <div className="px-panel py-8 text-center">
            <span className="text-zinc-500 text-data font-terminal">No hay solicitudes</span>
          </div>
        ) : (
          <div className="divide-y divide-terminal-border">
            {claims.map(claim => (
              <div key={claim.id} className="px-panel py-3 space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-data font-terminal text-zinc-200">
                        {claim.frigorifico_name}
                      </span>
                      <span className={`text-xxs font-terminal px-1.5 py-0.5 border rounded-terminal ${
                        claim.status === 'pending'
                          ? 'border-warning/30 text-warning'
                          : claim.status === 'approved'
                          ? 'border-positive/30 text-positive'
                          : 'border-negative/30 text-negative'
                      }`}>
                        {claim.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-xxs text-zinc-500 font-terminal mt-1 space-x-3">
                      <span>{claim.claimant_email}</span>
                      {claim.claimant_name && <span>{claim.claimant_name}</span>}
                      <span>CUIT: {formatCuit(claim.frigorifico_cuit)}</span>
                      {claim.claimant_phone && <span>Tel: {claim.claimant_phone}</span>}
                      {claim.claimant_role && <span>Rol: {claim.claimant_role}</span>}
                    </div>
                    <div className="text-xxs text-zinc-500 font-terminal mt-0.5">
                      {new Date(claim.created_at).toLocaleString('es-AR')}
                    </div>
                    {claim.admin_notes && (
                      <div className="text-xxs text-zinc-500 font-terminal mt-1 italic">
                        Nota: {claim.admin_notes}
                      </div>
                    )}
                  </div>

                  {claim.status === 'pending' && (
                    <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                      <label className="sr-only" htmlFor={`verif-${claim.id}`}>Cómo se verificó la identidad</label>
                      <select
                        id={`verif-${claim.id}`}
                        value={verif[claim.id] ?? ''}
                        onChange={(e) => setVerif((v) => ({ ...v, [claim.id]: e.target.value as MetodoVerificacion | '' }))}
                        className="max-w-[220px] bg-terminal-panel border border-terminal-border text-xxs font-terminal text-zinc-300 px-2 py-1.5 rounded-terminal"
                      >
                        <option value="">¿Cómo verificaste la identidad?</option>
                        {(Object.keys(METODOS_VERIFICACION) as MetodoVerificacion[]).map((m) => (
                          <option key={m} value={m}>{METODOS_VERIFICACION[m]}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleReview(claim.id, 'approved')}
                        disabled={!verif[claim.id]}
                        title={verif[claim.id] ? undefined : 'Elegí primero cómo verificaste la identidad'}
                        className="px-3 py-1.5 bg-positive/10 border border-positive/30 text-positive text-xxs font-terminal uppercase tracking-wider hover:bg-positive/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Aprobar
                      </button>
                      <button
                        onClick={() => handleReview(claim.id, 'rejected')}
                        className="px-3 py-1.5 bg-negative/10 border border-negative/30 text-negative text-xxs font-terminal uppercase tracking-wider hover:bg-negative/20 transition-colors"
                      >
                        Rechazar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
