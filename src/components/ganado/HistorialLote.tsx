'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  RANGOS,
  recortar,
  resumir,
  type PuntoHistorial,
  type Rango,
} from '@/lib/ganado-historial'

/**
 * La evolución del rodeo, con la interacción que el gráfico anterior no tenía.
 *
 * El sparkline previo era una silueta: sin ejes, sin hover, sin poder cambiar de moneda ni
 * de ventana. Mostraba treinta días porque era lo que había —la serie se armaba con las
 * visitas del usuario— y cuando el rodeo cambiaba dibujaba caídas del 93 % que nunca
 * pasaron.
 *
 * Acá la serie se recalcula contra los precios de cada fecha, así que existe desde el
 * primer día y llega hasta donde llegue el mercado: 2015. Lo que cambia para el que mira
 * es que puede preguntarle cosas — cuánto valía en marzo, cómo se ve en dólares, qué pasó
 * en dos años.
 */

const ALTO = 150
const PAD = { top: 12, right: 8, bottom: 22, left: 8 }

function fmtArs(n: number): string {
  return '$' + Math.round(n).toLocaleString('es-AR')
}
function fmtUsd(n: number): string {
  return 'USD ' + Math.round(n).toLocaleString('es-AR')
}
function fmtFecha(iso: string, largo = false): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    ...(largo ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  })
}

export function HistorialLote({ serie, metodo }: { serie: PuntoHistorial[]; metodo?: string }) {
  const [rango, setRango] = useState<Rango>('30d')
  const [moneda, setMoneda] = useState<'ars' | 'usd'>('ars')
  const [hover, setHover] = useState<number | null>(null)

  // En dólares no tiene sentido ofrecer un rango sin cotización; si la serie no trae USD,
  // el toggle se apaga en vez de dibujar una línea plana en cero.
  const hayUsd = useMemo(() => serie.some((p) => p.usd != null), [serie])
  useEffect(() => {
    if (!hayUsd && moneda === 'usd') setMoneda('ars')
  }, [hayUsd, moneda])

  const datos = useMemo(() => recortar(serie, rango), [serie, rango])
  const resumen = useMemo(() => resumir(datos), [datos])

  const valores = datos.map((p) => (moneda === 'usd' ? (p.usd ?? 0) : p.ars))
  const min = Math.min(...valores)
  const max = Math.max(...valores)
  const span = max - min || 1

  // ViewBox de 0-100 en X: el SVG escala solo y no hace falta medir el contenedor.
  const puntos = valores.map((v, i) => ({
    x: datos.length > 1 ? (i / (datos.length - 1)) * 100 : 50,
    y: PAD.top + (1 - (v - min) / span) * (ALTO - PAD.top - PAD.bottom),
  }))

  const linea = puntos.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const area = `${linea} L100,${ALTO - PAD.bottom} L0,${ALTO - PAD.bottom} Z`
  const sube = (resumen?.cambioArs ?? 0) >= 0
  const color = sube ? '#4ade80' : '#f87171'

  const activo = hover != null ? datos[hover] : null
  const fmt = moneda === 'usd' ? fmtUsd : fmtArs
  const valorDe = (p: PuntoHistorial) => (moneda === 'usd' ? (p.usd ?? 0) : p.ars)

  if (datos.length < 2) {
    return (
      <p className="text-sm text-zinc-400">
        Todavía no hay serie para este rango. Probá con una ventana más larga.
      </p>
    )
  }

  return (
    <div>
      {/* Controles: ventana y moneda */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {RANGOS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => { setRango(r.id); setHover(null) }}
              className={`rounded px-2.5 py-1 text-xs transition-colors ${
                rango === r.id
                  ? 'bg-accent/15 text-accent'
                  : 'text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="flex overflow-hidden rounded border border-zinc-700">
          {(['ars', 'usd'] as const).map((m) => (
            <button
              key={m}
              type="button"
              disabled={m === 'usd' && !hayUsd}
              onClick={() => setMoneda(m)}
              className={`px-3 py-1 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                moneda === m ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {m === 'ars' ? 'ARS' : 'USD'}
            </button>
          ))}
        </div>
      </div>

      {/* El número del punto donde está el mouse — o el de hoy si no hay hover. */}
      <div className="mb-2 flex items-baseline gap-3">
        <span className="font-mono text-xl text-zinc-100">
          {fmt(activo ? valorDe(activo) : valorDe(datos[datos.length - 1]))}
        </span>
        <span className="text-xs text-zinc-500">
          {activo ? fmtFecha(activo.fecha, true) : 'hoy'}
        </span>
        {!activo && resumen && (
          <span className={`text-xs ${sube ? 'text-positive' : 'text-negative'}`}>
            {sube ? '+' : ''}
            {(moneda === 'usd' && resumen.cambioPctUsd != null
              ? resumen.cambioPctUsd
              : resumen.cambioPctArs
            ).toFixed(1)}
            % en el período
          </span>
        )}
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 100 ${ALTO}`}
          preserveAspectRatio="none"
          className="h-[150px] w-full cursor-crosshair"
          onMouseLeave={() => setHover(null)}
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect()
            const pct = (e.clientX - r.left) / r.width
            setHover(Math.max(0, Math.min(datos.length - 1, Math.round(pct * (datos.length - 1)))))
          }}
          onTouchMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect()
            const pct = (e.touches[0].clientX - r.left) / r.width
            setHover(Math.max(0, Math.min(datos.length - 1, Math.round(pct * (datos.length - 1)))))
          }}
        >
          <defs>
            <linearGradient id="hl-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#hl-fill)" />
          <path
            d={linea}
            fill="none"
            stroke={color}
            strokeWidth="0.6"
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
          />
          {hover != null && puntos[hover] && (
            <>
              <line
                x1={puntos[hover].x}
                y1={PAD.top}
                x2={puntos[hover].x}
                y2={ALTO - PAD.bottom}
                stroke="#71717a"
                strokeWidth="0.4"
                vectorEffect="non-scaling-stroke"
                strokeDasharray="2 2"
              />
              <circle cx={puntos[hover].x} cy={puntos[hover].y} r="1.2" fill={color} />
            </>
          )}
        </svg>

        {/* Etiqueta flotante. Va en HTML y no en SVG para que el texto no se deforme con
            el preserveAspectRatio="none" del viewBox. */}
        {activo && puntos[hover!] && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 rounded border border-zinc-700 bg-zinc-900/95 px-2 py-1 text-xs shadow-lg"
            style={{
              left: `${Math.min(88, Math.max(12, puntos[hover!].x))}%`,
              top: `${(puntos[hover!].y / ALTO) * 100}%`,
              marginTop: -42,
            }}
          >
            <div className="font-mono text-zinc-100">{fmt(valorDe(activo))}</div>
            <div className="text-[10px] text-zinc-500">{fmtFecha(activo.fecha, true)}</div>
          </div>
        )}
      </div>

      {resumen && (
        <div className="mt-1 flex items-baseline justify-between text-xs text-zinc-500">
          <span>{fmtFecha(resumen.desde.fecha, true)}</span>
          <span className="text-zinc-600">
            mín {fmt(valorDe(resumen.min))} · máx {fmt(valorDe(resumen.max))}
          </span>
          <span>{fmtFecha(resumen.hasta.fecha, true)}</span>
        </div>
      )}

      {metodo && <p className="mt-3 text-[10px] leading-relaxed text-zinc-600">{metodo}</p>}
    </div>
  )
}
