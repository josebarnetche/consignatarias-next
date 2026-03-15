'use client'

import { useState } from 'react'
import Image from 'next/image'

interface QRCodeProps {
  /** URL to encode in QR */
  url: string
  /** Size in pixels */
  size?: number
  /** Show download buttons */
  showDownload?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * QR Code component using QR Server API (free, no API key needed).
 * Generates QR code image with optional download buttons.
 */
export default function QRCode({ 
  url, 
  size = 200, 
  showDownload = true,
  className = '' 
}: QRCodeProps) {
  const [downloading, setDownloading] = useState(false)

  // Use QR Server API (free, reliable)
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&format=png`
  const qrSvgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&format=svg`

  async function handleDownload(format: 'png' | 'svg') {
    setDownloading(true)
    try {
      const downloadUrl = format === 'svg' ? qrSvgUrl : qrUrl
      const response = await fetch(downloadUrl)
      const blob = await response.blob()
      
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `qr-code.${format}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(link.href)
    } catch (error) {
      console.error('Download failed:', error)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      {/* QR Code Image */}
      <div className="bg-white p-3 rounded-lg">
        <Image 
          src={qrUrl} 
          alt="QR Code" 
          width={size} 
          height={size}
          className="block"
          unoptimized
        />
      </div>

      {/* Download Buttons */}
      {showDownload && (
        <div className="flex gap-2">
          <button
            onClick={() => handleDownload('png')}
            disabled={downloading}
            className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {downloading ? '...' : '📥 PNG'}
          </button>
          <button
            onClick={() => handleDownload('svg')}
            disabled={downloading}
            className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {downloading ? '...' : '📥 SVG'}
          </button>
        </div>
      )}

      {/* URL Preview */}
      <p className="text-xs text-zinc-500 font-mono truncate max-w-[200px]" title={url}>
        {url}
      </p>
    </div>
  )
}
