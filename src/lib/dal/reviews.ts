/**
 * reviews.ts — DAL for consignataria reviews.
 *
 * Read path: getApprovedReviewsForSlug(canonical) → public, server-rendered.
 * Write path: submitReview(payload) → service-role insert with ip_hash + dedup.
 * Admin path: getPendingReviews, approveReview, rejectReview.
 *
 * Anti-abuse:
 *   - IP is hashed with REVIEW_IP_PEPPER before storage. Never reversible.
 *   - Unique (consignataria_slug, submitter_email) on insert. Re-submit by
 *     the same email updates the existing row and bumps status back to
 *     pending so admin re-reviews.
 *   - Per-IP rate limit handled by middleware (existing).
 */

import 'server-only'
import crypto from 'node:crypto'
import { createServiceClient } from '@/lib/supabase'

export type ReviewStatus = 'pending' | 'approved' | 'rejected'
export type SubmitterRole = 'productor' | 'asesor' | 'comprador' | 'otro'

export interface ReviewRow {
  id: string
  consignataria_slug: string
  submitter_name: string
  submitter_email: string
  submitter_role: SubmitterRole | null
  submitter_provincia: string | null
  rating: number
  body: string
  status: ReviewStatus
  rejection_reason: string | null
  created_at: string
  approved_at: string | null
  approved_by: string | null
}

export interface PublicReview {
  id: string
  submitterName: string
  submitterRole: SubmitterRole | null
  submitterProvincia: string | null
  rating: number
  body: string
  createdAt: string
}

export interface ReviewSubmission {
  consignatariaSlug: string
  submitterName: string
  submitterEmail: string
  submitterRole?: SubmitterRole
  submitterProvincia?: string
  rating: number
  body: string
  ip?: string | null
}

function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null
  const pepper = process.env.REVIEW_IP_PEPPER ?? 'cnsg-review-pepper-fallback'
  return crypto.createHash('sha256').update(ip + pepper).digest('hex')
}

/** Approved reviews for public display on the profile page. */
export async function getApprovedReviewsForSlug(slug: string, limit = 10): Promise<PublicReview[]> {
  const service = createServiceClient()
  if (!service) return []
  const { data, error } = await service
    .from('consignataria_reviews')
    .select('id, submitter_name, submitter_role, submitter_provincia, rating, body, created_at')
    .eq('consignataria_slug', slug)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error || !data) return []
  return data.map((r) => ({
    id: r.id,
    submitterName: r.submitter_name,
    submitterRole: r.submitter_role as SubmitterRole | null,
    submitterProvincia: r.submitter_provincia,
    rating: r.rating,
    body: r.body,
    createdAt: r.created_at,
  }))
}

/** Aggregate stats for the profile header. */
export async function getReviewStatsForSlug(slug: string): Promise<{ count: number; avgRating: number | null }> {
  const service = createServiceClient()
  if (!service) return { count: 0, avgRating: null }
  const { data, error } = await service
    .from('consignataria_reviews')
    .select('rating')
    .eq('consignataria_slug', slug)
    .eq('status', 'approved')
  if (error || !data || data.length === 0) return { count: 0, avgRating: null }
  const avg = data.reduce((s, r) => s + r.rating, 0) / data.length
  return { count: data.length, avgRating: Math.round(avg * 10) / 10 }
}

export type SubmitResult =
  | { ok: true; reviewId: string; updated: boolean }
  | { ok: false; code: 'validation' | 'not_found' | 'server'; message: string; details?: unknown }

/** Insert (or update if same email already submitted) a pending review. */
export async function submitReview(s: ReviewSubmission): Promise<SubmitResult> {
  const service = createServiceClient()
  if (!service) return { ok: false, code: 'server', message: 'database unavailable' }

  // Basic validation — DB will validate the rest via checks.
  if (!s.consignatariaSlug || !s.submitterName || !s.submitterEmail || !s.body) {
    return { ok: false, code: 'validation', message: 'campos requeridos faltantes' }
  }
  if (s.body.trim().length < 30 || s.body.trim().length > 2000) {
    return { ok: false, code: 'validation', message: 'el comentario debe tener entre 30 y 2000 caracteres' }
  }
  if (!Number.isFinite(s.rating) || s.rating < 1 || s.rating > 5) {
    return { ok: false, code: 'validation', message: 'rating fuera de rango' }
  }

  // Verify the consignataria exists (FK will catch it too, but better error).
  const { data: cons } = await service
    .from('consignatarias')
    .select('canonical_slug')
    .eq('canonical_slug', s.consignatariaSlug)
    .maybeSingle()
  if (!cons) return { ok: false, code: 'not_found', message: 'consignataria no encontrada' }

  const payload = {
    consignataria_slug: s.consignatariaSlug,
    submitter_name: s.submitterName.trim(),
    submitter_email: s.submitterEmail.trim().toLowerCase(),
    submitter_role: s.submitterRole ?? null,
    submitter_provincia: s.submitterProvincia ?? null,
    rating: s.rating,
    body: s.body.trim(),
    ip_hash: hashIp(s.ip),
    status: 'pending' as const,
    rejection_reason: null,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await service
    .from('consignataria_reviews')
    .upsert(payload, { onConflict: 'consignataria_slug,submitter_email' })
    .select('id, created_at, updated_at')
    .single()
  if (error || !data) return { ok: false, code: 'server', message: error?.message ?? 'unknown' }
  const updated = data.created_at !== data.updated_at
  return { ok: true, reviewId: data.id, updated }
}

/** Pending reviews for admin moderation. */
export async function getPendingReviews(limit = 50): Promise<ReviewRow[]> {
  const service = createServiceClient()
  if (!service) return []
  const { data } = await service
    .from('consignataria_reviews')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit)
  return (data as ReviewRow[]) ?? []
}

export async function approveReview(reviewId: string, adminEmail: string): Promise<boolean> {
  const service = createServiceClient()
  if (!service) return false
  const { error } = await service
    .from('consignataria_reviews')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: adminEmail,
      rejection_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reviewId)
  return !error
}

export async function rejectReview(reviewId: string, adminEmail: string, reason: string): Promise<boolean> {
  const service = createServiceClient()
  if (!service) return false
  const { error } = await service
    .from('consignataria_reviews')
    .update({
      status: 'rejected',
      approved_at: null,
      approved_by: adminEmail,
      rejection_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reviewId)
  return !error
}
