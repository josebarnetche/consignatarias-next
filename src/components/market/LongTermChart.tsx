'use client';

import { useState } from 'react';
import { TrendingUp, Calendar } from 'lucide-react';
import monthlyData from '@/lib/data/market-monthly.json';
import { PriceLineChart, type PricePoint } from '@/components/charts/PriceLineChart';

interface SeriesPoint {
  period: string;
  value: number;
}

const series = monthlyData.series as SeriesPoint[];

// Calculate stats
const latestValue = series[series.length - 1]?.value ?? 0;

function fmt(n: number, decimals = 0): string {
  return n.toLocaleString('es-AR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

type TimeRange = '1y' | '2y' | '3y';

export function LongTermChart() {
  const [range, setRange] = useState<TimeRange>('3y');
  
  const rangeMonths = range === '1y' ? 12 : range === '2y' ? 24 : 36;
  const displaySeries = series.slice(-rangeMonths);

  const chartData: PricePoint[] = displaySeries.map((s) => ({
    date: `${s.period}-01`,
    value: s.value,
  }));

  const displayMax = Math.max(...displaySeries.map(s => s.value));
  const displayMin = Math.min(...displaySeries.map(s => s.value));
  
  // Calculate range-specific change
  const rangeOldest = displaySeries[0]?.value ?? 0;
  const rangeNewest = displaySeries[displaySeries.length - 1]?.value ?? 0;
  const rangeChange = ((rangeNewest - rangeOldest) / rangeOldest * 100);

  return (
    <div className="terminal-panel">
      <div className="terminal-panel-header flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-amber-500" />
          <span className="font-heading">HISTÓRICO IGMAG</span>
          <span className="text-zinc-500 mx-1">&mdash;</span>
          <span className="text-zinc-500 text-sm normal-case">Promedios mensuales</span>
        </div>
        
        {/* Range selector */}
        <div className="flex items-center gap-1">
          {(['1y', '2y', '3y'] as TimeRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`
                px-2 py-1 text-xs font-medium rounded transition-colors
                ${range === r 
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                  : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
                }
              `}
            >
              {r === '1y' ? '1 Año' : r === '2y' ? '2 Años' : '3 Años'}
            </button>
          ))}
        </div>
      </div>
      
      <div className="px-panel py-4">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div>
            <div className="text-xxs text-zinc-500 uppercase mb-1">Último (Dic 24)</div>
            <div className="text-xl font-terminal tabular-nums text-zinc-100">
              {fmt(latestValue, 2)}
            </div>
          </div>
          <div>
            <div className="text-xxs text-zinc-500 uppercase mb-1">Var. {range === '1y' ? '12m' : range === '2y' ? '24m' : '36m'}</div>
            <div className={`text-xl font-terminal tabular-nums ${rangeChange >= 0 ? 'val-positive' : 'val-negative'}`}>
              {rangeChange >= 0 ? '+' : ''}{fmt(rangeChange, 1)}%
            </div>
          </div>
          <div>
            <div className="text-xxs text-zinc-500 uppercase mb-1">Máximo</div>
            <div className="text-xl font-terminal tabular-nums text-zinc-100">
              {fmt(displayMax, 2)}
            </div>
          </div>
          <div>
            <div className="text-xxs text-zinc-500 uppercase mb-1">Mínimo</div>
            <div className="text-xl font-terminal tabular-nums text-zinc-100">
              {fmt(displayMin, 2)}
            </div>
          </div>
        </div>

        {/* Gráfico de línea interactivo: escala completa + tooltip precio/fecha */}
        <PriceLineChart
          data={chartData}
          height={160}
          accentColor="#fbbf24"
          decimals={2}
          prefix="$"
        />

        {/* Context */}
        <div className="mt-4 pt-4 border-t border-zinc-800">
          <p className="text-xxs text-zinc-500">
            <Calendar className="w-3 h-3 inline-block mr-1" />
            Datos: {monthlyData.range.from} a {monthlyData.range.to} • 
            Fuente: {monthlyData.source}
          </p>
        </div>
      </div>
    </div>
  );
}
