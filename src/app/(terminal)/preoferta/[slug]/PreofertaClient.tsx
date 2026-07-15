'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Preoferta } from '@/lib/data/preofertas'

/** Formatea un ISO a "vie 17-jul 14:00" (es-AR, corto). */
function fmtFecha(iso: string): string {
  const d = new Date(iso)
  const dias = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${dias[d.getDay()]} ${d.getDate()}-${meses[d.getMonth()]} ${hh}:${mm}`
}

const fmt = (n: number) => '$ ' + n.toLocaleString('es-AR')
/** Precio por kilo — el lenguaje del ICP (piensa en $/kg, no en total). */
const porKilo = (monto: number, peso?: string) => {
  const p = peso ? parseInt(peso.replace(/\D/g, ''), 10) : 0
  return p > 0 ? '$ ' + Math.round(monto / p).toLocaleString('es-AR') + '/kg' : null
}

export default function PreofertaClient({
  remate,
  valoresIniciales,
  interes,
  userEmail,
  serverNow,
}: {
  remate: Preoferta
  valoresIniciales: Record<string, number>
  interes: Record<string, number>
  userEmail: string | null
  serverNow: number
}) {
  const [valores, setValores] = useState<Record<string, number>>(valoresIniciales)
  const [sel, setSel] = useState<string | null>(remate.lotes[0]?.rp ?? null)
  const cierre = useMemo(() => new Date(remate.cierre_preoferta).getTime(), [remate.cierre_preoferta])
  const [ahora, setAhora] = useState<number>(serverNow) // hora del server → SSR y cliente coinciden
  const abierta = ahora < cierre

  useEffect(() => {
    setAhora(Date.now())
    const t = setInterval(() => setAhora(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  // refresco de valores cada 15s
  const refresh = useCallback(async () => {
    try {
      const r = await fetch(`/api/preoferta/bid?remate=${encodeURIComponent(remate.slug)}`, { cache: 'no-store' })
      if (r.ok) { const j = await r.json(); setValores(j.valores ?? {}) }
    } catch { /* noop */ }
  }, [])
  useEffect(() => {
    const t = setInterval(refresh, 15000)
    return () => clearInterval(t)
  }, [refresh])

  const baseDe = (rp: string) => remate.lotes.find((l) => l.rp === rp)?.base ?? remate.base
  const valorDe = (rp: string) => valores[rp] ?? baseDe(rp)
  const lote = remate.lotes.find((l) => l.rp === sel) ?? null

  const restante = Math.max(0, cierre - ahora)
  const dd = Math.floor(restante / 864e5)
  const hh = Math.floor((restante % 864e5) / 36e5)
  const mm = Math.floor((restante % 36e5) / 6e4)

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-6">
      {/* Cabecera */}
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <span className="text-xxs font-terminal uppercase tracking-widest px-2 py-0.5 rounded bg-amber-400/15 text-amber-300 border border-amber-500/40">
          Prueba interna · ofertas no vinculantes
        </span>
        {abierta ? (
          <span className="text-xxs font-terminal uppercase tracking-widest px-2 py-0.5 rounded bg-positive/15 text-positive border border-positive/40 inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-positive animate-pulse" /> Pre-oferta abierta
          </span>
        ) : (
          <span className="text-xxs font-terminal uppercase tracking-widest px-2 py-0.5 rounded bg-zinc-700/40 text-zinc-400 border border-zinc-600">
            Pre-oferta cerrada
          </span>
        )}
      </div>
      <h1 className="text-2xl md:text-3xl font-heading text-zinc-100 leading-tight">{remate.remate}</h1>
      <p className="text-zinc-400 text-data mt-1">
        {remate.consignataria} · {remate.lugar} · Remate {fmtFecha(remate.fecha)}
      </p>
      <p className="text-zinc-500 text-xs mt-1">
        {abierta
          ? <>Cierra en <b className="text-zinc-200 tabular-nums">{dd}d {String(hh).padStart(2, '0')}h {String(mm).padStart(2, '0')}m</b> · {fmtFecha(remate.cierre_preoferta)}</>
          : <>Cerró el {fmtFecha(remate.cierre_preoferta)}</>}
        {' · '}{remate.lotes.length} lotes con video
      </p>
      {(() => {
        const totalInt = Object.values(interes).reduce((a, b) => a + b, 0)
        const lotesInt = Object.keys(interes).length
        return (
          <p className="text-xxs font-terminal uppercase tracking-widest text-zinc-600 mt-1.5">
            El remate, medido ·{' '}
            {totalInt > 0
              ? <><b className="text-positive">{totalInt}</b> {totalInt === 1 ? 'interesado' : 'interesados'} en {lotesInt} {lotesInt === 1 ? 'lote' : 'lotes'}</>
              : <span>demanda por lote en vivo</span>}
          </p>
        )
      })()}

      <div className="grid lg:grid-cols-[1fr_360px] gap-5 mt-5">
        {/* ── Detalle del lote seleccionado ── */}
        <div>
          {lote && (
            <div className="terminal-panel rounded-xl overflow-hidden border border-terminal-border">
              <div className="relative bg-black" style={{ aspectRatio: '16 / 9' }}>
                <iframe
                  key={lote.rp}
                  src={`https://www.youtube.com/embed/${lote.video}`}
                  title={`Lote ${lote.lote} · RP ${lote.rp}`}
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <div className="p-4 sm:p-5">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-positive font-terminal text-sm font-bold">LOTE {lote.lote}</span>
                  <span className="text-zinc-500 text-xs">Corral {lote.corral} · RP {lote.rp}</span>
                </div>
                {lote.fn && (
                  <p className="text-zinc-400 text-sm mt-1.5">
                    Nac. {lote.fn} · Reg. {lote.reg} · C.E. {lote.ce} · Peso {lote.peso} kg
                    {lote.padre ? <> · Padre <b className="text-zinc-200">{lote.padre}</b></> : null}
                    {lote.madre ? <> · Madre <b className="text-zinc-200">{lote.madre}</b></> : null}
                  </p>
                )}

                {/* ── $/kilo (lenguaje del ICP) + argumento genético + observabilidad ── */}
                <div className="mt-3 grid sm:grid-cols-[auto_1fr] gap-3 items-center">
                  {porKilo(valorDe(lote.rp), lote.peso) && (
                    <div className="rounded-lg border border-terminal-border bg-black/30 px-3.5 py-2 text-center shrink-0">
                      <div className="text-xxs font-terminal uppercase tracking-wider text-zinc-500">Queda a</div>
                      <div className="font-mono font-bold text-xl text-zinc-100 tabular-nums leading-none">{porKilo(valorDe(lote.rp), lote.peso)}</div>
                      <div className="text-xxs text-zinc-600">sobre {lote.peso} kg</div>
                    </div>
                  )}
                  <p className="text-sm text-zinc-300 leading-snug">
                    No comprás kilos: comprás la genética que <b className="text-zinc-100">se los pone a tu rodeo</b>.
                    {lote.ce && parseFloat(String(lote.ce).replace(',', '.')) >= 34
                      ? <> C.E. <b className="text-zinc-100">{lote.ce} cm</b> → alta fertilidad, más terneros por servicio.</>
                      : null}
                  </p>
                </div>

                {/* Observabilidad — demanda medida por lote */}
                <div className="mt-2 flex items-center gap-2 text-xxs">
                  <span className="inline-flex items-center gap-1.5 text-zinc-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-positive" />
                    {(interes[lote.rp] ?? 0) > 0
                      ? <><b className="text-zinc-200">{interes[lote.rp]}</b> {interes[lote.rp] === 1 ? 'productor interesado' : 'productores interesados'} en este lote</>
                      : <span className="text-zinc-600">Sé el primero en marcar interés en este lote</span>}
                  </span>
                </div>

                <OfertaWidget
                  remateSlug={remate.slug}
                  consignataria={remate.consignataria}
                  rp={lote.rp}
                  actual={valorDe(lote.rp)}
                  base={baseDe(lote.rp)}
                  tieneOfertas={valores[lote.rp] != null}
                  abierta={abierta}
                  userEmail={userEmail}
                  onNuevoValor={() => { /* el valor actual lo manda el espejo de elrural, no nuestra oferta */ }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Cartelera ── */}
        <div>
          <div className="text-xxs font-terminal uppercase tracking-widest text-zinc-500 mb-2">Cartelera · {remate.lotes.length} lotes</div>
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 max-h-[70vh] overflow-y-auto pr-1">
            {remate.lotes.map((l) => {
              const on = l.rp === sel
              return (
                <button
                  key={l.rp}
                  onClick={() => setSel(l.rp)}
                  className={`flex gap-2.5 items-center text-left rounded-lg border p-2 transition-colors ${on ? 'border-positive/60 bg-positive/[0.06]' : 'border-terminal-border hover:border-zinc-600 bg-black/20'}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`https://i.ytimg.com/vi/${l.video}/mqdefault.jpg`} alt="" className="w-20 h-12 object-cover rounded shrink-0 bg-zinc-800" loading="lazy" />
                  <div className="min-w-0">
                    <div className="text-zinc-200 text-sm font-semibold truncate">Lote {l.lote} · RP {l.rp}</div>
                    <div className="text-positive text-xs font-mono tabular-nums">
                      {porKilo(valorDe(l.rp), l.peso) ?? fmt(valorDe(l.rp))}
                    </div>
                    <div className="text-zinc-600 text-xxs">
                      {(interes[l.rp] ?? 0) > 0 ? `${interes[l.rp]} interesado${interes[l.rp] === 1 ? '' : 's'}` : `Corral ${l.corral}`}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function OfertaWidget({
  remateSlug, consignataria, rp, actual, base, tieneOfertas, abierta, userEmail, onNuevoValor,
}: {
  remateSlug: string; consignataria: string; rp: string; actual: number; base: number; tieneOfertas: boolean; abierta: boolean; userEmail: string | null;
  onNuevoValor: (v: number) => void
}) {
  const INC = 100_000
  const minimo = tieneOfertas ? actual + INC : base
  const [monto, setMonto] = useState<number>(minimo)
  const [nombre, setNombre] = useState('')
  const [cuit, setCuit] = useState('')
  const [telefono, setTelefono] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => { setMonto(minimo) }, [minimo, rp])
  useEffect(() => { setMsg(null); setOk(false) }, [rp])

  const cuitOk = cuit.replace(/\D/g, '').length === 11

  const ofertar = async () => {
    setMsg(null); setBusy(true)
    try {
      const r = await fetch('/api/preoferta/bid', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remate: remateSlug, lote_rp: rp, amount: monto, nombre, cuit, telefono }),
      })
      const j = await r.json()
      if (r.ok) { onNuevoValor(j.actual); setMonto(j.proximo); setOk(true); setMsg(`✓ Listo. ${consignataria} te contacta por este lote.`) }
      else if (j.needsAuth) setMsg('Ingresá para ofertar.')
      else { setMsg(j.error ?? 'No se pudo ofertar.'); if (j.actual) onNuevoValor(j.actual) }
    } catch { setMsg('Error de red.') }
    setBusy(false)
  }

  const inputCls = 'bg-zinc-900 border border-terminal-border rounded px-2.5 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 w-full'

  return (
    <div className="mt-4">
      {/* Valor actual + monto */}
      <div className="flex flex-col sm:flex-row rounded-lg overflow-hidden border border-terminal-border">
        <div className="bg-positive text-black px-4 py-3 flex flex-col justify-center sm:min-w-[170px]">
          <span className="text-xxs font-terminal font-bold tracking-widest opacity-80">VALOR ACTUAL · libro elrural</span>
          <span className="font-mono font-extrabold text-2xl leading-none tabular-nums whitespace-nowrap">{fmt(actual)}</span>
        </div>
        <div className="bg-black/30 px-3 py-2.5 flex-1 flex items-center gap-2">
          <button disabled={!abierta} onClick={() => setMonto((m) => Math.max(minimo, m - INC))} className="w-9 h-9 rounded border border-terminal-border text-zinc-300 font-bold disabled:opacity-40" aria-label="Bajar $100.000">«</button>
          <input
            inputMode="numeric" value={monto.toLocaleString('es-AR')}
            onChange={(e) => setMonto(parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)}
            disabled={!abierta}
            className="flex-1 min-w-0 bg-zinc-900 border border-terminal-border rounded px-2 py-2 text-center font-mono text-lg text-zinc-100 tabular-nums"
            aria-label="Su oferta"
          />
          <button disabled={!abierta} onClick={() => setMonto((m) => m + INC)} className="w-9 h-9 rounded border border-terminal-border text-zinc-300 font-bold disabled:opacity-40" aria-label="Subir $100.000">»</button>
        </div>
      </div>

      {userEmail ? (
        ok ? (
          <div className="mt-3 rounded-lg border border-positive/40 bg-positive/[0.07] p-3 text-sm text-zinc-200">
            ✓ Interés registrado en <b className="font-mono">{fmt(actual)}</b>. <b>{consignataria}</b> —consignataria del remate— te contacta por este lote. Podés marcar otro.
          </div>
        ) : (
          <>
            {/* Identidad del ofertante (para representarlo + informe) */}
            <div className="grid sm:grid-cols-3 gap-2 mt-3">
              <input className={inputCls} placeholder="Nombre y apellido / razón social" value={nombre} onChange={(e) => setNombre(e.target.value)} disabled={!abierta} />
              <input className={inputCls} placeholder="CUIT (11 dígitos)" inputMode="numeric" value={cuit} onChange={(e) => setCuit(e.target.value)} disabled={!abierta} />
              <input className={inputCls} placeholder="Teléfono de contacto" inputMode="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} disabled={!abierta} />
            </div>
            <button
              onClick={ofertar}
              disabled={!abierta || busy || monto < minimo || nombre.trim().length < 3 || !cuitOk || telefono.replace(/\D/g, '').length < 8}
              className="mt-2 w-full bg-negative hover:bg-red-700 disabled:opacity-50 text-white font-bold px-5 py-3 text-sm tracking-wide rounded-lg"
            >
              {busy ? 'Registrando…' : 'QUE ME CONTACTE REGGI POR ESTE LOTE →'}
            </button>
          </>
        )
      ) : (
        <a href="/cuenta" className="mt-3 block bg-negative hover:bg-red-700 text-white font-bold px-5 py-3 text-sm tracking-wide rounded-lg text-center">
          INGRESÁ PARA OFERTAR
        </a>
      )}

      <div className="flex items-center justify-between mt-1.5 text-xxs gap-2">
        <span className="text-zinc-500">
          Precio orientativo · base <b className="text-zinc-300 font-mono">{fmt(base)}</b>
        </span>
        {msg && !ok && <span className="text-amber-300 text-right">{msg}</span>}
      </div>
      {userEmail && !ok && (
        <p className="text-zinc-600 text-xxs mt-1">
          Te ponemos en contacto directo con {consignataria}, la consignataria del remate. El precio es orientativo: la operación se cierra con ellos. Prueba interna.
        </p>
      )}
    </div>
  )
}
