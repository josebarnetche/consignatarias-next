'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Preoferta } from '@/lib/data/preofertas'
import CondicionesRemate from '@/components/preoferta/CondicionesRemate'
import PanelGenetico from '@/components/preoferta/PanelGenetico'
import { localidadesCorrientes } from '@/lib/data/reggi-reps'

const LOCALIDADES = localidadesCorrientes()

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
const fmtCorto = (n: number) => n >= 1_000_000 ? `$ ${(n / 1_000_000).toLocaleString('es-AR', { maximumFractionDigits: 1 })}M` : fmt(n)

/** Ícono de ojo (viewship). */
function Ojo({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
    </svg>
  )
}

/** ID anónimo estable por navegador — para contar visitantes únicos sin cookies. */
function getVisitorId(): string {
  try {
    let v = localStorage.getItem('cnsg_vid')
    if (!v) {
      v = 'v-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
      localStorage.setItem('cnsg_vid', v)
    }
    return v
  } catch { return 'anon' }
}

export default function PreofertaClient({
  remate,
  valoresIniciales,
  interes,
  vistas,
  userEmail,
  serverNow,
  initialLote,
}: {
  remate: Preoferta
  valoresIniciales: Record<string, number>
  interes: Record<string, number>
  vistas: Record<string, number>
  userEmail: string | null
  serverNow: number
  initialLote?: string | null
}) {
  const [valores, setValores] = useState<Record<string, number>>(valoresIniciales)
  const [sel, setSel] = useState<string | null>(initialLote ?? remate.lotes[0]?.rp ?? null)
  const cierre = useMemo(() => new Date(remate.cierre_preoferta).getTime(), [remate.cierre_preoferta])
  const [ahora, setAhora] = useState<number>(serverNow) // hora del server → SSR y cliente coinciden
  const abierta = ahora < cierre
  const detalleRef = useRef<HTMLDivElement>(null)

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
  }, [remate.slug])
  useEffect(() => {
    const t = setInterval(refresh, 15000)
    return () => clearInterval(t)
  }, [refresh])

  // Observabilidad de viewship: vista de página (una vez) + vista por lote
  // (deduplicada por rp en esta sesión). Fire-and-forget.
  const vistoRef = useRef<Set<string>>(new Set())
  const registrarVista = useCallback((loteRp: string | null) => {
    const key = loteRp ?? '__page__'
    if (vistoRef.current.has(key)) return
    vistoRef.current.add(key)
    try {
      fetch('/api/preoferta/view', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
        body: JSON.stringify({ remate: remate.slug, lote_rp: loteRp, visitor: getVisitorId() }),
      }).catch(() => {})
    } catch { /* noop */ }
  }, [remate.slug])

  useEffect(() => { registrarVista(null) }, [registrarVista])       // vista de página
  useEffect(() => { if (sel) registrarVista(sel) }, [sel, registrarVista]) // vista de lote

  const baseDe = (rp: string) => remate.lotes.find((l) => l.rp === rp)?.base ?? remate.base
  const valorDe = (rp: string) => valores[rp] ?? baseDe(rp)
  const lote = remate.lotes.find((l) => l.rp === sel) ?? null

  // al elegir un lote en el strip mobile, subimos al detalle
  const elegir = (rp: string) => {
    setSel(rp)
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      requestAnimationFrame(() => detalleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    }
  }

  const restante = Math.max(0, cierre - ahora)
  const dd = Math.floor(restante / 864e5)
  const hh = Math.floor((restante % 864e5) / 36e5)
  const mm = Math.floor((restante % 36e5) / 6e4)
  const countdown = `${dd}d ${String(hh).padStart(2, '0')}h ${String(mm).padStart(2, '0')}m`

  const totalInt = Object.values(interes).reduce((a, b) => a + b, 0)
  const lotesInt = Object.keys(interes).length

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-5 sm:py-7">
      {/* ── Cabecera ── */}
      <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
        {abierta ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-positive/15 text-positive border border-positive/40">
            <span className="h-1.5 w-1.5 rounded-full bg-positive animate-pulse" /> Pre-oferta abierta · cierra en <span className="tabular-nums font-semibold">{countdown}</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-zinc-700/40 text-zinc-400 border border-zinc-600">
            Pre-oferta cerrada
          </span>
        )}
        <span className="text-[11px] px-2 py-1 rounded-full bg-amber-400/10 text-amber-300/90 border border-amber-500/30">Prueba interna · no vinculante</span>
      </div>

      <h1 className="text-[26px] leading-[1.1] sm:text-4xl font-heading text-zinc-50">{remate.remate}</h1>
      <p className="text-zinc-400 mt-1.5 text-sm sm:text-base">
        {remate.consignataria} · {remate.lugar}
      </p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-zinc-500">
        <span>Remate <b className="text-zinc-300 tabular-nums">{fmtFecha(remate.fecha)}</b></span>
        <span className="text-zinc-700">·</span>
        <span>{remate.lotes.length} lotes con video</span>
        {remate.martillero && <><span className="text-zinc-700">·</span><span>Martillero: {remate.martillero}</span></>}
        {totalInt > 0 && (
          <><span className="text-zinc-700">·</span>
          <span className="text-positive"><b>{totalInt}</b> {totalInt === 1 ? 'interesado' : 'interesados'} en {lotesInt} {lotesInt === 1 ? 'lote' : 'lotes'}</span></>
        )}
      </div>

      {/* ── Navegador de lotes (mobile): strip horizontal sticky ── */}
      <div className="lg:hidden sticky top-0 z-20 -mx-3 sm:-mx-4 px-3 sm:px-4 py-2 mt-4 bg-zinc-950/90 backdrop-blur-sm border-y border-terminal-border">
        <div className="flex gap-2 overflow-x-auto pb-0.5 -mb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {remate.lotes.map((l) => {
            const on = l.rp === sel
            return (
              <button
                key={l.rp}
                onClick={() => elegir(l.rp)}
                className={`relative shrink-0 w-[92px] rounded-lg border overflow-hidden text-left transition-colors ${on ? 'border-accent ring-1 ring-accent' : 'border-terminal-border'}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`https://i.ytimg.com/vi/${l.video}/mqdefault.jpg`} alt="" className="w-full h-[52px] object-cover bg-zinc-800" loading="lazy" />
                <div className={`px-1.5 py-1 ${on ? 'bg-accent/15' : 'bg-black/40'}`}>
                  <div className="text-[11px] font-semibold text-zinc-100 leading-none">Lote {l.lote}</div>
                  <div className="text-[10px] text-positive font-mono tabular-nums mt-0.5">{fmtCorto(valorDe(l.rp))}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-5 mt-4 lg:mt-6 items-start">
        {/* ── Detalle del lote ── */}
        <div ref={detalleRef} className="scroll-mt-[76px] lg:scroll-mt-0">
          {lote && (
            <div className="rounded-2xl overflow-hidden border border-terminal-border bg-black/20">
              <div className="relative bg-black" style={{ aspectRatio: '16 / 9' }}>
                <iframe
                  key={lote.rp}
                  src={`https://www.youtube-nocookie.com/embed/${lote.video}?rel=0&modestbranding=1&playsinline=1&iv_load_policy=3`}
                  title={`Lote ${lote.lote} · RP ${lote.rp}`}
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>

              <div className="p-4 sm:p-6">
                {/* Título del lote */}
                <div className="flex items-baseline gap-2.5 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-semibold text-zinc-50">Lote {lote.lote}</h2>
                  <span className="text-zinc-500 text-sm">Corral {lote.corral} · RP {lote.rp}</span>
                </div>
                {lote.fn && (
                  <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
                    Nac. {lote.fn} · Reg. {lote.reg} · C.E. {lote.ce} · Peso {lote.peso} kg
                    {lote.padre ? <> · Padre <b className="text-zinc-200">{lote.padre}</b></> : null}
                    {lote.madre ? <> · Madre <b className="text-zinc-200">{lote.madre}</b></> : null}
                  </p>
                )}

                {/* Demanda medida por lote */}
                <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  {(interes[lote.rp] ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-1.5 text-positive">
                      <span className="h-1.5 w-1.5 rounded-full bg-positive" />
                      <b>{interes[lote.rp]}</b> {interes[lote.rp] === 1 ? 'interesado' : 'interesados'}
                    </span>
                  )}
                  {(vistas[lote.rp] ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-1 text-zinc-500" title="Visitantes únicos que abrieron este lote">
                      <Ojo /> <b className="text-zinc-300">{vistas[lote.rp]}</b> {vistas[lote.rp] === 1 ? 'vio' : 'vieron'} este lote
                    </span>
                  )}
                  {(interes[lote.rp] ?? 0) === 0 && (vistas[lote.rp] ?? 0) === 0 && (
                    <span className="text-zinc-600">Sé el primero en marcar interés en este lote</span>
                  )}
                </div>

                {/* Pre-oferta (valor + acción) — lo primero accionable */}
                <OfertaWidget
                  remateSlug={remate.slug}
                  consignataria={remate.consignataria}
                  cabana={remate.cabana}
                  lote={lote.lote}
                  rp={lote.rp}
                  actual={valorDe(lote.rp)}
                  base={baseDe(lote.rp)}
                  tieneOfertas={valores[lote.rp] != null}
                  abierta={abierta}
                  userEmail={userEmail}
                  onNuevoValor={(v) => setValores((s) => ({ ...s, [lote.rp]: Math.max(v, s[lote.rp] ?? 0) }))}
                />

                {/* Argumento genético y condiciones — el respaldo */}
                <PanelGenetico lote={lote} lotes={remate.lotes} />
                <CondicionesRemate remate={remate} />
              </div>
            </div>
          )}
        </div>

        {/* ── Catálogo (desktop): sidebar vertical ── */}
        <aside className="hidden lg:block">
          <div className="sticky top-4">
            <div className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-2.5">Catálogo · {remate.lotes.length} lotes</div>
            <div className="flex flex-col gap-2 max-h-[calc(100vh-6rem)] overflow-y-auto pr-1">
              {remate.lotes.map((l) => {
                const on = l.rp === sel
                return (
                  <button
                    key={l.rp}
                    onClick={() => setSel(l.rp)}
                    className={`flex gap-3 items-center text-left rounded-xl border p-2 transition-colors ${on ? 'border-accent bg-accent/[0.06]' : 'border-terminal-border hover:border-zinc-600 bg-black/20'}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`https://i.ytimg.com/vi/${l.video}/mqdefault.jpg`} alt="" className="w-[72px] h-[44px] object-cover rounded-lg shrink-0 bg-zinc-800" loading="lazy" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-zinc-100 text-sm font-semibold truncate">Lote {l.lote}</span>
                        <span className="text-positive text-xs font-mono tabular-nums shrink-0">{fmtCorto(valorDe(l.rp))}</span>
                      </div>
                      <div className="text-zinc-500 text-[11px] flex items-center gap-x-2 flex-wrap mt-0.5">
                        {(interes[l.rp] ?? 0) > 0 && <span className="text-positive">{interes[l.rp]} interesado{interes[l.rp] === 1 ? '' : 's'}</span>}
                        {(vistas[l.rp] ?? 0) > 0 && <span className="inline-flex items-center gap-0.5"><Ojo className="w-3 h-3" />{vistas[l.rp]}</span>}
                        {(interes[l.rp] ?? 0) === 0 && (vistas[l.rp] ?? 0) === 0 && <span>Corral {l.corral} · RP {l.rp}</span>}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

function OfertaWidget({
  remateSlug, consignataria, cabana, lote, rp, actual, base, tieneOfertas, abierta, userEmail, onNuevoValor,
}: {
  remateSlug: string; consignataria: string; cabana: string; lote: string; rp: string; actual: number; base: number; tieneOfertas: boolean; abierta: boolean; userEmail: string | null;
  onNuevoValor: (v: number) => void
}) {
  const INC = 100_000
  const minimo = tieneOfertas ? actual + INC : base
  const [abierto, setAbierto] = useState(false)  // divulgación progresiva del formulario
  const [monto, setMonto] = useState<number>(minimo)
  const [nombre, setNombre] = useState('')
  const [cuit, setCuit] = useState('')
  const [telefono, setTelefono] = useState('')
  const [localidad, setLocalidad] = useState('')
  const [acepto, setAcepto] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => { setMonto(minimo) }, [minimo, rp])
  useEffect(() => { setMsg(null); setOk(false); setAbierto(false) }, [rp])

  const cuitOk = cuit.replace(/\D/g, '').length === 11

  const ofertar = async () => {
    setMsg(null); setBusy(true)
    try {
      const r = await fetch('/api/preoferta/bid', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remate: remateSlug, lote_rp: rp, amount: monto, nombre, cuit, telefono, localidad }),
      })
      const j = await r.json()
      if (r.ok) { onNuevoValor(j.actual); setMonto(j.proximo); setOk(true) }
      else if (j.needsAuth) setMsg('Ingresá para pre-ofertar.')
      else { setMsg(j.error ?? 'No se pudo registrar.'); if (j.actual) onNuevoValor(j.actual) }
    } catch { setMsg('Error de red.') }
    setBusy(false)
  }

  const inputCls = 'bg-zinc-900 border border-terminal-border rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 w-full focus:border-accent focus:outline-none'

  return (
    <div className="mt-4 rounded-2xl border border-terminal-border overflow-hidden">
      {/* Valor actual del lote */}
      <div className="bg-positive/[0.08] px-4 sm:px-5 py-3.5 border-b border-terminal-border flex items-end justify-between gap-3">
        <div>
          <div className="text-xs text-zinc-400">Valor actual del lote</div>
          <div className="font-mono font-extrabold text-3xl leading-none tabular-nums text-zinc-50 mt-1">{fmt(actual)}</div>
          <div className="text-[11px] text-zinc-500 mt-1">+ IVA · valor total del reproductor</div>
        </div>
        {tieneOfertas && <span className="text-[11px] text-positive whitespace-nowrap">actualizado en vivo</span>}
      </div>

      <div className="p-4 sm:p-5">
        {ok ? (
          <div className="rounded-xl border border-positive/40 bg-positive/[0.07] p-3.5 text-sm text-zinc-200">
            <div className="text-xs uppercase tracking-wider text-positive font-semibold mb-1">✓ Pre-oferta registrada</div>
            Pre-oferta de <b className="font-mono">{fmt(actual)}</b> por el Lote {lote}. Un asesor de <b>{consignataria}</b> te va a contactar para <b>validar tu CUIT</b>. Recién ahí queda firme.
          </div>
        ) : !abierta ? (
          <div className="rounded-xl border border-terminal-border bg-black/20 p-3.5 text-sm text-zinc-400 text-center">
            La pre-oferta de este remate está <b className="text-zinc-200">cerrada</b>. El valor mostrado es el último registrado.
          </div>
        ) : !userEmail ? (
          <>
            <p className="text-sm text-zinc-400 leading-snug mb-3">
              Manifestá interés serio por este reproductor. Te contactan para validar tu CUIT antes de que la pre-oferta quede firme.
            </p>
            <a href="/cuenta" className="block bg-accent hover:bg-accent-bright text-black font-semibold px-5 py-3.5 text-sm rounded-xl text-center transition-colors">
              Ingresá para pre-ofertar
            </a>
          </>
        ) : !abierto ? (
          <>
            <p className="text-sm text-zinc-400 leading-snug mb-3">
              Una pre-oferta es una <b className="text-zinc-200">manifestación seria de interés</b> sobre un reproductor registrado — no una compra en un clic. La operación se cierra con {consignataria}.
            </p>
            <button
              onClick={() => setAbierto(true)}
              disabled={!abierta}
              className="w-full bg-accent hover:bg-accent-bright disabled:opacity-40 text-black font-semibold px-5 py-3.5 text-sm rounded-xl transition-colors"
            >
              {abierta ? `Pre-ofertar por el Lote ${lote}` : 'Pre-oferta cerrada'}
            </button>
          </>
        ) : (
          <div className="space-y-3">
            {/* Tu pre-oferta */}
            <div>
              <label className="text-xs text-zinc-400">Tu pre-oferta <span className="text-zinc-600">(mínimo {fmt(minimo)})</span></label>
              <div className="flex items-center gap-2 mt-1">
                <button onClick={() => setMonto((m) => Math.max(minimo, m - INC))} className="w-11 h-11 rounded-lg border border-terminal-border text-zinc-300 text-lg font-bold shrink-0" aria-label="Bajar $100.000">−</button>
                <div className="relative flex-1 min-w-0">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-mono">$</span>
                  <input
                    inputMode="numeric" value={monto.toLocaleString('es-AR')}
                    onChange={(e) => setMonto(parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)}
                    className="w-full bg-zinc-900 border border-terminal-border rounded-lg pl-7 pr-3 py-2.5 text-center font-mono text-lg text-zinc-100 tabular-nums focus:border-accent focus:outline-none"
                    aria-label="Tu pre-oferta"
                  />
                </div>
                <button onClick={() => setMonto((m) => m + INC)} className="w-11 h-11 rounded-lg border border-terminal-border text-zinc-300 text-lg font-bold shrink-0" aria-label="Subir $100.000">+</button>
              </div>
            </div>

            {/* Identidad — para validar el CUIT */}
            <input className={inputCls} placeholder="Nombre y apellido / razón social" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input className={inputCls} placeholder="CUIT (11 dígitos)" inputMode="numeric" value={cuit} onChange={(e) => setCuit(e.target.value)} />
              <input className={inputCls} placeholder="Teléfono de contacto" inputMode="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
            </div>
            <select
              className={`${inputCls} ${localidad ? 'text-zinc-100' : 'text-zinc-500'}`}
              value={localidad} onChange={(e) => setLocalidad(e.target.value)} aria-label="Localidad (Corrientes)"
            >
              <option value="">¿Desde qué localidad consultás? (Corrientes)</option>
              {LOCALIDADES.map((l) => <option key={l} value={l} className="text-zinc-100 bg-zinc-900">{l}</option>)}
            </select>

            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-zinc-400 leading-snug">
              <input type="checkbox" checked={acepto} onChange={(e) => setAcepto(e.target.checked)} className="mt-0.5 h-4 w-4 accent-accent shrink-0" />
              <span>Acepto que {cabana} / {consignataria} me contacten para <b className="text-zinc-200">verificar mi relación con el CUIT ingresado</b>, y que la pre-oferta avanza recién con mi identidad validada.</span>
            </label>

            <button
              onClick={ofertar}
              disabled={!abierta || busy || !acepto || !localidad || monto < minimo || nombre.trim().length < 3 || !cuitOk || telefono.replace(/\D/g, '').length < 8}
              className="w-full bg-accent hover:bg-accent-bright disabled:opacity-40 text-black font-bold px-5 py-3.5 text-sm rounded-xl transition-colors"
            >
              {busy ? 'Registrando…' : `Confirmar pre-oferta · ${fmt(monto)}`}
            </button>
            <p className="text-zinc-600 text-[11px] text-center">Te llamamos para validar tu CUIT antes de registrar la pre-oferta.</p>
          </div>
        )}

        {msg && !ok && <p className="text-amber-300 text-xs mt-2.5 text-center">{msg}</p>}
      </div>
    </div>
  )
}
