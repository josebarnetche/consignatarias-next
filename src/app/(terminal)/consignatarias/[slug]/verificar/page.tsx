import { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import {
  getAllCanonicalSlugs,
  getCanonicalSlug,
  getProfile,
} from '@/lib/data/consignataria-slugs'
import ClaimForm from '@/components/claims/ClaimForm'

/* ------------------------------------------------------------------ */
/*  STATIC PARAMS                                                      */
/* ------------------------------------------------------------------ */

export function generateStaticParams() {
  return getAllCanonicalSlugs().map(slug => ({ slug }))
}

/* ------------------------------------------------------------------ */
/*  METADATA                                                           */
/* ------------------------------------------------------------------ */

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const canonical = getCanonicalSlug(slug)
  if (!canonical) return {}

  const profile = getProfile(canonical)
  if (!profile) return {}

  return {
    title: `Verificar perfil — ${profile.displayName}`,
    description: `Verificá el perfil de ${profile.displayName} en Consignatarias.com.ar y completá tu información.`,
    robots: {
      index: false,
      follow: false,
    },
    alternates: {
      canonical: `https://www.consignatarias.com.ar/consignatarias/${canonical}/verificar`,
    },
  }
}

/* ------------------------------------------------------------------ */
/*  PAGE                                                               */
/* ------------------------------------------------------------------ */

export default async function ClaimPage({ params }: Props) {
  const { slug } = await params

  const canonical = getCanonicalSlug(slug)
  if (!canonical) notFound()

  if (slug !== canonical) {
    permanentRedirect(`/consignatarias/${canonical}/verificar`)
  }

  const profile = getProfile(canonical)!

  return (
    <div className="max-w-lg mx-auto px-2 sm:px-4 py-6">
      <ClaimForm slug={canonical} displayName={profile.displayName} />
    </div>
  )
}
