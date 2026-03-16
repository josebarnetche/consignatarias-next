import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// GET /api/consignatarias/[slug]/videos - Get video gallery for a consignataria
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const supabase = await createClient()

    // First get the consignataria ID from slug
    const { data: consignataria, error: consigError } = await supabase
      .from('consignatarias')
      .select('id')
      .eq('slug', slug)
      .single()

    if (consigError || !consignataria) {
      return NextResponse.json(
        { error: 'Consignataria not found' },
        { status: 404 }
      )
    }

    // Get videos for this consignataria
    const { data: videos, error: videosError } = await supabase
      .from('consignataria_videos')
      .select('*')
      .eq('consignataria_id', consignataria.id)
      .order('is_featured', { ascending: false })
      .order('published_at', { ascending: false })
      .limit(50)

    if (videosError) {
      console.error('Error fetching videos:', videosError)
      return NextResponse.json(
        { error: 'Error fetching videos' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      videos: videos || [],
      total: videos?.length || 0
    })
  } catch (error) {
    console.error('Videos API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/consignatarias/[slug]/videos - Add a video (PRO only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get consignataria and check ownership
    const { data: consignataria, error: consigError } = await supabase
      .from('consignatarias')
      .select('id, claimed_by, nombre')
      .eq('slug', slug)
      .single()

    if (consigError || !consignataria) {
      return NextResponse.json(
        { error: 'Consignataria not found' },
        { status: 404 }
      )
    }

    if (consignataria.claimed_by !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to manage this consignataria' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { youtubeUrl, videoType = 'remate', remateId, title, description } = body

    // Extract video ID from YouTube URL
    const videoId = extractYouTubeVideoId(youtubeUrl)
    if (!videoId) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL' },
        { status: 400 }
      )
    }

    // Fetch metadata from YouTube Data API if available
    let videoTitle = title
    let videoDescription = description
    
    if (!videoTitle && process.env.YOUTUBE_API_KEY) {
      try {
        const ytResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${process.env.YOUTUBE_API_KEY}`
        )
        if (ytResponse.ok) {
          const ytData = await ytResponse.json()
          if (ytData.items?.[0]?.snippet) {
            videoTitle = ytData.items[0].snippet.title
            videoDescription = videoDescription || ytData.items[0].snippet.description?.slice(0, 500)
          }
        }
      } catch (e) {
        console.error('YouTube API fetch failed:', e)
      }
    }
    
    // Fallback to provided title or placeholder
    videoTitle = videoTitle || `Video de ${consignataria.nombre}`

    // Insert video
    const { data: video, error: insertError } = await supabase
      .from('consignataria_videos')
      .insert({
        consignataria_id: consignataria.id,
        youtube_video_id: videoId,
        title: videoTitle,
        description: description || null,
        video_type: videoType,
        remate_id: remateId || null,
        thumbnail_url: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        published_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) {
      // Check for duplicate
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'Este video ya está agregado' },
          { status: 409 }
        )
      }
      console.error('Error inserting video:', insertError)
      return NextResponse.json(
        { error: 'Error adding video' },
        { status: 500 }
      )
    }

    return NextResponse.json({ video }, { status: 201 })
  } catch (error) {
    console.error('Add video API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper to extract YouTube video ID from various URL formats
function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null
  
  // Already just the ID (11 chars)
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
    return url
  }

  // Various YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }

  return null
}
