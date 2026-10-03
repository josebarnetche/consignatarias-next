// eslint-disable-next-line @typescript-eslint/no-require-imports -- next.config.js es CommonJS
const rematesData = require('./src/lib/data/remates.json')

// Slugs de las fichas de remate vigentes, para los redirects del middleware. Antes el
// middleware importaba remates.json entero (~700 KB dentro del bundle de edge) solo para
// armar este Set. Calculado acá queda siempre en sync con el build (lee el mismo JSON
// que generateStaticParams) y viaja como un string de ~60 KB.
// La fórmula TIENE que ser la de src/lib/remate-slug.ts (no se puede importar TS desde
// acá); src/lib/remate-slug.test.ts compara las dos.
function slugsRematesVigentes() {
  const slugs = new Set()
  for (const r of rematesData) {
    slugs.add(
      [
        r.consignatariaSlug || 'remate',
        r.type || 'general',
        (r.province && r.province.toLowerCase().replace(/\s+/g, '-')) || 'argentina',
        r.date,
      ].join('-'),
    )
  }
  return [...slugs].join('\n')
}

// Bots que reciben la metadata bloqueante en el <head> en vez de streameada en el <body>
// (Next 15.2+). La lista por defecto de Next no trae a los crawlers de IA ni a Googlebot
// "pelado" (solo los Google-*). Se sobreescribe entera, así que incluye la de Next.
const HTML_LIMITED_BOTS = new RegExp(
  [
    'Googlebot', '[\\w-]+-Google', 'Google-[\\w-]+', 'Google-Extended', 'Chrome-Lighthouse',
    'Bingbot', 'BingPreview', 'Slurp', 'DuckDuckBot', 'baiduspider', 'yandex', 'sogou', 'Applebot',
    'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User',
    'anthropic-ai', 'PerplexityBot', 'Perplexity-User', 'CCBot', 'facebookexternalhit',
    'facebookcatalog', 'Twitterbot', 'WhatsApp', 'LinkedInBot', 'Slackbot', 'Discordbot',
    'TelegramBot', 'redditbot', 'SkypeUriPreview', 'bitlybot', 'ia_archiver', 'Yeti', 'googleweblight',
  ].join('|'),
  'i',
)

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Se deja así a propósito (auditoría SEO 2026-10-03): hay 12 usos de next/image, el
  // hero de la home ya sale en WebP con variante mobile, y las cabeceras de features/ son
  // JPG de 64-94 KB decorativos (opacidad 30-40 %, detrás de gradientes); en WebP
  // ahorrarían ~40 KB por página. Activar la optimización de Vercel cambia las URLs y se
  // cobra por imagen: no lo justifica.
  images: {
    unoptimized: true,
  },

  htmlLimitedBots: HTML_LIMITED_BOTS,

  env: {
    REMATE_SLUGS_VIGENTES: slugsRematesVigentes(),
  },

  trailingSlash: false,

  // Las rutas opengraph-image (next/og) leen src/fonts/*.ttf en runtime con
  // readFile(process.cwd()+...). En el Lambda de Vercel esos .ttf NO se traceaban
  // al bundle de la función → ENOENT (579 errores en /remates/[slug]/opengraph-image).
  // Esto fuerza a incluir las fuentes en toda ruta opengraph-image.
  outputFileTracingIncludes: {
    '/**/opengraph-image': ['./src/fonts/JetBrainsMono-Bold.ttf', './src/fonts/JetBrainsMono-Medium.ttf'],
    // Las guías pagas se leen de `private/guias/` en runtime (nunca de /public:
    // ahí serían descargables sin comprar). Sin este include el Lambda no las
    // trae y la descarga responde 503 file_unavailable.
    '/api/guias-premium/**': ['./private/guias/**'],
  },

  // Security headers (redirects + cache headers handled by vercel.json)
  async headers() {
    return [
      {
        // Universally-safe headers for EVERY path (incl. los widgets embebibles).
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            // Force HTTPS for 2 years incl. subdomains. Safe: the site is
            // HTTPS-only on Vercel.
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            // CSP sin las directivas de framing — esas van en el bloque de abajo,
            // que EXCLUYE /api/widget para dejar los widgets embebibles en sitios
            // de terceros (motor de backlinks del data-layer). base-uri/object-src/
            // upgrade son seguros en todos lados, widget incluido.
            key: 'Content-Security-Policy',
            value: [
              // NOTE: intentionally no `default-src` — that would fall through
              // to connect-src/script-src and break the browser Supabase
              // client + Vercel analytics. Only the always-safe directives:
              "base-uri 'self'",
              "object-src 'none'",
              'upgrade-insecure-requests',
            ].join('; '),
          },
        ],
      },
      {
        // Anti-clickjacking (framing) para TODO menos /api/widget/*. Los widgets
        // (índice, remates) setean sus propios headers de framing permisivos en el
        // route handler y deben poder embeberse en webs de consignatarias/contadores.
        source: '/((?!api/widget).*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self'",
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
