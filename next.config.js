/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },

  trailingSlash: false,

  // Security headers (redirects + cache headers handled by vercel.json)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
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
            // Conservative CSP that does NOT break inline JSON-LD or the
            // first-party analytics already on the page. It blocks the
            // high-value injection vectors: framing (clickjacking beyond
            // X-Frame-Options), <base> hijacking, and plugin/object embeds,
            // and upgrades any stray http subresource. A full script-src
            // nonce policy can follow once inline JSON-LD is migrated.
            key: 'Content-Security-Policy',
            value: [
              // NOTE: intentionally no `default-src` — that would fall through
              // to connect-src/script-src and break the browser Supabase
              // client + Vercel analytics. Only the always-safe directives:
              "frame-ancestors 'self'",
              "base-uri 'self'",
              "object-src 'none'",
              'upgrade-insecure-requests',
            ].join('; '),
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
