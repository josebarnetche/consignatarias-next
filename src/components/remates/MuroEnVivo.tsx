'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Radio, Phone, MessageCircle, Volume2, VolumeX, Maximize2, Minimize2,
  ExternalLink, RefreshCw, X, Play, History,
} from 'lucide-react'
import { trackValueEvent, emitValueBeacon } from '@/lib/analytics'
import type { StreamItem } from '@/components/remates/StreamWall'
import type { Repeticion } from '@/lib/remates-en-vivo'

/**
 * El muro: varias ferias al mismo tiempo, y el teléfono de cada una a un toque.
 *
 * LO QUE SE MIDIÓ ANTES DE ESTA VERSIÓN (30 días al 21-sep-2026): la mediana de
 * permanencia en /remates/en-vivo era de 20 segundos y sólo el 7,6 % se quedaba
 * más de dos minutos — por DEBAJO del promedio del sitio, en la página que debería
 * ser la más pegajosa. El 70 % de esas visitas llegaba en horario de remates. No
 * entraban cuando no había nada: entraban cuando había, y no encontraban motivo
 * para quedarse. Las decisiones de abajo salen de ahí.
 *
 * 1. NUNCA UNA PANTALLA VACÍA. Un lunes hay tres remates y de noche ninguno: el
 *    estado vacío es el estado más común. Cuando nadie transmite, el muro pone solo
 *    el último remate grabado —marcado REPETICIÓN, con su fecha— y avisa cuándo
 *    arranca el próximo. Cuando arranca, la repetición le deja el lugar sola.
 * 2. NUNCA SACARLE EL PLAYER A QUIEN LO ESTÁ MIRANDO. Si una transmisión se corta,
 *    el recuadro queda, marcado TERMINÓ, con el teléfono de la firma. Se va cuando
 *    el usuario lo cierra, no cuando el servidor deja de verla.
 * 3. PESO. Cada player de YouTube es más de un mega de JavaScript, y el que mira
 *    esta página suele estar en el campo con 4G. Se reproducen a la vez hasta 1 en
 *    el teléfono, 2 en tablet y 4 en escritorio; el resto queda como miniatura con
 *    la imagen EN VIVO del momento, y entra con un toque.
 * 4. LA PESTAÑA TRABAJA. El título dice cuántos remates hay al aire, y si arranca
 *    uno mientras el usuario está en otra pestaña, se lo avisa ahí.
 * 5. EL SONIDO ES DE A UNO. Cuatro audios encimados no son una función.
 *
 * DOS RELOJES: uno local cada 10 s para las cuentas regresivas, y uno de red cada
 * 30 s contra /api/remates/en-vivo/estado, que se adelanta al volver a la pestaña.
 */

const REFRESCO_MS = 30_000
/** Con la pestaña oculta se sigue mirando, pero más espaciado: es lo que permite
 *  avisar en el título que arrancó un remate sin gastar una consulta cada 30 s. */
const REFRESCO_OCULTO_MS = 120_000
const TIC_RELOJ_MS = 10_000
const LATIDO_MS = 5 * 60_000

type Tipo = 'vivo' | 'termino' | 'repeticion'

interface Recuadro {
  key: string
  tipo: Tipo
  embedUrl: string
  videoId: string | null
  firma: string
  titulo: string
  /** "14:00 hs · Chaco" en vivo; "Repetición del 10/9" en grabados. */
  detalle: string
  slug: string
  perfilHref: string
  watchUrl: string
  tel: string | null
  wa: string | null
  telVisible: string | null
}

export interface BandaReferencia {
  categoria: string
  p10: number
  mediana: number
  p90: number
}

interface Props {
  inicial: StreamItem[]
  /** Remates de hoy que todavía no salieron al aire, para la cuenta regresiva. */
  porVenir: Array<{ id: string; firma: string; hora: string | null; perfilHref: string }>
  repeticiones: Repeticion[]
  /** El Valor de Referencia de las últimas semanas, para tener al lado del martillo. */
  referencia: { bandas: BandaReferencia[]; desde: string; hasta: string } | null
}

// ─── helpers puros ──────────────────────────────────────────────────────────

function minutosArgentina(): number {
  const art = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }))
  return art.getHours() * 60 + art.getMinutes()
}

function minutosDeHora(t: string | null | undefined): number | null {
  if (!t || t === '00:00') return null
  const m = /^(\d{2}):(\d{2})/.exec(t)
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}

/** "en 12 min" · "en 1 h 05" · null si ya pasó o no sabemos la hora. */
function faltan(hora: string | null | undefined, ahora: number): string | null {
  const inicio = minutosDeHora(hora)
  if (inicio === null) return null
  const d = inicio - ahora
  if (d <= 0) return null
  if (d < 60) return `en ${d} min`
  return `en ${Math.floor(d / 60)} h ${String(d % 60).padStart(2, '0')}`
}

function fechaCorta(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${Number(d)}/${Number(m)}`
}

const pesos = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`

function conSonido(embedUrl: string, sonando: boolean): string {
  return sonando ? embedUrl.replace('mute=1', 'mute=0') : embedUrl
}

function embedDeVideo(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1`
}

function desdeStream(s: StreamItem, tipo: Tipo): Recuadro {
  return {
    key: s.id,
    tipo,
    embedUrl: s.embedUrl,
    videoId: s.videoId ?? null,
    firma: s.firma,
    titulo: s.titulo,
    detalle: [s.hora ? `${s.hora} hs` : null, s.lugar].filter(Boolean).join(' · '),
    slug: s.slug,
    perfilHref: s.perfilHref,
    watchUrl: s.watchUrl,
    tel: s.tel ?? null,
    wa: s.wa ?? null,
    telVisible: s.telVisible ?? null,
  }
}

function desdeRepeticion(r: Repeticion): Recuadro {
  return {
    key: r.id,
    tipo: 'repeticion',
    embedUrl: embedDeVideo(r.videoId),
    videoId: r.videoId,
    firma: r.firma,
    titulo: r.titulo,
    detalle: `Grabado el ${fechaCorta(r.fecha)}`,
    slug: r.perfilHref.split('/').pop() ?? '',
    perfilHref: r.perfilHref,
    watchUrl: r.watchUrl,
    tel: r.tel,
    wa: r.wa,
    telVisible: r.telVisible,
  }
}

/** Cuántos players a la vez según la pantalla. En el servidor, 1: es lo seguro. */
function cupoDePantalla(): number {
  if (typeof window === 'undefined') return 1
  if (window.matchMedia('(min-width: 1280px)').matches) return 4
  if (window.matchMedia('(min-width: 768px)').matches) return 2
  return 1
}

// ─── componente ─────────────────────────────────────────────────────────────

export default function MuroEnVivo({ inicial, porVenir, repeticiones, referencia }: Props) {
  const [streams, setStreams] = useState<StreamItem[]>(inicial)
  // Los que estuvieron al aire en esta visita y se cortaron: quedan en pantalla.
  const [terminados, setTerminados] = useState<Record<string, StreamItem>>({})
  const [cerrados, setCerrados] = useState<Set<string>>(() => new Set())
  const [ahora, setAhora] = useState<number>(() => minutosArgentina())
  const [ultimo, setUltimo] = useState<number>(() => Date.now())
  const [refrescando, setRefrescando] = useState(false)
  const [sonando, setSonando] = useState<string | null>(null)
  const [foco, setFoco] = useState<string | null>(null)
  // En el servidor y en la primera pintada, UN solo player: el HTML ya empieza a
  // bajar lo que haya en los iframes, y en un teléfono con 4G cuatro juntos es la
  // forma más rápida de que la página no cargue nunca. Se amplía al montar.
  const [cupo, setCupo] = useState(1)
  // Todo lo que depende del reloj (cuentas regresivas, "al día hace…") se pinta
  // recién después de montar: el servidor y el navegador no leen la hora en el
  // mismo instante, y un minuto de diferencia es un error de hidratación.
  const [montado, setMontado] = useState(false)
  const [pantalla, setPantalla] = useState<string[]>(() => {
    const primero = inicial.find((s) => s.enVivoAhora)
    if (primero) return [primero.id]
    return repeticiones[0] ? [repeticiones[0].id] : []
  })
  const vistosAlAire = useRef<Set<string>>(new Set(inicial.filter((s) => s.enVivoAhora).map((s) => s.id)))
  const enVuelo = useRef(false)
  const ultimaConsulta = useRef(0)
  const streamsRef = useRef<StreamItem[]>(inicial)
  // La repetición que puso el MURO (no el usuario). Es la única que se desaloja
  // sola cuando arranca un remate: la que eligió el usuario se respeta. Es estado
  // y no una ref a propósito: el armado de la pantalla tiene que poder correr dos
  // veces con el mismo resultado (React lo hace en desarrollo), y una ref mutada a
  // mitad de camino hacía que la segunda pasada ya no encontrara el relleno.
  const [relleno, setRelleno] = useState<string | null>(() =>
    inicial.some((s) => s.enVivoAhora) ? null : (repeticiones[0]?.id ?? null),
  )
  const tituloOriginal = useRef<string | null>(null)
  const avisoPestana = useRef<string | null>(null)

  // ── red ──
  const refrescar = useCallback(async () => {
    if (enVuelo.current || typeof document === 'undefined') return
    if (document.hidden && Date.now() - ultimaConsulta.current < REFRESCO_OCULTO_MS) return
    enVuelo.current = true
    ultimaConsulta.current = Date.now()
    setRefrescando(true)
    try {
      const r = await fetch('/api/remates/en-vivo/estado', { cache: 'no-store' })
      if (r.ok) {
        const data = (await r.json()) as { streams?: StreamItem[] }
        if (Array.isArray(data.streams)) {
          const nuevos = data.streams
          const alAireAhora = new Set(nuevos.filter((s) => s.enVivoAhora).map((s) => s.id))
          // Lo que estaba al aire y ya no: pasa a TERMINÓ en vez de desaparecer.
          const cortados = streamsRef.current.filter((s) => s.enVivoAhora && !alAireAhora.has(s.id))
          streamsRef.current = nuevos
          setStreams(nuevos)
          setTerminados((t) => {
            const n = { ...t }
            for (const s of cortados) n[s.id] = { ...s, enVivoAhora: false }
            // Si volvió al aire, deja de estar terminado.
            for (const id of alAireAhora) delete n[id]
            return n
          })
          // Arrancó uno nuevo con el usuario en otra pestaña: se lo decimos en el título.
          for (const s of nuevos) {
            if (s.enVivoAhora && !vistosAlAire.current.has(s.id)) {
              vistosAlAire.current.add(s.id)
              if (document.hidden) avisoPestana.current = `🔴 Arrancó ${s.firma}`
            }
          }
        }
        setUltimo(Date.now())
      }
      // Ante un error NO se toca nada: la pared que el usuario está mirando se queda.
    } catch {
      /* se reintenta en el próximo ciclo */
    } finally {
      enVuelo.current = false
      setRefrescando(false)
    }
  }, [])

  useEffect(() => {
    setCupo(cupoDePantalla())
    setMontado(true)
    const reloj = setInterval(() => setAhora(minutosArgentina()), TIC_RELOJ_MS)
    const red = setInterval(refrescar, REFRESCO_MS)
    const alVolver = () => {
      if (!document.hidden) {
        avisoPestana.current = null
        refrescar()
      }
    }
    document.addEventListener('visibilitychange', alVolver)
    return () => {
      clearInterval(reloj)
      clearInterval(red)
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [refrescar])

  // ── los recuadros disponibles ──
  const alAire = useMemo(() => streams.filter((s) => s.enVivoAhora), [streams])
  const recuadros = useMemo(() => {
    const m = new Map<string, Recuadro>()
    for (const s of alAire) m.set(s.id, desdeStream(s, 'vivo'))
    for (const s of Object.values(terminados)) if (!m.has(s.id)) m.set(s.id, desdeStream(s, 'termino'))
    for (const r of repeticiones) m.set(r.id, desdeRepeticion(r))
    return m
  }, [alAire, terminados, repeticiones])

  // ── armado automático de la pantalla ──
  // Regla: lo que está al aire entra solo mientras haya cupo; una repetición puesta
  // de relleno le cede el lugar al primer remate que arranca; lo que el usuario
  // cerró no vuelve a entrar solo.
  useEffect(() => {
    let p = pantalla.filter((k) => recuadros.has(k))
    let nuevoRelleno = relleno
    const vivosFuera = alAire.map((s) => s.id).filter((id) => !p.includes(id) && !cerrados.has(id))
    if (vivosFuera.length > 0) {
      // La repetición de relleno le cede el lugar al primer remate que arranca.
      // Una que abrió el usuario, no: eso lo decidió él.
      if (relleno && relleno !== foco && relleno !== sonando) p = p.filter((k) => k !== relleno)
      nuevoRelleno = null
      for (const id of vivosFuera) if (p.length < cupo) p.push(id)
    }
    if (p.length === 0 && alAire.length === 0 && repeticiones[0] && !cerrados.has(repeticiones[0].id)) {
      p = [repeticiones[0].id]
      nuevoRelleno = repeticiones[0].id
    }
    if (nuevoRelleno !== relleno) setRelleno(nuevoRelleno)
    const igual = p.length === pantalla.length && p.every((k, i) => k === pantalla[i])
    if (!igual) setPantalla(p)
  }, [pantalla, relleno, recuadros, alAire, cupo, cerrados, repeticiones, foco, sonando])

  const abrir = useCallback(
    (key: string, modo: 'vivo' | 'repeticion') => {
      setCerrados((c) => {
        if (!c.has(key)) return c
        const n = new Set(c)
        n.delete(key)
        return n
      })
      setRelleno((r) => (r === key ? null : r))
      // Se calcula FUERA del updater de setState: React lo ejecuta en el próximo
      // render, no acá, así que una lista llenada adentro llegaba vacía a la línea
      // de abajo y lo desplazado nunca quedaba marcado.
      const n = pantalla.includes(key) ? [...pantalla] : [...pantalla, key]
      const desplazados: string[] = []
      // Lleno: sale el que lleva más tiempo, salvo el enfocado y el que suena.
      while (n.length > cupo) {
        const i = n.findIndex((k) => k !== key && k !== foco && k !== sonando)
        if (i < 0) break
        desplazados.push(...n.splice(i, 1))
      }
      setPantalla(n)
      // Lo que el usuario sacó para hacer lugar no vuelve a entrar solo en el
      // próximo refresco: sigue en la fila de "al aire también", a un toque.
      if (desplazados.length > 0) {
        setCerrados((c) => {
          const n = new Set(c)
          for (const k of desplazados) n.add(k)
          return n
        })
      }
      const r = recuadros.get(key)
      trackValueEvent('live_click', { meta: { slug: r?.slug, modo: modo === 'vivo' ? 'embed' : 'repeticion', desde: 'muro' } })
      requestAnimationFrame(() => {
        document.getElementById(`stream-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
    },
    [pantalla, cupo, foco, sonando, recuadros],
  )

  const cerrar = useCallback((key: string) => {
    setRelleno((r) => (r === key ? null : r))
    setPantalla((p) => p.filter((k) => k !== key))
    setCerrados((c) => new Set(c).add(key))
    setFoco((f) => (f === key ? null : f))
    setSonando((s) => (s === key ? null : s))
    setTerminados((t) => {
      if (!(key in t)) return t
      const n = { ...t }
      delete n[key]
      return n
    })
  }, [])

  // ── la pestaña ──
  useEffect(() => {
    if (tituloOriginal.current === null) tituloOriginal.current = document.title
    const base = tituloOriginal.current
    document.title = avisoPestana.current
      ? `${avisoPestana.current} · ${base}`
      : alAire.length > 0
        ? `(${alAire.length}) 🔴 En vivo · ${base}`
        : base
  }, [alAire.length, ultimo])
  useEffect(() => () => {
    if (tituloOriginal.current !== null) document.title = tituloOriginal.current
  }, [])

  // ── el latido: permanencia real, no la que alcanza a registrar time_on_page ──
  const enPantallaRef = useRef<Recuadro[]>([])
  useEffect(() => {
    let minutos = 0
    const t = setInterval(() => {
      if (document.hidden || enPantallaRef.current.length === 0) return
      minutos += LATIDO_MS / 60_000
      const vivos = enPantallaRef.current.filter((r) => r.tipo === 'vivo').length
      emitValueBeacon('live_watch', {
        meta: { minutos, vivos, repeticiones: enPantallaRef.current.length - vivos },
      })
    }, LATIDO_MS)
    return () => clearInterval(t)
  }, [])

  // ── derivados para pintar ──
  const enPantalla = pantalla.map((k) => recuadros.get(k)).filter((r): r is Recuadro => !!r)
  enPantallaRef.current = enPantalla
  const enfocado = foco ? enPantalla.find((r) => r.key === foco) ?? null : null
  const resto = enfocado ? enPantalla.filter((r) => r.key !== enfocado.key) : enPantalla
  const columnas =
    resto.length <= 1 ? 'grid-cols-1'
      : resto.length === 3 ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
        : 'grid-cols-1 md:grid-cols-2'

  const vivosSinAbrir = alAire.filter((s) => !pantalla.includes(s.id))
  const repeticionesSinAbrir = repeticiones.filter((r) => !pantalla.includes(r.id))
  const idsEnPared = new Set(streams.map((s) => s.id))
  const faltantes = porVenir.filter((p) => !idsEnPared.has(p.id))
  const proxima = montado ? faltantes.find((p) => faltan(p.hora, ahora) !== null) ?? null : null
  const segundosDesde = Math.max(0, Math.round((Date.now() - ultimo) / 1000))
  const soloRepeticion = alAire.length === 0

  // El botón de llamar que queda fijo abajo en el teléfono: el del recuadro
  // enfocado, o el primero en vivo, o el que esté en pantalla.
  const paraLlamar =
    (enfocado && (enfocado.tel || enfocado.wa) ? enfocado : null) ??
    enPantalla.find((r) => r.tipo === 'vivo' && (r.tel || r.wa)) ??
    enPantalla.find((r) => r.tel || r.wa) ??
    null

  // Con UN solo player (lo más común: un remate, o la repetición de relleno), lo
  // que sigue va en una columna al costado en pantallas grandes —la guía de lo que
  // hay para mirar—. Antes la repetición ocupaba todo el ancho y empujaba debajo
  // del pliegue justo lo que da motivo para quedarse: los otros remates grabados y
  // cuándo arranca el próximo.
  const conLateral = enPantalla.length === 1

  const players =
    enPantalla.length > 0 ? (
      <div className="space-y-4">
        {enfocado && (
          <Cuadro
            r={enfocado}
            grande
            sonando={sonando === enfocado.key}
            onSonido={() => setSonando(sonando === enfocado.key ? null : enfocado.key)}
            enfocado
            onFoco={() => setFoco(null)}
            onCerrar={() => cerrar(enfocado.key)}
            permitirFoco={!conLateral}
          />
        )}
        {resto.length > 0 && (
          <div className={`grid ${columnas} gap-4`}>
            {resto.map((r) => (
              <Cuadro
                key={r.key}
                r={r}
                sonando={sonando === r.key}
                onSonido={() => setSonando(sonando === r.key ? null : r.key)}
                enfocado={false}
                onFoco={() => setFoco(r.key)}
                onCerrar={() => cerrar(r.key)}
                permitirFoco={!conLateral}
              />
            ))}
          </div>
        )}
      </div>
    ) : (
      <div className="border border-zinc-800 rounded-lg bg-zinc-900/30 px-4 py-8 text-center">
        <Radio className="w-6 h-6 text-zinc-700 mx-auto mb-3" />
        <p className="text-zinc-300 text-sm">Ninguna transmisión al aire en este momento.</p>
        <p className="text-zinc-600 text-xxs mt-2">
          Esta pantalla se actualiza sola: dejala abierta y los remates aparecen cuando salen al aire.
        </p>
      </div>
    )

  const lateral = (
    <>
      {/* Al aire pero sin abrir: miniatura con la imagen del momento, entra con un toque. */}
      {vivosSinAbrir.length > 0 && (
        <Fila titulo={`Al aire también (${vivosSinAbrir.length})`} lateral={conLateral}>
          {vivosSinAbrir.map((s) => (
            <Miniatura
              key={s.id}
              videoId={s.videoId ?? null}
              vivo
              firma={s.firma}
              linea={[s.hora ? `${s.hora} hs` : null, s.lugar].filter(Boolean).join(' · ')}
              onClick={() => abrir(s.id, 'vivo')}
              lateral={conLateral}
            />
          ))}
        </Fila>
      )}

      {/* Los que faltan hoy, con su cuenta regresiva. */}
      {faltantes.length > 0 && (
        <Fila titulo="Más tarde, hoy" lateral={conLateral}>
          {faltantes.map((p) => {
            const cuanto = montado ? faltan(p.hora, ahora) : null
            return (
              <Link
                key={p.id}
                href={p.perfilHref}
                className="shrink-0 lg:shrink min-w-0 max-w-full flex items-center gap-1.5 px-3 py-1.5 text-xs border border-zinc-800 text-zinc-400 hover:text-accent hover:border-accent rounded transition-colors"
              >
                <span className="truncate min-w-0">{p.firma}</span>
                {p.hora && <span className="text-zinc-600 font-mono">{p.hora}</span>}
                {cuanto && <span className="text-accent text-xxs whitespace-nowrap">{cuanto}</span>}
              </Link>
            )
          })}
        </Fila>
      )}

      {/* Lo que un comprador tiene en la cabeza cuando baja el martillo. */}
      {referencia && referencia.bandas.length > 0 && (
        <div className="border border-zinc-800 rounded-lg bg-zinc-900/30 px-3 py-2.5">
          <p className="text-zinc-400 text-xs mb-1.5">
            <span className="text-zinc-200 font-medium">Qué se pagó</span> · lotes del MAG del{' '}
            {fechaCorta(referencia.desde)} al {fechaCorta(referencia.hasta)}, $/kg vivo
          </p>
          <div className={conLateral ? 'grid grid-cols-1 gap-1' : 'flex flex-wrap gap-x-5 gap-y-1'}>
            {referencia.bandas.map((b) => (
              <p key={b.categoria} className="text-xs text-zinc-500 flex items-baseline gap-1.5">
                <span className="text-zinc-300">{b.categoria}</span>
                <span className="font-mono text-zinc-100">{pesos(b.mediana)}</span>
                <span className="font-mono text-zinc-600 text-xxs">
                  {pesos(b.p10)}–{pesos(b.p90)}
                </span>
              </p>
            ))}
          </div>
          <Link href="/vr" className="inline-block mt-2 text-xxs text-accent hover:underline">
            Cuánto vale tu hacienda, por peso →
          </Link>
        </div>
      )}

      {/* Remates grabados: lo que da para quedarse cuando no hay nada, y de a ratos también cuando hay. */}
      {repeticionesSinAbrir.length > 0 && (
        <Fila titulo="Remates grabados" icono={<History className="w-3.5 h-3.5 text-zinc-500" />} lateral={conLateral}>
          {repeticionesSinAbrir.map((r) => (
            <Miniatura
              key={r.id}
              videoId={r.videoId}
              firma={r.firma}
              linea={`${fechaCorta(r.fecha)} · ${r.titulo}`}
              onClick={() => abrir(r.id, 'repeticion')}
              lateral={conLateral}
            />
          ))}
        </Fila>
      )}
    </>
  )

  return (
    <section className={`mb-10 ${paraLlamar ? 'pb-20 md:pb-0' : ''}`}>
      {/* Estado: cuántos al aire y hace cuánto lo sabemos. */}
      <div className="flex items-center justify-between gap-x-3 gap-y-1 flex-wrap mb-3">
        <h2 className="text-zinc-100 text-sm md:text-lg font-medium flex items-center gap-2 min-w-0">
          {alAire.length > 0 ? (
            <>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-red-600 rounded text-sm font-bold text-white">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                {alAire.length}
              </span>
              {alAire.length === 1 ? 'remate al aire ahora' : 'remates al aire ahora'}
            </>
          ) : (
            <>
              <Radio className="w-4 h-4 text-zinc-600 shrink-0" />
              {proxima ? (
                <span>
                  Próxima transmisión: <span className="text-zinc-100">{proxima.firma}</span>
                  {proxima.hora ? <span className="text-zinc-400"> · {proxima.hora} hs</span> : null}
                  <span className="text-accent"> · {faltan(proxima.hora, ahora)}</span>
                </span>
              ) : (
                'Nadie está transmitiendo ahora'
              )}
            </>
          )}
        </h2>
        <button
          type="button"
          onClick={refrescar}
          className="flex items-center gap-1.5 text-xxs text-zinc-600 hover:text-zinc-300 transition-colors"
          title="Buscar transmisiones nuevas ahora"
        >
          <RefreshCw className={`w-3 h-3 ${refrescando ? 'animate-spin' : ''}`} />
          {refrescando
            ? 'buscando…'
            : !montado
              ? 'al día'
              : `al día hace ${segundosDesde < 60 ? `${segundosDesde} s` : `${Math.floor(segundosDesde / 60)} min`}`}
        </button>
      </div>

      {soloRepeticion && enPantalla.length > 0 && (
        <p className="text-zinc-500 text-xs mb-3">
          Mientras tanto, un remate grabado. Cuando arranque uno en vivo, aparece acá solo.
        </p>
      )}

      {conLateral ? (
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-5 lg:items-start">
          {players}
          <aside className="mt-4 lg:mt-0 space-y-4">{lateral}</aside>
        </div>
      ) : (
        <>
          {players}
          <div className="mt-4 space-y-4">{lateral}</div>
        </>
      )}

      {/* Teléfono: la llamada fija abajo, al alcance del pulgar. */}
      {paraLlamar && (
        <div
          className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-zinc-800 bg-[#09090b]/95 backdrop-blur px-4 pt-2.5 flex items-center gap-2"
          style={{ paddingBottom: 'calc(0.625rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <div className="min-w-0 flex-1">
            <p className="text-zinc-100 text-sm font-medium truncate">{paraLlamar.firma}</p>
            <p className="text-zinc-500 text-xxs truncate">
              {paraLlamar.tipo === 'vivo' ? 'En vivo ahora' : paraLlamar.tipo === 'termino' ? 'Terminó hace un rato' : paraLlamar.detalle}
            </p>
          </div>
          {paraLlamar.wa && (
            <a
              href={paraLlamar.wa}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackValueEvent('contact_whatsapp', { meta: { slug: paraLlamar.slug, desde: 'muro-barra' } })}
              className="flex items-center justify-center w-11 h-11 rounded border border-zinc-700 text-emerald-400"
              aria-label={`WhatsApp a ${paraLlamar.firma}`}
            >
              <MessageCircle className="w-5 h-5" />
            </a>
          )}
          {paraLlamar.tel && (
            <a
              href={paraLlamar.tel}
              onClick={() => trackValueEvent('contact_phone', { meta: { slug: paraLlamar.slug, desde: 'muro-barra' } })}
              className="flex items-center gap-1.5 h-11 px-4 rounded bg-accent text-zinc-950 text-sm font-semibold"
            >
              <Phone className="w-4 h-4" />
              Llamar
            </a>
          )}
        </div>
      )}
    </section>
  )
}

// ─── piezas ─────────────────────────────────────────────────────────────────

function Fila({
  titulo, icono, lateral = false, children,
}: {
  titulo: string
  icono?: React.ReactNode
  /** En la columna del costado (pantallas grandes): lista vertical en vez de tira. */
  lateral?: boolean
  children: React.ReactNode
}) {
  // En la columna, todo va en renglones a lo ancho, botones de texto incluidos: en
  // 300 px "Saenz Valiente, Bullrich y Cia. SA · 10:00 · en 7 h 37" no entra, y con
  // `flex-wrap` se salía de la columna en vez de achicarse.
  const distribucion = lateral
    ? 'md:flex-wrap md:overflow-visible lg:flex-col lg:flex-nowrap'
    : 'md:flex-wrap md:overflow-visible'
  return (
    <div>
      <p className="text-zinc-500 text-xs mb-2 flex items-center gap-1.5">
        {icono}
        {titulo}
      </p>
      {/* En el teléfono, una tira que se desliza con el dedo. */}
      <div className={`flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 ${distribucion}`}>{children}</div>
    </div>
  )
}

function Miniatura({
  videoId, vivo = false, firma, linea, onClick, lateral = false,
}: {
  videoId: string | null
  vivo?: boolean
  firma: string
  linea: string
  onClick: () => void
  /** En la columna del costado: renglón con miniatura chica a la izquierda. */
  lateral?: boolean
}) {
  // `mqdefault_live` es el cuadro ACTUAL de la transmisión: muestra qué está
  // entrando a la pista ahora mismo, que es lo que decide si vale la pena abrirla.
  const [src, setSrc] = useState(
    videoId ? `https://i.ytimg.com/vi/${videoId}/${vivo ? 'mqdefault_live' : 'mqdefault'}.jpg` : null,
  )
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group shrink-0 w-44 md:w-48 text-left border border-zinc-800 hover:border-accent rounded-lg overflow-hidden bg-zinc-900/40 transition-colors ${
        lateral ? 'lg:w-full lg:flex lg:items-center' : ''
      }`}
    >
      <div className={`relative aspect-video bg-zinc-900 ${lateral ? 'lg:w-28 lg:shrink-0' : ''}`}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
            onError={() => setSrc(videoId ? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` : null)}
          />
        ) : null}
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="w-9 h-9 rounded-full bg-black/60 group-hover:bg-red-600 flex items-center justify-center transition-colors">
            <Play className="w-4 h-4 text-white fill-white ml-0.5" />
          </span>
        </span>
        {vivo && (
          <span className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 bg-red-600 rounded-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span className="text-white text-[10px] font-bold">EN VIVO</span>
          </span>
        )}
      </div>
      <div className="px-2 py-1.5 min-w-0">
        <p className="text-zinc-200 text-xs font-medium truncate">{firma}</p>
        <p className="text-zinc-500 text-[10px] truncate">{linea}</p>
      </div>
    </button>
  )
}

function Cuadro({
  r, grande = false, sonando, onSonido, enfocado, onFoco, onCerrar, permitirFoco = true,
}: {
  r: Recuadro
  grande?: boolean
  sonando: boolean
  onSonido: () => void
  enfocado: boolean
  onFoco: () => void
  onCerrar: () => void
  /** Con un solo player en pantalla, "agrandar" no agranda nada: se esconde. */
  permitirFoco?: boolean
}) {
  return (
    <article
      id={`stream-${r.key}`}
      className={`border rounded-lg overflow-hidden bg-zinc-900/40 flex flex-col ${
        r.tipo === 'vivo' ? 'border-red-500/30' : 'border-zinc-800'
      }`}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-zinc-800">
        <div className="min-w-0">
          <p className={`text-zinc-100 font-medium truncate ${grande ? 'text-base' : 'text-sm'}`}>{r.firma}</p>
          <p className="text-zinc-500 text-xxs truncate">
            {r.titulo}
            {r.detalle ? ` · ${r.detalle}` : ''}
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-1">
          {r.tipo === 'vivo' && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-red-600 rounded-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span className="text-white text-xxs font-bold">EN VIVO</span>
            </span>
          )}
          {r.tipo === 'termino' && (
            <span className="px-1.5 py-0.5 bg-zinc-800 rounded-sm text-zinc-300 text-xxs font-bold">TERMINÓ</span>
          )}
          {r.tipo === 'repeticion' && (
            <span className="px-1.5 py-0.5 bg-zinc-800 rounded-sm text-zinc-300 text-xxs font-bold">REPETICIÓN</span>
          )}
          <button
            type="button"
            onClick={onCerrar}
            aria-label={`Cerrar ${r.firma}`}
            className="p-1 text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {r.tipo === 'termino' && (
        <p className="px-3 py-1.5 text-xxs text-zinc-400 bg-zinc-800/40 border-b border-zinc-800">
          La transmisión se cortó o terminó. Si algo te interesó, la firma sigue atendiendo.
        </p>
      )}

      <div className="relative w-full aspect-video bg-black">
        <iframe
          // La key cambia con el sonido para que el player se vuelva a montar:
          // YouTube no deja pasar de mudo a con sonido cambiando el src a secas.
          key={`${r.key}-${sonando ? 'audio' : 'mudo'}`}
          src={conSonido(r.embedUrl, sonando)}
          title={`${r.tipo === 'repeticion' ? 'Remate grabado' : 'Transmisión'} de ${r.firma}`}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          loading="lazy"
          className="absolute inset-0 h-full w-full"
          frameBorder={0}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-t border-zinc-800 mt-auto">
        {r.tel ? (
          <a
            href={r.tel}
            onClick={() => trackValueEvent('contact_phone', { meta: { slug: r.slug, desde: 'muro', tipo: r.tipo } })}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-accent hover:bg-accent-bright text-zinc-950 rounded transition-colors"
          >
            <Phone className="w-3.5 h-3.5" />
            Llamar {r.telVisible ? <span className="font-mono hidden sm:inline">{r.telVisible}</span> : 'a la firma'}
          </a>
        ) : (
          <Link
            href={r.perfilHref}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-accent hover:bg-accent-bright text-zinc-950 rounded transition-colors"
          >
            <Phone className="w-3.5 h-3.5" />
            Contacto de la firma
          </Link>
        )}
        {r.wa && (
          <a
            href={r.wa}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackValueEvent('contact_whatsapp', { meta: { slug: r.slug, desde: 'muro', tipo: r.tipo } })}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-zinc-700 text-zinc-300 hover:text-emerald-400 hover:border-emerald-500/40 rounded transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            WhatsApp
          </a>
        )}
        <Link href={r.perfilHref} className="text-xs text-zinc-500 hover:text-accent transition-colors">
          Ver firma
        </Link>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={onSonido}
            aria-label={sonando ? `Silenciar a ${r.firma}` : `Escuchar a ${r.firma}`}
            title={sonando ? 'Silenciar' : 'Escuchar este'}
            className={`p-1.5 rounded transition-colors ${sonando ? 'text-accent bg-accent/10' : 'text-zinc-500 hover:text-zinc-200'}`}
          >
            {sonando ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          {permitirFoco && (
          <button
            type="button"
            onClick={onFoco}
            aria-label={enfocado ? 'Volver a la grilla' : `Agrandar ${r.firma}`}
            title={enfocado ? 'Volver a la grilla' : 'Agrandar'}
            className="p-1.5 rounded text-zinc-500 hover:text-zinc-200 transition-colors hidden md:inline-flex"
          >
            {enfocado ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          )}
          <a
            href={r.watchUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir en YouTube"
            className="p-1.5 rounded text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </article>
  )
}
