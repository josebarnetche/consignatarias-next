/**
 * Etapas de una consulta en el panel de la firma (18-10-2026). Los valores son los
 * que ya tenía `consignataria_leads.status` desde la tabla original; lo nuevo es que
 * la firma los puede mover. "converted" = la consulta terminó en negocio.
 */
export const ETAPAS = ['new', 'contacted', 'converted', 'archived'] as const
export type Etapa = (typeof ETAPAS)[number]

export const ETAPA_LABEL: Record<Etapa, string> = {
  new: 'Nueva',
  contacted: 'Contactada',
  converted: 'Ganada',
  archived: 'Descartada',
}

export function esEtapa(v: unknown): v is Etapa {
  return typeof v === 'string' && (ETAPAS as readonly string[]).includes(v)
}

/** Cualquier valor viejo o vacío cuenta como consulta nueva. */
export function etapaDe(status: string | null | undefined): Etapa {
  return esEtapa(status) ? status : 'new'
}

export const NOTAS_MAX = 2000

/** De dónde llegó la consulta, en palabras de la firma. */
export function origenConsulta(source: string | null | undefined): string {
  switch (source) {
    case 'profile':
      return 'Formulario de tu perfil'
    case 'whatsapp_profile':
      return 'WhatsApp desde tu perfil'
    case 'go_landing':
      return 'Tu página con QR'
    case 'remate':
      return 'Ficha de un remate'
    default:
      return source ? source.replace(/_/g, ' ') : 'Sin dato'
  }
}
