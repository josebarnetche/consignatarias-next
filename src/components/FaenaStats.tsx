import { getFaenaStats, formatFaenaDate, formatCabezas } from '@/lib/faena-api';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';

export async function FaenaStats() {
  const stats = await getFaenaStats();

  if (!stats) return null;

  const TrendIcon =
    stats.yearlyChange > 1 ? TrendingUp : stats.yearlyChange < -1 ? TrendingDown : Minus;

  const trendColor =
    stats.yearlyChange > 1
      ? 'text-green-600'
      : stats.yearlyChange < -1
        ? 'text-red-600'
        : 'text-gray-600';

  return (
    <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Faena Nacional</h3>
        <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">
          Datos oficiales
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {/* Current Month */}
        <div>
          <p className="text-sm text-gray-500">{formatFaenaDate(stats.current.date)}</p>
          <p className="text-2xl font-bold text-gray-900">{formatCabezas(stats.current.cabezas)}</p>
          <p className="text-xs text-gray-400">cabezas</p>
        </div>

        {/* Monthly Change */}
        <div>
          <p className="text-sm text-gray-500">vs. mes anterior</p>
          <p
            className={`text-lg font-semibold ${stats.monthlyChange > 0 ? 'text-green-600' : stats.monthlyChange < 0 ? 'text-red-600' : 'text-gray-600'}`}
          >
            {stats.monthlyChange > 0 ? '+' : ''}
            {stats.monthlyChange.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-400">{formatCabezas(stats.previous.cabezas)}</p>
        </div>

        {/* YoY Change */}
        <div>
          <p className="text-sm text-gray-500">vs. año anterior</p>
          <div className="flex items-center gap-1">
            <TrendIcon className={`h-5 w-5 ${trendColor}`} />
            <p className={`text-lg font-semibold ${trendColor}`}>
              {stats.yearlyChange > 0 ? '+' : ''}
              {stats.yearlyChange.toFixed(1)}%
            </p>
          </div>
          <p className="text-xs text-gray-400">{formatCabezas(stats.yearAgo.cabezas)}</p>
        </div>

        {/* 12-Month Total */}
        <div>
          <p className="text-sm text-gray-500">Últimos 12 meses</p>
          <p className="text-2xl font-bold text-gray-900">{formatCabezas(stats.total12Months)}</p>
          <p className="text-xs text-gray-400">cabezas faenadas</p>
        </div>
      </div>

      <p className="mt-4 text-xs text-gray-400">
        Fuente: Secretaría de Agricultura, Ganadería y Pesca
      </p>
    </div>
  );
}
