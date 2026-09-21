'use client';

import { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { trackEvent, trackValueEvent } from '@/lib/analytics';
import { getReferenciaPorPeso } from '@/lib/vr';

/**
 * "¿Cuánto vale tu hacienda hoy?" — la puerta de entrada al Valor de Referencia.
 *
 * Antes multiplicaba `market-prices.json → categories[x].current` por un peso fijo por
 * categoría y arrancaba en TERNEROS. Dos problemas medidos el 21-sep-2026:
 *  1. Ese precio alterna entre observado y un ratio fijo sobre el INMAG según el día
 *     (ver lib/rodeo-vr.ts), y el del ternero es SIEMPRE un ratio: el MAG no opera
 *     terneros. La primera cifra que veía un productor en la home era inventada.
 *  2. El peso no se podía cambiar, y el peso mueve el precio por kilo más que el origen
 *     (vaca de 250 kg a 2.400 $/kg contra 3.200 a 500 kg).
 * Ahora: categoría + cabezas + peso → banda observada de lotes parecidos, con el rango y
 * los lotes que la sostienen. El ternero no está en la lista y se dice por qué.
 */
const CATEGORIES = [
  { key: 'novillos', label: 'Novillos', avgKg: 450 },
  { key: 'novillitos', label: 'Novillitos', avgKg: 350 },
  { key: 'vaquillonas', label: 'Vaquillonas', avgKg: 320 },
  { key: 'vacas', label: 'Vacas', avgKg: 450 },
  { key: 'toros', label: 'Toros', avgKg: 600 },
] as const;

type CategoryKey = typeof CATEGORIES[number]['key'];

export default function ValuationWidget() {
  const [category, setCategory] = useState<CategoryKey>('vacas');
  const [heads, setHeads] = useState(100);
  const [kg, setKg] = useState<number>(450);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Un evento de uso la primera vez que se toca la calculadora: denominador del embudo.
  const interactedRef = useRef(false);
  const markCalcInteraction = () => {
    if (interactedRef.current) return;
    interactedRef.current = true;
    trackEvent('valuation_calc_used', { category, source: 'vr' });
    trackValueEvent('tool_used', { meta: { tool: 'valuacion_vr', category } });
  };

  const ref = useMemo(() => getReferenciaPorPeso(category, kg), [category, kg]);
  const kilos = heads * kg;
  const label = CATEGORIES.find((c) => c.key === category)?.label.toLowerCase() ?? category;

  const fmt = (n: number) => Math.round(n).toLocaleString('es-AR');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          source: 'valuation_widget',
          metadata: { category, heads, kg },
        }),
      });
      if (res.ok) {
        setSubmitted(true);
        trackEvent('valuation_lead', {
          category,
          heads,
          estimated_value: ref.banda ? ref.banda.mediana * kilos : 0,
          source: 'valuation_widget',
        });
      }
    } catch {
      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-sky-500/10 via-zinc-900 to-zinc-900 border border-sky-500/30 rounded-xl p-6 md:p-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />

      <div className="relative z-10">
        <h3 className="text-xl font-medium text-zinc-100 mb-1">
          ¿Cuánto vale tu hacienda hoy?
        </h3>
        <p className="text-sm text-zinc-500 mb-6">
          Con lo que realmente se pagó por lotes parecidos al tuyo en el Mercado Agroganadero.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label htmlFor="vw-category" className="text-xs text-zinc-500 mb-1.5 block">Categoría</label>
            <select
              id="vw-category"
              value={category}
              onChange={(e) => {
                markCalcInteraction();
                const k = e.target.value as CategoryKey;
                setCategory(k);
                setKg(CATEGORIES.find((c) => c.key === k)?.avgKg ?? kg);
              }}
              className="w-full bg-zinc-900 border border-zinc-700 focus:border-sky-500/50 rounded-lg px-4 py-2.5 text-zinc-100 outline-none transition-colors cursor-pointer"
            >
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="vw-heads" className="text-xs text-zinc-500 mb-1.5 block">Cabezas</label>
            <input
              id="vw-heads"
              type="number"
              value={heads}
              onChange={(e) => { markCalcInteraction(); setHeads(Math.max(1, parseInt(e.target.value) || 1)); }}
              min={1}
              max={10000}
              className="w-full bg-zinc-900 border border-zinc-700 focus:border-sky-500/50 rounded-lg px-4 py-2.5 text-zinc-100 text-lg font-mono outline-none transition-colors"
            />
          </div>
          <div>
            <label htmlFor="vw-kg" className="text-xs text-zinc-500 mb-1.5 block">Peso promedio (kg)</label>
            <input
              id="vw-kg"
              type="number"
              value={kg}
              onChange={(e) => { markCalcInteraction(); setKg(Math.max(1, parseInt(e.target.value) || 1)); }}
              min={100}
              max={1000}
              className="w-full bg-zinc-900 border border-zinc-700 focus:border-sky-500/50 rounded-lg px-4 py-2.5 text-zinc-100 text-lg font-mono outline-none transition-colors"
            />
          </div>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-5 mb-5">
          {ref.banda ? (
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Valor de Referencia</div>
                <div className="text-4xl md:text-5xl font-medium text-accent tracking-tight tabular-nums">
                  ${fmt(ref.banda.mediana * kilos)}
                </div>
                <div className="text-sm text-zinc-300 font-mono mt-1">
                  entre ${fmt(ref.banda.p10 * kilos)} y ${fmt(ref.banda.p90 * kilos)}
                </div>
                <div className="text-xs text-zinc-500 mt-2 leading-relaxed">
                  {ref.base === 'rango_peso' && ref.rango
                    ? `${fmt(ref.banda.lotes)} lotes de ${label} de ${ref.rango.desde_kg}–${ref.rango.hasta_kg} kg`
                    : `${fmt(ref.banda.lotes)} lotes de ${label} de todos los pesos (no hay 30 lotes de ${kg} kg)`}
                  {' '}vendidos en {ref.ventana_dias} días · mediana ${fmt(ref.banda.mediana)}/kg
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-zinc-600 mb-1">Por cabeza</div>
                <div className="text-2xl font-medium text-zinc-300 tracking-tight tabular-nums">
                  ${fmt(ref.banda.mediana * kg)}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-400">
              No hay lotes observados suficientes para esa categoría en los últimos {ref.ventana_dias} días.
              Preferimos no mostrar un número.
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <Link
            href="/mi-ganado"
            className="inline-flex items-center justify-center px-6 py-2.5 bg-accent hover:bg-sky-300 text-zinc-950 font-medium rounded-lg text-sm transition-colors whitespace-nowrap"
          >
            Guardá tu rodeo y seguilo gratis →
          </Link>
          <Link
            href="/metodologia/vr"
            className="inline-flex items-center justify-center px-4 py-2.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Cómo se calcula
          </Link>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              aria-label="Correo electrónico para recibir el cierre mensual"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="flex-1 bg-zinc-900 border border-zinc-700 focus:border-sky-500/50 rounded-lg px-4 py-2.5 text-zinc-100 text-sm outline-none transition-colors"
              required
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 border border-zinc-700 hover:border-sky-500/50 text-zinc-200 font-medium rounded-lg text-sm transition-colors whitespace-nowrap disabled:opacity-60"
            >
              {isSubmitting ? 'Enviando...' : 'Recibí el cierre mensual'}
            </button>
          </form>
        ) : (
          <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-3">
            <span>✓</span>
            <span>Listo. El 1° de cada mes te mandamos el cierre del INMAG. Un mail por mes, sin spam.</span>
          </div>
        )}

        <div className="text-[10px] text-zinc-600 mt-4 flex flex-wrap gap-x-4 gap-y-1">
          <span>Precios observados, no estimados</span>
          <span>•</span>
          <span>Terneros: el MAG no los opera, no hay precio observado</span>
          <span>•</span>
          <span>Sin flete ni comisión</span>
        </div>
      </div>
    </div>
  );
}
