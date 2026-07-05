'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface IntelFirm {
  slug: string
  display_name: string
  cuit: string | null
  en_mag: boolean
  cabezas: number
  precio_prom: number | null
}
interface IntelResp {
  tier: string
  maxFirms: number
  days: number
  watchlist: IntelFirm[]
}

const fmt = (n: number) => n.toLocaleString('es-AR')

/**
 * Intel de mercado — el usuario sigue hasta N consignatarias y compara su
 * actividad (cabezas + precio) en el MAG de Cañuelas (mercado de referencia).
 * Free sigue 3; PRO sigue 20 + histórico. Es "lo que operan los OTROS".
 */
export default function MarketIntelPanel() {
  const [data, setData] = useState<IntelResp | null>(null)
  const [days, setDays] = useState(30)
  const [firms, setFirms] = useState<Array<{ slug: string; name: string }>>([])
  const [pick, setPick] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (d: number) => {
    const r = await fetch(`/api/market-intel?days=${d}`)
    if (r.ok) setData(await r.json())
    setLoading(false)
  }, [])

  useEffect(() => {
    load(days)
  }, [days, load])

  useEffect(() => {
    fetch('/api/consignatarias/ranking')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const list = (j?.ranking || j?.consignatarias || j?.items || []) as Array<{ slug: string; name: string }>
        if (Array.isArray(list)) setFirms(list.filter((f) => f.slug && f.name))
      })
      .catch(() => {})
  }, [])

  const add = async () => {
    if (!pick) return
    setMsg('')
    const r = await fetch('/api/market-intel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: pick }),
    })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) {
      setMsg(j.message || 'No se pudo agregar.')
      return
    }
    setPick('')
    load(days)
  }

  const remove = async (slug: string) => {
    await fetch(`/api/market-intel?slug=${encodeURIComponent(slug)}`, { method: 'DELETE' })
    load(days)
  }

  const wl = data?.watchlist ?? []
  const atLimit = data ? wl.length >= data.maxFirms : false
  const followed = new Set(wl.map((w) => w.slug))
  const options = firms.filter((f) => !followed.has(f.slug))

  return (
    <div className="terminal-panel">
      <div
        className="terminal-panel-header flex items-center justify-between"
        style={{ color: '#38bdf8', borderBottomColor: 'rgba(56,189,248,0.25)' }}
      >
        <span>Intel de mercado · seguí a la competencia</span>
        <div className="flex gap-1">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`text-xxs font-terminal px-1.5 py-0.5 rounded-[2px] ${days === d ? 'text-sky-300 border border-sky-500/40' : 'text-zinc-500'}`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>
      <div className="px-panel py-4">
        <p className="text-zinc-500 text-xxs leading-relaxed mb-3">
          Seguí cuántas cabezas y a qué precio operaron otras firmas en el{' '}
          <span className="text-zinc-300">MAG de Cañuelas</span> (el mercado que fija la referencia). No incluye
          ferias del interior ni venta directa.
        </p>

        {loading ? (
          <p className="text-zinc-600 text-xxs">Cargando…</p>
        ) : wl.length === 0 ? (
          <p className="text-zinc-600 text-xxs mb-3">Todavía no seguís ninguna firma. Agregá abajo para empezar.</p>
        ) : (
          <div className="space-y-1.5 mb-3">
            {wl.map((f) => (
              <div key={f.slug} className="flex items-center justify-between border-b border-terminal-border pb-1.5">
                <div className="min-w-0">
                  <div className="text-zinc-200 text-data truncate">{f.display_name}</div>
                  {!f.en_mag && <div className="text-zinc-600 text-xxs">opera fuera de Cañuelas — sin dato transaccional</div>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-sky-300 font-terminal tabular-nums text-data">
                      {fmt(f.cabezas)} <span className="text-zinc-600 text-xxs">cab</span>
                    </div>
                    {f.precio_prom && (
                      <div className="text-zinc-500 text-xxs tabular-nums">${fmt(f.precio_prom)}/kg prom</div>
                    )}
                  </div>
                  <button onClick={() => remove(f.slug)} className="text-zinc-600 hover:text-red-400 text-sm leading-none" title="Dejar de seguir">
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {atLimit ? (
          <div className="mt-2 rounded-[2px] border border-sky-500/30 bg-sky-500/[0.04] px-3 py-2">
            <p className="text-zinc-300 text-xxs">
              {data?.tier === 'pro'
                ? `Seguís el máximo de ${data?.maxFirms} firmas.`
                : `Seguís ${data?.maxFirms} firmas (el máximo del plan free).`}
            </p>
            {data?.tier !== 'pro' && (
              <Link href="/planes" className="text-sky-300 text-xxs hover:underline">
                Con PRO seguí hasta 20 firmas + histórico + alertas →
              </Link>
            )}
          </div>
        ) : (
          <div className="flex gap-2 items-center">
            <select
              value={pick}
              onChange={(e) => setPick(e.target.value)}
              className="flex-1 bg-zinc-900 border border-terminal-border text-zinc-300 text-xxs font-terminal px-2 py-1 rounded-[2px]"
            >
              <option value="">Agregar una firma a seguir…</option>
              {options.map((f) => (
                <option key={f.slug} value={f.slug}>
                  {f.name}
                </option>
              ))}
            </select>
            <button
              onClick={add}
              disabled={!pick}
              className="terminal-btn text-xxs shrink-0 disabled:opacity-40"
              style={{ borderColor: 'rgba(56,189,248,0.5)', color: '#38bdf8' }}
            >
              + Seguir
            </button>
          </div>
        )}
        {msg && <p className="text-amber-400 text-xxs mt-2">{msg}</p>}
        {data && (
          <p className="text-zinc-600 text-xxs mt-2">
            {wl.length}/{data.maxFirms} firmas · {data.tier === 'pro' ? 'PRO' : 'free'}
          </p>
        )}
      </div>
    </div>
  )
}
