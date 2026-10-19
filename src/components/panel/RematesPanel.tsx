'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { claveRemate } from '@/lib/dal/auctions'
import { mensajeError } from '@/lib/ui/mensaje-error'
import { provinciaNombre } from '@/lib/ui/tokens'
import type { OfertaRecibida, PreofertaFirma } from '@/lib/preofertas-firma'
import { videoDelLote } from '@/lib/validators/preoferta-firma'
import { diasHasta, lugaresHabituales, lunesDelMail, sinProvincia, tituloSugerido } from '@/lib/panel/remate-auto'
import CompartirRemate from './CompartirRemate'
import { BloqueFecha, BotonPrimario, BotonSecundario, Hoja, SoloPro, Vacio, fmt } from './PanelUi'

/**
 * Los remates de la firma (18-10-2026): una tarjeta por remate con lo que se hace con
 * él —compartirlo, abrirle pre-ofertas, editarlo— y la carga en una hoja al costado con
 * lo mínimo a la vista (flyer, nombre, fecha, lugar) y el resto plegado.
 *
 * Junta las dos fuentes: lo que cargó la firma (`consignataria_auctions`) y lo que el
 * sitio encontró solo (remates.json). Editar uno del calendario lo corrige: la versión
 * de la firma lo reemplaza (`reemplaza_clave`).
 */

export interface RematePropio {
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
  /** Ficha pública (/remates/…), si ya está en el calendario. */
  path?: string | null
}

export interface RemateCalendario {
  title: string
  date: string
  time: string | null
  location: string
  clave?: string
  province?: string
  type?: string
  main_category?: string
  estimated_heads?: number | null
  description?: string
  catalog_url?: string | null
  youtube_url?: string | null
  path?: string | null
}

interface Item {
  key: string
  /** Clave estable para enlazar la pre-oferta. */
  clave: string
  propio: RematePropio | null
  calendario: RemateCalendario | null
  title: string
  date: string
  time: string | null
  location: string
  province: string | null
  flyer: string | null
  path: string | null
}

const SITIO = 'https://www.consignatarias.com.ar'
const PROVINCIAS = ['BUENOS AIRES', 'CORRIENTES', 'ENTRE RIOS', 'SANTA FE', 'CORDOBA', 'LA PAMPA', 'CHACO', 'FORMOSA', 'MISIONES', 'SANTIAGO DEL ESTERO', 'SAN LUIS', 'SALTA', 'TUCUMAN', 'JUJUY', 'RIO NEGRO', 'NEUQUEN', 'CHUBUT', 'MENDOZA', 'CATAMARCA', 'LA RIOJA', 'SAN JUAN', 'SANTA CRUZ', 'TIERRA DEL FUEGO']
const TIPOS = [['general', 'General'], ['invernada', 'Invernada'], ['cria', 'Cría'], ['reproductores', 'Reproductores'], ['especial', 'Especial']]
const CATEGORIAS = [['mixto', 'Mixto'], ['terneros', 'Terneros'], ['novillos', 'Novillos'], ['vaquillonas', 'Vaquillonas'], ['vaca_gorda', 'Vaca gorda'], ['toros', 'Toros']]
const CATEGORIAS_LOTE = ['Terneros', 'Terneras', 'Novillitos', 'Novillos', 'Vaquillonas', 'Vacas', 'Vacas con cría', 'Toros', 'Otro']

const CAMPO = 'mt-1.5 block w-full rounded-xl border border-terminal-border bg-terminal-bg/60 px-3.5 py-2.5 text-[0.9375rem] text-ink placeholder:text-zinc-600 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20'
const ETIQUETA = 'block text-sm font-medium text-zinc-300'

const sinAcentos = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()

/** "Mercedes" + "CORRIENTES" → "Mercedes, Corrientes"; si el lugar ya dice la provincia, no la repite. */
function lugarConProvincia(lugar: string, provincia: string | null): string | null {
  if (!provincia) return lugar || null
  if (lugar && sinAcentos(lugar).includes(sinAcentos(provincia))) return lugar
  return [lugar, provinciaNombre(provincia)].filter(Boolean).join(', ')
}

/** Fecha de hoy en Argentina (UTC−3): de noche, la UTC ya es mañana. */
export const hoyAr = () => new Date(Date.now() - 3 * 3_600_000).toISOString().slice(0, 10)

function detalleDe(i: Pick<Item, 'date' | 'time' | 'location'>) {
  const dia = new Date(i.date + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
  return [dia, i.time ? `${i.time} hs` : null, i.location || null].filter(Boolean).join(' · ')
}

async function llamar<T>(method: string, url: string, body?: unknown): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
    const j = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, error: mensajeError(j, 'No se pudo completar. Probá de nuevo.') }
    return { ok: true, data: j as T }
  } catch {
    return { ok: false, error: 'Sin conexión. Probá de nuevo.' }
  }
}

export default function RematesPanel({
  slug,
  firma,
  esPro,
  propios: propiosIniciales,
  calendario,
  preofertas: preofertasIniciales,
  ofertas,
  soloLectura = false,
  abrirNuevo = false,
  alcanceMail = 0,
}: {
  slug: string
  firma: string
  esPro: boolean
  propios: RematePropio[]
  calendario: RemateCalendario[]
  preofertas: PreofertaFirma[]
  ofertas: OfertaRecibida[]
  soloLectura?: boolean
  /** Abre la hoja de carga al entrar (desde "Cargar remate" en Inicio). */
  abrirNuevo?: boolean
  /** Productores que reciben el mail semanal: lo muestra la carga como resultado. */
  alcanceMail?: number
}) {
  const [propios, setPropios] = useState(propiosIniciales)
  const [preofertas, setPreofertas] = useState(preofertasIniciales)
  const [hoja, setHoja] = useState<{ tipo: 'editar' | 'compartir' | 'preofertas'; item: Item | null } | null>(
    abrirNuevo ? { tipo: 'editar', item: null } : null,
  )
  const [verAnteriores, setVerAnteriores] = useState(false)
  const hoy = hoyAr()

  const corregidas = useMemo(() => new Set(propios.map((p) => p.reemplaza_clave).filter(Boolean) as string[]), [propios])
  const items: Item[] = useMemo(() => {
    const deFirma = propios.map<Item>((p) => ({
      key: `p${p.id}`,
      clave: p.reemplaza_clave || claveRemate({ date: p.date, location: p.location ?? '' }),
      propio: p,
      calendario: null,
      title: p.title,
      date: p.date,
      time: p.time,
      location: p.location ?? '',
      province: p.province,
      flyer: p.flyer_url ?? null,
      path: p.path ?? null,
    }))
    const delCalendario = calendario
      .filter((c) => !c.clave || !corregidas.has(c.clave))
      .map<Item>((c) => ({
        key: `c${c.clave ?? c.date + c.title}`,
        clave: c.clave ?? claveRemate({ date: c.date, location: c.location }),
        propio: null,
        calendario: c,
        title: c.title,
        date: c.date,
        time: c.time,
        location: c.location,
        province: c.province ?? null,
        flyer: null,
        path: c.path ?? null,
      }))
    return [...deFirma, ...delCalendario].sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''))
  }, [propios, calendario, corregidas])

  const proximos = items.filter((i) => i.date >= hoy)
  /** Los que el sitio encontró en su web y la firma todavía no completó: cargar uno es elegirlo. */
  const sinCompletar = proximos.filter((i) => !i.propio)
  const lugares = useMemo(() => lugaresHabituales(items), [items])
  const anteriores = items.filter((i) => i.date < hoy).reverse()
  const preofertaDe = (i: Item) =>
    preofertas.find((p) => p.remate_clave === i.clave) ?? preofertas.find((p) => !p.remate_clave && p.fecha_remate === i.date && p.titulo === i.title) ?? null

  const tarjeta = (i: Item) => {
    const p = preofertaDe(i)
    const nOfertas = p ? ofertas.filter((o) => o.preoferta_id === p.id).length : 0
    return (
      <li key={i.key} className="flex flex-col gap-4 rounded-2xl border border-terminal-border bg-terminal-panel p-4 sm:flex-row sm:items-center sm:p-5">
        <div className="flex min-w-0 flex-1 gap-4">
          <BloqueFecha fecha={i.date} />
          <div className="min-w-0">
            <p className="text-base font-semibold leading-snug text-ink">{i.title}</p>
            <p className="mt-0.5 text-sm text-zinc-500">
              {[i.time ? `${i.time} hs` : null, lugarConProvincia(i.location, i.province)].filter(Boolean).join(' · ')}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
              <span className={`rounded-full px-2.5 py-0.5 ${i.propio ? 'bg-positive/10 text-positive' : 'bg-zinc-800 text-zinc-400'}`}>
                {i.propio ? 'Cargado por vos' : 'Lo encontramos en tu web'}
              </span>
              {i.flyer && <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-zinc-300">Con flyer</span>}
              {p && (
                <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-accent">
                  Pre-ofertas · {p.lotes.length} {p.lotes.length === 1 ? 'lote' : 'lotes'}
                  {nOfertas > 0 ? ` · ${nOfertas} ${nOfertas === 1 ? 'oferta' : 'ofertas'}` : ''}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <BotonPrimario onClick={() => setHoja({ tipo: 'compartir', item: i })}>Compartir</BotonPrimario>
          <BotonSecundario onClick={() => setHoja({ tipo: 'preofertas', item: i })}>Pre-ofertas</BotonSecundario>
          {!soloLectura && <BotonSecundario onClick={() => setHoja({ tipo: 'editar', item: i })}>{i.propio ? 'Editar' : 'Completar'}</BotonSecundario>}
        </div>
      </li>
    )
  }

  const cerrar = () => setHoja(null)

  return (
    <div className="space-y-6">
      {!soloLectura && (
        <button
          type="button"
          onClick={() => setHoja({ tipo: 'editar', item: null })}
          className="group flex w-full items-center gap-4 rounded-2xl border border-dashed border-accent/40 bg-accent/[0.03] p-5 text-left transition-colors hover:bg-accent/[0.07]"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent text-xl text-white oscuro:text-zinc-950" aria-hidden="true">+</span>
          <span>
            <span className="block text-base font-semibold text-ink">Cargar un remate</span>
            <span className="block text-sm text-zinc-500">Subí el flyer y poné fecha y lugar. Sale en tu perfil al instante y en el calendario y el mail semanal en menos de una hora.</span>
          </span>
        </button>
      )}

      {proximos.length === 0 ? (
        <Vacio titulo="No hay remates próximos." texto="Cuando cargues uno, o lo publiques en tu web, aparece acá listo para compartir." />
      ) : (
        <ul className="space-y-3">{proximos.map(tarjeta)}</ul>
      )}

      {anteriores.length > 0 && (
        <div>
          <button type="button" onClick={() => setVerAnteriores(!verAnteriores)} className="text-sm text-zinc-500 hover:text-ink">
            {verAnteriores ? 'Ocultar' : 'Ver'} remates anteriores ({anteriores.length})
          </button>
          {verAnteriores && <ul className="mt-3 space-y-3 opacity-80">{anteriores.map(tarjeta)}</ul>}
        </div>
      )}

      <Hoja
        abierta={hoja?.tipo === 'editar'}
        titulo={hoja?.item ? (hoja.item.propio ? 'Editar remate' : 'Completar remate') : 'Cargar un remate'}
        bajada={hoja?.item && !hoja.item.propio ? 'Lo encontramos en tu web. Lo que cambies acá reemplaza nuestra versión.' : undefined}
        onCerrar={cerrar}
      >
        {hoja?.tipo === 'editar' && (
          <FormRemate
            key={hoja.item?.key ?? 'nuevo'}
            slug={slug}
            item={hoja.item}
            esPro={esPro}
            alcanceMail={alcanceMail}
            sugeridos={hoja.item ? [] : sinCompletar}
            lugares={lugares}
            onElegir={(i) => setHoja({ tipo: 'editar', item: i })}
            onListo={(guardado, borradoId) => {
              if (borradoId != null) setPropios((ps) => ps.filter((x) => x.id !== borradoId))
              else if (guardado) setPropios((ps) => (ps.some((x) => x.id === guardado.id) ? ps.map((x) => (x.id === guardado.id ? { ...x, ...guardado } : x)) : [...ps, guardado]))
              cerrar()
            }}
          />
        )}
      </Hoja>

      <Hoja abierta={hoja?.tipo === 'compartir'} titulo="Compartir remate" bajada="Mandalo por WhatsApp, subí la tarjeta a tu estado o imprimí el QR." onCerrar={cerrar}>
        {hoja?.tipo === 'compartir' && hoja.item && (
          <CompartirRemate
            q={{
              url: hoja.item.path && hoja.item.date >= hoy ? `${SITIO}${hoja.item.path}` : `${SITIO}/go/${slug}`,
              firma,
              rotulo: hoja.item.date >= hoy ? 'Próximo remate' : 'Mis remates',
              titulo: hoja.item.title,
              detalle: detalleDe(hoja.item),
              archivo: `remate-${hoja.item.date}`,
              slugFirma: slug,
            }}
          />
        )}
      </Hoja>

      <Hoja abierta={hoja?.tipo === 'preofertas'} titulo="Pre-ofertas" bajada={hoja?.item ? hoja.item.title : undefined} onCerrar={cerrar}>
        {hoja?.tipo === 'preofertas' && hoja.item && (
          <PreofertasRemate
            slug={slug}
            firma={firma}
            esPro={esPro}
            soloLectura={soloLectura}
            item={hoja.item}
            preoferta={preofertaDe(hoja.item)}
            ofertas={ofertas}
            onCambio={(p) => setPreofertas((ps) => (ps.some((x) => x.id === p.id) ? ps.map((x) => (x.id === p.id ? p : x)) : [p, ...ps]))}
          />
        )}
      </Hoja>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Cargar / editar                                                     */
/* ------------------------------------------------------------------ */

function FormRemate({
  slug,
  item,
  esPro,
  alcanceMail,
  sugeridos,
  lugares,
  onElegir,
  onListo,
}: {
  slug: string
  item: Item | null
  esPro: boolean
  alcanceMail: number
  sugeridos: Item[]
  lugares: { location: string; province: string | null }[]
  onElegir: (i: Item) => void
  onListo: (guardado: RematePropio | null, borradoId?: number) => void
}) {
  const router = useRouter()
  const base = item?.propio ?? item?.calendario ?? null
  const [f, setF] = useState({
    title: base?.title ?? '',
    date: base?.date ?? '',
    time: base?.time ?? '',
    // Del calendario viene "EA. Aguay, CORRIENTES": la provincia ya va en su campo.
    location: item?.calendario && !item.propio ? sinProvincia(base?.location ?? '', base?.province) : base?.location ?? '',
    province: base?.province ?? '',
    type: base?.type ?? 'general',
    main_category: base?.main_category ?? 'mixto',
    estimated_heads: base?.estimated_heads?.toString() ?? '',
    description: base?.description ?? '',
    catalog_url: base?.catalog_url ?? '',
    youtube_url: base?.youtube_url ?? '',
    flyer_url: item?.propio?.flyer_url ?? '',
  })
  const [masDatos, setMasDatos] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }))
  const nombreSolo = tituloSugerido(f)
  /** Escribir un lugar donde ya remató completa la provincia. */
  const setLugar = (location: string) =>
    setF((x) => {
      const conocido = lugares.find((l) => l.location.toLowerCase() === location.trim().toLowerCase())
      return { ...x, location, province: x.province || conocido?.province || '' }
    })

  async function subirFlyer(file: File) {
    setSubiendo(true)
    setError(null)
    const fd = new FormData()
    fd.append('flyer', file)
    try {
      const res = await fetch(`/api/consignatarias/${slug}/flyer`, { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) setError(mensajeError(data, 'No se pudo subir el flyer'))
      else setF((x) => ({ ...x, flyer_url: data.url }))
    } catch {
      setError('Sin conexión al subir el flyer')
    } finally {
      setSubiendo(false)
    }
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true)
    setError(null)
    const payload = {
      ...f,
      title: f.title.trim() || nombreSolo,
      estimated_heads: f.estimated_heads ? parseInt(f.estimated_heads, 10) : null,
      time: f.time || null,
      location: f.location || null,
      province: f.province || null,
      description: f.description || null,
      catalog_url: f.catalog_url || null,
      youtube_url: f.youtube_url || null,
      flyer_url: f.flyer_url || null,
      ...(!item?.propio && item?.calendario?.clave ? { reemplaza_clave: item.calendario.clave } : {}),
    }
    const r = await llamar<RematePropio>(item?.propio ? 'PATCH' : 'POST', item?.propio ? `/api/consignatarias/${slug}/auctions/${item.propio.id}` : `/api/consignatarias/${slug}/auctions`, payload)
    setGuardando(false)
    if (!r.ok) return setError(r.error)
    router.refresh()
    onListo(r.data)
  }

  async function borrar() {
    if (!item?.propio || !confirm('¿Borrar este remate? Deja de verse en tu perfil y en el calendario.')) return
    const r = await llamar<unknown>('DELETE', `/api/consignatarias/${slug}/auctions/${item.propio.id}`)
    if (!r.ok) return setError(r.error)
    router.refresh()
    onListo(null, item.propio.id)
  }

  return (
    <form onSubmit={guardar} className="space-y-5">
      {sugeridos.length > 0 && (
        <div className="rounded-2xl bg-accent/[0.06] p-4">
          <p className="text-sm font-semibold text-ink">¿Es uno de estos? Ya los encontramos en tu web.</p>
          <p className="mt-0.5 text-xs text-zinc-500">Tocalo y se completa solo; vos sumás el flyer.</p>
          <ul className="mt-3 space-y-1.5">
            {sugeridos.slice(0, 4).map((s) => (
              <li key={s.key}>
                <button
                  type="button"
                  onClick={() => onElegir(s)}
                  className="flex w-full items-center gap-3 rounded-xl bg-terminal-panel px-3 py-2.5 text-left transition-colors hover:bg-zinc-800/60"
                >
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-accent">
                    {new Date(s.date + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">{s.title}</span>
                  <span className="shrink-0 text-xs text-zinc-500">Usar →</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* El flyer primero: es lo que la firma ya tiene hecho. */}
      <label className={`relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed ${f.flyer_url ? 'border-transparent' : 'border-zinc-700 hover:border-accent'} bg-terminal-bg/60 text-center transition-colors ${f.flyer_url ? 'aspect-[4/5] max-h-80' : 'py-8'}`}>
        <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={subiendo} onChange={(e) => e.target.files?.[0] && subirFlyer(e.target.files[0])} />
        {f.flyer_url ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.flyer_url} alt="Flyer del remate" className="absolute inset-0 h-full w-full object-contain" />
            <span className="absolute bottom-3 rounded-full bg-zinc-950/70 px-3 py-1 text-xs text-white">Tocá para cambiarlo</span>
          </>
        ) : (
          <>
            <span className="text-2xl" aria-hidden="true">🖼</span>
            <span className="mt-2 text-sm font-semibold text-ink">{subiendo ? 'Subiendo…' : 'Subí el flyer del remate'}</span>
            <span className="mt-0.5 text-xs text-zinc-500">Foto o imagen, hasta 5 MB. Se muestra en la ficha del remate.</span>
          </>
        )}
      </label>
      {f.flyer_url && (
        <button type="button" onClick={() => setF((x) => ({ ...x, flyer_url: '' }))} className="-mt-3 text-xs text-zinc-500 hover:text-negative">
          Quitar flyer
        </button>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className={ETIQUETA}>
          Fecha
          <input required type="date" value={f.date} onChange={set('date')} className={CAMPO} />
        </label>
        <label className={ETIQUETA}>
          Hora
          <input type="time" value={f.time} onChange={set('time')} className={CAMPO} />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className={ETIQUETA}>
          Lugar
          <input value={f.location} onChange={(e) => setLugar(e.target.value)} placeholder="Ej. Mercedes" className={CAMPO} />
        </label>
        <label className={ETIQUETA}>
          Provincia
          <select value={f.province} onChange={set('province')} className={CAMPO}>
            <option value="">Elegí</option>
            {PROVINCIAS.map((p) => (
              <option key={p} value={p}>{provinciaNombre(p)}</option>
            ))}
          </select>
        </label>
      </div>
      {lugares.length > 0 && (
        <div className="-mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-zinc-500">Donde ya rematás:</span>
          {lugares.map((l) => (
            <button
              key={l.location}
              type="button"
              onClick={() => setF((x) => ({ ...x, location: l.location, province: l.province ?? x.province }))}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${f.location.trim().toLowerCase() === l.location.toLowerCase() ? 'bg-accent text-white oscuro:text-zinc-950' : 'bg-zinc-800/70 text-zinc-300 hover:bg-zinc-700/70'}`}
            >
              {lugarConProvincia(l.location, l.province)}
            </button>
          ))}
        </div>
      )}

      <label className={ETIQUETA}>
        Nombre del remate <span className="font-normal text-zinc-500">(opcional)</span>
        <input value={f.title} onChange={set('title')} placeholder={nombreSolo || 'Ej. Remate de invernada en la Sociedad Rural'} className={CAMPO} />
        {!f.title.trim() && nombreSolo && <span className="mt-1 block text-xs font-normal text-zinc-500">Si no le ponés nombre, sale como «{nombreSolo}».</span>}
      </label>

      <button type="button" onClick={() => setMasDatos(!masDatos)} className="text-sm font-medium text-accent" aria-expanded={masDatos}>
        {masDatos ? '− Menos datos' : '+ Más datos (cabezas, catálogo, video…)'}
      </button>
      {masDatos && (
        <div className="space-y-4 rounded-2xl bg-zinc-800/30 p-4">
          <div className="grid grid-cols-2 gap-3">
            <label className={ETIQUETA}>
              Tipo
              <select value={f.type} onChange={set('type')} className={CAMPO}>
                {TIPOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <label className={ETIQUETA}>
              Categoría principal
              <select value={f.main_category} onChange={set('main_category')} className={CAMPO}>
                {CATEGORIAS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
          </div>
          <label className={ETIQUETA}>
            Cabezas (aprox.)
            <input type="number" min={1} value={f.estimated_heads} onChange={set('estimated_heads')} placeholder="500" className={CAMPO} />
          </label>
          <label className={ETIQUETA}>
            Qué se remata
            <textarea rows={3} value={f.description} onChange={set('description')} placeholder="Ej. 300 terneros Braford, 120 vaquillonas preñadas…" className={CAMPO} />
          </label>
          <label className={ETIQUETA}>
            Link del catálogo
            <input type="url" value={f.catalog_url} onChange={set('catalog_url')} placeholder="https://…" className={CAMPO} />
          </label>
          <label className={ETIQUETA}>
            Link de la transmisión o video
            <input type="url" value={f.youtube_url} onChange={set('youtube_url')} placeholder="https://youtube.com/…" className={CAMPO} />
          </label>
        </div>
      )}

      {f.date && <QuePasa fecha={f.date} esPro={esPro} alcanceMail={alcanceMail} />}

      {error && <p className="rounded-xl bg-negative/10 px-4 py-3 text-sm text-negative" role="alert">{error}</p>}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <BotonPrimario type="submit" disabled={guardando || subiendo}>{guardando ? 'Guardando…' : 'Guardar remate'}</BotonPrimario>
        {item?.propio && (
          <button type="button" onClick={borrar} className="text-sm text-zinc-500 hover:text-negative">Borrar remate</button>
        )}
      </div>
    </form>
  )
}

/** Lo que pasa con el remate apenas se guarda, calculado de la fecha. */
function QuePasa({ fecha, esPro, alcanceMail }: { fecha: string; esPro: boolean; alcanceMail: number }) {
  const hoy = hoyAr()
  const dias = diasHasta(fecha, hoy)
  const dia = new Date(fecha + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
  if (dias < 0) {
    return <p className="rounded-2xl bg-zinc-800/40 px-4 py-3 text-sm text-zinc-400">Esa fecha ya pasó ({dia}). Queda en tus remates anteriores.</p>
  }
  const cuando = dias === 0 ? 'Es hoy' : dias === 1 ? 'Es mañana' : `Faltan ${dias} días`
  const lunes = lunesDelMail(fecha, hoy, new Date(Date.now() - 3 * 3_600_000).getUTCHours())
  const lunesTxt = lunes ? new Date(lunes + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'numeric' }) : null
  return (
    <div className="rounded-2xl bg-zinc-800/40 p-4 text-sm">
      <p className="font-semibold text-ink">
        {cuando} <span className="font-normal text-zinc-500">· {dia}</span>
      </p>
      <ul className="mt-2 space-y-1 text-zinc-400">
        <li>✓ Sale en tu perfil al guardar y en el calendario en menos de una hora.</li>
        {alcanceMail > 0 && (
          <li>
            {lunesTxt
              ? esPro
                ? `✓ Va primero en el mail del lunes ${lunesTxt} a ${fmt(alcanceMail)} productores.`
                : `✓ Entra en el mail del lunes ${lunesTxt} a ${fmt(alcanceMail)} productores si queda lugar (los PRO van primero).`
              : '· Ya no llega al mail semanal: compartilo por WhatsApp con la tarjeta y el QR.'}
          </li>
        )}
        <li>✓ Después lo compartís y le abrís pre-ofertas desde la tarjeta.</li>
      </ul>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Pre-ofertas de UN remate                                            */
/* ------------------------------------------------------------------ */

function PreofertasRemate({
  slug,
  firma,
  esPro,
  soloLectura,
  item,
  preoferta: p,
  ofertas,
  onCambio,
}: {
  slug: string
  firma: string
  esPro: boolean
  soloLectura: boolean
  item: Item
  preoferta: PreofertaFirma | null
  ofertas: OfertaRecibida[]
  onCambio: (p: PreofertaFirma) => void
}) {
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lote, setLote] = useState({ cabezas: '', categoria: 'Terneros', peso_kg: '', video_url: '' })
  const [compartir, setCompartir] = useState(false)
  const base = `/api/consignatarias/${encodeURIComponent(slug)}/preofertas`

  if (!esPro) {
    return (
      <SoloPro
        titulo="Recibí ofertas antes del martillo"
        beneficio="Cargá los lotes de este remate con su video. El interesado deja su oferta y su contacto, y te llega por mail y a este panel."
        desde="preofertas"
      />
    )
  }

  async function correr<T extends { preoferta?: PreofertaFirma | null }>(method: string, url: string, body?: unknown) {
    setEnviando(true)
    setError(null)
    const r = await llamar<T>(method, url, body)
    setEnviando(false)
    if (!r.ok) {
      setError(r.error)
      return false
    }
    if (r.data.preoferta) onCambio(r.data.preoferta)
    return true
  }

  if (!p) {
    return (
      <div className="space-y-5">
        <p className="text-[0.9375rem] leading-relaxed text-zinc-400">
          Publicá los lotes de este remate antes del día: cada lote con cabezas, peso y su video. El que está interesado deja
          su oferta y su teléfono, y te llega a vos. Sirve para medir la demanda y llegar al remate con compradores.
        </p>
        <ol className="space-y-2 text-sm text-zinc-300">
          <li>1. Abrís las pre-ofertas de este remate.</li>
          <li>2. Cargás los lotes (cabezas, categoría, peso y el link del video).</li>
          <li>3. Publicás y compartís el link por WhatsApp.</li>
        </ol>
        {error && <p className="text-sm text-negative" role="alert">{error}</p>}
        {!soloLectura && (
          <BotonPrimario
            disabled={enviando}
            onClick={() =>
              correr<{ preoferta: PreofertaFirma }>('POST', base, {
                titulo: item.title,
                fecha_remate: item.date,
                lugar: item.location || null,
                cierre: `${item.date}T${item.time && /^\d{2}:\d{2}/.test(item.time) ? item.time.slice(0, 5) : '12:00'}:00-03:00`,
                remate_clave: item.clave,
              })
            }
          >
            {enviando ? 'Abriendo…' : 'Abrir pre-ofertas para este remate'}
          </BotonPrimario>
        )}
      </div>
    )
  }

  const deEsta = ofertas.filter((o) => o.preoferta_id === p.id)
  const url = `/api/consignatarias/${encodeURIComponent(slug)}/preofertas/${p.id}`
  const publica = `https://www.consignatarias.com.ar/preofertas/f/${p.id}`

  if (compartir) {
    return (
      <div className="space-y-4">
        <button type="button" onClick={() => setCompartir(false)} className="text-sm text-zinc-500 hover:text-ink">← Volver a los lotes</button>
        <CompartirRemate q={{ url: publica, firma, rotulo: 'Pre-ofertas abiertas', titulo: item.title, detalle: detalleDe(item), archivo: `preofertas-${item.date}`, slugFirma: slug }} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-zinc-800/40 px-4 py-3">
        <p className="text-sm">
          <span className={`mr-2 inline-block h-2 w-2 rounded-full ${p.estado === 'publicada' ? 'bg-positive' : p.estado === 'cerrada' ? 'bg-zinc-500' : 'bg-warning'}`} aria-hidden="true" />
          <span className="font-semibold text-ink">{p.estado === 'publicada' ? 'Publicada' : p.estado === 'cerrada' ? 'Cerrada' : 'Sin publicar'}</span>
          <span className="text-zinc-500"> · {p.lotes.length} {p.lotes.length === 1 ? 'lote' : 'lotes'} · {deEsta.length} {deEsta.length === 1 ? 'oferta' : 'ofertas'}</span>
        </p>
        {!soloLectura && (
          <div className="flex gap-2">
            {p.estado === 'borrador' && (
              <BotonPrimario disabled={enviando || p.lotes.length === 0} onClick={() => correr('PATCH', url, { estado: 'publicada' })}>Publicar</BotonPrimario>
            )}
            {p.estado === 'publicada' && (
              <>
                <BotonPrimario onClick={() => setCompartir(true)}>Compartir</BotonPrimario>
                <BotonSecundario disabled={enviando} onClick={() => correr('PATCH', url, { estado: 'cerrada' })}>Cerrar</BotonSecundario>
              </>
            )}
            {p.estado === 'cerrada' && (
              <BotonSecundario disabled={enviando} onClick={() => correr('PATCH', url, { estado: 'publicada' })}>Reabrir</BotonSecundario>
            )}
          </div>
        )}
      </div>
      {p.estado === 'borrador' && p.lotes.length === 0 && <p className="-mt-3 text-sm text-zinc-500">Cargá al menos un lote para poder publicar.</p>}
      {p.estado !== 'borrador' && (
        <Link href={`/preofertas/f/${p.id}`} target="_blank" className="-mt-3 inline-block text-sm text-accent hover:underline">Ver cómo la ve el comprador ↗</Link>
      )}

      {p.lotes.length > 0 && (
        <ul className="space-y-3">
          {p.lotes.map((l) => {
            const video = videoDelLote(l.video_url)
            const deLote = deEsta.filter((o) => o.lote_id === l.id)
            return (
              <li key={l.id} className="rounded-2xl border border-terminal-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{l.titulo}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {[l.cabezas != null ? `${fmt(l.cabezas)} cab.` : null, l.categoria, l.peso_kg != null ? `${fmt(l.peso_kg)} kg` : null].filter(Boolean).join(' · ')}
                      {video ? <> · <a href={video.href} target="_blank" rel="noopener noreferrer" className="text-accent">video</a></> : <span className="text-warning"> · sin video</span>}
                    </p>
                  </div>
                  {!soloLectura && deLote.length === 0 && (
                    <button type="button" disabled={enviando} onClick={() => confirm(`¿Quitar «${l.titulo}»?`) && correr('DELETE', `${url}/lotes/${l.id}`)} className="text-xs text-zinc-500 hover:text-negative">
                      Quitar
                    </button>
                  )}
                </div>
                {deLote.length > 0 && (
                  <ul className="mt-3 space-y-2 border-t border-terminal-border pt-3">
                    {deLote.map((o) => (
                      <li key={o.id} className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                        <span className="text-ink">{o.nombre ?? 'Sin nombre'}</span>
                        <span className="tabular-nums text-ink">{o.monto != null ? `$ ${fmt(o.monto)}` : 'Sin monto'}</span>
                        <span className="w-full text-xs text-zinc-500">
                          {o.telefono && <a href={`tel:${o.telefono.replace(/[^\d+]/g, '')}`} className="mr-3 text-accent">{o.telefono}</a>}
                          {o.email && <a href={`mailto:${o.email}`} className="text-accent">{o.email}</a>}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {!soloLectura && p.estado !== 'cerrada' && (
        <form
          className="space-y-3 rounded-2xl bg-zinc-800/30 p-4"
          onSubmit={async (e) => {
            e.preventDefault()
            const n = p.lotes.length + 1
            const ok = await correr('POST', `${url}/lotes`, {
              titulo: `Lote ${n} · ${lote.cabezas} ${lote.categoria.toLowerCase()}`,
              categoria: lote.categoria,
              cabezas: lote.cabezas,
              peso_kg: lote.peso_kg,
              video_url: lote.video_url,
              orden: n,
            })
            if (ok) setLote((x) => ({ ...x, cabezas: '', peso_kg: '', video_url: '' }))
          }}
        >
          <p className="text-sm font-semibold text-ink">Agregar un lote</p>
          <div className="grid grid-cols-3 gap-2">
            <label className="text-xs text-zinc-400">
              Cabezas
              <input required type="number" min={1} value={lote.cabezas} onChange={(e) => setLote((x) => ({ ...x, cabezas: e.target.value }))} className={CAMPO} />
            </label>
            <label className="text-xs text-zinc-400">
              Categoría
              <select value={lote.categoria} onChange={(e) => setLote((x) => ({ ...x, categoria: e.target.value }))} className={CAMPO}>
                {CATEGORIAS_LOTE.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label className="text-xs text-zinc-400">
              Peso (kg)
              <input type="number" min={1} value={lote.peso_kg} onChange={(e) => setLote((x) => ({ ...x, peso_kg: e.target.value }))} className={CAMPO} />
            </label>
          </div>
          <label className="block text-xs text-zinc-400">
            Link del video (YouTube, Vimeo o Drive)
            <input type="url" value={lote.video_url} onChange={(e) => setLote((x) => ({ ...x, video_url: e.target.value }))} placeholder="https://youtu.be/…" className={CAMPO} />
          </label>
          <BotonPrimario type="submit" disabled={enviando}>{enviando ? 'Agregando…' : '+ Agregar lote'}</BotonPrimario>
        </form>
      )}
      {error && <p className="rounded-xl bg-negative/10 px-4 py-3 text-sm text-negative" role="alert">{error}</p>}
    </div>
  )
}
