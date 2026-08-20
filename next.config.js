/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
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
