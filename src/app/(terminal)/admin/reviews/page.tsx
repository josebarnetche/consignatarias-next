import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin-auth'
import { getPendingReviews } from '@/lib/dal/reviews'
import ReviewsModerationClient from './ReviewsModerationClient'

export const metadata: Metadata = {
  title: 'Moderación de reseñas',
  robots: { index: false, follow: false },
}

export default async function AdminReviewsPage() {
  const auth = await requireAdmin()
  if (!auth.authorized) redirect('/login?next=/admin/reviews')

  const pending = await getPendingReviews(100)

  return <ReviewsModerationClient initialReviews={pending} adminEmail={auth.email ?? ''} />
}
