import type { Metadata } from 'next'
import { getAllProfiles } from '@/lib/data/consignataria-slugs'
import { tokenPropuesta } from '@/lib/propuesta/token'
import ConstructorPropuesta from './ConstructorPropuesta'

/**
 * Admin → propuesta PRO por firma. El gate de admin lo hace el layout de /admin.
 *
 * Los tokens se calculan acá, en el servidor, porque el secreto no puede bajar al
 * navegador. Bajan los 107 tokens ya firmados: sólo los ve un admin, y cada uno
 * abre únicamente la propuesta de su firma.
 */
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Propuestas PRO',
  robots: { index: false, follow: false },
}

export default function AdminPropuestaPage() {
  const firmas = getAllProfiles()
    .map((p) => ({ slug: p.canonicalSlug, nombre: p.displayName, token: tokenPropuesta(p.canonicalSlug) }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  const sinSecreto = firmas.length > 0 && !firmas[0].token

  return (
    <div className="terminal-panel">
      <div className="terminal-panel-header text-zinc-200 text-label tracking-widest">Propuesta PRO por firma</div>
      <div className="px-panel py-4 space-y-3">
        <p className="text-xs text-zinc-400 leading-relaxed">
          Elegí la firma, completá a quién va dirigida y, si querés, un párrafo propio. El link se puede mandar tal cual
          (abre sin sesión) o abrirlo y guardarlo como PDF con «Descargar PDF». Los datos se leen al momento de abrirlo.
        </p>
        {sinSecreto && (
          <p className="text-xs text-negative">
            El servidor no tiene PROPUESTA_SECRET ni API_KEY_PEPPER: los links no llevan firma y sólo abren con sesión de
            admin.
          </p>
        )}
        <ConstructorPropuesta firmas={firmas} />
      </div>
    </div>
  )
}
