import "./globals.css";
import { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import AnalyticsProvider from '@/components/AnalyticsProvider';
import rematesData from '@/lib/data/remates.json';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const GA_ID = 'G-6CZMZH9S6Y';

const rematesCount = rematesData.length;

export const metadata: Metadata = {
  metadataBase: new URL('https://www.consignatarias.com.ar'),
  title: {
    default: 'Remates Ganaderos Argentina 2026 | Consignatarias.com.ar',
    template: '%s | Consignatarias.com.ar',
  },
  description:
    `Calendario unificado de remates ganaderos de múltiples consignatarias argentinas. ${rematesCount} remates, 364 frigoríficos MAGYP, precios INMAG en tiempo real. Acceso libre.`,
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
    description: `Calendario unificado de ${rematesCount} remates ganaderos, 364 frigoríficos y precios INMAG. La plataforma de inteligencia del mercado ganadero argentino.`,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Consignatarias.com.ar - Inteligencia del Mercado Ganadero',
      },
    ],
  },
  alternates: {
    canonical: 'https://www.consignatarias.com.ar',
    languages: {
      'es-AR': 'https://www.consignatarias.com.ar',
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

import { OrganizationSchema, WebSiteSchema, DatasetSchema } from '@/components/seo/JsonLd';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-AR" className={`dark ${inter.variable}`}>
      <head>
        {/* Google tag (gtag.js) — standard async placement per Google docs */}
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`,
          }}
        />
        {/* Schema.org Structured Data */}
        <OrganizationSchema />
        <WebSiteSchema />
        <DatasetSchema
          name="Calendario de Remates Ganaderos Argentina"
          description="Base de datos actualizada de remates ganaderos de múltiples consignatarias argentinas"
          url="https://www.consignatarias.com.ar/remates"
          keywords={['remates ganaderos', 'subastas hacienda', 'consignatarias argentina']}
        />
        <DatasetSchema
          name="Directorio de Frigoríficos MAGYP Argentina"
          description="364 plantas frigoríficas habilitadas por MAGYP con datos de provincia, etapa y matrícula"
          url="https://www.consignatarias.com.ar/frigorificos"
          keywords={['frigorificos argentina', 'plantas faena', 'MAGYP']}
        />
      </head>
      <body className="antialiased">
        <AnalyticsProvider />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
