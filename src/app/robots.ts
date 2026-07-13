import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // AI search engine bots — explicitly allowed
      {
        userAgent: 'GPTBot',
        allow: '/',
        disallow: ['/api/', '/_next/', '/admin/', '/mi-cuenta/'],
      },
      {
        userAgent: 'ChatGPT-User',
        allow: '/',
        disallow: ['/api/', '/_next/', '/admin/', '/mi-cuenta/'],
      },
      {
        userAgent: 'PerplexityBot',
        allow: '/',
        disallow: ['/api/', '/_next/', '/admin/', '/mi-cuenta/'],
      },
      {
        userAgent: 'ClaudeBot',
        allow: '/',
        disallow: ['/api/', '/_next/', '/admin/', '/mi-cuenta/'],
      },
      {
        userAgent: 'anthropic-ai',
        allow: '/',
        disallow: ['/api/', '/_next/', '/admin/', '/mi-cuenta/'],
      },
      {
        userAgent: 'Google-Extended',
        allow: '/',
        disallow: ['/api/', '/_next/', '/admin/', '/mi-cuenta/'],
      },
      // Default rule for all other crawlers
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/_next/', '/admin/', '/mi-cuenta/'],
      },
    ],
    sitemap: 'https://www.consignatarias.com.ar/sitemap.xml',
    host: 'https://www.consignatarias.com.ar',
  }
}
