import { MetadataRoute } from 'next'

// Rutas que NO deben crawlearse: APIs, internos, y superficies utilitarias que
// ya van noindex (redirects /go, flujos de verificación, login, upgrade, cuenta).
// Bloquearlas en robots.txt ahorra crawl budget y las saca del reporte
// "Excluida por noindex" de GSC (Google ni las visita).
const DISALLOW = [
  '/api/',
  '/_next/',
  '/admin/',
  '/mi-cuenta/',
  '/cuenta/',
  '/go/',
  '/login',
  '/upgrade',
  '/*/verificar', // /consignatarias/<slug>/verificar y /frigorificos/verificar?cuit=
]

const AI_BOTS = ['GPTBot', 'ChatGPT-User', 'PerplexityBot', 'ClaudeBot', 'anthropic-ai', 'Google-Extended']

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      ...AI_BOTS.map((userAgent) => ({ userAgent, allow: '/', disallow: DISALLOW })),
      { userAgent: '*', allow: '/', disallow: DISALLOW },
    ],
    sitemap: 'https://www.consignatarias.com.ar/sitemap.xml',
    host: 'https://www.consignatarias.com.ar',
  }
}
