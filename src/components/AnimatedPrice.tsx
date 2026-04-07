'use client'

import { useEffect, useState, useRef } from 'react'

interface AnimatedPriceProps {
  value: number
  duration?: number
  prefix?: string
  suffix?: string
  decimals?: number
  className?: string
}

// Easing function: easeOutExpo - starts fast, slows dramatically at the end
function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
}

// Alternative: easeOutQuart - smoother deceleration
function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4)
}

// Custom easing: very slow at the end
function easeOutSuperSlow(t: number): number {
  // Combines expo with extra slowdown at the end
  const base = 1 - Math.pow(2, -12 * t)
  // Extra slowdown in last 20%
  if (t > 0.8) {
    const lastPhase = (t - 0.8) / 0.2
    return base * (1 - 0.02 * (1 - easeOutQuart(lastPhase)))
  }
  return base
}

export function AnimatedPrice({
  value,
  duration = 2500,
  prefix = '$',
  suffix = '',
  decimals = 0,
  className = '',
}: AnimatedPriceProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const startTimeRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    // Reset on value change
    setDisplayValue(0)
    setIsComplete(false)
    startTimeRef.current = null

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp
      }

      const elapsed = timestamp - startTimeRef.current
      const progress = Math.min(elapsed / duration, 1)
      
      // Apply easing
      const easedProgress = easeOutExpo(progress)
      
      // Calculate current value
      const currentValue = easedProgress * value
      setDisplayValue(currentValue)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        setDisplayValue(value)
        setIsComplete(true)
      }
    }

    // Small delay before starting animation for dramatic effect
    const timeout = setTimeout(() => {
      rafRef.current = requestAnimationFrame(animate)
    }, 200)

    return () => {
      clearTimeout(timeout)
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [value, duration])

  // Format number with locale
  const formattedValue = displayValue.toLocaleString('es-AR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

  return (
    <span 
      className={`
        tabular-nums transition-all duration-500
        ${className} 
        ${isComplete ? 'opacity-100' : 'opacity-90'}
      `}
      style={{
        textShadow: isComplete ? '0 0 30px rgba(16, 185, 129, 0.3)' : 'none',
      }}
    >
      {prefix}{formattedValue}{suffix}
    </span>
  )
}

// Variant with decimal animation (whole and decimal parts animate separately)
export function AnimatedPriceWithDecimals({
  value,
  duration = 2500,
  prefix = '$',
  suffix = '',
  className = '',
  decimalClassName = '',
}: AnimatedPriceProps & { decimalClassName?: string }) {
  const [displayValue, setDisplayValue] = useState(0)
  const startTimeRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    setDisplayValue(0)
    startTimeRef.current = null

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp
      }

      const elapsed = timestamp - startTimeRef.current
      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = easeOutExpo(progress)
      const currentValue = easedProgress * value
      setDisplayValue(currentValue)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        setDisplayValue(value)
      }
    }

    const timeout = setTimeout(() => {
      rafRef.current = requestAnimationFrame(animate)
    }, 200)

    return () => {
      clearTimeout(timeout)
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [value, duration])

  const wholePart = Math.floor(displayValue).toLocaleString('es-AR')
  const decimalPart = (displayValue % 1).toFixed(2).substring(2)

  return (
    <span className={`tabular-nums ${className}`}>
      {prefix}{wholePart}
      <span className={decimalClassName}>,{decimalPart}</span>
      {suffix}
    </span>
  )
}
