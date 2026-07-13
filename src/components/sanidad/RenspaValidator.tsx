'use client'

import { useState } from 'react'
import { decodeRenspa, type RenspaDecode } from '@/lib/data/senasa-sanidad'

export default function RenspaValidator() {
  const [value, setValue] = useState('')
  const [result, setResult] = useState<RenspaDecode | null>(null)

  function onCheck(e: React.FormEvent) {
    e.preventDefault()
    setResult(decodeRenspa(value))
  }

  return (
    <div className="rounded-terminal border border-terminal-border bg-terminal-panel p-4">
      <form onSubmit={onCheck} className="flex flex-col sm:flex-row gap-2">
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            if (result) setResult(null)
          }}
          inputMode="numeric"
          placeholder="Ej. 01.234.5.67890.12"
          aria-label="Código RENSPA"
          className="flex-1 rounded-terminal border border-terminal-border bg-terminal-bg px-3 py-2 text-data text-zinc-100 placeholder:text-zinc-600 focus:border-accent focus:outline-none font-terminal"
        />
        <button
          type="submit"
          className="terminal-btn rounded-terminal border border-accent/40 bg-accent/10 px-4 py-2 text-data text-accent hover:bg-accent/20 transition-colors"
        >
          Validar
        </button>
      </form>

      {result && (
        <div className="mt-4 delta-flash">
          {!result.valido ? (
            <p className="text-data text-warning">✕ {result.error}</p>
          ) : (
            <div className="text-data">
              <p className="text-positive font-medium mb-2">✓ Estructura válida — {result.normalizado}</p>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-zinc-300">
                <dt className="text-xxs uppercase tracking-wide text-zinc-500">Provincia</dt>
                <dd className="font-terminal">{result.provincia}</dd>
                <dt className="text-xxs uppercase tracking-wide text-zinc-500">Departamento</dt>
                <dd className="font-terminal">{result.departamento}</dd>
                <dt className="text-xxs uppercase tracking-wide text-zinc-500">Jurisdicción</dt>
                <dd className="font-terminal">{result.jurisdiccion}</dd>
                <dt className="text-xxs uppercase tracking-wide text-zinc-500">Establecimiento</dt>
                <dd className="font-terminal">{result.establecimiento}</dd>
                <dt className="text-xxs uppercase tracking-wide text-zinc-500">Productor</dt>
                <dd className="font-terminal">{result.productor}</dd>
              </dl>
              <p className="mt-3 text-xxs text-zinc-500">
                Se valida la estructura del código, no que el RENSPA exista o esté vigente. Verificá la
                vigencia en la{' '}
                <a
                  href="https://aps2.senasa.gov.ar/registros/faces/publico/personas/tc_productoresagropecuarios.jsp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:text-accent-bright underline underline-offset-2"
                >
                  consulta pública de SENASA ↗
                </a>
                .
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
