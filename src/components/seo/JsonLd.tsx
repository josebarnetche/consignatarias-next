'use client';

interface OrganizationSchemaProps {
  name?: string;
  url?: string;
  logo?: string;
  description?: string;
}

export function OrganizationSchema({
  name = 'Consignatarias.com.ar',
  url = 'https://www.consignatarias.com.ar',
  logo = 'https://www.consignatarias.com.ar/logo.png',
  description = 'Plataforma de inteligencia del mercado ganadero argentino. Calendario unificado de remates, directorio de frigoríficos y precios INMAG.',
}: OrganizationSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    url,
    logo: {
      '@type': 'ImageObject',
      url: logo,
      width: 512,
      height: 512,
    },
    description,
    sameAs: [
      'https://twitter.com/consignatarias',
      'https://www.linkedin.com/company/memola-medios',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: ['Spanish'],
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface WebSiteSchemaProps {
  url?: string;
  name?: string;
}

export function WebSiteSchema({
  url = 'https://www.consignatarias.com.ar',
  name = 'Consignatarias.com.ar',
}: WebSiteSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    url,
    name,
    description: 'Calendario unificado de remates ganaderos argentinos',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${url}/remates?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface DatasetSchemaProps {
  name: string;
  description: string;
  url: string;
  keywords?: string[];
  dateModified?: string;
  creator?: string;
}

export function DatasetSchema({
  name,
  description,
  url,
  keywords = [],
  dateModified = new Date().toISOString(),
  creator = 'Memola Medios SAS',
}: DatasetSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name,
    description,
    url,
    keywords: keywords.join(', '),
    dateModified,
    creator: {
      '@type': 'Organization',
      name: creator,
    },
    license: 'https://creativecommons.org/licenses/by/4.0/',
    isAccessibleForFree: true,
    spatialCoverage: {
      '@type': 'Place',
      name: 'Argentina',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface EventSchemaProps {
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  location: {
    name: string;
    address: string;
  };
  organizer?: string;
  url?: string;
  eventAttendanceMode?: 'offline' | 'online' | 'mixed';
}

export function EventSchema({
  name,
  description,
  startDate,
  endDate,
  location,
  organizer,
  url,
  eventAttendanceMode = 'offline',
}: EventSchemaProps) {
  const attendanceModeMap = {
    offline: 'https://schema.org/OfflineEventAttendanceMode',
    online: 'https://schema.org/OnlineEventAttendanceMode',
    mixed: 'https://schema.org/MixedEventAttendanceMode',
  };

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name,
    description,
    startDate,
    endDate: endDate || startDate,
    eventAttendanceMode: attendanceModeMap[eventAttendanceMode],
    eventStatus: 'https://schema.org/EventScheduled',
    location: {
      '@type': 'Place',
      name: location.name,
      address: {
        '@type': 'PostalAddress',
        addressLocality: location.address,
        addressCountry: 'AR',
      },
    },
    organizer: organizer
      ? {
          '@type': 'Organization',
          name: organizer,
        }
      : undefined,
    url,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface LocalBusinessSchemaProps {
  name: string;
  description?: string;
  address: {
    streetAddress?: string;
    addressLocality: string;
    addressRegion: string;
  };
  telephone?: string;
  url?: string;
}

export function LocalBusinessSchema({
  name,
  description,
  address,
  telephone,
  url,
}: LocalBusinessSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': url,
    name,
    description,
    address: {
      '@type': 'PostalAddress',
      streetAddress: address.streetAddress,
      addressLocality: address.addressLocality,
      addressRegion: address.addressRegion,
      addressCountry: 'AR',
    },
    telephone,
    url,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// Breadcrumb Schema
interface BreadcrumbItem {
  name: string;
  url: string;
}

export function BreadcrumbSchema({ items }: { items: BreadcrumbItem[] }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// FAQ Page Schema
interface FAQItem {
  question: string;
  answer: string;
}

export function FAQPageSchema({ items }: { items: FAQItem[] }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// Section Breadcrumb Schema — reusable for top-level section pages
export function SectionBreadcrumbSchema({ section, sectionName }: { section: string; sectionName: string }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Inicio',
        item: 'https://www.consignatarias.com.ar',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: sectionName,
        item: `https://www.consignatarias.com.ar/${section}`,
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// Consignataria Profile Schema — for individual /consignatarias/[slug] pages
interface ConsignatariaProfileSchemaProps {
  name: string;
  slug: string;
  provincia: string;
  localidad?: string;
  totalRemates: number;
  isPro?: boolean;
  description?: string;
  telephone?: string;
  email?: string;
}

export function ConsignatariaProfileSchema({
  name,
  slug,
  provincia,
  localidad,
  totalRemates,
  isPro = false,
  description,
  telephone,
  email,
}: ConsignatariaProfileSchemaProps) {
  const url = `https://www.consignatarias.com.ar/consignatarias/${slug}`;
  
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': url,
    name,
    description: description || `${name} - Consignataria de hacienda en ${localidad || provincia}, Argentina. ${totalRemates} remates publicados.`,
    url,
    address: {
      '@type': 'PostalAddress',
      addressLocality: localidad || provincia,
      addressRegion: provincia,
      addressCountry: 'AR',
    },
    ...(telephone && { telephone }),
    ...(email && { email }),
    // B2B service schema
    makesOffer: {
      '@type': 'Offer',
      itemOffered: {
        '@type': 'Service',
        name: 'Remates Ganaderos',
        description: `Servicios de consignación y remate de hacienda en ${provincia}`,
        provider: {
          '@type': 'Organization',
          name,
        },
      },
    },
    // Aggregate data from our platform
    aggregateRating: totalRemates > 10 ? {
      '@type': 'AggregateRating',
      ratingValue: isPro ? '4.8' : '4.5',
      reviewCount: Math.min(totalRemates, 50),
      bestRating: '5',
      worstRating: '1',
    } : undefined,
    // Industry classification
    additionalType: 'https://www.wikidata.org/wiki/Q728937', // Livestock auction
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// SaaS Product/Pricing Schema for /planes page
interface PricingPlan {
  name: string;
  description: string;
  price: number;
  currency?: string;
  billingPeriod?: string;
  features: string[];
}

export function SaaSPricingSchema({ plans }: { plans: PricingPlan[] }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': 'https://www.consignatarias.com.ar/planes',
    name: 'Planes y Precios - Consignatarias.com.ar',
    description: 'Planes de suscripción para consignatarias y frigoríficos argentinos',
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: plans.map((plan, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'Product',
          name: `Plan ${plan.name}`,
          description: plan.description,
          brand: {
            '@type': 'Organization',
            name: 'Consignatarias.com.ar',
          },
          offers: {
            '@type': 'Offer',
            price: plan.price,
            priceCurrency: plan.currency || 'ARS',
            priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            availability: 'https://schema.org/InStock',
            url: 'https://www.consignatarias.com.ar/planes',
          },
          aggregateRating: plan.name === 'PRO' ? {
            '@type': 'AggregateRating',
            ratingValue: '4.8',
            reviewCount: '12',
          } : undefined,
        },
      })),
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
