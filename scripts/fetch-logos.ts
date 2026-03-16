/**
 * Fetch logos/favicons from consignataria websites
 * Run: npx tsx scripts/fetch-logos.ts
 */

import fs from 'fs'
import path from 'path'
import https from 'https'
import http from 'http'

// Sources with known websites
const sources: Record<string, string> = {
  // Consignatarias principales
  'rosgan': 'https://www.rosgan.com.ar',
  'afa': 'https://www.afascl.coop',
  'coop-guillermo-lehmann': 'https://www.cooplehmann.com.ar',
  'colombo-magliano': 'https://www.colombomagliano.com.ar',
  'urien-loza': 'https://www.urienloza.com.ar',
  'garcia-de-la-navarra': 'https://www.gdln.com.ar',
  'mariano-pavon': 'https://www.marianopavon.com.ar',
  'julio-barreiro': 'https://www.juliobarreiro.com.ar',
  
  // Frigoríficos con website
  'swift': 'https://sitio.swift.com.ar',
  'rioplatense': 'https://www.rioplatense.com',
  'arrebeef': 'https://www.arrebeef.com',
  'gorina': 'https://www.friggorina.com',
  'coto': 'https://www.coto.com.ar',
  'quickfood': 'https://www.quickfood.com.ar',
  'mattievich': 'https://www.mattievich.com.ar',
}

const OUTPUT_DIR = path.join(__dirname, '../public/logos')

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

async function fetchFavicon(slug: string, baseUrl: string): Promise<void> {
  const faviconPaths = [
    '/favicon.ico',
    '/favicon.png',
    '/apple-touch-icon.png',
    '/apple-icon.png',
    '/icon.png',
  ]

  for (const faviconPath of faviconPaths) {
    try {
      const url = new URL(faviconPath, baseUrl)
      console.log(`Trying ${url.href}...`)
      
      const data = await downloadFile(url.href)
      if (data && data.length > 100) { // Minimum size check
        const ext = faviconPath.includes('.ico') ? 'ico' : 'png'
        const outputPath = path.join(OUTPUT_DIR, `${slug}.${ext}`)
        fs.writeFileSync(outputPath, data)
        console.log(`✓ Saved ${slug}.${ext} (${data.length} bytes)`)
        return
      }
    } catch (e) {
      // Continue to next path
    }
  }
  
  // Try Google's favicon service as fallback
  try {
    const domain = new URL(baseUrl).hostname
    const googleUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
    console.log(`Trying Google favicon service for ${domain}...`)
    
    const data = await downloadFile(googleUrl)
    if (data && data.length > 100) {
      const outputPath = path.join(OUTPUT_DIR, `${slug}.png`)
      fs.writeFileSync(outputPath, data)
      console.log(`✓ Saved ${slug}.png via Google (${data.length} bytes)`)
      return
    }
  } catch (e) {
    console.log(`✗ Failed for ${slug}`)
  }
}

function downloadFile(url: string): Promise<Buffer | null> {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http
    
    const request = protocol.get(url, { timeout: 5000 }, (response) => {
      // Follow redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location
        if (redirectUrl) {
          downloadFile(redirectUrl).then(resolve)
          return
        }
      }
      
      if (response.statusCode !== 200) {
        resolve(null)
        return
      }
      
      const chunks: Buffer[] = []
      response.on('data', (chunk) => chunks.push(chunk))
      response.on('end', () => resolve(Buffer.concat(chunks)))
      response.on('error', () => resolve(null))
    })
    
    request.on('error', () => resolve(null))
    request.on('timeout', () => {
      request.destroy()
      resolve(null)
    })
  })
}

async function main() {
  console.log('Fetching logos from consignataria websites...\n')
  
  for (const [slug, url] of Object.entries(sources)) {
    await fetchFavicon(slug, url)
  }
  
  console.log('\nDone!')
}

main()
