import { createServiceClient } from '@/lib/supabase'
import frigorificosEnriched from '@/lib/data/frigorificos-enriched.json'

interface StaticFrigorifico {
  cuit: string
  name: string
  matricula: string
  province: string
  stage: number
  grupoEmpresario: string | null
  tipo: string | null
  localidad: string | null
  direccion: string | null
  telefono: string | null
  email: string | null
  web: string | null
  volumenFaena: string | null
  notas: string | null
  enrichedAt: string | null
  enrichmentSource: string | null
}

export interface EnrichedFrigorifico {
  cuit: string
  name: string
  matricula: string
  province: string
  stage: number
  grupoEmpresario: string | null
  tipo: string | null
  localidad: string | null
  direccion: string | null
  // Merged: Supabase profile takes priority over enriched JSON
  phone: string | null
  email: string | null
  website: string | null
  description: string | null
  volumenFaena: string | null
  notas: string | null
  // Supabase-only fields
  verified: boolean
  featured: boolean
  claimedByEmail: string | null
  claimedAt: string | null
}

const staticData = frigorificosEnriched as StaticFrigorifico[]

export async function getFrigorificoProfile(cuit: string): Promise<EnrichedFrigorifico | null> {
  const staticEntry = staticData.find(f => f.cuit === cuit)
  if (!staticEntry) return null

  try {
    const service = createServiceClient()
    const { data } = await service
      .from('frigorifico_profiles')
      .select('*')
      .eq('cuit', cuit)
      .single()

    return {
      cuit: staticEntry.cuit,
      name: staticEntry.name,
      matricula: staticEntry.matricula,
      province: staticEntry.province,
      stage: staticEntry.stage,
      grupoEmpresario: staticEntry.grupoEmpresario,
      tipo: staticEntry.tipo,
      localidad: staticEntry.localidad,
      direccion: staticEntry.direccion,
      // Supabase profile overrides enriched JSON
      phone: data?.phone || staticEntry.telefono || null,
      email: data?.email || staticEntry.email || null,
      website: data?.website || staticEntry.web || null,
      description: data?.description || staticEntry.notas || null,
      volumenFaena: staticEntry.volumenFaena,
      notas: staticEntry.notas,
      verified: data?.verified || false,
      featured: data?.featured || false,
      claimedByEmail: data?.claimed_by_email || null,
      claimedAt: data?.claimed_at || null,
    }
  } catch {
    // Fallback to static-only data if Supabase unavailable
    return {
      cuit: staticEntry.cuit,
      name: staticEntry.name,
      matricula: staticEntry.matricula,
      province: staticEntry.province,
      stage: staticEntry.stage,
      grupoEmpresario: staticEntry.grupoEmpresario,
      tipo: staticEntry.tipo,
      localidad: staticEntry.localidad,
      direccion: staticEntry.direccion,
      phone: staticEntry.telefono || null,
      email: staticEntry.email || null,
      website: staticEntry.web || null,
      description: staticEntry.notas || null,
      volumenFaena: staticEntry.volumenFaena,
      notas: staticEntry.notas,
      verified: false,
      featured: false,
      claimedByEmail: null,
      claimedAt: null,
    }
  }
}
