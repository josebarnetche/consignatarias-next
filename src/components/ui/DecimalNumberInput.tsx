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
      onFocus={(e) => {
        setFocused(true)
        // Si el campo está en 0, seleccioná todo → el primer tecleo lo reemplaza
        // (evita el "01,5"). Si tiene un valor real (ej. 1120), no selecciona: deja editar.
        if (value === 0) e.target.select()
      }}
      onBlur={() => {
        setFocused(false)
        setRaw(fmt(value))
      }}
      onChange={(e) => {
        let s = e.target.value
        // dígitos + un separador decimal (coma o punto); vacío permitido mientras edita.
        if (!/^\d*[.,]?\d*$/.test(s)) return
        // Sacar cero(s) a la izquierda cuando hay otro dígito detrás: "01,5" → "1,5",
        // "007" → "7". Mantiene "0", "0,5", "0.5" y "" (vacío).
        s = s.replace(/^0+(\d)/, '$1')
        setRaw(s)
        const n = parseFloat(s.replace(',', '.'))
        onChange(Number.isFinite(n) ? Math.max(min, n) : min)
      }}
      className={className}
    />
  )
}
