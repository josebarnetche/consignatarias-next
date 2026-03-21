'use client';

interface FollowerCountProps {
  count: number;
  className?: string;
}

/**
 * Social proof: Shows how many people follow a consignataria
 * Lock-in: Creates bandwagon effect and validates user decisions
 * 
 * Psychology:
 * - Low numbers (1-10): Shows early adopter status
 * - Medium (10-50): Social proof kicks in
 * - High (50+): Strong validation signal
 */
export function FollowerCount({ count, className = '' }: FollowerCountProps) {
  // Don't show if no followers (avoids awkward "0 seguidores")
  if (count < 1) return null;

  // Format number with locale
  const formattedCount = count.toLocaleString('es-AR');
  
  // Singular/plural
  const label = count === 1 ? 'productor sigue' : 'productores siguen';

  return (
    <div className={`flex items-center gap-1.5 text-sm text-zinc-400 ${className}`}>
      <span className="text-zinc-500">👥</span>
      <span>
        <span className="text-zinc-300 font-medium">{formattedCount}</span>
        {' '}
        {label} esta consignataria
      </span>
    </div>
  );
}

/**
 * Compact version for tighter spaces
 */
export function FollowerCountCompact({ count, className = '' }: FollowerCountProps) {
  if (count < 1) return null;

  const formattedCount = count.toLocaleString('es-AR');

  return (
    <span className={`inline-flex items-center gap-1 text-xs text-zinc-500 ${className}`}>
      <span>👥</span>
      <span>{formattedCount}</span>
    </span>
  );
}
