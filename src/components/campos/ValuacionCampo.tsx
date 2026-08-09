'use client'

import { useMemo, useState } from 'react'
import { TIERRA_PROVINCIAS, tierraDe, zonasDe, valuarCampo, type Valuacion } from '@/lib/valuacion-campos'

/**
 * Tasador de campos — la pieza visual pesada de la inmobiliaria rural.
 *
 * Muestra el número grande arriba (US$/ha y total), y debajo cómo se llegó: la
 * vía de renta contra la de comparables, con la posición del campo dentro del
 * rango real de su provincia. La barra p25–p75 es lo que hace entender de un
 * vistazo si el campo está barato, en precio, o caro para su zona.
 *
 * Interactivo a propósito: mover el canon y ver moverse la valuación es lo que
 * convierte una calculadora en una herramienta que alguien vuelve a abrir.
 */
const fmtUsd = (n: number) => 'US$' + Math.round(n).toLocaleString('es-AR')
const fmtUsdCompacto = (n: number) =>
  n >= 1_000_000
    ? `US$${(n / 1_000_000).toLocaleString('es-AR', { maximumFractionDigits: 2 })}M`
    : fmtUsd(n)

export default function ValuacionCampo({
  hectareasInicial = 500,
  provinciaInicial = 'Buenos Aires',
  kgHaMesInicial = 5,
  compacto = false,
}: {
  hectareasInicial?: number
  provinciaInicial?: string
  kgHaMesInicial?: number | null
  compacto?: boolean
}) {
  const [hectareas, setHectareas] = useState(hectareasInicial)
  const [provincia, setProvincia] = useState(provinciaInicial)
  const [zona, setZona] = useState<string>('')
  // Mientras el usuario no toque el canon, seguimos el típico de la zona: así el
  // slider arranca en un número que existe en el campo, no en uno inventado.
  const [canonTocado, setCanonTocado] = useState(kgHaMesInicial != null)
  const [kgHaMes, setKgHaMes] = useState<number>(kgHaMesInicial || 4.5)

  const zonas = useMemo(() => zonasDe(provincia), [provincia])
  const canonTipico = useMemo(
    () => tierraDe(provincia, zona || null)?.kg_ha_mes_canon ?? null,
    [provincia, zona],
  )
  const canon = canonTocado ? kgHaMes : (canonTipico ?? kgHaMes)

  const v: Valuacion = useMemo(
    () => valuarCampo({ hectareas, provincia, zona: zona || null, kgHaMes: canon }),
    [hectareas, provincia, zona, canon],
  )

  const comp = v.porComparables
  // Posición del valor calculado dentro del rango real de la provincia (0-100%).
  const posicion = comp
    ? Math.max(0, Math.min(100, ((v.usdHa - comp.p25) / Math.max(1, comp.p75 - comp.p25)) * 100))
    : null

  const lectura =
    !comp || posicion === null
      ? null
      : posicion < 20
        ? { texto: 'Por debajo del rango de la zona', color: 'text-emerald-400' }
        : posicion > 80
          ? { texto: 'En la banda alta de la zona', color: 'text-amber-400' }
          : { texto: 'Dentro del rango de la zona', color: 'text-zinc-300' }

  return (
    <div className="border border-zinc-800 rounded-xl bg-gradient-to-b from-zinc-900/80 to-zinc-950 overflow-hidden">
      {/* Número grande */}
      <div className="p-6 border-b border-zinc-800">
        <p className="text-zinc-500 text-xs uppercase tracking-[0.16em] mb-2">Valor estimado</p>
        <div className="flex items-end gap-3 flex-wrap">
          <span className="text-4xl sm:text-5xl font-mono text-zinc-50 leading-none tabular-nums">
            {fmtUsd(v.usdHa)}
          </span>
          <span className="text-zinc-500 text-sm mb-1">por hectárea</span>
        </div>
        <p className="text-accent text-xl font-mono mt-2 tabular-nums">
          {fmtUsdCompacto(v.usdTotal)} <span className="text-zinc-500 text-sm font-sans">el campo entero</span>
        </p>
        {lectura && (
          <p className={`text-xs mt-3 ${lectura.color}`}>
            ● {lectura.texto}
            {comp ? ` (${fmtUsd(comp.p25)} – ${fmtUsd(comp.p75)} por ha en ${comp.region})` : ''}
          </p>
        )}
      </div>

      {/* Controles */}
      <div className="p-6 border-b border-zinc-800 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-zinc-400 text-xs block mb-1.5">Provincia</span>
            <select
              value={provincia}
              onChange={(e) => {
                setProvincia(e.target.value)
                setZona('')
              }}
              className="w-full px-3 py-2 text-sm bg-zinc-900 border border-zinc-800 rounded text-zinc-200 focus:outline-none focus:border-zinc-600"
            >
              {TIERRA_PROVINCIAS.map((t) => (
                <option key={t.provincia} value={t.provincia}>
                  {t.provincia}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-zinc-400 text-xs block mb-1.5">
              Zona {zonas.length === 0 && <span className="text-zinc-600">(sin relevar)</span>}
            </span>
            <select
              value={zona}
              onChange={(e) => setZona(e.target.value)}
              disabled={zonas.length === 0}
              className="w-full px-3 py-2 text-sm bg-zinc-900 border border-zinc-800 rounded text-zinc-200 focus:outline-none focus:border-zinc-600 disabled:opacity-40"
            >
              <option value="">Toda la provincia</option>
              {zonas.map((t) => (
                <option key={t.zona} value={t.zona as string}>
                  {t.zona}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-zinc-400 text-xs block mb-1.5">Hectáreas</span>
            <input
              type="number"
              min={1}
              value={hectareas}
              onChange={(e) => setHectareas(Math.max(1, Number(e.target.value) || 1))}
              className="w-full px-3 py-2 text-sm bg-zinc-900 border border-zinc-800 rounded text-zinc-200 font-mono focus:outline-none focus:border-zinc-600"
            />
          </label>
        </div>

        <label className="block">
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-zinc-400 text-xs">Canon de arrendamiento</span>
            <span className="text-accent font-mono text-sm tabular-nums">
              {canon.toLocaleString('es-AR', { maximumFractionDigits: 1 })} kg/ha/mes
            </span>
          </div>
          <input
            type="range"
            min={0.1}
            max={20}
            step={0.1}
            value={canon}
            onChange={(e) => {
              setCanonTocado(true)
              setKgHaMes(Number(e.target.value))
            }}
            className="w-full accent-sky-400"
          />
          <div className="flex justify-between text-xxs text-zinc-600 mt-1">
            <span>0,1</span>
            <span>
              {!canonTocado && canonTipico
                ? `típico de la zona · movelo si sabés el tuyo`
                : 'kilos de novillo por hectárea por mes'}
            </span>
            <span>20</span>
          </div>
        </label>
      </div>

      {/* Las dos vías */}
      {!compacto && (
        <div className="p-6 space-y-4">
          <p className="text-zinc-500 text-xs uppercase tracking-[0.16em]">Cómo se llega</p>

          {v.porRenta && (
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-zinc-800/60">
              <div>
                <p className="text-zinc-200 text-sm">Por lo que renta</p>
                <p className="text-zinc-500 text-xs mt-0.5">
                  {fmtUsd(v.porRenta.canonAnualUsdHa)}/ha al año × {v.porRenta.anos} años
                </p>
              </div>
              <span className="text-zinc-100 font-mono text-sm shrink-0 tabular-nums">
                {fmtUsd(v.porRenta.usdHa)}/ha
              </span>
            </div>
          )}

          {comp && (
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-zinc-800/60">
              <div>
                <p className="text-zinc-200 text-sm">Por lo que se paga en la zona</p>
                <p className="text-zinc-500 text-xs mt-0.5">
                  {comp.region} · {comp.n === 1 ? 'tasación de referencia' : `${comp.n} referencias relevadas`}
                </p>
              </div>
              <span className="text-zinc-100 font-mono text-sm shrink-0 tabular-nums">
                {fmtUsd(comp.usdHa)}/ha
              </span>
            </div>
          )}

          {/* Barra de rango: dónde cae este campo dentro de su provincia */}
          {comp && posicion !== null && (
            <div className="pt-1">
              <div className="relative h-2 rounded-full bg-zinc-800 overflow-visible">
                <div className="absolute inset-y-0 left-0 right-0 rounded-full bg-gradient-to-r from-emerald-500/30 via-sky-500/30 to-amber-500/30" />
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-sky-400 ring-2 ring-zinc-950"
                  style={{ left: `${posicion}%` }}
                />
              </div>
              <div className="flex justify-between text-xxs text-zinc-600 mt-1.5 tabular-nums">
                <span>{fmtUsd(comp.p25)}</span>
                <span className="text-zinc-500">rango de {comp.region}</span>
                <span>{fmtUsd(comp.p75)}</span>
              </div>
            </div>
          )}

          {v.esAgricola && (
            <p className="text-xs text-amber-300/90 border border-amber-500/30 rounded px-3 py-2 bg-amber-500/[0.04]">
              Esta zona es agrícola: la tierra se paga por lo que rinde en granos, no por lo que cría. El
              canon ganadero no explica su precio, así que acá vale el comparable de la zona.
            </p>
          )}

          {v.masAniosQueLaPampa && v.porRenta && (
            <p className="text-xs text-zinc-400 border border-zinc-800 rounded px-3 py-2 bg-zinc-900/50">
              Ahí la tierra equivale a {v.porRenta.anos} años de arrendamiento, contra los veintipico de la
              pampa húmeda. No es un error: en esas zonas el campo se paga también por lo que puede llegar a
              valer, no solo por lo que produce hoy.
            </p>
          )}

          {v.brecha !== null && Math.abs(v.brecha) > 25 && (
            <p className="text-xs text-zinc-400 border border-zinc-800 rounded px-3 py-2 bg-zinc-900/50">
              {v.brecha > 0
                ? `Lo que rinde está ${Math.round(v.brecha)}% por encima de lo que se paga en la zona: o el campo es mejor que el promedio de su provincia, o el canon está alto.`
                : `Lo que rinde está ${Math.abs(Math.round(v.brecha))}% por debajo de lo que se paga en la zona: o el canon quedó atrasado, o el campo vale por otra cosa además del pasto.`}
            </p>
          )}

          <p className="text-zinc-600 text-xxs leading-relaxed pt-1">
            Estimación orientativa a partir del canon y de precios relevados por provincia. Novillo tomado a
            US${v.novilloUsdKg.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/kg,
            promedio del mes anterior. No reemplaza una tasación profesional.
          </p>
        </div>
      )}
    </div>
  )
}
