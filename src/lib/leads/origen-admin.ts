import frigorificosData from '@/lib/data/frigorificos.json'
import { nombrePropio, provinciaNombre } from '@/lib/ui/tokens'

/**
 * De dónde vino un lead, en palabras (19-10-2026).
 *
 * `producer_leads.source` guarda claves como `frigorifico:30718669592:otra-consulta`:
 * en /admin/leads no había forma de saber a qué planta le quería vender cada productor
 * sin buscar el CUIT a mano. Se resuelve en el server (el padrón tiene 1.100 plantas y
 * no tiene por qué viajar al navegador).
 */

export interface OrigenLead {
  /** Para agrupar en "Por origen": Frigorífico, Campos, Arrendamiento… */
  grupo: string
  /** Lo que se lee en la fila: "Frigorífico Ovechas (Chaco) · otra consulta". */
  etiqueta: string
  href: string | null
}

const PLANTAS = new Map((frigorificosData as { cuit: string; name: string; province: string | null }[]).map((f) => [f.cuit, f]))

/** "FRIGORIFICO OVECHAS S.A.S." → "Frigorifico Ovechas S.A.S." sin comillas sueltas del padrón. */
const nombrePlanta = (n: string) => nombrePropio(n.replace(/"/g, '').replace(/\s*\(D\.N\.I\..*?\)/i, '').trim())

export function origenLead(source: string | null): OrigenLead {
  if (!source) return { grupo: 'Sin origen', etiqueta: 'Sin origen', href: null }
  const [tipo, clave, extra] = source.split(':')

  if (tipo === 'frigorifico' && clave) {
    const p = PLANTAS.get(clave)
    const sufijo = extra === 'otra-consulta' ? ' · otra consulta' : ''
    return {
      grupo: 'Frigorífico',
      etiqueta: p ? `${nombrePlanta(p.name)}${p.province ? ` (${provinciaNombre(p.province)})` : ''}${sufijo}` : `Frigorífico CUIT ${clave}${sufijo}`,
      href: `/frigorificos/${clave}`,
    }
  }
  if (tipo === 'campos' || tipo === 'campo') {
    const quiere = clave === 'tengo' ? 'Tiene campo' : clave === 'busco' ? 'Busca campo' : 'Campos'
    const donde = extra?.replace(/^(zona|prov)-/, '').replace(/-/g, ' ')
    return { grupo: 'Campos', etiqueta: [quiere, donde && donde !== 'tasador' ? nombrePropio(donde) : null, extra === 'tasador' ? 'tasador' : null].filter(Boolean).join(' · '), href: null }
  }
  // Formulario corto de hacienda (21-10-2026, `sourceDePagina()`): la clave es la de la URL.
  if (tipo === 'consignataria' && clave) {
    return { grupo: 'Ficha de consignataria', etiqueta: nombrePropio(clave.replace(/-/g, ' ')), href: `/consignatarias/${clave}` }
  }
  if (tipo === 'remate' && clave) return { grupo: 'Ficha de remate', etiqueta: clave, href: `/remates/${clave}` }
  if (tipo === 'precios' && clave) return { grupo: 'Precios', etiqueta: `Precio de ${clave}`, href: `/precios/${clave}` }
  if (tipo === 'frigorificos-provincia' && clave) {
    return { grupo: 'Frigoríficos por provincia', etiqueta: `Frigoríficos en ${nombrePropio(clave.replace(/-/g, ' '))}`, href: `/frigorificos/${clave}` }
  }
  if (tipo === 'arrendamiento') return { grupo: 'Arrendamiento', etiqueta: 'Calculadora de arrendamiento', href: null }
  return { grupo: 'Herramientas', etiqueta: source, href: null }
}
