import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase-server'

const WINDOW_DAYS = 30

export interface Citada {
  slug: string
  nombre: string
  refs: number
  engines: string
}

/**
 * Citas de IA a consignatarias (últimos 30 días) desde `ai_referrals`.
 * Una "cita" = una IA (ChatGPT/Copilot/…) llevó a alguien al perfil de la firma.
 * Alimenta el hook de la landing PRO ("las IAs ya citan consignatarias") y la
 * personalización por firma.
 */
export async function getAiCitationStats(): Promise<{
  aiRefsMes: number
  firmsCitadas: number
  citadas: Citada[]
}> {
  const db = createAdminClient() as unknown as SupabaseClient
  const since = new Date(Date.now() - WINDOW_DAYS * 86400000).toISOString()

  const { data } = await db.from('ai_referrals').select('engine, path').gte('created_at', since).limit(5000)
  const rows = (data || []) as Array<{ engine: string | null; path: string | null }>
  const aiRefsMes = rows.length

  const bySlug = new Map<string, { refs: number; engines: Set<string> }>()
  for (const r of rows) {
    const m = (r.path || '').match(/^\/consignatarias\/([^/?]+)/)
    if (!m) continue
    const slug = m[1]
    const e = bySlug.get(slug) || { refs: 0, engines: new Set<string>() }
    e.refs++
    if (r.engine) e.engines.add(r.engine)
    bySlug.set(slug, e)
  }

  const slugs = [...bySlug.keys()]
  const names = new Map<string, string>()
  if (slugs.length) {
    const { data: cs } = await createAdminClient()
      .from('consignatarias')
      .select('canonical_slug, display_name')
      .in('canonical_slug', slugs)
    for (const c of cs || []) names.set(c.canonical_slug, c.display_name)
  }

  const prettyEngine: Record<string, string> = {
    copilot: 'Copilot',
    chatgpt: 'ChatGPT',
    gemini: 'Gemini',
    claude: 'Claude',
    perplexity: 'Perplexity',
  }
  const pretty = (slug: string) =>
    slug.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())
  const citadas: Citada[] = [...bySlug.entries()]
    .map(([slug, e]) => ({
      slug,
      nombre: names.get(slug) || pretty(slug),
      refs: e.refs,
      engines: [...e.engines].map((x) => prettyEngine[x] || x).join(' · '),
    }))
    .sort((a, b) => b.refs - a.refs)

  return { aiRefsMes, firmsCitadas: bySlug.size, citadas }
}
