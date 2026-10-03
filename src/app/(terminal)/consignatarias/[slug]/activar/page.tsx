import { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { getAllCanonicalSlugs, getCanonicalSlug, getProfile } from '@/lib/data/consignataria-slugs'
import ActivarProForm from '@/components/consignataria/ActivarProForm'

/* ------------------------------------------------------------------ */
/*  STATIC PARAMS                                                      */
/* ------------------------------------------------------------------ */

// Solo firmas: los slugs de provincia (/consignatarias/buenos-aires) no tienen perfil, y
// prerenderizados salían como not-found con status 200 y dos meta robots.
export function generateStaticParams() {
  return getAllCanonicalSlugs().map((slug) => ({ slug }))
}

/* ------------------------------------------------------------------ */
/*  METADATA                                                           */
/* ------------------------------------------------------------------ */

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const canonical = getCanonicalSlug(slug)
  if (!canonical) return { robots: { index: false, follow: false } }

  const profile = getProfile(canonical)
  if (!profile) return { robots: { index: false, follow: false } }

  return {
    title: `Activar PRO — ${profile.displayName}`,
    description: `Activá el perfil PRO de ${profile.displayName} en Consignatarias.com.ar: prioridad, badge verificado y analítica de tu perfil.`,
    robots: {
      index: false,
      follow: false,
    },
    alternates: {
      canonical: `https://www.consignatarias.com.ar/consignatarias/${canonical}/activar`,
    },
  }
}

/* ------------------------------------------------------------------ */
/*  PAGE                                                               */
/* ------------------------------------------------------------------ */

export default async function ActivarPage({ params }: Props) {
  const { slug } = await params

  const canonical = getCanonicalSlug(slug)
  if (!canonical) notFound()

  if (slug !== canonical) {
    permanentRedirect(`/consignatarias/${canonical}/activar`)
  }

  const profile = getProfile(canonical)!

  return (
    <div className="max-w-lg mx-auto px-2 sm:px-4 py-6">
      <ActivarProForm slug={canonical} displayName={profile.displayName} />
    </div>
  )
}
