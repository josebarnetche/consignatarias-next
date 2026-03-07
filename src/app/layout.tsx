import "./globals.css";
import { Metadata } from 'next';
import Script from 'next/script';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import AnalyticsProvider from '@/components/AnalyticsProvider';

const GA_ID = 'G-6CZMZH9S6Y';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.consignatarias.com.ar'),
  title: {
    default: 'Remates Ganaderos Argentina | Calendario Unificado | Consignatarias.com.ar',
    template: '%s | Consignatarias.com.ar',
  },
  description:
    'Calendario unificado de remates ganaderos de múltiples consignatarias argentinas. 370+ remates, 364 frigoríficos MAGYP, precios INMAG en tiempo real. Acceso libre.',
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
    title: 'Remates Ganaderos Argentina | Consignatarias.com.ar',
    description: 'Calendario unificado de 370+ remates ganaderos, 364 frigoríficos y precios INMAG. La plataforma de inteligencia del mercado ganadero argentino.',
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
    title: 'Remates Ganaderos Argentina | Consignatarias.com.ar',
    description: 'Calendario unificado de 370+ remates ganaderos y precios INMAG en tiempo real.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://www.consignatarias.com.ar',
  },
  verification: {
    // google: 'tu-codigo-de-verificacion',
  },
  category: 'business',
};

import { OrganizationSchema, WebSiteSchema, DatasetSchema } from '@/components/seo/JsonLd';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
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
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`}
        </Script>
        <AnalyticsProvider />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
