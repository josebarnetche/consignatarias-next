'use client';

import { useState } from 'react';
import { TrendingUp, Calendar } from 'lucide-react';
import monthlyData from '@/lib/data/market-monthly.json';

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

function formatPeriod(period: string): string {
  const [year, month] = period.split('-');
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${months[parseInt(month) - 1]} ${year.slice(2)}`;
}

function barHeight(value: number, min: number, max: number): number {
  if (max === min) return 100;
  const ratio = (value - min) / (max - min);
  return Math.round(10 + ratio * 90); // 10% min, 100% max
}

type TimeRange = '1y' | '2y' | '3y';

export function LongTermChart() {
  const [range, setRange] = useState<TimeRange>('3y');
  
  const rangeMonths = range === '1y' ? 12 : range === '2y' ? 24 : 36;
  const displaySeries = series.slice(-rangeMonths);
  
  const displayMax = Math.max(...displaySeries.map(s => s.value));
  const displayMin = Math.min(...displaySeries.map(s => s.value));
  
  // Calculate range-specific change
  const rangeOldest = displaySeries[0]?.value ?? 0;
  const rangeNewest = displaySeries[displaySeries.length - 1]?.value ?? 0;
  const rangeChange = ((rangeNewest - rangeOldest) / rangeOldest * 100);

  return (
    <div className="terminal-panel">
      <div className="terminal-panel-header flex items-center justify-between">
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

        {/* Bar chart */}
        <div className="font-terminal text-data leading-tight">
          <div className="flex items-end gap-px mb-2" style={{ height: '140px' }}>
            {displaySeries.map((pt, i) => {
              const h = barHeight(pt.value, displayMin, displayMax);
              const isLast = i === displaySeries.length - 1;
              return (
                <div
                  key={pt.period}
                  className="group relative flex-1 min-w-0 rounded-t-sm transition-all hover:opacity-80"
                  style={{
                    height: `${h}%`,
                    background: isLast 
                      ? 'linear-gradient(to top, #d97706, #fbbf24)' 
                      : 'linear-gradient(to top, #3f3f46, #52525b)',
                  }}
                >
                  {/* Tooltip on hover */}
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-zinc-900 border border-zinc-700 text-zinc-200 text-xxs tabular-nums px-2 py-1 rounded whitespace-nowrap z-10">
                    <span className="text-amber-400">{formatPeriod(pt.period)}</span>: ${fmt(pt.value, 2)}
                  </span>
                </div>
              );
            })}
          </div>
          
          {/* Year labels */}
          <div className="flex gap-px text-xxs text-zinc-500 border-t border-zinc-800 pt-2">
            {displaySeries.map((pt, i) => {
              // Show label only at year boundaries or first/last
              const showLabel = i === 0 || 
                i === displaySeries.length - 1 || 
                pt.period.endsWith('-01') ||
                pt.period.endsWith('-07');
              return (
                <div key={pt.period} className="flex-1 min-w-0 text-center truncate">
                  {showLabel ? formatPeriod(pt.period) : ''}
                </div>
              );
            })}
          </div>
        </div>

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
