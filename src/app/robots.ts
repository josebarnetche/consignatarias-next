import { MetadataRoute } from 'next'

// Rutas que NO deben crawlearse: APIs, internos, y superficies utilitarias que
// ya van noindex (flujos de verificación, login, upgrade, cuenta).
// Bloquearlas en robots.txt ahorra crawl budget y las saca del reporte
// "Excluida por noindex" de GSC (Google ni las visita).
//
// Lo que NO va acá:
// - '/_next/': ahí están el CSS y el JS. Bloqueado, Googlebot renderiza la página
//   sin estilos ni hidratación y la evalúa rota.
// - '/go/': las páginas ya son noindex; si robots las bloquea, Google nunca llega a
//   leer ese noindex y puede indexar la URL igual, por enlaces.
const DISALLOW = [
  '/api/',
  '/admin/',
  '/mi-cuenta/',
  '/cuenta/',
  '/login',
  '/upgrade',
  '/*/verificar', // /consignatarias/<slug>/verificar y /frigorificos/verificar?cuit=
]

// El server MCP es una superficie pública que promocionamos (/mcp, llms.txt, el
// registry): no puede quedar tapado por el Disallow de /api/. La regla más
// específica gana, así que este Allow le gana a '/api/'.
const ALLOW = ['/', '/api/mcp']

// Buscadores y asistentes de IA: queremos que lean y citen el sitio. Se declaran uno
// por uno para que ninguno quede librado a cómo interpreta el bloque '*'.
const AI_BOTS = [
  'OAI-SearchBot',
  'ChatGPT-User',
  'GPTBot',
  'Claude-SearchBot',
  'Claude-User',
  'ClaudeBot',
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'Meta-ExternalAgent',
  'CCBot',
  'Amazonbot',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      ...AI_BOTS.map((userAgent) => ({ userAgent, allow: ALLOW, disallow: DISALLOW })),
      { userAgent: '*', allow: ALLOW, disallow: DISALLOW },
    ],
    sitemap: 'https://www.consignatarias.com.ar/sitemap.xml',
    host: 'https://www.consignatarias.com.ar',
  }
}
