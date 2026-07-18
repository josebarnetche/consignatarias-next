/**
 * Government Faena (Cattle Slaughter) Data API
 * Source: Secretaría de Agricultura, Ganadería y Pesca
 * API: datos.gob.ar
 */

export interface FaenaDataPoint {
  date: string;
  cabezas: number;
}

export interface FaenaStats {
  current: FaenaDataPoint;
  previous: FaenaDataPoint;
  yearAgo: FaenaDataPoint;
  monthlyChange: number; // percentage
  yearlyChange: number; // percentage
  total12Months: number;
}

const FAENA_API_URL =
  'https://apis.datos.gob.ar/series/api/series/?ids=40.3_VC_0_M_15&limit=13&sort=desc&format=json';

interface ApiResponse {
  data: [string, number][];
  meta: unknown[];
}

export async function getFaenaStats(): Promise<FaenaStats | null> {
  try {
    const res = await fetch(FAENA_API_URL, {
      next: { revalidate: 86400 }, // Cache for 24h (data updates monthly)
    });

    if (!res.ok) return null;

    const json: ApiResponse = await res.json();
    const data = json.data;

    if (!data || data.length < 13) return null;

    // data[0] = most recent month
    // data[12] = same month last year
    const current: FaenaDataPoint = { date: data[0][0], cabezas: Math.round(data[0][1]) };
    const previous: FaenaDataPoint = { date: data[1][0], cabezas: Math.round(data[1][1]) };
    const yearAgo: FaenaDataPoint = { date: data[12][0], cabezas: Math.round(data[12][1]) };

    const monthlyChange = ((current.cabezas - previous.cabezas) / previous.cabezas) * 100;
    const yearlyChange = ((current.cabezas - yearAgo.cabezas) / yearAgo.cabezas) * 100;

    // Sum last 12 months
    const total12Months = data.slice(0, 12).reduce((sum, [, val]) => sum + Math.round(val), 0);

    return {
      current,
      previous,
      yearAgo,
      monthlyChange,
      yearlyChange,
      total12Months,
    };
  } catch (error) {
    console.error('Failed to fetch faena stats:', error);
    return null;
  }
}

export function formatFaenaDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-AR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export function formatCabezas(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(2)}M`;
  }
  return n.toLocaleString('es-AR');
}
