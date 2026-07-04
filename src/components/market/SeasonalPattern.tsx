'use client';

import { useMemo } from 'react';
import { Calendar, TrendingUp, TrendingDown, Lightbulb } from 'lucide-react';
import monthlyData from '@/lib/data/market-monthly.json';

interface SeriesPoint {
  period: string;
  value: number;
}

const series = monthlyData.series as SeriesPoint[];

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function fmt(n: number, decimals = 1): string {
  const sign = n >= 0 ? '+' : '';
  return sign + n.toLocaleString('es-AR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }) + '%';
}

export function SeasonalPattern() {
  const patterns = useMemo(() => {
    // Group values by month across all years
    const monthGroups: Record<number, number[]> = {};
    
    series.forEach((pt, i) => {
      if (i === 0) return; // Skip first point (no previous month)
      const [, month] = pt.period.split('-');
      const monthNum = parseInt(month) - 1;
      const prevValue = series[i - 1].value;
      const change = ((pt.value - prevValue) / prevValue) * 100;
      
      if (!monthGroups[monthNum]) monthGroups[monthNum] = [];
      monthGroups[monthNum].push(change);
    });

    // Calculate average change for each month
    const monthlyAvg = MONTHS.map((name, i) => {
      const changes = monthGroups[i] || [];
      const avg = changes.length > 0 
        ? changes.reduce((a, b) => a + b, 0) / changes.length 
        : 0;
      return { month: name, monthIndex: i, avgChange: avg, samples: changes.length };
    });

    // Find best/worst months
    const sorted = [...monthlyAvg].sort((a, b) => b.avgChange - a.avgChange);
    const bestMonths = sorted.slice(0, 3).filter(m => m.avgChange > 0);
    const worstMonths = sorted.slice(-3).filter(m => m.avgChange < 0).reverse();

    // Calculate current month position
    const currentMonth = new Date().getMonth();
    const currentPattern = monthlyAvg[currentMonth];

    return { monthlyAvg, bestMonths, worstMonths, currentPattern };
  }, []);

  const maxAbs = Math.max(...patterns.monthlyAvg.map(m => Math.abs(m.avgChange)));

  return (
    <div className="terminal-panel">
      <div className="terminal-panel-header flex items-center gap-2">
        <Calendar className="w-4 h-4 text-accent" />
        <span className="font-heading">ESTACIONALIDAD</span>
        <span className="text-zinc-500 mx-1">&mdash;</span>
        <span className="text-zinc-500 text-sm normal-case">Patrones históricos mensuales</span>
      </div>

      <div className="px-panel py-4">
        {/* Monthly pattern visualization */}
        <div className="mb-6">
          <div className="grid grid-cols-12 gap-1">
            {patterns.monthlyAvg.map((m, i) => {
              const isPositive = m.avgChange >= 0;
              const barHeight = Math.abs(m.avgChange) / maxAbs * 100;
              const isCurrent = i === new Date().getMonth();
              
              return (
                <div key={m.month} className="flex flex-col items-center">
                  {/* Bar container (centered baseline) */}
                  <div className="relative h-16 w-full flex items-center justify-center">
                    {/* Baseline */}
                    <div className="absolute w-full h-px bg-zinc-700" />
                    
                    {/* Bar */}
                    <div
                      className={`
                        absolute w-full rounded-sm transition-all
                        ${isPositive 
                          ? 'bg-emerald-500/70 bottom-1/2' 
                          : 'bg-red-500/70 top-1/2'
                        }
                        ${isCurrent ? 'ring-2 ring-sky-500 ring-offset-1 ring-offset-zinc-900' : ''}
                      `}
                      style={{ height: `${barHeight / 2}%` }}
                    />
                  </div>
                  
                  {/* Label */}
                  <span className={`
                    text-xxs mt-1
                    ${isCurrent ? 'text-accent font-bold' : 'text-zinc-500'}
                  `}>
                    {m.month}
                  </span>
                  
                  {/* Change value */}
                  <span className={`
                    text-xxs tabular-nums
                    ${isPositive ? 'text-emerald-400/80' : 'text-red-400/80'}
                  `}>
                    {fmt(m.avgChange)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Insights */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Best months to sell */}
          {patterns.bestMonths.length > 0 && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-medium text-emerald-400">Mejor momento para vender</span>
              </div>
              <div className="text-sm text-zinc-300">
                {patterns.bestMonths.map(m => m.month).join(', ')}
              </div>
              <p className="text-xxs text-zinc-500 mt-1">
                Históricamente los precios suben
              </p>
            </div>
          )}

          {/* Best months to buy */}
          {patterns.worstMonths.length > 0 && (
            <div className="bg-sky-500/10 border border-sky-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4 text-sky-500" />
                <span className="text-sm font-medium text-sky-400">Mejor momento para comprar</span>
              </div>
              <div className="text-sm text-zinc-300">
                {patterns.worstMonths.map(m => m.month).join(', ')}
              </div>
              <p className="text-xxs text-zinc-500 mt-1">
                Históricamente los precios bajan
              </p>
            </div>
          )}
        </div>

        {/* Current month insight */}
        {patterns.currentPattern && (
          <div className="mt-4 pt-4 border-t border-zinc-800">
            <div className="flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-accent mt-0.5" />
              <p className="text-sm text-zinc-400">
                <span className="text-accent font-medium">{patterns.currentPattern.month}</span>
                {' '}históricamente muestra{' '}
                <span className={patterns.currentPattern.avgChange >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                  {fmt(patterns.currentPattern.avgChange)}
                </span>
                {' '}de variación mensual (basado en {patterns.currentPattern.samples} años).
              </p>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <p className="mt-4 text-xxs text-zinc-600">
          * Basado en datos {monthlyData.range.from} - {monthlyData.range.to}. Rendimientos pasados no garantizan resultados futuros.
        </p>
      </div>
    </div>
  );
}
