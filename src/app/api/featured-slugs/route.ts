import { NextResponse } from 'next/server'
import { getFeaturedSlugs } from '@/lib/featured'

export async function GET() {
  const slugs = [...(await getFeaturedSlugs())]

  return NextResponse.json({ slugs }, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  })
}
