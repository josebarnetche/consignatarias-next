'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Play, X, ExternalLink } from 'lucide-react'

export interface ConsignatariaVideo {
  id: string
  youtube_video_id: string
  title: string
  description?: string
  video_type: 'remate' | 'lote' | 'institucional' | 'tour'
  published_at?: string
  thumbnail_url?: string
  duration_seconds?: number
  view_count?: number
  is_featured?: boolean
}

interface VideoGalleryProps {
  videos: ConsignatariaVideo[]
  consignatariaName?: string
}

function formatDuration(seconds?: number): string {
  if (!seconds) return ''
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatViewCount(count?: number): string {
  if (!count) return ''
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
  return count.toString()
}

function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
}

function VideoTypeLabel({ type }: { type: string }) {
  const labels: Record<string, { text: string; color: string }> = {
    remate: { text: 'Remate', color: 'bg-amber-600' },
    lote: { text: 'Lote', color: 'bg-blue-600' },
    institucional: { text: 'Institucional', color: 'bg-gray-600' },
    tour: { text: 'Tour', color: 'bg-green-600' },
  }
  const config = labels[type] || labels.remate
  return (
    <span className={`${config.color} text-white text-xs px-2 py-0.5 rounded`}>
      {config.text}
    </span>
  )
}

export function VideoGallery({ videos, consignatariaName: _consignatariaName }: VideoGalleryProps) {
  const [activeVideo, setActiveVideo] = useState<ConsignatariaVideo | null>(null)

  if (!videos.length) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Play className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No hay videos disponibles</p>
      </div>
    )
  }

  return (
    <>
      {/* Video Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {videos.map((video) => (
          <button
            key={video.id}
            onClick={() => setActiveVideo(video)}
            className="group relative aspect-video rounded-lg overflow-hidden bg-gray-900 hover:ring-2 hover:ring-amber-500 transition-all"
          >
            {/* Thumbnail */}
            <Image
              src={video.thumbnail_url || getYouTubeThumbnail(video.youtube_video_id)}
              alt={video.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              unoptimized
            />
            
            {/* Play overlay */}
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors flex items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-amber-600/90 group-hover:bg-amber-500 flex items-center justify-center transition-colors">
                <Play className="w-7 h-7 text-white fill-white ml-1" />
              </div>
            </div>

            {/* Featured badge */}
            {video.is_featured && (
              <div className="absolute top-2 left-2">
                <span className="bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded">
                  ⭐ DESTACADO
                </span>
              </div>
            )}

            {/* Duration */}
            {video.duration_seconds && (
              <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
                {formatDuration(video.duration_seconds)}
              </div>
            )}

            {/* Video type label */}
            <div className="absolute top-2 right-2">
              <VideoTypeLabel type={video.video_type} />
            </div>

            {/* Title overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
              <p className="text-white text-sm font-medium line-clamp-2 text-left">
                {video.title}
              </p>
              {video.view_count && video.view_count > 0 && (
                <p className="text-gray-300 text-xs mt-1">
                  {formatViewCount(video.view_count)} visualizaciones
                </p>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Video Modal */}
      {activeVideo && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setActiveVideo(null)}
        >
          <div 
            className="relative w-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setActiveVideo(null)}
              className="absolute -top-12 right-0 text-white hover:text-amber-500 transition-colors"
            >
              <X className="w-8 h-8" />
            </button>

            {/* YouTube embed */}
            <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${activeVideo.youtube_video_id}?autoplay=1&rel=0`}
                title={activeVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>

            {/* Video info */}
            <div className="mt-4 text-white">
              <h3 className="text-xl font-semibold">{activeVideo.title}</h3>
              {activeVideo.description && (
                <p className="text-gray-300 mt-2 line-clamp-3">{activeVideo.description}</p>
              )}
              <div className="flex items-center gap-4 mt-3 text-sm text-gray-400">
                <VideoTypeLabel type={activeVideo.video_type} />
                {activeVideo.view_count && (
                  <span>{formatViewCount(activeVideo.view_count)} visualizaciones</span>
                )}
                <a
                  href={`https://youtube.com/watch?v=${activeVideo.youtube_video_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-amber-500 hover:text-amber-400"
                >
                  Ver en YouTube <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default VideoGallery
