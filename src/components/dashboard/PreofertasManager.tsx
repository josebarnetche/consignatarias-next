'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { LoteFirma, OfertaRecibida, PreofertaFirma } from '@/lib/preofertas-firma'
import { isoALocalAr, localArAIso, videoDelLote, type EstadoPreoferta } from '@/lib/validators/preoferta-firma'

export type { LoteFirma, OfertaRecibida, PreofertaFirma } from '@/lib/preofertas-firma'

/**
 * Pre-ofertas en el panel de la firma (17-10-2026).
 *
 * La firma arma su remate (título, fecha, lugar, cierre, condiciones), carga los lotes
 * con su video, publica y cierra, y ve las ofertas que le dejan por cada lote con el
 * contacto del interesado. Es función de PRO Consignataria: sin plan se explica qué es
 * y se manda a /planes — sin datos de muestra, porque un panel con ofertas inventadas
 * promete algo que todavía no pasó.
 *
 * Todo lo que escribe pasa por /api/consignatarias/[slug]/preofertas, que revalida
 * dueño, plan y datos; la validación de acá es solo para no hacer viajes inútiles.
 */

interface Props {
  slug: string
  esPro: boolean
  inicial: PreofertaFirma[]
  ofertas: OfertaRecibida[]
}

const ESTADO: Record<EstadoPreoferta, { label: string; clase: string }> = {
  borrador: { label: 'Borrador', clase: 'border-zinc-600 text-zinc-400' },
  publicada: { label: 'Publicada', clase: 'border-positive/50 text-positive' },
  cerrada: { label: 'Cerrada', clase: 'border-zinc-600 text-zinc-500' },
}

const CAMPO = 'w-full rounded-terminal border border-terminal-border bg-zinc-950 px-2.5 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-accent focus:outline-none'
const BOTON = 'rounded-terminal border border-terminal-border px-2.5 py-1 text-xs text-zinc-300 hover:border-accent/60 hover:text-ink disabled:opacity-50'
const BOTON_PRIMARIO = 'rounded-terminal bg-accent px-3 py-1.5 text-xs font-semibold text-white oscuro:text-zinc-950 hover:bg-accent-bright disabled:opacity-50'

function fmtPesos(n: number): string {
  return '$ ' + n.toLocaleString('es-AR')
}

function fmtFechaHora(iso: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(iso))
}

function fmtFecha(fecha: string): string {
  return fecha.split('-').reverse().join('-')
}

async function llamar<T>(method: string, url: string, body?: unknown): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
    const j = await res.json().catch(() => ({}))
    if (!res.ok) {
      const err = typeof j.error === 'string' ? j.error : (j.error?.message ?? 'No se pudo completar la acción')
      return { ok: false, error: err }
    }
    return { ok: true, data: j as T }
  } catch {
    return { ok: false, error: 'Sin conexión. Probá de nuevo.' }
  }
}

/* ------------------------------------------------------------------ */
/*  Formularios                                                         */
/* ------------------------------------------------------------------ */

function FormRemate({
  inicial, enviando, onGuardar, onCancelar,
}: {
  inicial?: PreofertaFirma
  enviando: boolean
  onGuardar: (datos: Record<string, string>) => void
  onCancelar: () => void
}) {
  return (
    <form
      className="grid gap-2.5 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault()
        const f = new FormData(e.currentTarget)
        onGuardar({
          titulo: String(f.get('titulo') ?? ''),
          fecha_remate: String(f.get('fecha_remate') ?? ''),
          lugar: String(f.get('lugar') ?? ''),
          cierre: localArAIso(String(f.get('cierre') ?? '')),
          condiciones: String(f.get('condiciones') ?? ''),
        })
      }}
    >
      <label className="sm:col-span-2 text-xs text-zinc-400">
        Remate
        <input name="titulo" required minLength={3} maxLength={160} defaultValue={inicial?.titulo} placeholder="Ej. Remate de invernada — Sociedad Rural" className={`${CAMPO} mt-1`} />
      </label>
      <label className="text-xs text-zinc-400">
        Fecha del remate
        <input name="fecha_remate" type="date" required defaultValue={inicial?.fecha_remate} className={`${CAMPO} mt-1`} />
      </label>
      <label className="text-xs text-zinc-400">
        Lugar
        <input name="lugar" maxLength={160} defaultValue={inicial?.lugar ?? ''} placeholder="Ej. Predio ferial, Mercedes" className={`${CAMPO} mt-1`} />
      </label>
      <label className="sm:col-span-2 text-xs text-zinc-400">
        Cierre de las ofertas (hora argentina)
        <input name="cierre" type="datetime-local" required defaultValue={inicial ? isoALocalAr(inicial.cierre) : ''} className={`${CAMPO} mt-1`} />
      </label>
      <label className="sm:col-span-2 text-xs text-zinc-400">
        Condiciones (opcional)
        <textarea name="condiciones" rows={3} maxLength={4000} defaultValue={inicial?.condiciones ?? ''} placeholder="Plazos de pago, sanidad, flete, comisión…" className={`${CAMPO} mt-1`} />
      </label>
      <div className="sm:col-span-2 flex gap-2">
        <button type="submit" disabled={enviando} className={BOTON_PRIMARIO}>{enviando ? 'Guardando…' : inicial ? 'Guardar cambios' : 'Crear borrador'}</button>
        <button type="button" onClick={onCancelar} className="px-2 text-xs text-zinc-500 hover:text-zinc-300">Cancelar</button>
      </div>
    </form>
  )
}

function FormLote({
  inicial, enviando, onGuardar, onCancelar,
}: {
  inicial?: LoteFirma
  enviando: boolean
  onGuardar: (datos: Record<string, string>) => void
  onCancelar: () => void
}) {
  return (
    <form
      className="grid gap-2.5 sm:grid-cols-6"
      onSubmit={(e) => {
        e.preventDefault()
        const f = new FormData(e.currentTarget)
        const datos: Record<string, string> = {}
        for (const k of ['titulo', 'categoria', 'cabezas', 'peso_kg', 'video_url', 'descripcion', 'precio_base']) {
          datos[k] = String(f.get(k) ?? '').trim()
        }
        onGuardar(datos)
      }}
    >
      <label className="sm:col-span-4 text-xs text-zinc-400">
        Lote
        <input name="titulo" required minLength={2} maxLength={160} defaultValue={inicial?.titulo} placeholder="Ej. Lote 12 — 40 terneros Braford" className={`${CAMPO} mt-1`} />
      </label>
      <label className="sm:col-span-2 text-xs text-zinc-400">
        Categoría
        <input name="categoria" maxLength={60} defaultValue={inicial?.categoria ?? ''} placeholder="Ej. Terneros" className={`${CAMPO} mt-1`} />
      </label>
      <label className="sm:col-span-2 text-xs text-zinc-400">
        Cabezas
        <input name="cabezas" type="number" min={1} max={100000} defaultValue={inicial?.cabezas ?? ''} className={`${CAMPO} mt-1 tabular-nums`} />
      </label>
      <label className="sm:col-span-2 text-xs text-zinc-400">
        Peso promedio (kg)
        <input name="peso_kg" type="number" min={1} max={2000} defaultValue={inicial?.peso_kg ?? ''} className={`${CAMPO} mt-1 tabular-nums`} />
      </label>
      <label className="sm:col-span-2 text-xs text-zinc-400">
        Precio base (ARS, opcional)
        <input name="precio_base" inputMode="numeric" pattern="[0-9.]*" defaultValue={inicial?.precio_base ?? ''} className={`${CAMPO} mt-1 tabular-nums`} />
      </label>
      <label className="sm:col-span-6 text-xs text-zinc-400">
        Video (YouTube, Vimeo o Google Drive)
        <input name="video_url" type="url" maxLength={500} defaultValue={inicial?.video_url ?? ''} placeholder="https://youtu.be/…" className={`${CAMPO} mt-1`} />
      </label>
      <label className="sm:col-span-6 text-xs text-zinc-400">
        Descripción (opcional)
        <textarea name="descripcion" rows={2} maxLength={2000} defaultValue={inicial?.descripcion ?? ''} placeholder="Estado, sanidad, origen, destino sugerido…" className={`${CAMPO} mt-1`} />
      </label>
      <div className="sm:col-span-6 flex gap-2">
        <button type="submit" disabled={enviando} className={BOTON_PRIMARIO}>{enviando ? 'Guardando…' : inicial ? 'Guardar lote' : 'Agregar lote'}</button>
        <button type="button" onClick={onCancelar} className="px-2 text-xs text-zinc-500 hover:text-zinc-300">Cancelar</button>
      </div>
    </form>
  )
}

/* ------------------------------------------------------------------ */
/*  Ofertas                                                             */
/* ------------------------------------------------------------------ */

function ListaOfertas({ ofertas }: { ofertas: OfertaRecibida[] }) {
  if (ofertas.length === 0) return <p className="text-xxs text-zinc-600">Sin ofertas todavía.</p>
  return (
    <ul className="divide-y divide-terminal-border rounded-terminal border border-terminal-border">
      {ofertas.map((o) => (
        <li key={o.id} className="px-3 py-2 text-xs">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <span className="font-medium text-zinc-100">{o.nombre ?? 'Sin nombre'}</span>
            <span className="font-terminal tabular-nums text-zinc-300">{o.monto != null ? fmtPesos(o.monto) : 'Sin monto'}</span>
          </div>
          <div className="mt-0.5 flex flex-wrap gap-x-3 text-zinc-400">
            {o.telefono && <a href={`tel:${o.telefono.replace(/[^\d+]/g, '')}`} className="hover:text-ink">{o.telefono}</a>}
            {o.email && <a href={`mailto:${o.email}`} className="hover:text-ink">{o.email}</a>}
            <span className="text-zinc-600 tabular-nums">{fmtFechaHora(o.fecha)}</span>
          </div>
          {o.mensaje && <p className="mt-1 whitespace-pre-line text-zinc-400">{o.mensaje}</p>}
        </li>
      ))}
    </ul>
  )
}

/* ------------------------------------------------------------------ */
/*  Tarjeta de una pre-oferta                                           */
/* ------------------------------------------------------------------ */

function TarjetaPreoferta({
  p, ofertas, base, onCambio, onBorrada,
}: {
  p: PreofertaFirma
  ofertas: OfertaRecibida[]
  base: string
  onCambio: (p: PreofertaFirma) => void
  onBorrada: (id: string) => void
}) {
  const [abierta, setAbierta] = useState(p.estado !== 'cerrada')
  const [editando, setEditando] = useState(false)
  const [loteEditando, setLoteEditando] = useState<string | 'nuevo' | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const porLote = useMemo(() => {
    const m = new Map<string, OfertaRecibida[]>()
    for (const o of ofertas) if (o.lote_id) m.set(o.lote_id, [...(m.get(o.lote_id) ?? []), o])
    return m
  }, [ofertas])

  const url = `${base}/${p.id}`
  const vencida = Date.parse(p.cierre) <= Date.now()

  async function accion<T extends { preoferta?: PreofertaFirma | null }>(method: string, path: string, body?: unknown, alTerminar?: () => void) {
    setEnviando(true)
    setError(null)
    const r = await llamar<T>(method, `${url}${path}`, body)
    setEnviando(false)
    if (!r.ok) {
      setError(r.error)
      return
    }
    if (r.data.preoferta) onCambio(r.data.preoferta)
    alTerminar?.()
  }

  async function borrar() {
    if (!confirm(`¿Borrar «${p.titulo}»? No se puede deshacer.`)) return
    setEnviando(true)
    setError(null)
    const r = await llamar<{ ok: boolean }>('DELETE', url)
    setEnviando(false)
    if (!r.ok) return setError(r.error)
    onBorrada(p.id)
  }

  const est = ESTADO[p.estado]

  return (
    <article className="rounded-terminal border border-terminal-border bg-zinc-900/40">
      <header className="flex flex-wrap items-start justify-between gap-2 px-3.5 py-3">
        <button type="button" onClick={() => setAbierta(!abierta)} className="min-w-0 flex-1 text-left" aria-expanded={abierta}>
          <span className="flex flex-wrap items-center gap-2">
            <span className={`rounded border px-1.5 py-0.5 text-[10px] font-terminal uppercase tracking-wider ${est.clase}`}>{est.label}</span>
            <span className="text-sm font-medium text-zinc-100">{p.titulo}</span>
          </span>
          <span className="mt-1 block text-xxs font-terminal text-zinc-500">
            Remate {fmtFecha(p.fecha_remate)}{p.lugar ? ` · ${p.lugar}` : ''} · cierra {fmtFechaHora(p.cierre)}
            {' · '}{p.lotes.length} {p.lotes.length === 1 ? 'lote' : 'lotes'}
            {' · '}<span className={ofertas.length > 0 ? 'text-positive' : ''}>{ofertas.length} {ofertas.length === 1 ? 'oferta' : 'ofertas'}</span>
          </span>
        </button>
        <div className="flex flex-wrap gap-1.5">
          {p.estado !== 'borrador' && (
            <Link href={`/preofertas/f/${p.id}`} target="_blank" className={BOTON}>Ver publicada</Link>
          )}
          {p.estado === 'borrador' && (
            <button type="button" disabled={enviando || p.lotes.length === 0} onClick={() => accion('PATCH', '', { estado: 'publicada' })} className={BOTON_PRIMARIO} title={p.lotes.length === 0 ? 'Cargá al menos un lote' : undefined}>
              Publicar
            </button>
          )}
          {p.estado === 'publicada' && (
            <button type="button" disabled={enviando} onClick={() => accion('PATCH', '', { estado: 'cerrada' })} className={BOTON}>Cerrar ofertas</button>
          )}
          {p.estado === 'cerrada' && !vencida && (
            <button type="button" disabled={enviando} onClick={() => accion('PATCH', '', { estado: 'publicada' })} className={BOTON}>Reabrir</button>
          )}
          {!editando && (
            <button type="button" onClick={() => { setEditando(true); setAbierta(true) }} className={BOTON}>Editar</button>
          )}
          {ofertas.length === 0 && (
            <button type="button" disabled={enviando} onClick={borrar} className={`${BOTON} hover:text-negative`}>Borrar</button>
          )}
        </div>
      </header>

      {error && <p className="px-3.5 pb-2 text-xs text-negative" role="alert">{error}</p>}
      {p.estado === 'publicada' && vencida && (
        <p className="px-3.5 pb-2 text-xxs text-zinc-500">El cierre ya pasó: la ficha dejó de recibir ofertas. Cerrala o corré la fecha de cierre.</p>
      )}

      {abierta && (
        <div className="space-y-4 border-t border-terminal-border px-3.5 py-3">
          {editando && (
            <FormRemate
              inicial={p}
              enviando={enviando}
              onCancelar={() => setEditando(false)}
              onGuardar={(d) => accion('PATCH', '', d, () => setEditando(false))}
            />
          )}

          {!editando && p.condiciones && (
            <p className="whitespace-pre-line text-xs text-zinc-400">{p.condiciones}</p>
          )}

          <div className="space-y-3">
            {p.lotes.map((l) => {
              const video = videoDelLote(l.video_url)
              const deLote = porLote.get(l.id) ?? []
              return (
                <div key={l.id} className="rounded-terminal border border-terminal-border p-3">
                  {loteEditando === l.id ? (
                    <FormLote
                      inicial={l}
                      enviando={enviando}
                      onCancelar={() => setLoteEditando(null)}
                      onGuardar={(d) => accion('PATCH', `/lotes/${l.id}`, d, () => setLoteEditando(null))}
                    />
                  ) : (
                    <>
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="text-sm font-medium text-zinc-100">{l.titulo}</span>
                        <span className="flex gap-1.5">
                          <button type="button" onClick={() => setLoteEditando(l.id)} className={BOTON}>Editar</button>
                          {deLote.length === 0 && (
                            <button
                              type="button"
                              disabled={enviando}
                              onClick={() => { if (confirm(`¿Quitar «${l.titulo}»?`)) accion('DELETE', `/lotes/${l.id}`) }}
                              className={`${BOTON} hover:text-negative`}
                            >
                              Quitar
                            </button>
                          )}
                        </span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap gap-x-3 text-xxs text-zinc-500">
                        {l.categoria && <span>{l.categoria}</span>}
                        {l.cabezas != null && <span className="tabular-nums">{l.cabezas} cab.</span>}
                        {l.peso_kg != null && <span className="tabular-nums">{l.peso_kg} kg</span>}
                        {l.precio_base != null && <span className="tabular-nums">base {fmtPesos(l.precio_base)}</span>}
                        {video
                          ? <a href={video.href} target="_blank" rel="noopener noreferrer" className="text-accent hover:text-ink">video ({video.tipo})</a>
                          : <span className="text-warning">sin video</span>}
                      </div>
                      <div className="mt-2">
                        <p className="mb-1 text-[10px] font-terminal uppercase tracking-wider text-zinc-500">Ofertas recibidas ({deLote.length})</p>
                        <ListaOfertas ofertas={deLote} />
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>

          {loteEditando === 'nuevo' ? (
            <div className="rounded-terminal border border-dashed border-terminal-border p-3">
              <FormLote
                enviando={enviando}
                onCancelar={() => setLoteEditando(null)}
                onGuardar={(d) => accion('POST', '/lotes', d, () => setLoteEditando(null))}
              />
            </div>
          ) : (
            <button type="button" onClick={() => setLoteEditando('nuevo')} className={BOTON}>+ Agregar lote</button>
          )}
        </div>
      )}
    </article>
  )
}

/* ------------------------------------------------------------------ */
/*  Panel                                                               */
/* ------------------------------------------------------------------ */

export default function PreofertasManager({ slug, esPro, inicial, ofertas: ofertasIniciales }: Props) {
  const [preofertas, setPreofertas] = useState<PreofertaFirma[]>(inicial)
  const [ofertas, setOfertas] = useState<OfertaRecibida[]>(ofertasIniciales)
  const [creando, setCreando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const base = `/api/consignatarias/${encodeURIComponent(slug)}/preofertas`

  if (!esPro) {
    return (
      <section aria-labelledby="preofertas-titulo" className="rounded-terminal border border-terminal-border bg-zinc-900/40 p-4">
        <h2 id="preofertas-titulo" className="text-sm font-semibold text-zinc-100">Pre-ofertas</h2>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-400">
          Cargá los lotes de tu próximo remate con su video y recibí ofertas antes del martillo: el interesado deja
          su oferta y su contacto, y te llega a vos por mail y a este panel. Es parte de PRO Consignataria.
        </p>
        <Link href="/planes#consignataria" className="mt-3 inline-block text-xs font-terminal text-accent hover:text-ink">
          Ver PRO Consignataria &rarr;
        </Link>
      </section>
    )
  }

  async function crear(d: Record<string, string>) {
    setEnviando(true)
    setError(null)
    const r = await llamar<{ preoferta: PreofertaFirma }>('POST', base, d)
    setEnviando(false)
    if (!r.ok) return setError(r.error)
    setPreofertas((ps) => [r.data.preoferta, ...ps])
    setCreando(false)
  }

  async function refrescar() {
    setEnviando(true)
    setError(null)
    const r = await llamar<{ preofertas: PreofertaFirma[]; ofertas: OfertaRecibida[] }>('GET', base)
    setEnviando(false)
    if (!r.ok) return setError(r.error)
    setPreofertas(r.data.preofertas)
    setOfertas(r.data.ofertas)
  }

  return (
    <section aria-labelledby="preofertas-titulo" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="preofertas-titulo" className="text-sm font-semibold text-zinc-100">Pre-ofertas</h2>
          <p className="text-xxs text-zinc-500">
            Lotes con video antes del remate. Las ofertas te llegan por mail y quedan acá; el contacto del interesado no se publica.
          </p>
        </div>
        <div className="flex gap-1.5">
          <button type="button" onClick={refrescar} disabled={enviando} className={BOTON}>Actualizar</button>
          {!creando && <button type="button" onClick={() => setCreando(true)} className={BOTON_PRIMARIO}>Nueva pre-oferta</button>}
        </div>
      </div>

      {error && <p className="text-xs text-negative" role="alert">{error}</p>}

      {creando && (
        <div className="rounded-terminal border border-dashed border-terminal-border p-3.5">
          <FormRemate enviando={enviando} onGuardar={crear} onCancelar={() => setCreando(false)} />
        </div>
      )}

      {preofertas.length === 0 && !creando && (
        <p className="text-xs text-zinc-500">
          Todavía no cargaste ninguna. Creá el remate, sumá los lotes con su video y publicá: la ficha queda en /preofertas hasta el cierre.
        </p>
      )}

      {preofertas.map((p) => (
        <TarjetaPreoferta
          key={p.id}
          p={p}
          base={base}
          ofertas={ofertas.filter((o) => o.preoferta_id === p.id)}
          onCambio={(nueva) => setPreofertas((ps) => ps.map((x) => (x.id === nueva.id ? nueva : x)))}
          onBorrada={(id) => setPreofertas((ps) => ps.filter((x) => x.id !== id))}
        />
      ))}
    </section>
  )
}
