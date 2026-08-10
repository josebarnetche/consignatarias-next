'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { TIERRA_PROVINCIAS, tierraDe, zonasDe, valuarCampo, precioSoja, type Valuacion } from '@/lib/valuacion-campos'

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
  // Los avisos de arrendamiento se publican casi siempre en kg/ha/AÑO ("60 kg de
  // novillo por hectárea, por año"), aunque el pago sea mensual. Si el tasador
  // solo aceptara el número mensual, cualquiera que copie el número de un aviso
  // se equivocaría por doce. Adentro siempre se trabaja en kg/ha/mes.
  const [porAno, setPorAno] = useState(false)
  // Mientras el usuario no toque el canon, seguimos el típico de la zona: así el
  // slider arranca en un número que existe en el campo, no en uno inventado.
  const [canonTocado, setCanonTocado] = useState(kgHaMesInicial != null)
  const [kgHaMes, setKgHaMes] = useState<number>(kgHaMesInicial || 4.5)
  // Campo agrícola: el canon se pacta en quintales de soja por ha por año.
  const [qqHaAnio, setQqHaAnio] = useState<number | null>(null)

  const zonas = useMemo(() => zonasDe(provincia), [provincia])
  const referencia = useMemo(() => tierraDe(provincia, zona || null), [provincia, zona])
  const canonTipico = referencia?.kg_ha_mes_canon ?? null
  const canon = canonTocado ? kgHaMes : (canonTipico ?? kgHaMes)
  const agricola = referencia?.aptitud === 'agricola'
  const qq = qqHaAnio ?? referencia?.qq_soja_ha_anio ?? null

  const v: Valuacion = useMemo(
    () => valuarCampo({ hectareas, provincia, zona: zona || null, kgHaMes: canon, qqHaAnio: qq }),
    [hectareas, provincia, zona, canon, qq],
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

        {agricola ? (
          <label className="block">
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-zinc-400 text-xs">Arrendamiento (en soja)</span>
              <span className="text-accent font-mono text-sm tabular-nums">
                {(qq ?? 0).toLocaleString('es-AR', { maximumFractionDigits: 1 })} qq/ha/año
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={40}
              step={0.5}
              value={qq ?? 12}
              onChange={(e) => setQqHaAnio(Number(e.target.value))}
              className="w-full accent-sky-400"
            />
            <div className="flex justify-between text-xxs text-zinc-600 mt-1">
              <span>1</span>
              <span>
                {qqHaAnio === null && referencia?.qq_soja_ha_anio
                  ? 'típico de la zona · movelo si sabés el tuyo'
                  : 'quintales de soja por hectárea por año'}
              </span>
              <span>40</span>
            </div>
          </label>
        ) : (
        <label className="block">
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-zinc-400 text-xs">
              Canon de arrendamiento
              <span className="ml-2 inline-flex rounded overflow-hidden border border-zinc-800 align-middle">
                {([['mes', false], ['año', true]] as const).map(([etiqueta, valor]) => (
                  <button
                    key={etiqueta}
                    type="button"
                    onClick={() => setPorAno(valor)}
                    className={`px-2 py-0.5 text-xxs transition-colors ${
                      porAno === valor ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    por {etiqueta}
                  </button>
                ))}
              </span>
            </span>
            <span className="text-accent font-mono text-sm tabular-nums">
              {(porAno ? canon * 12 : canon).toLocaleString('es-AR', { maximumFractionDigits: 1 })}{' '}
              kg/ha/{porAno ? 'año' : 'mes'}
            </span>
          </div>
          <input
            type="range"
            min={porAno ? 1 : 0.1}
            max={porAno ? 240 : 20}
            step={porAno ? 1 : 0.1}
            value={porAno ? canon * 12 : canon}
            onChange={(e) => {
              setCanonTocado(true)
              const v = Number(e.target.value)
              setKgHaMes(porAno ? v / 12 : v)
            }}
            className="w-full accent-sky-400"
          />
          <div className="flex justify-between text-xxs text-zinc-600 mt-1">
            <span>{porAno ? '1' : '0,1'}</span>
            <span>
              {!canonTocado && canonTipico
                ? 'típico de la zona · movelo si sabés el tuyo'
                : `kilos de novillo por hectárea por ${porAno ? 'año' : 'mes'}`}
            </span>
            <span>{porAno ? '240' : '20'}</span>
          </div>
        </label>
        )}
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
                  {v.unidadCanon === 'qq_soja_anio'
                    ? `${v.canonUsado} quintales de soja por ha al año`
                    : `${v.canonUsado} kg de novillo por ha al mes`}{' '}
                  = {fmtUsd(v.porRenta.canonAnualUsdHa)}/ha al año × {v.porRenta.anos} años
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
            <p className="text-xs text-zinc-400 border border-zinc-800 rounded px-3 py-2 bg-zinc-900/50">
              Zona agrícola: acá la tierra se paga por lo que rinde en granos, así que el arrendamiento se
              pacta en <strong className="text-zinc-200">quintales de soja por hectárea por año</strong> y
              no en kilos de novillo. Es la misma cuenta, en otra moneda.
              {referencia?.rinde_soja_qq_ha
                ? ` Rinde de referencia de la zona: ${referencia.rinde_soja_qq_ha} qq/ha de soja de primera.`
                : ''}
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

          {referencia?.canon_fuente && (
            <p className="text-zinc-500 text-xxs leading-relaxed">
              Canon de referencia de la zona: {referencia.canon_fuente}.
            </p>
          )}

          <div className="border-t border-zinc-800 pt-4">
            <p className="text-zinc-300 text-xs mb-2">
              ¿Es tu campo y lo querés arrendar o vender?
            </p>
            <Link
              href={`/campos/publicar?provincia=${encodeURIComponent(provincia)}&hectareas=${hectareas}${
                zona ? `&partido=${encodeURIComponent(zona)}` : ''
              }${!v.esAgricola ? `&kg=${canon}` : ''}`}
              className="inline-block px-4 py-2 text-xs bg-accent hover:bg-accent-bright text-zinc-950 font-medium rounded transition-colors"
            >
              Publicarlo con estos datos
            </Link>
            <p className="text-zinc-600 text-xxs mt-2">
              Gratis. Tu contacto no se publica: las consultas te las pasamos nosotros.
            </p>
          </div>

          <p className="text-zinc-600 text-xxs leading-relaxed pt-1">
            Estimación orientativa a partir del canon y de precios relevados por zona.{' '}
            {v.unidadCanon === 'qq_soja_anio'
              ? `Soja tomada a US$${precioSoja().usdQuintal.toFixed(1)} el quintal (FOB de MAGYP${precioSoja().fecha ? ` del ${precioSoja().fecha}` : ''}, llevado a disponible).${precioSoja().desactualizado ? ' ⚠ El precio de la soja no se actualiza hace más de tres semanas.' : ''}`
              : `Novillo tomado a US$${v.novilloUsdKg.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/kg, promedio del mes anterior.`}{' '}
            No reemplaza una tasación profesional.
          </p>
        </div>
      )}
    </div>
  )
}
