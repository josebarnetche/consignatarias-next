/**
 * Points System — Profile Completion Rewards
 * 
 * 10 puntos = 1 peso
 * 4,500 puntos = 1 mes PRO ($45,000 ARS)
 */

export const POINT_VALUES = {
  // Data uploads (high value)
  DTE_UPLOAD: 500,        // Per DT-e file uploaded
  LOGO_UPLOAD: 400,       // Visual commitment
  
  // Contact info
  CUIT: 300,              // Trust signal
  PHONE: 200,             // Contact info
  EMAIL: 200,             // Contact info
  WHATSAPP: 200,          // Primary contact (Argentina)
  WEBSITE: 200,           // Digital presence
  
  // Content
  DESCRIPTION: 300,       // Completeness
  CATALOG_URL: 200,       // Content
  YOUTUBE_URL: 200,       // Content
  
  // Core actions
  FIRST_REMATE: 800,      // Core action - creating first auction
  REMATE_RESULT: 500,     // Engagement - uploading results
  
  // Bonuses
  PROFILE_COMPLETE: 300,  // All fields done
} as const

export const PRO_MONTH_THRESHOLD = 4500

export type PointAction = keyof typeof POINT_VALUES

/**
 * Calculate total points from a consignataria profile
 */
export function calculateProfilePoints(profile: {
  cuit?: string | null
  phone?: string | null
  email?: string | null
  whatsapp?: string | null
  website?: string | null
  description?: string | null
  logo?: string | null
  catalogUrl?: string | null
  youtubeUrl?: string | null
  dteCount?: number
  remateCount?: number
  hasResults?: boolean
}): { total: number; breakdown: { action: string; points: number; earned: boolean }[] } {
  const breakdown: { action: string; points: number; earned: boolean }[] = []
  let total = 0

  // Contact fields
  const fields: [string, keyof typeof POINT_VALUES, unknown][] = [
    ['CUIT verificado', 'CUIT', profile.cuit],
    ['Teléfono', 'PHONE', profile.phone],
    ['Email', 'EMAIL', profile.email],
    ['WhatsApp', 'WHATSAPP', profile.whatsapp],
    ['Sitio web', 'WEBSITE', profile.website],
    ['Descripción', 'DESCRIPTION', profile.description],
    ['Logo', 'LOGO_UPLOAD', profile.logo],
    ['URL catálogo', 'CATALOG_URL', profile.catalogUrl],
    ['URL YouTube', 'YOUTUBE_URL', profile.youtubeUrl],
  ]

  for (const [label, key, value] of fields) {
    const earned = Boolean(value)
    const points = POINT_VALUES[key]
    breakdown.push({ action: label, points, earned })
    if (earned) total += points
  }

  // DT-e uploads (500 pts each, max 3 for initial onboarding)
  const dteCount = Math.min(profile.dteCount ?? 0, 3)
  breakdown.push({
    action: `DT-e subidas (${dteCount}/3)`,
    points: POINT_VALUES.DTE_UPLOAD * 3,
    earned: dteCount >= 3
  })
  total += dteCount * POINT_VALUES.DTE_UPLOAD

  // First remate
  const hasRemate = (profile.remateCount ?? 0) > 0
  breakdown.push({
    action: 'Primer remate',
    points: POINT_VALUES.FIRST_REMATE,
    earned: hasRemate
  })
  if (hasRemate) total += POINT_VALUES.FIRST_REMATE

  // Remate results
  breakdown.push({
    action: 'Resultado de remate',
    points: POINT_VALUES.REMATE_RESULT,
    earned: Boolean(profile.hasResults)
  })
  if (profile.hasResults) total += POINT_VALUES.REMATE_RESULT

  // Profile complete bonus
  const baseFieldsComplete = fields.slice(0, 6).every(([, , v]) => Boolean(v))
  breakdown.push({
    action: 'Bonus: perfil completo',
    points: POINT_VALUES.PROFILE_COMPLETE,
    earned: baseFieldsComplete
  })
  if (baseFieldsComplete) total += POINT_VALUES.PROFILE_COMPLETE

  return { total, breakdown }
}

/**
 * Get suggested next actions sorted by points (highest first)
 */
export function getNextActions(breakdown: { action: string; points: number; earned: boolean }[]): {
  action: string
  points: number
}[] {
  return breakdown
    .filter(item => !item.earned)
    .sort((a, b) => b.points - a.points)
    .slice(0, 5)
}

/**
 * Check if eligible for free PRO month
 */
export function canRedeemPRO(points: number, alreadyRedeemed: boolean): boolean {
  return points >= PRO_MONTH_THRESHOLD && !alreadyRedeemed
}
