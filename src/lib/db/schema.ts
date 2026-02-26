// Database schema for consignatarias platform
// Currently used as TypeScript types — DB connection added later

export interface Auction {
  id: number
  title: string
  consignatariaName: string
  consignatariaSlug: string
  date: string        // ISO date "YYYY-MM-DD"
  time: string | null // "HH:MM" or null for all-day events
  location: string    // "Ciudad, Provincia"
  province: string    // denormalized for filtering
  type: 'invernada' | 'cria' | 'reproductores' | 'general' | 'especial'
  mainCategory: 'terneros' | 'novillos' | 'vaca_gorda' | 'vaquillonas' | 'toros' | 'mixto'
  estimatedHeads: number | null
  description: string
  youtubeUrl: string | null
  catalogUrl: string | null
  source: 'web' | 'social' | 'tv' | 'manual'
  sourceUrl: string | null
  status: 'scheduled' | 'live' | 'completed'
}

export interface FeaturedLink {
  id: number
  title: string
  url: string
  type: 'video' | 'pdf' | 'nota' | 'guia'
  description: string
}

// Type labels for display
export const typeLabels: Record<Auction['type'], string> = {
  invernada: 'Invernada',
  cria: 'Cría',
  reproductores: 'Reproductores',
  general: 'General',
  especial: 'Especial',
}

export const categoryLabels: Record<Auction['mainCategory'], string> = {
  terneros: 'Terneros',
  novillos: 'Novillos',
  vaca_gorda: 'Vaca Gorda',
  vaquillonas: 'Vaquillonas',
  toros: 'Toros',
  mixto: 'Mixto',
}

export const statusLabels: Record<Auction['status'], string> = {
  scheduled: 'Programado',
  live: 'En vivo',
  completed: 'Finalizado',
}
