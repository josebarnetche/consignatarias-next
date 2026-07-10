'use client'

import { useEffect, useState } from 'react'

/**
 * Input numérico que acepta decimales con COMA (1,6) o punto (1.6). `type="number"`
 * NO toma la coma argentina — al tipear "1,6" el valor quedaba vacío → 0 (bug de la
 * calc de arrendamiento). Mantiene un string local para no "saltar" mientras se
 * escribe, y resincroniza desde `value` solo cuando no está enfocado (blur / carga
 * externa como localStorage).
 */
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : String(n).replace('.', ','))

export default function DecimalNumberInput({
  value,
  onChange,
  min = 0,
  className,
  placeholder,
  ariaLabel,
}: {
  value: number
  onChange: (n: number) => void
  min?: number
  className?: string
  placeholder?: string
  ariaLabel?: string
}) {
  const [raw, setRaw] = useState<string>(() => fmt(value))
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setRaw(fmt(value))
  }, [value, focused])

  return (
    <input
      type="text"
      inputMode="decimal"
      value={raw}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false)
        setRaw(fmt(value))
      }}
      onChange={(e) => {
        const s = e.target.value
        // dígitos + un separador decimal (coma o punto); vacío permitido mientras edita.
        if (!/^\d*[.,]?\d*$/.test(s)) return
        setRaw(s)
        const n = parseFloat(s.replace(',', '.'))
        onChange(Number.isFinite(n) ? Math.max(min, n) : min)
      }}
      className={className}
    />
  )
}
