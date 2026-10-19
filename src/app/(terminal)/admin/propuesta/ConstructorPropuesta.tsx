'use client'

import { useMemo, useState } from 'react'

interface Firma {
  slug: string
  nombre: string
  token: string
}

const SITIO = 'https://www.consignatarias.com.ar'
const NOTA_MAX = 600

/** El link de la página → el del PDF generado en el servidor, con el mismo token. */
function aPdf(link: string): string {
  const u = new URL(link)
  u.searchParams.delete('nota')
  return `${u.pathname.replace(/^\/propuesta\//, '/api/propuesta/')}/pdf${u.search}`
}

/** Mismo armado que urlPropuesta() (src/lib/propuesta/token.ts), con el token ya firmado. */
function armarLink(f: Firma, contacto: string, nota: string): string {
  const q = new URLSearchParams()
  if (f.token) q.set('t', f.token)
  if (contacto.trim()) q.set('contacto', contacto.trim())
  if (nota.trim()) q.set('nota', nota.trim())
  const qs = q.toString()
  return `${SITIO}/propuesta/${f.slug}${qs ? `?${qs}` : ''}`
}

/** Comparación sin acentos ni mayúsculas, para buscar "salliquelo" y encontrar "Salliqueló". */
function normal(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export default function ConstructorPropuesta({ firmas }: { firmas: Firma[] }) {
  const [busqueda, setBusqueda] = useState('')
  const [elegida, setElegida] = useState<Firma | null>(null)
  const [contacto, setContacto] = useState('')
  const [nota, setNota] = useState('')
  const [copiado, setCopiado] = useState<string | null>(null)

  const filtradas = useMemo(() => {
    const q = normal(busqueda.trim())
    if (!q) return firmas
    return firmas.filter((f) => normal(f.nombre).includes(q) || f.slug.includes(q))
  }, [busqueda, firmas])

  async function copiar(texto: string, clave: string) {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(clave)
      setTimeout(() => setCopiado(null), 1500)
    } catch {
      // Sin permiso de portapapeles: el link queda visible para copiarlo a mano.
    }
  }

  const linkElegida = elegida ? armarLink(elegida, contacto, nota) : ''

  return (
    <div className="space-y-4">
      {elegida && (
        <div className="border border-terminal-border rounded-terminal p-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-ink">{elegida.nombre}</p>
            <button type="button" onClick={() => setElegida(null)} className="text-xxs text-zinc-500 hover:text-zinc-300">
              Cambiar firma
            </button>
          </div>
          <label className="block space-y-1">
            <span className="text-xxs text-zinc-500 uppercase tracking-wider">Para (opcional)</span>
            <input
              value={contacto}
              onChange={(e) => setContacto(e.target.value.slice(0, 80))}
              placeholder="Nombre de la persona"
              className="terminal-input w-full"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xxs text-zinc-500 uppercase tracking-wider">
              Nota propia (opcional · {nota.length}/{NOTA_MAX})
            </span>
            <textarea
              value={nota}
              onChange={(e) => setNota(e.target.value.slice(0, NOTA_MAX))}
              rows={4}
              placeholder="Un párrafo breve que aparece después de la portada, en texto plano."
              className="terminal-input w-full"
            />
          </label>
          <div className="space-y-2">
            <p className="text-xxs text-zinc-500 uppercase tracking-wider">Link para compartir</p>
            <p className="text-xs text-zinc-300 break-all font-mono bg-terminal-bg p-2 rounded-terminal">{linkElegida}</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => copiar(linkElegida, 'elegida')} className="terminal-btn">
                {copiado === 'elegida' ? 'Copiado' : 'Copiar link'}
              </button>
              <a href={linkElegida.replace(SITIO, '')} target="_blank" rel="noopener noreferrer" className="terminal-btn">
                Abrir propuesta
              </a>
              <a href={aPdf(linkElegida)} target="_blank" rel="noopener noreferrer" className="terminal-btn">
                Descargar PDF
              </a>
            </div>
          </div>
        </div>
      )}

      <input
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder={`Buscar entre ${firmas.length} firmas`}
        className="terminal-input w-full"
      />

      <ul className="divide-y divide-terminal-border border-y border-terminal-border">
        {filtradas.map((f) => {
          const link = armarLink(f, '', '')
          return (
            <li key={f.slug} className="py-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    setElegida(f)
                    setContacto('')
                    setNota('')
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                  className="text-sm text-ink hover:text-accent text-left"
                >
                  {f.nombre}
                </button>
                <p className="text-xxs text-zinc-500 truncate">{link}</p>
              </div>
              <div className="flex gap-3 shrink-0 text-xxs">
                <button type="button" onClick={() => copiar(link, f.slug)} className="text-accent hover:text-accent-bright">
                  {copiado === f.slug ? 'Copiado' : 'Copiar'}
                </button>
                <a href={link.replace(SITIO, '')} target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-bright">
                  Abrir
                </a>
                <a href={aPdf(link)} target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-bright">
                  PDF
                </a>
              </div>
            </li>
          )
        })}
        {filtradas.length === 0 && <li className="py-3 text-xs text-zinc-500">Ninguna firma coincide.</li>}
      </ul>
    </div>
  )
}
