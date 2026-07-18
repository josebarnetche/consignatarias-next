import "./globals.css";
import { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import Script from 'next/script';
import AnalyticsProvider from '@/components/AnalyticsProvider';
import CookieConsent from '@/components/CookieConsent';
import WhatsAppLeadFAB from '@/components/WhatsAppLeadFAB';
import AccountNudge from '@/components/AccountNudge';
import rematesData from '@/lib/data/remates.json';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const GA_ID = 'G-6CZMZH9S6Y';

// Only load GA on the production deploy — keeps localhost + Vercel preview
// traffic out of the production property. (analytics.ts also hostname-guards
// every event as defense-in-depth.)
const ANALYTICS_ENABLED = process.env.VERCEL_ENV === 'production';

const rematesCount = rematesData.length;

export const metadata: Metadata = {
  metadataBase: new URL('https://www.consignatarias.com.ar'),
  title: {
    default: 'Remates Ganaderos Argentina 2026 | Consignatarias.com.ar',
    template: '%s | Consignatarias.com.ar',
  },
  description:
    `Calendario unificado de remates ganaderos de múltiples consignatarias argentinas. ${rematesCount} remates, 1.102 frigoríficos MAGYP, precios INMAG en tiempo real. Acceso libre.`,
  keywords: [
    'remates ganaderos',
    'consignatarias argentina',
    'hacienda argentina',
    'frigorificos argentina',
    'precio ganado',
    'INMAG',
    'remates invernada',
    'remates cria',
    'mercado ganadero',
    'subastas ganaderas',
  ],
  authors: [{ name: 'Memola Medios SAS' }],
  creator: 'Memola Medios SAS',
  publisher: 'Memola Medios SAS',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'es_AR',
    url: 'https://www.consignatarias.com.ar',
    siteName: 'Consignatarias.com.ar',
    title: 'Remates Ganaderos Argentina | Calendario 2026 | Consignatarias.com.ar',
    description: `Calendario unificado de ${rematesCount} remates ganaderos, 1.102 frigoríficos y precios INMAG. La plataforma de inteligencia del mercado ganadero argentino.`,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Consignatarias.com.ar - Inteligencia del Mercado Ganadero',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@consignatarias',
    creator: '@memola_onbase',
    title: 'Remates Ganaderos Argentina | Calendario 2026',
    description: `Calendario unificado de ${rematesCount} remates ganaderos, 1.102 frigoríficos y precios INMAG. Inteligencia del mercado ganadero argentino.`,
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://www.consignatarias.com.ar',
    languages: {
      'es-AR': 'https://www.consignatarias.com.ar',
    },
    types: {
      'application/rss+xml': 'https://www.consignatarias.com.ar/rss.xml',
      'application/json': 'https://www.consignatarias.com.ar/precios.json',
    },
  },
  verification: {
    google: 'yp0ZNCGnizkAx0V1VuG_eIsS3g-AavcABk64J4_neW8',
  },
  category: 'business',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48' },
      { url: '/icon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

import { OrganizationSchema, WebSiteSchema } from '@/components/seo/JsonLd';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-AR" className={`dark ${inter.variable}`}>
      <head>
        {/* Google tag (gtag.js) — async per Google docs. `send_page_view:false`
            so the SPA-aware AnalyticsProvider is the SOLE source of page_view
            (the inline config used to emit a duplicate pageview on first load). */}
        {ANALYTICS_ENABLED && (
          <>
            {/* Preconnect: open the GTM/GA connection early so the deferred
                gtag.js download is fast when it fires (esp. slow mobile nets). */}
            <link rel="preconnect" href="https://www.googletagmanager.com" />
            <link rel="preconnect" href="https://www.google-analytics.com" crossOrigin="" />
            {/* Inline stub runs IMMEDIATELY (plain head script, before hydration) so
                window.gtag + dataLayer exist before any React effect fires — e.g. the
                pro_upgrade `purchase` event in UpgradeConfirmTracker. Events queue into
                dataLayer; the deferred gtag.js loader (in <body>, lazyOnload) flushes the
                queue on load. Conversions are delayed by a beat, never dropped. */}
            <script
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}',{send_page_view:false});`,
              }}
            />
          </>
        )}
        {/* Schema.org — Organization + WebSite son de sitio (van en el layout).
            Los Dataset viven en su página (/remates, /frigorificos), no globales. */}
        <OrganizationSchema />
        <WebSiteSchema />
      </head>
      <body className="antialiased">
        <AnalyticsProvider />
        <CookieConsent />
        {children}
        {/* Burbuja global de WhatsApp (lead "sumá tu consignataria" → whatsapp_lead).
            Montada en el ROOT layout para que aparezca en TODAS las páginas,
            incluida la home de la raíz (que no usa el layout terminal). */}
        <WhatsAppLeadFAB />
        {/* Nudge-first: invita (nunca obliga) a crear cuenta gratis con Google en
            momentos de alta intención. Global, no bloqueante. Ver src/lib/account-nudge.ts */}
        <AccountNudge />
        <Analytics />
        <SpeedInsights />
        {/* gtag.js download deferred to browser idle (lazyOnload) — keeps ~157 KiB of
            third-party JS off the mobile critical path (TBT/INP). The inline stub in
            <head> already defines gtag() and queues events; this only processes the
            dataLayer queue once loaded, so the pro_upgrade conversion still registers. */}
        {ANALYTICS_ENABLED && (
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="lazyOnload"
          />
        )}
      </body>
    </html>
  );
}
