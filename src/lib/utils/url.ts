/**
 * Normalize URL to ensure it has a protocol.
 * Handles cases like:
 * - "www.example.com" -> "https://www.example.com"
 * - "example.com" -> "https://example.com"
 * - "https://example.com" -> "https://example.com" (unchanged)
 * - "/path" -> "/path" (unchanged, relative path)
 */
export function normalizeUrl(url: string | null | undefined): string | null {
  if (!url) return null
  
  // Already has protocol
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  
  // Looks like a domain (contains a dot, no spaces, not a relative path)
  if (url.includes('.') && !url.includes(' ') && !url.startsWith('/')) {
    return `https://${url}`
  }
  
  return url
}

/**
 * Check if a URL is external (has http/https protocol)
 */
export function isExternalUrl(url: string | null | undefined): boolean {
  if (!url) return false
  const normalized = normalizeUrl(url)
  return normalized?.startsWith('http') ?? false
}

/**
 * Get normalized href, with fallback
 */
export function getExternalHref(url: string | null | undefined, fallback = '#'): string {
  return normalizeUrl(url) || fallback
}
