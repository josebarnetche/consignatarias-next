'use client'

/**
 * PRO Badge with optional verified checkmark.
 * Used in auction listings and consignataria profiles.
 * 
 * Design: Gold/amber color scheme with subtle glow animation.
 * Conveys premium status to non-technical users.
 */

interface ProBadgeProps {
  /** Show verified checkmark */
  verified?: boolean
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Show glow animation */
  animated?: boolean
  /** Additional CSS classes */
  className?: string
}

export default function ProBadge({ 
  verified = false, 
  size = 'sm',
  animated = true,
  className = ''
}: ProBadgeProps) {
  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  }

  return (
    <span 
      className={`
        inline-flex items-center font-terminal font-bold tracking-wider
        border border-amber-500/50 bg-gradient-to-r from-amber-500/20 to-amber-600/10
        text-amber-400 rounded-sm
        ${animated ? 'pro-badge-glow' : ''}
        ${sizeClasses[size]}
        ${className}
      `}
      role="img"
      aria-label={verified ? "Consignataria PRO Verificada" : "Consignataria PRO"}
    >
      {/* Star icon */}
      <svg 
        className={`${size === 'sm' ? 'w-2.5 h-2.5' : size === 'md' ? 'w-3 h-3' : 'w-4 h-4'} text-amber-400`} 
        fill="currentColor" 
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
      
      <span>PRO</span>
      
      {/* Verified checkmark */}
      {verified && (
        <svg 
          className={`${size === 'sm' ? 'w-2.5 h-2.5' : size === 'md' ? 'w-3 h-3' : 'w-4 h-4'} text-amber-300`}
          fill="currentColor" 
          viewBox="0 0 20 20"
        >
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      )}
    </span>
  )
}

/**
 * Standalone verified checkmark badge.
 * For use next to consignataria names.
 */
export function VerifiedBadge({ 
  size = 'sm',
  className = '' 
}: { 
  size?: 'sm' | 'md' | 'lg'
  className?: string 
}) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }

  return (
    <span 
      className={`inline-flex items-center ${className}`}
      title="Consignataria verificada"
      role="img"
      aria-label="Verificada"
    >
      <svg 
        className={`${sizeClasses[size]} text-amber-400`}
        fill="currentColor" 
        viewBox="0 0 20 20"
      >
        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    </span>
  )
}
