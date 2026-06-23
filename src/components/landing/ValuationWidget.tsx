'use client';

import { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import marketPrices from '@/lib/data/market-prices.json';
import { trackEvent } from '@/lib/analytics';

const CATEGORIES = [
  { key: 'terneros', label: 'Terneros', avgKg: 180 },
  { key: 'novillitos', label: 'Novillitos', avgKg: 280 },
  { key: 'novillos', label: 'Novillos', avgKg: 420 },
  { key: 'vaquillonas', label: 'Vaquillonas', avgKg: 320 },
  { key: 'vacas', label: 'Vacas', avgKg: 380 },
  { key: 'toros', label: 'Toros', avgKg: 550 },
] as const;

const PROVINCES = [
  'Buenos Aires',
  'Santa Fe', 
  'Córdoba',
  'Entre Ríos',
  'Corrientes',
  'La Pampa',
  'Chaco',
  'Formosa',
  'Santiago del Estero',
  'San Luis',
] as const;

type CategoryKey = typeof CATEGORIES[number]['key'];

interface MarketPricesData {
  categories: Record<CategoryKey, { current: number; prev: number; change: number }>;
  inmag: { current: number; prev: number; change: number };
}

const prices = marketPrices as MarketPricesData;

export default function ValuationWidget() {
  const [category, setCategory] = useState<CategoryKey>('terneros');
  const [heads, setHeads] = useState(100);
  const [province, setProvince] = useState('Corrientes');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fire one engagement event the first time the user touches the calculator,
  // so the funnel has a denominator (calc-used → lead) instead of being blind.
  const interactedRef = useRef(false);
  const markCalcInteraction = () => {
    if (interactedRef.current) return;
    interactedRef.current = true;
    trackEvent('valuation_calc_used', { category, province });
  };

  const calculation = useMemo(() => {
    const cat = CATEGORIES.find(c => c.key === category);
    const pricePerKg = prices.categories[category]?.current || 0;
    const change = prices.categories[category]?.change || 0;
    const avgKg = cat?.avgKg || 180;
    const totalValue = pricePerKg * avgKg * heads;
    const perHead = pricePerKg * avgKg;
    
    return { pricePerKg, avgKg, totalValue, perHead, change };
  }, [category, heads]);

  const fmt = (n: number) => n.toLocaleString('es-AR');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      // Submit to newsletter API
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          source: 'valuation_widget',
          metadata: { category, heads, province }
        }),
      });
      
      if (res.ok) {
        setSubmitted(true);
        trackEvent('valuation_lead', {
          category,
          heads,
          province,
          estimated_value: calculation.totalValue,
          source: 'valuation_widget',
        });
      }
    } catch {
      // Silent fail, show success anyway for UX
      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-emerald-500/10 via-zinc-900 to-zinc-900 border border-emerald-500/30 rounded-xl p-6 md:p-8 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      
      <div className="relative z-10">
        <h3 className="text-xl font-medium text-zinc-100 mb-1">
          ¿Cuánto vale tu hacienda hoy?
        </h3>
        <p className="text-sm text-zinc-500 mb-6">
          Calculá el valor estimado con precios INMAG actualizados
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label htmlFor="vw-heads" className="text-xs text-zinc-500 mb-1.5 block">Cantidad de cabezas</label>
            <input
              id="vw-heads"
              type="number"
              value={heads}
              onChange={(e) => { markCalcInteraction(); setHeads(Math.max(1, parseInt(e.target.value) || 1)); }}
              min={1}
              max={10000}
              className="w-full bg-zinc-900 border border-zinc-700 focus:border-emerald-500/50 rounded-lg px-4 py-2.5 text-zinc-100 text-lg font-mono outline-none transition-colors"
            />
          </div>
          <div>
            <label htmlFor="vw-category" className="text-xs text-zinc-500 mb-1.5 block">Categoría</label>
            <select
              id="vw-category"
              value={category}
              onChange={(e) => { markCalcInteraction(); setCategory(e.target.value as CategoryKey); }}
              className="w-full bg-zinc-900 border border-zinc-700 focus:border-emerald-500/50 rounded-lg px-4 py-2.5 text-zinc-100 outline-none transition-colors cursor-pointer"
            >
              {CATEGORIES.map(c => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="vw-province" className="text-xs text-zinc-500 mb-1.5 block">Provincia</label>
            <select
              id="vw-province"
              value={province}
              onChange={(e) => { markCalcInteraction(); setProvince(e.target.value); }}
              className="w-full bg-zinc-900 border border-zinc-700 focus:border-emerald-500/50 rounded-lg px-4 py-2.5 text-zinc-100 outline-none transition-colors cursor-pointer"
            >
              {PROVINCES.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Result */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-5 mb-5">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">
                Valor estimado
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl md:text-5xl font-medium text-emerald-400 tracking-tight">
                  ${fmt(calculation.totalValue)}
                </span>
                <span className={`text-sm font-mono ${calculation.change > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {calculation.change > 0 ? '▲' : '▼'} {Math.abs(calculation.change).toFixed(1)}%
                </span>
              </div>
              <div className="text-xs text-zinc-500 mt-2">
                ${fmt(calculation.pricePerKg)}/kg × {calculation.avgKg}kg × {heads} cab = ${fmt(calculation.perHead)}/cab
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-xs text-zinc-600 mb-1">Precio por cabeza</div>
              <div className="text-2xl font-medium text-zinc-300 tracking-tight">
                ${fmt(calculation.perHead)}
              </div>
            </div>
          </div>
        </div>

        {/* Email capture */}
        {!submitted ? (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              aria-label="Correo electrónico para recibir el detalle"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="flex-1 bg-zinc-900 border border-zinc-700 focus:border-emerald-500/50 rounded-lg px-4 py-2.5 text-zinc-100 text-sm outline-none transition-colors"
              required
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/50 text-black font-medium rounded-lg text-sm transition-colors whitespace-nowrap"
            >
              {isSubmitting ? 'Enviando...' : 'Recibí el cierre mensual'}
            </button>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-3">
              <span>✓</span>
              <span>Listo. El 1° de cada mes te mandamos el cierre del INMAG con el valor de {CATEGORIES.find(c => c.key === category)?.label.toLowerCase()}. Un mail por mes, sin spam.</span>
            </div>
            <Link
              href="/mercado/arrendamiento"
              className="inline-flex items-center gap-1.5 text-sm text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
            >
              Ver cuánto rinde para tu arrendamiento →
            </Link>
          </div>
        )}

        <div className="text-[10px] text-zinc-600 mt-4 flex flex-wrap gap-x-4 gap-y-1">
          <span>Precios INMAG actualizados</span>
          <span>•</span>
          <span>Peso promedio por categoría</span>
          <span>•</span>
          <span>Sin costo de flete ni comisión</span>
        </div>
      </div>
    </div>
  );
}
