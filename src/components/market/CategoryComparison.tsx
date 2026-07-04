'use client';

import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';
import categoriesData from '@/lib/data/market-categories.json';

interface SeriesPoint {
  period: string;
  igmag: number;
  novillos: number;
  novillitos: number;
  vacas: number;
  vaquillonas: number;
  toros: number;
  mej: number;
}

const series = categoriesData.series as SeriesPoint[];

type CategoryKey = 'novillos' | 'novillitos' | 'vacas' | 'vaquillonas' | 'toros' | 'mej';

const CATEGORY_LABELS: Record<CategoryKey, string> = {
  novillos: 'Novillos',
  novillitos: 'Novillitos',
  vaquillonas: 'Vaquillonas',
  vacas: 'Vacas',
  toros: 'Toros',
  mej: 'MEJ',
};

const CATEGORY_ORDER: CategoryKey[] = ['novillitos', 'novillos', 'vaquillonas', 'vacas', 'toros', 'mej'];

function fmt(n: number, decimals = 0): string {
  return n.toLocaleString('es-AR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtChange(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return sign + n.toFixed(1) + '%';
}

function ChangeIndicator({ value }: { value: number }) {
  if (value > 2) {
    return <TrendingUp className="w-3.5 h-3.5 text-green-500" />;
  } else if (value < -2) {
    return <TrendingDown className="w-3.5 h-3.5 text-red-500" />;
  }
  return <Minus className="w-3.5 h-3.5 text-zinc-500" />;
}

export function CategoryComparison() {
  const data = useMemo(() => {
    const latest = series[series.length - 1];
    const prevYear = series.find(s => {
      const [latestYear, latestMonth] = latest.period.split('-');
      return s.period === `${parseInt(latestYear) - 1}-${latestMonth}`;
    });
    const prev2Year = series.find(s => {
      const [latestYear, latestMonth] = latest.period.split('-');
      return s.period === `${parseInt(latestYear) - 2}-${latestMonth}`;
    });

    // Find historical max for each category
    const maxValues: Record<CategoryKey, { value: number; period: string }> = {
      novillos: { value: 0, period: '' },
      novillitos: { value: 0, period: '' },
      vacas: { value: 0, period: '' },
      vaquillonas: { value: 0, period: '' },
      toros: { value: 0, period: '' },
      mej: { value: 0, period: '' },
    };

    series.forEach(pt => {
      CATEGORY_ORDER.forEach(cat => {
        if (pt[cat] > maxValues[cat].value) {
          maxValues[cat] = { value: pt[cat], period: pt.period };
        }
      });
    });

    const categories = CATEGORY_ORDER.map(cat => {
      const current = latest[cat];
      const yoy = prevYear ? ((current - prevYear[cat]) / prevYear[cat]) * 100 : null;
      const y2y = prev2Year ? ((current - prev2Year[cat]) / prev2Year[cat]) * 100 : null;
      const max = maxValues[cat];
      const vsMax = ((current - max.value) / max.value) * 100;
      const isAtMax = current >= max.value * 0.98; // Within 2% of max

      return {
        key: cat,
        label: CATEGORY_LABELS[cat],
        current,
        yoy,
        y2y,
        max: max.value,
        maxPeriod: max.period,
        vsMax,
        isAtMax,
      };
    });

    // Find best performer (highest YoY)
    const bestPerformer = [...categories]
      .filter(c => c.yoy !== null)
      .sort((a, b) => (b.yoy ?? 0) - (a.yoy ?? 0))[0];

    return {
      categories,
      latestPeriod: latest.period,
      prevYearPeriod: prevYear?.period,
      prev2YearPeriod: prev2Year?.period,
      bestPerformer,
    };
  }, []);

  const formatPeriod = (period: string): string => {
    const [year, month] = period.split('-');
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${months[parseInt(month) - 1]} ${year}`;
  };

  return (
    <div className="terminal-panel">
      <div className="terminal-panel-header flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-accent" />
        <span className="font-heading">COMPARATIVA POR CATEGORÍA</span>
        <span className="text-zinc-500 mx-1">&mdash;</span>
        <span className="text-zinc-500 text-sm normal-case">
          {formatPeriod(data.latestPeriod)}
        </span>
      </div>

      <div className="px-panel py-4">
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full font-terminal text-sm">
            <thead>
              <tr className="text-xxs text-zinc-500 uppercase border-b border-zinc-800">
                <th className="text-left py-2 pr-4">Categoría</th>
                <th className="text-right py-2 px-3">Actual</th>
                <th className="text-right py-2 px-3">vs {data.prevYearPeriod?.split('-')[0] || 'YoY'}</th>
                <th className="hidden sm:table-cell text-right py-2 px-3">vs {data.prev2YearPeriod?.split('-')[0] || '2Y'}</th>
                <th className="hidden sm:table-cell text-right py-2 px-3">Máx Hist.</th>
                <th className="hidden sm:table-cell text-right py-2 pl-3">vs Máx</th>
              </tr>
            </thead>
            <tbody>
              {data.categories.map((cat, i) => (
                <tr
                  key={cat.key}
                  className={`
                    border-b border-zinc-800/50 
                    ${i % 2 === 0 ? 'bg-zinc-900/30' : ''}
                    hover:bg-zinc-800/30 transition-colors
                  `}
                >
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-200 font-medium">{cat.label}</span>
                      {cat.isAtMax && (
                        <span className="text-xxs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">
                          ATH
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="text-right py-3 px-3 tabular-nums text-zinc-100">
                    ${fmt(cat.current, 2)}
                  </td>
                  <td className="text-right py-3 px-3">
                    {cat.yoy !== null ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <ChangeIndicator value={cat.yoy} />
                        <span
                          className={`tabular-nums ${
                            cat.yoy >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          {fmtChange(cat.yoy)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>
                  <td className="hidden sm:table-cell text-right py-3 px-3">
                    {cat.y2y !== null ? (
                      <span
                        className={`tabular-nums ${
                          cat.y2y >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {fmtChange(cat.y2y)}
                      </span>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>
                  <td className="hidden sm:table-cell text-right py-3 px-3 tabular-nums text-zinc-400">
                    ${fmt(cat.max, 2)}
                  </td>
                  <td className="hidden sm:table-cell text-right py-3 pl-3">
                    <span
                      className={`tabular-nums text-sm ${
                        cat.vsMax >= -5 ? 'text-amber-400' : 'text-zinc-500'
                      }`}
                    >
                      {fmtChange(cat.vsMax)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Insight */}
        {data.bestPerformer && (
          <div className="mt-4 pt-4 border-t border-zinc-800">
            <div className="flex items-start gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <p className="text-zinc-400">
                <span className="text-green-400 font-medium">{data.bestPerformer.label}</span>
                {' '}lidera con{' '}
                <span className="text-green-400 tabular-nums">
                  {fmtChange(data.bestPerformer.yoy ?? 0)}
                </span>
                {' '}interanual. Precio actual: ${fmt(data.bestPerformer.current, 2)}/kg vivo.
              </p>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-xxs text-zinc-600">
          <span>
            <span className="inline-block w-2 h-2 bg-amber-500/40 rounded mr-1" />
            ATH = Máximo histórico (±2%)
          </span>
          <span>MEJ = Mestizo/Especial/Joven</span>
          <span>Fuente: {categoriesData.source}</span>
        </div>
      </div>
    </div>
  );
}
